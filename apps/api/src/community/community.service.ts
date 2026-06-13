import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ProjectsService } from '../projects/projects.service'
import type { AuthSession } from '../projects/project.models'
import { COMMUNITY_STORE, CommunityStore, FileCommunityStore } from './community.store'
import {
  AttachmentTargetType,
  CommunityForbiddenTerm,
  CommunityAttachment,
  CommunityState,
  DISCUSSION_CATEGORIES,
  DiscussionCategory,
  DiscussionComment,
  DiscussionThread,
  DmConversation,
  DmMessage,
  createEmptyCommunityState,
  normalizeForbiddenTerm,
} from './community.models'

/** 첨부 페이로드(디코드 기준) 상한 — 클라이언트 1600px 리사이즈 + 2MB 캡과 동일 계약. */
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024
export const ATTACHMENTS_PER_TARGET = 3
const ATTACHMENT_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/

export interface ThreadSummary {
  id: number
  projectId: number
  projectTitle: string
  category: DiscussionCategory
  title: string
  excerpt: string
  authorEmail: string
  authorName: string
  status: DiscussionThread['status']
  commentCount: number
  attachmentCount: number
  createdAt: Date
  lastActivityAt: Date
}

export interface CommentWithAttachments extends DiscussionComment {
  attachments: CommunityAttachment[]
}

export interface ThreadDetail {
  thread: DiscussionThread & { attachments: CommunityAttachment[] }
  comments: CommentWithAttachments[]
}

export interface ConversationSummary extends DmConversation {
  unreadCount: number
  lastMessagePreview: string | null
}

/**
 * 커뮤니티 서비스 — 토론/댓글/첨부/쪽지의 인메모리 상태 + write-behind 영속.
 * 세션 검증과 프로젝트 조회는 ProjectsService 에 위임한다(projects 상태는 읽기 전용으로만 사용).
 */
@Injectable()
export class CommunityService implements OnModuleInit, OnModuleDestroy {
  private readonly store: CommunityStore
  private state: CommunityState

  constructor(
    private readonly projectsService: ProjectsService,
    @Optional() @Inject(COMMUNITY_STORE) store?: CommunityStore
  ) {
    this.store = store ?? new FileCommunityStore()
    this.state = createEmptyCommunityState()
  }

  async onModuleInit(): Promise<void> {
    this.state = await this.store.load()
  }

  async onModuleDestroy(): Promise<void> {
    await this.store.flush()
  }

  private persist(): void {
    this.store.save(this.state)
  }

  // ───────────────────────── 토론 스레드 ─────────────────────────

  async listThreads(projectId: number): Promise<ThreadSummary[]> {
    await this.projectsService.getProjectById(projectId)
    return this.state.threads
      .filter((thread) => thread.projectId === projectId && thread.status === 'visible')
      .map((thread) => this.toThreadSummary(thread))
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
  }

  async createThread(
    projectId: number,
    session: AuthSession,
    input: { category: DiscussionCategory; title: string; body: string; attachments?: string[] }
  ): Promise<ThreadDetail> {
    const project = await this.projectsService.getProjectById(projectId)
    if (!DISCUSSION_CATEGORIES.includes(input.category)) {
      throw new BadRequestException('토론 주제 분류가 올바르지 않습니다.')
    }
    this.assertAllowedContent('discussion', [
      { label: '토론 제목', value: input.title },
      { label: '토론 내용', value: input.body },
    ])
    const attachments = this.validateAttachmentPayloads(input.attachments)

    const now = new Date()
    const thread: DiscussionThread = {
      id: this.state.nextThreadId++,
      projectId,
      authorEmail: session.email,
      authorName: session.name || session.email,
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
      status: 'visible',
      hiddenBy: null,
      moderationNote: null,
      createdAt: now,
      lastActivityAt: now,
    }
    this.state.threads.push(thread)
    this.appendAttachments('thread', thread.id, project.id, session.email, attachments)
    this.persist()
    return this.getThreadDetail(projectId, thread.id)
  }

  async getThreadDetail(
    projectId: number,
    threadId: number,
    viewer?: AuthSession | null
  ): Promise<ThreadDetail> {
    await this.projectsService.getProjectById(projectId)
    const thread = this.state.threads.find(
      (item) => item.id === threadId && item.projectId === projectId
    )
    const isAdmin = viewer?.role === 'admin'
    if (!thread || (thread.status === 'hidden' && !isAdmin)) {
      throw new NotFoundException('토론을 찾을 수 없습니다.')
    }

    const comments = this.state.comments
      .filter((comment) => comment.threadId === thread.id && comment.status !== 'hidden')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((comment) => ({
        ...comment,
        // 삭제 플레이스홀더: 본문은 저장 시점에 비웠지만, 방어적으로 응답에서도 비운다.
        body: comment.status === 'deleted' ? '' : comment.body,
        attachments: this.attachmentsFor('comment', comment.id),
      }))

    return {
      thread: { ...thread, attachments: this.attachmentsFor('thread', thread.id) },
      comments,
    }
  }

  /** 작성자 본인 스레드 숨김(소프트 삭제). 운영자 복구가 가능하도록 레코드는 남긴다. */
  hideOwnThread(threadId: number, session: AuthSession): { hidden: true } {
    const thread = this.requireThread(threadId)
    if (thread.authorEmail !== session.email) {
      throw new ForbiddenException('본인이 작성한 토론만 삭제할 수 있습니다.')
    }
    thread.status = 'hidden'
    thread.hiddenBy = session.email
    thread.moderationNote = '작성자가 삭제했습니다.'
    this.persist()
    return { hidden: true }
  }

  // ───────────────────────── 댓글/답글 ─────────────────────────

  addComment(
    threadId: number,
    session: AuthSession,
    input: { body: string; parentId?: number | null; attachments?: string[] }
  ): CommentWithAttachments {
    const thread = this.requireThread(threadId)
    if (thread.status === 'hidden') {
      throw new NotFoundException('토론을 찾을 수 없습니다.')
    }
    this.assertAllowedContent('discussion', [{ label: '댓글', value: input.body }])

    let parentId: number | null = null
    if (input.parentId !== undefined && input.parentId !== null) {
      const parent = this.state.comments.find(
        (comment) => comment.id === input.parentId && comment.threadId === threadId
      )
      if (!parent) {
        throw new BadRequestException('답글 대상 댓글을 찾을 수 없습니다.')
      }
      if (parent.parentId !== null) {
        throw new BadRequestException('답글에는 다시 답글을 달 수 없습니다(1단 답글).')
      }
      parentId = parent.id
    }

    const attachments = this.validateAttachmentPayloads(input.attachments)
    const comment: DiscussionComment = {
      id: this.state.nextCommentId++,
      threadId,
      parentId,
      authorEmail: session.email,
      authorName: session.name || session.email,
      body: input.body.trim(),
      status: 'visible',
      createdAt: new Date(),
    }
    this.state.comments.push(comment)
    this.appendAttachments('comment', comment.id, thread.projectId, session.email, attachments)
    thread.lastActivityAt = comment.createdAt
    this.persist()
    return { ...comment, attachments: this.attachmentsFor('comment', comment.id) }
  }

  /**
   * 댓글 삭제 — 스레드 구조 보존을 위해 레코드를 지우지 않고 'deleted' 플레이스홀더로 바꾼다.
   * 본문/첨부는 즉시 비운다(개인정보·이미지 잔존 방지). 작성자 본인 또는 운영자만 가능.
   */
  deleteComment(threadId: number, commentId: number, session: AuthSession): CommentWithAttachments {
    const comment = this.state.comments.find(
      (item) => item.id === commentId && item.threadId === threadId
    )
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.')
    }
    if (comment.authorEmail !== session.email && session.role !== 'admin') {
      throw new ForbiddenException('본인이 작성한 댓글만 삭제할 수 있습니다.')
    }
    comment.status = 'deleted'
    comment.body = ''
    this.removeAttachmentsOf('comment', comment.id, session.email)
    this.persist()
    return { ...comment, attachments: this.attachmentsFor('comment', comment.id) }
  }

  // ───────────────────────── 운영자 모더레이션 ─────────────────────────

  listAdminThreads(): ThreadSummary[] {
    return this.state.threads
      .map((thread) => this.toThreadSummary(thread))
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
  }

  moderateThread(
    threadId: number,
    action: 'hide' | 'restore' | 'delete',
    admin: AuthSession,
    note?: string
  ): { threadId: number; action: string } {
    const thread = this.requireThread(threadId)

    if (action === 'delete') {
      // 하드 삭제: 스레드 + 댓글 + 첨부 레코드를 모두 제거한다(복구 불가, 명시적 운영 판단).
      const commentIds = new Set(
        this.state.comments
          .filter((comment) => comment.threadId === threadId)
          .map((comment) => comment.id)
      )
      this.state.comments = this.state.comments.filter((comment) => comment.threadId !== threadId)
      this.state.attachments = this.state.attachments.filter(
        (attachment) =>
          !(attachment.targetType === 'thread' && attachment.targetId === threadId) &&
          !(attachment.targetType === 'comment' && commentIds.has(attachment.targetId))
      )
      this.state.threads = this.state.threads.filter((item) => item.id !== threadId)
      this.persist()
      return { threadId, action }
    }

    thread.status = action === 'hide' ? 'hidden' : 'visible'
    thread.hiddenBy = action === 'hide' ? admin.email : null
    thread.moderationNote =
      note?.trim() || (action === 'hide' ? '운영자가 숨김 처리했습니다.' : '운영자가 복구했습니다.')
    this.persist()
    return { threadId, action }
  }

  /** 운영자 첨부 관리 목록 — 제거되지 않은 첨부만, 최신순 상한 적용(payload 크기 보호). */
  listAdminAttachments(limit = 60): CommunityAttachment[] {
    return this.state.attachments
      .filter((attachment) => !attachment.removedBy)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, Math.max(1, Math.min(limit, 200)))
  }

  removeAttachment(attachmentId: number, admin: AuthSession): CommunityAttachment {
    const attachment = this.state.attachments.find((item) => item.id === attachmentId)
    if (!attachment) {
      throw new NotFoundException('첨부를 찾을 수 없습니다.')
    }
    attachment.dataUrl = ''
    attachment.removedBy = admin.email
    this.persist()
    return attachment
  }

  listForbiddenTerms(): CommunityForbiddenTerm[] {
    return [...this.state.forbiddenTerms].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })
  }

  createForbiddenTerm(
    admin: AuthSession,
    input: { term: string; scope?: CommunityForbiddenTerm['scope']; reason?: string }
  ): CommunityForbiddenTerm {
    const term = input.term.trim()
    const normalizedTerm = normalizeForbiddenTerm(term)
    const scope = input.scope ?? 'all'
    this.assertValidForbiddenTerm(normalizedTerm)
    this.assertUniqueForbiddenTerm(normalizedTerm, scope)

    const now = new Date()
    const created: CommunityForbiddenTerm = {
      id: this.state.nextForbiddenTermId++,
      term,
      normalizedTerm,
      scope,
      enabled: true,
      reason: input.reason?.trim() || null,
      createdBy: admin.email,
      createdAt: now,
      updatedAt: now,
    }
    this.state.forbiddenTerms.push(created)
    this.persist()
    return created
  }

  updateForbiddenTerm(
    termId: number,
    _admin: AuthSession,
    input: {
      term?: string
      scope?: CommunityForbiddenTerm['scope']
      reason?: string
      enabled?: boolean
    }
  ): CommunityForbiddenTerm {
    const target = this.state.forbiddenTerms.find((item) => item.id === termId)
    if (!target) {
      throw new NotFoundException('금칙어를 찾을 수 없습니다.')
    }

    const nextTerm = input.term === undefined ? target.term : input.term.trim()
    const nextNormalized = normalizeForbiddenTerm(nextTerm)
    const nextScope = input.scope ?? target.scope
    this.assertValidForbiddenTerm(nextNormalized)
    this.assertUniqueForbiddenTerm(nextNormalized, nextScope, target.id)

    target.term = nextTerm
    target.normalizedTerm = nextNormalized
    target.scope = nextScope
    if (input.reason !== undefined) {
      target.reason = input.reason.trim() || null
    }
    if (input.enabled !== undefined) {
      target.enabled = input.enabled
    }
    target.updatedAt = new Date()
    this.persist()
    return target
  }

  deleteForbiddenTerm(termId: number): { deleted: true } {
    const before = this.state.forbiddenTerms.length
    this.state.forbiddenTerms = this.state.forbiddenTerms.filter((item) => item.id !== termId)
    if (this.state.forbiddenTerms.length === before) {
      throw new NotFoundException('금칙어를 찾을 수 없습니다.')
    }
    this.persist()
    return { deleted: true }
  }

  // ───────────────────────── 1:1 쪽지 ─────────────────────────

  listConversations(session: AuthSession): ConversationSummary[] {
    return this.state.conversations
      .filter(
        (conversation) =>
          conversation.makerEmail === session.email || conversation.investorEmail === session.email
      )
      .map((conversation) => {
        const related = this.state.messages.filter(
          (message) => message.conversationId === conversation.id
        )
        const last = related[related.length - 1] ?? null
        const unreadCount = related.filter(
          (message) => message.senderEmail !== session.email && message.readAt === null
        ).length
        return {
          ...conversation,
          unreadCount,
          lastMessagePreview: last ? last.body.slice(0, 80) : null,
        }
      })
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
  }

  /** 대화 메시지 조회 — 참가자 전용. 조회 시 상대가 보낸 미확인 메시지를 읽음 처리한다(폴링 기반). */
  getConversationMessages(
    conversationId: number,
    session: AuthSession
  ): { conversation: DmConversation; messages: DmMessage[] } {
    const conversation = this.requireConversation(conversationId, session)
    let changed = false
    const messages = this.state.messages
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    for (const message of messages) {
      if (message.senderEmail !== session.email && message.readAt === null) {
        message.readAt = new Date()
        changed = true
      }
    }
    if (changed) {
      this.persist()
    }
    return { conversation, messages }
  }

  /**
   * 쪽지 전송 — projectId 가 오면 관심 회원/투자자가 메이커에게 대화를 시작(find-or-create)하고,
   * conversationId 가 오면 기존 대화에 참가자가 메시지를 추가한다.
   */
  async sendMessage(
    session: AuthSession,
    input: { projectId?: number; conversationId?: number; body: string }
  ): Promise<{ conversation: DmConversation; message: DmMessage }> {
    const body = input.body.trim()
    this.assertAllowedContent('message', [{ label: '쪽지', value: body }])
    let conversation: DmConversation

    if (input.conversationId) {
      conversation = this.requireConversation(input.conversationId, session)
    } else if (input.projectId) {
      if (session.role !== 'investor' && session.role !== 'member') {
        throw new ForbiddenException(
          '쪽지는 관심 회원/투자자가 메이커에게 시작할 수 있습니다. 받은 쪽지에는 답장할 수 있어요.'
        )
      }
      const project = await this.projectsService.getProjectById(input.projectId)
      const owner = this.projectsService.getProjectOwner(input.projectId)
      if (!owner) {
        throw new NotFoundException('이 프로젝트의 메이커를 찾을 수 없습니다.')
      }
      if (owner.email === session.email) {
        throw new BadRequestException('본인 프로젝트에는 쪽지를 보낼 수 없습니다.')
      }
      const existing = this.state.conversations.find(
        (item) => item.projectId === input.projectId && item.investorEmail === session.email
      )
      if (existing) {
        conversation = existing
      } else {
        conversation = {
          id: this.state.nextConversationId++,
          projectId: project.id,
          projectTitle: project.title,
          makerEmail: owner.email,
          makerName: owner.name ?? '메이커',
          investorEmail: session.email,
          investorName: session.name || session.email,
          createdAt: new Date(),
          lastMessageAt: new Date(),
        }
        this.state.conversations.push(conversation)
      }
    } else {
      throw new BadRequestException('projectId 또는 conversationId 중 하나가 필요합니다.')
    }

    const message: DmMessage = {
      id: this.state.nextMessageId++,
      conversationId: conversation.id,
      senderEmail: session.email,
      body,
      createdAt: new Date(),
      readAt: null,
    }
    this.state.messages.push(message)
    conversation.lastMessageAt = message.createdAt
    this.persist()
    return { conversation, message }
  }

  // ───────────────────────── 내부 헬퍼 ─────────────────────────

  private requireThread(threadId: number): DiscussionThread {
    const thread = this.state.threads.find((item) => item.id === threadId)
    if (!thread) {
      throw new NotFoundException('토론을 찾을 수 없습니다.')
    }
    return thread
  }

  private requireConversation(conversationId: number, session: AuthSession): DmConversation {
    const conversation = this.state.conversations.find((item) => item.id === conversationId)
    if (
      !conversation ||
      (conversation.makerEmail !== session.email && conversation.investorEmail !== session.email)
    ) {
      throw new NotFoundException('대화를 찾을 수 없습니다.')
    }
    return conversation
  }

  private toThreadSummary(thread: DiscussionThread): ThreadSummary {
    const commentCount = this.state.comments.filter(
      (comment) => comment.threadId === thread.id && comment.status === 'visible'
    ).length
    const attachmentCount = this.state.attachments.filter(
      (attachment) =>
        !attachment.removedBy &&
        ((attachment.targetType === 'thread' && attachment.targetId === thread.id) ||
          (attachment.targetType === 'comment' &&
            this.state.comments.some(
              (comment) =>
                comment.id === attachment.targetId &&
                comment.threadId === thread.id &&
                comment.status === 'visible'
            )))
    ).length
    return {
      id: thread.id,
      projectId: thread.projectId,
      projectTitle: this.projectsService.getProjectOwner(thread.projectId)?.projectTitle ?? '',
      category: thread.category,
      title: thread.title,
      excerpt: thread.body.length > 160 ? `${thread.body.slice(0, 160)}…` : thread.body,
      authorEmail: thread.authorEmail,
      authorName: thread.authorName,
      status: thread.status,
      commentCount,
      attachmentCount,
      createdAt: thread.createdAt,
      lastActivityAt: thread.lastActivityAt,
    }
  }

  private attachmentsFor(targetType: AttachmentTargetType, targetId: number) {
    return this.state.attachments.filter(
      (attachment) => attachment.targetType === targetType && attachment.targetId === targetId
    )
  }

  private appendAttachments(
    targetType: AttachmentTargetType,
    targetId: number,
    projectId: number,
    authorEmail: string,
    dataUrls: string[]
  ): void {
    for (const dataUrl of dataUrls) {
      this.state.attachments.push({
        id: this.state.nextAttachmentId++,
        targetType,
        targetId,
        projectId,
        authorEmail,
        dataUrl,
        byteSize: estimateBase64Bytes(dataUrl),
        removedBy: null,
        createdAt: new Date(),
      })
    }
  }

  private removeAttachmentsOf(
    targetType: AttachmentTargetType,
    targetId: number,
    removedBy: string
  ): void {
    for (const attachment of this.attachmentsFor(targetType, targetId)) {
      if (!attachment.removedBy) {
        attachment.dataUrl = ''
        attachment.removedBy = removedBy
      }
    }
  }

  private assertAllowedContent(
    scope: 'discussion' | 'message',
    fields: Array<{ label: string; value: string }>
  ): void {
    const activeTerms = this.state.forbiddenTerms.filter(
      (term) => term.enabled && (term.scope === 'all' || term.scope === scope)
    )
    if (activeTerms.length === 0) {
      return
    }

    for (const field of fields) {
      const normalizedValue = normalizeForbiddenTerm(field.value)
      if (!normalizedValue) {
        continue
      }
      if (activeTerms.some((term) => normalizedValue.includes(term.normalizedTerm))) {
        throw new BadRequestException(`${field.label}에 커뮤니티 금칙어가 포함되어 있습니다.`)
      }
    }
  }

  private assertValidForbiddenTerm(normalizedTerm: string): void {
    if (!normalizedTerm) {
      throw new BadRequestException('금칙어를 입력해주세요.')
    }
  }

  private assertUniqueForbiddenTerm(
    normalizedTerm: string,
    scope: CommunityForbiddenTerm['scope'],
    ignoreId?: number
  ): void {
    const duplicate = this.state.forbiddenTerms.find(
      (term) =>
        term.id !== ignoreId && term.normalizedTerm === normalizedTerm && term.scope === scope
    )
    if (duplicate) {
      throw new BadRequestException('이미 등록된 금칙어입니다.')
    }
  }

  private validateAttachmentPayloads(dataUrls?: string[]): string[] {
    if (!dataUrls || dataUrls.length === 0) {
      return []
    }
    if (dataUrls.length > ATTACHMENTS_PER_TARGET) {
      throw new BadRequestException(
        `이미지는 최대 ${ATTACHMENTS_PER_TARGET}장까지 첨부할 수 있습니다.`
      )
    }
    for (const dataUrl of dataUrls) {
      if (typeof dataUrl !== 'string' || !ATTACHMENT_DATA_URL_PATTERN.test(dataUrl)) {
        throw new BadRequestException(
          '이미지 첨부 형식이 올바르지 않습니다(PNG/JPEG/WebP data URL).'
        )
      }
      if (estimateBase64Bytes(dataUrl) > ATTACHMENT_MAX_BYTES) {
        throw new BadRequestException('이미지 첨부는 장당 2MB 이하여야 합니다.')
      }
    }
    return dataUrls
  }
}

/** data URL(base64) 의 디코드 바이트 수 추정 — 패딩 보정 포함. */
export function estimateBase64Bytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',')
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

/**
 * 커뮤니티 도메인 모델 — 프로젝트별 토론 스레드 + 1단 댓글/답글 + 이미지 첨부 + 1:1 쪽지.
 *
 * projects 스토어(ProjectsState)와 의도적으로 분리된 별도 상태다. projects 영속 계층은
 * 불가침(ADR/컨벤션)이므로 커뮤니티는 자기 모듈에서 자기 상태를 적재/영속한다.
 * 직렬화 규칙(Date↔ISO, 백필 기본값)은 projects.store.ts 의 패턴을 그대로 따른다.
 */

export type DiscussionCategory = 'question' | 'feedback' | 'help' | 'showcase'

export const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  'question',
  'feedback',
  'help',
  'showcase',
]

/** visible=공개, hidden=운영자/작성자 숨김(목록 제외, 복구 가능). 하드 삭제는 레코드 제거. */
export type DiscussionStatus = 'visible' | 'hidden'

export interface DiscussionThread {
  id: number
  projectId: number
  authorEmail: string
  /** 작성 시점 표시명 스냅샷(세션 name). 이메일은 프론트에서 마스킹 노출한다. */
  authorName: string
  category: DiscussionCategory
  title: string
  body: string
  status: DiscussionStatus
  /** 숨김 처리 주체 — 운영자 이메일 또는 작성자 본인. null 이면 공개 상태. */
  hiddenBy?: string | null
  moderationNote?: string | null
  createdAt: Date
  /** 마지막 댓글/생성 시각 — 목록 정렬 축. */
  lastActivityAt: Date
}

/** deleted=작성자 삭제(스레드 구조 보존용 플레이스홀더), hidden=운영자 숨김. */
export type DiscussionCommentStatus = 'visible' | 'deleted' | 'hidden'

export interface DiscussionComment {
  id: number
  threadId: number
  /** 1단 답글: 루트 댓글 id. 루트 댓글이면 null. (답글의 답글은 서버가 거부) */
  parentId: number | null
  authorEmail: string
  authorName: string
  body: string
  status: DiscussionCommentStatus
  createdAt: Date
}

export type AttachmentTargetType = 'thread' | 'comment'

/**
 * 이미지 첨부 — 클라이언트가 1600px 리사이즈 + 2MB 캡으로 만든 data URL 을 그대로 영속한다.
 * 별도 오브젝트 스토리지 없이 기존 스냅샷 영속 계층의 결(프로젝트 thumbnail 과 동일 방식)을 따른다.
 * 운영자 제거 시 dataUrl 만 비우고 레코드를 남겨 "제거됨" 플레이스홀더로 노출한다.
 */
export interface CommunityAttachment {
  id: number
  targetType: AttachmentTargetType
  targetId: number
  projectId: number
  authorEmail: string
  /** data:image/...;base64 페이로드. 운영자 제거 시 빈 문자열. */
  dataUrl: string
  byteSize: number
  removedBy?: string | null
  createdAt: Date
}

/** 쪽지 대화방 — (projectId, investorEmail) 당 1개. 메이커는 프로젝트 소유자 스냅샷. */
export interface DmConversation {
  id: number
  projectId: number
  projectTitle: string
  makerEmail: string
  makerName: string
  investorEmail: string
  investorName: string
  createdAt: Date
  lastMessageAt: Date
}

export interface DmMessage {
  id: number
  conversationId: number
  senderEmail: string
  body: string
  createdAt: Date
  /** 상대가 읽은 시각. 비실시간 폴링 기반 읽음 처리. */
  readAt: Date | null
}

export type ForbiddenTermScope = 'all' | 'discussion' | 'message'

export interface CommunityForbiddenTerm {
  id: number
  term: string
  normalizedTerm: string
  scope: ForbiddenTermScope
  enabled: boolean
  reason?: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CommunityState {
  threads: DiscussionThread[]
  comments: DiscussionComment[]
  attachments: CommunityAttachment[]
  conversations: DmConversation[]
  messages: DmMessage[]
  forbiddenTerms: CommunityForbiddenTerm[]
  nextThreadId: number
  nextCommentId: number
  nextAttachmentId: number
  nextConversationId: number
  nextMessageId: number
  nextForbiddenTermId: number
}

export function createEmptyCommunityState(): CommunityState {
  return {
    threads: [],
    comments: [],
    attachments: [],
    conversations: [],
    messages: [],
    forbiddenTerms: [],
    nextThreadId: 1,
    nextCommentId: 1,
    nextAttachmentId: 1,
    nextConversationId: 1,
    nextMessageId: 1,
    nextForbiddenTermId: 1,
  }
}

interface SerializedThread extends Omit<DiscussionThread, 'createdAt' | 'lastActivityAt'> {
  createdAt: string
  lastActivityAt: string
}

interface SerializedComment extends Omit<DiscussionComment, 'createdAt'> {
  createdAt: string
}

interface SerializedAttachment extends Omit<CommunityAttachment, 'createdAt'> {
  createdAt: string
}

interface SerializedConversation extends Omit<DmConversation, 'createdAt' | 'lastMessageAt'> {
  createdAt: string
  lastMessageAt: string
}

interface SerializedMessage extends Omit<DmMessage, 'createdAt' | 'readAt'> {
  createdAt: string
  readAt: string | null
}

interface SerializedForbiddenTerm extends Omit<CommunityForbiddenTerm, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
}

export interface SerializedCommunityState extends Omit<
  CommunityState,
  'threads' | 'comments' | 'attachments' | 'conversations' | 'messages' | 'forbiddenTerms'
> {
  threads: SerializedThread[]
  comments: SerializedComment[]
  attachments: SerializedAttachment[]
  conversations: SerializedConversation[]
  messages: SerializedMessage[]
  forbiddenTerms: SerializedForbiddenTerm[]
}

export function serializeCommunityState(state: CommunityState): SerializedCommunityState {
  return {
    ...state,
    threads: state.threads.map((thread) => ({
      ...thread,
      createdAt: thread.createdAt.toISOString(),
      lastActivityAt: thread.lastActivityAt.toISOString(),
    })),
    comments: state.comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    })),
    attachments: state.attachments.map((attachment) => ({
      ...attachment,
      createdAt: attachment.createdAt.toISOString(),
    })),
    conversations: state.conversations.map((conversation) => ({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
    })),
    messages: state.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt ? message.readAt.toISOString() : null,
    })),
    forbiddenTerms: state.forbiddenTerms.map((term) => ({
      ...term,
      createdAt: term.createdAt.toISOString(),
      updatedAt: term.updatedAt.toISOString(),
    })),
  }
}

export function deserializeCommunityState(state: SerializedCommunityState): CommunityState {
  return {
    threads: Array.isArray(state.threads)
      ? state.threads.map((thread) => ({
          ...thread,
          status: thread.status ?? 'visible',
          hiddenBy: thread.hiddenBy ?? null,
          moderationNote: thread.moderationNote ?? null,
          createdAt: new Date(thread.createdAt),
          lastActivityAt: new Date(thread.lastActivityAt ?? thread.createdAt),
        }))
      : [],
    comments: Array.isArray(state.comments)
      ? state.comments.map((comment) => ({
          ...comment,
          parentId: comment.parentId ?? null,
          status: comment.status ?? 'visible',
          createdAt: new Date(comment.createdAt),
        }))
      : [],
    attachments: Array.isArray(state.attachments)
      ? state.attachments.map((attachment) => ({
          ...attachment,
          removedBy: attachment.removedBy ?? null,
          createdAt: new Date(attachment.createdAt),
        }))
      : [],
    conversations: Array.isArray(state.conversations)
      ? state.conversations.map((conversation) => ({
          ...conversation,
          createdAt: new Date(conversation.createdAt),
          lastMessageAt: new Date(conversation.lastMessageAt ?? conversation.createdAt),
        }))
      : [],
    messages: Array.isArray(state.messages)
      ? state.messages.map((message) => ({
          ...message,
          createdAt: new Date(message.createdAt),
          readAt: message.readAt ? new Date(message.readAt) : null,
        }))
      : [],
    forbiddenTerms: Array.isArray(state.forbiddenTerms)
      ? state.forbiddenTerms.map((term) => ({
          ...term,
          normalizedTerm: term.normalizedTerm || normalizeForbiddenTerm(term.term),
          scope: normalizeForbiddenTermScope(term.scope),
          enabled: term.enabled !== false,
          reason: term.reason ?? null,
          createdAt: new Date(term.createdAt),
          updatedAt: new Date(term.updatedAt ?? term.createdAt),
        }))
      : [],
    nextThreadId: Number.isInteger(state.nextThreadId) ? state.nextThreadId : 1,
    nextCommentId: Number.isInteger(state.nextCommentId) ? state.nextCommentId : 1,
    nextAttachmentId: Number.isInteger(state.nextAttachmentId) ? state.nextAttachmentId : 1,
    nextConversationId: Number.isInteger(state.nextConversationId) ? state.nextConversationId : 1,
    nextMessageId: Number.isInteger(state.nextMessageId) ? state.nextMessageId : 1,
    nextForbiddenTermId: Number.isInteger(state.nextForbiddenTermId)
      ? state.nextForbiddenTermId
      : 1,
  }
}

export function normalizeForbiddenTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeForbiddenTermScope(scope: unknown): ForbiddenTermScope {
  return scope === 'discussion' || scope === 'message' ? scope : 'all'
}

import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { ProjectsService } from '../projects/projects.service'
import { CommunityService } from './community.service'
import { CreateDiscussionDto } from './dto/create-discussion.dto'
import { CreateDiscussionCommentDto } from './dto/create-discussion-comment.dto'
import { ModerateDiscussionDto } from './dto/moderate-discussion.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { CreateForbiddenTermDto } from './dto/create-forbidden-term.dto'
import { UpdateForbiddenTermDto } from './dto/update-forbidden-term.dto'

/**
 * 커뮤니티 컨트롤러 — 프로젝트별 토론 스레드(목록/생성/상세), 1단 댓글·답글, 이미지 첨부,
 * 1:1 쪽지(메이커↔관심 회원). 세션 검증은 ProjectsService 의 쿠키 세션 규약을 그대로 쓴다.
 */
@Controller('api/community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly projectsService: ProjectsService
  ) {}

  /** GET /api/community/projects/:projectId/discussions — 공개 토론 목록(숨김 제외). */
  @Get('projects/:projectId/discussions')
  listDiscussions(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.communityService.listThreads(projectId)
  }

  /** POST /api/community/projects/:projectId/discussions — 로그인 회원의 토론 생성. */
  @Post('projects/:projectId/discussions')
  createDiscussion(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() request: Request,
    @Body() body: CreateDiscussionDto
  ) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.communityService.createThread(projectId, session, body)
  }

  /** GET /api/community/projects/:projectId/discussions/:threadId — 토론 상세(+댓글/첨부). */
  @Get('projects/:projectId/discussions/:threadId')
  getDiscussion(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('threadId', ParseIntPipe) threadId: number,
    @Req() request: Request
  ) {
    const viewer = this.projectsService.getSessionFromCookie(request.headers.cookie)
    return this.communityService.getThreadDetail(projectId, threadId, viewer)
  }

  /** POST .../discussions/:threadId/delete — 작성자 본인 스레드 숨김(소프트 삭제). */
  @Post('discussions/:threadId/delete')
  deleteOwnDiscussion(@Param('threadId', ParseIntPipe) threadId: number, @Req() request: Request) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.communityService.hideOwnThread(threadId, session)
  }

  /** POST .../discussions/:threadId/comments — 댓글 또는 1단 답글(parentId) 등록. */
  @Post('discussions/:threadId/comments')
  addComment(
    @Param('threadId', ParseIntPipe) threadId: number,
    @Req() request: Request,
    @Body() body: CreateDiscussionCommentDto
  ) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.communityService.addComment(threadId, session, body)
  }

  /** POST .../comments/:commentId/delete — 작성자/운영자 삭제(플레이스홀더 보존). */
  @Post('discussions/:threadId/comments/:commentId/delete')
  deleteComment(
    @Param('threadId', ParseIntPipe) threadId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() request: Request
  ) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.communityService.deleteComment(threadId, commentId, session)
  }

  // ───────────────────────── 운영자 ─────────────────────────

  /** GET /api/community/admin/discussions — 전체 토론(숨김 포함) 모더레이션 큐. */
  @Get('admin/discussions')
  listAdminDiscussions(@Req() request: Request) {
    this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.listAdminThreads()
  }

  /** POST /api/community/admin/discussions/:threadId/moderate — 숨김/복구/삭제. */
  @Post('admin/discussions/:threadId/moderate')
  moderateDiscussion(
    @Param('threadId', ParseIntPipe) threadId: number,
    @Req() request: Request,
    @Body() body: ModerateDiscussionDto
  ) {
    const admin = this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.moderateThread(threadId, body.action, admin, body.note)
  }

  /** GET /api/community/admin/attachments — 제거되지 않은 첨부 목록(최신순 상한). */
  @Get('admin/attachments')
  listAdminAttachments(@Req() request: Request, @Query('limit') limit?: string) {
    this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.listAdminAttachments(limit ? Number.parseInt(limit, 10) : 60)
  }

  /** GET /api/community/admin/forbidden-terms — 커뮤니티/쪽지 입력 금칙어 목록. */
  @Get('admin/forbidden-terms')
  listForbiddenTerms(@Req() request: Request) {
    this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.listForbiddenTerms()
  }

  /** POST /api/community/admin/forbidden-terms — 금칙어 추가. */
  @Post('admin/forbidden-terms')
  createForbiddenTerm(@Req() request: Request, @Body() body: CreateForbiddenTermDto) {
    const admin = this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.createForbiddenTerm(admin, body)
  }

  /** POST /api/community/admin/forbidden-terms/:termId — 금칙어 수정/활성 전환. */
  @Post('admin/forbidden-terms/:termId')
  updateForbiddenTerm(
    @Param('termId', ParseIntPipe) termId: number,
    @Req() request: Request,
    @Body() body: UpdateForbiddenTermDto
  ) {
    const admin = this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.updateForbiddenTerm(termId, admin, body)
  }

  /** POST /api/community/admin/forbidden-terms/:termId/delete — 금칙어 삭제. */
  @Post('admin/forbidden-terms/:termId/delete')
  deleteForbiddenTerm(@Param('termId', ParseIntPipe) termId: number, @Req() request: Request) {
    this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.deleteForbiddenTerm(termId)
  }

  /** POST /api/community/admin/attachments/:attachmentId/remove — 첨부 제거(레코드 보존). */
  @Post('admin/attachments/:attachmentId/remove')
  removeAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Req() request: Request
  ) {
    const admin = this.projectsService.requireAdminSession(request.headers.cookie)
    return this.communityService.removeAttachment(attachmentId, admin)
  }

  // ───────────────────────── 쪽지 ─────────────────────────

  /** GET /api/community/messages/conversations — 내 대화 목록(미확인 수 포함). */
  @Get('messages/conversations')
  listConversations(@Req() request: Request) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.communityService.listConversations(session)
  }

  /** GET /api/community/messages/conversations/:conversationId — 대화 메시지(읽음 처리 포함). */
  @Get('messages/conversations/:conversationId')
  getConversation(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() request: Request
  ) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.communityService.getConversationMessages(conversationId, session)
  }

  /** POST /api/community/messages — 쪽지 전송(projectId=새 대화, conversationId=답장). */
  @Post('messages')
  sendMessage(@Req() request: Request, @Body() body: SendMessageDto) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.communityService.sendMessage(session, body)
  }
}

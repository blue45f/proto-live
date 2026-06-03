import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { Project } from './project.models'
import { ProjectsService, ProjectListPage } from './projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { ValidateUrlDto } from './dto/validate-url.dto'
import { CreateMatchProposalDto } from './dto/create-match-proposal.dto'
import { CreateProjectReviewDto } from './dto/create-project-review.dto'
import { LoginDto } from './dto/login.dto'
import { ModerateProjectReviewDto } from './dto/moderate-project-review.dto'
import { ReportProjectReviewDto } from './dto/report-project-review.dto'
import { RecordProjectEventDto } from './dto/record-project-event.dto'
import { GetProjectsQueryDto, ProjectQueryInput } from './dto/get-projects-query.dto'
import { AdminRevenueProjectionQueryDto } from './dto/admin-revenue-projection-query.dto'

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * POST /api/projects/auth/login
   * 서버가 계정 정보를 검증하고 httpOnly 세션 쿠키를 발급합니다.
   */
  @Post('auth/login')
  login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = this.projectsService.login(body)
    response.setHeader('Set-Cookie', result.cookie)
    return result.session
  }

  /**
   * GET /api/projects/auth/session
   * 현재 httpOnly 세션 쿠키에서 로그인 상태를 복원합니다.
   */
  @Get('auth/session')
  getSession(@Req() request: Request) {
    return this.projectsService.getSessionFromCookie(request.headers.cookie) ?? null
  }

  /**
   * POST /api/projects/auth/logout
   * 세션 쿠키를 만료시킵니다.
   */
  @Post('auth/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', this.projectsService.createLogoutCookie())
    return { success: true }
  }

  /**
   * GET /api/projects
   * 등록된 전체 프로젝트 목록을 반환합니다.
   */
  @Get()
  async getProjects(@Query() query: GetProjectsQueryDto): Promise<Project[] | ProjectListPage> {
    const normalized = normalizeProjectQuery(query)

    if (normalized.page !== undefined || normalized.limit !== undefined) {
      return this.projectsService.getProjectList(normalized)
    }

    return this.projectsService.getAllProjects(normalized)
  }

  /**
   * GET /api/projects/config
   * 프론트엔드 선택지와 도메인 설정을 API 기반으로 공급합니다.
   */
  @Get('config')
  getMarketConfig() {
    return this.projectsService.getMarketConfig()
  }

  /**
   * GET /api/projects/stats
   * 등록 데이터에서 실시간 마켓 지표를 계산합니다.
   */
  @Get('stats')
  getMarketStats() {
    return this.projectsService.getMarketStats()
  }

  /**
   * GET /api/projects/admin-dashboard
   * 관리자 화면에서 사용할 고급 펀널/프로젝트 성과 지표를 반환합니다.
   */
  @Get('admin-dashboard')
  getAdminDashboard(@Req() request: Request) {
    this.projectsService.requireAdminSession(request.headers.cookie)
    return this.projectsService.getAdminDashboard()
  }

  /**
   * GET /api/projects/admin-revenue-projection
   * 수익 가정값을 반영한 월간/연간 시뮬레이션과 KPI 시그널을 반환합니다.
   */
  @Get('admin-revenue-projection')
  getAdminRevenueProjection(
    @Req() request: Request,
    @Query() query: AdminRevenueProjectionQueryDto
  ) {
    this.projectsService.requireAdminSession(request.headers.cookie)
    return this.projectsService.getAdminRevenueProjection(query)
  }

  /**
   * GET /api/projects/admin-reported-reviews
   * 신고 또는 숨김 처리된 커뮤니티 의견을 운영자 검토 큐로 반환합니다.
   */
  @Get('admin-reported-reviews')
  getAdminReportedReviews(@Req() request: Request) {
    const admin = this.projectsService.requireAdminSession(request.headers.cookie)
    return this.projectsService.getReportedProjectReviews(admin)
  }

  /**
   * GET /api/projects/admin-audit-logs
   * 운영 처리, 신고, 투자 관심 동의 기록을 최신순으로 반환합니다.
   */
  @Get('admin-audit-logs')
  getAdminAuditLogs(@Req() request: Request, @Query('limit') limit?: string) {
    const admin = this.projectsService.requireAdminSession(request.headers.cookie)
    return this.projectsService.getAdminAuditLogs(admin, limit ? Number.parseInt(limit, 10) : 30)
  }

  /**
   * POST /api/projects/refresh
   * 등록된 프로젝트의 라이브 URL 상태를 다시 확인합니다.
   */
  @Post('refresh')
  async refreshProjects(@Req() request: Request): Promise<Project[]> {
    this.projectsService.requireAdminSession(request.headers.cookie)
    return this.projectsService.refreshAllProjects()
  }

  /**
   * GET /api/projects/:id
   * ID로 단일 프로젝트를 조회합니다. 존재하지 않으면 404를 반환합니다.
   */
  @Get(':id')
  async getProjectById(@Param('id', ParseIntPipe) id: number): Promise<Project> {
    return this.projectsService.getProjectById(id)
  }

  /**
   * GET /api/projects/:id/events
   * 프로젝트별 관심 신호와 검증 이력을 반환합니다.
   */
  @Get(':id/events')
  getProjectEvents(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectEvents(id)
  }

  /**
   * GET /api/projects/:id/reviews
   * 로그인 회원이 남긴 평가, 리뷰, 성장 지원 의견과 대댓글을 반환합니다.
   */
  @Get(':id/reviews')
  getProjectReviews(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectReviews(id)
  }

  /**
   * POST /api/projects/validate
   * 프로젝트 제출 전 URL 유효성을 사전 검증합니다.
   */
  @Post('validate')
  async validateUrl(@Body() body: ValidateUrlDto) {
    return this.projectsService.validateUrl(body.url)
  }

  /**
   * POST /api/projects
   * 새로운 사용자/메이커를 필요 시 생성하고 프로젝트를 등록합니다.
   */
  @Post()
  async createProject(@Req() request: Request, @Body() body: CreateProjectDto): Promise<Project> {
    const session = this.projectsService.requireRoleSession(
      request.headers.cookie,
      ['maker'],
      '창업자 계정으로 로그인해야 사이트를 등록할 수 있습니다.'
    )
    return this.projectsService.createProject({ ...body, email: session.email })
  }

  /**
   * POST /api/projects/:id/refresh
   * 단일 프로젝트의 라이브 상태를 갱신합니다.
   */
  @Post(':id/refresh')
  async refreshProject(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request
  ): Promise<Project> {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.projectsService.refreshProjectForSession(id, session)
  }

  /**
   * POST /api/projects/:id/events
   * 프리뷰/외부 열기 등 투자자 관심 신호를 기록합니다.
   */
  @Post(':id/events')
  recordProjectEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RecordProjectEventDto
  ): Project {
    return this.projectsService.recordProjectEvent(id, body.type)
  }

  /**
   * POST /api/projects/:id/reviews
   * 로그인 회원의 평가/리뷰/성장지원 의견 또는 대댓글을 저장합니다.
   */
  @Post(':id/reviews')
  createProjectReview(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
    @Body() body: CreateProjectReviewDto
  ) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    const role = session.role === 'admin' ? 'member' : session.role
    return this.projectsService.createProjectReview(id, { ...body, email: session.email, role })
  }

  /**
   * POST /api/projects/:id/reviews/:reviewId/report
   * 커뮤니티 의견을 신고하고 자동 숨김 기준을 적용합니다.
   */
  @Post(':id/reviews/:reviewId/report')
  reportProjectReview(
    @Param('id', ParseIntPipe) id: number,
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Req() request: Request,
    @Body() body: ReportProjectReviewDto
  ) {
    const session = this.projectsService.requireSession(request.headers.cookie)
    return this.projectsService.reportProjectReview(id, reviewId, { ...body, email: session.email })
  }

  /**
   * POST /api/projects/:id/reviews/:reviewId/moderate
   * 운영자가 신고 의견을 유지, 숨김, 복구 처리합니다.
   */
  @Post(':id/reviews/:reviewId/moderate')
  moderateProjectReview(
    @Param('id', ParseIntPipe) id: number,
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Req() request: Request,
    @Body() body: ModerateProjectReviewDto
  ) {
    const admin = this.projectsService.requireAdminSession(request.headers.cookie)
    return this.projectsService.moderateProjectReview(id, reviewId, body, admin)
  }

  /**
   * POST /api/projects/:id/match
   * 투자자 의향서를 기록하고 프로젝트 매칭 지표를 갱신합니다.
   */
  @Post(':id/match')
  async createMatchProposal(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
    @Body() body: CreateMatchProposalDto
  ): Promise<Project> {
    const session = this.projectsService.requireRoleSession(
      request.headers.cookie,
      ['investor'],
      '투자자 계정으로 로그인해야 투자 관심을 기록할 수 있습니다.'
    )
    return this.projectsService.createMatchProposal(id, { ...body, email: session.email })
  }

  /**
   * POST /api/projects/:id/invest
   * 명시적 고지/동의 없는 레거시 투자 카운터 엔드포인트를 차단합니다.
   */
  @Post(':id/invest')
  async investInProject(@Param('id', ParseIntPipe) id: number): Promise<Project> {
    void id
    throw new BadRequestException(
      '투자 관심은 필수 고지와 개인정보 연락 동의를 포함하는 /api/projects/:id/match API로만 기록할 수 있습니다.'
    )
  }
}

function normalizeProjectQuery(query: GetProjectsQueryDto): ProjectQueryInput {
  return {
    category: query.category,
    accessMode: query.accessMode,
    q: query.q,
    tag: query.tag,
    minSignal: query.minSignal,
    minFundingAmount: query.minFundingAmount,
    maxFundingAmount: query.maxFundingAmount,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
    onlyVerified: query.onlyVerified === 'true',
  }
}

import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Project } from './project.models';
import { ProjectsService, ProjectListPage } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ValidateUrlDto } from './dto/validate-url.dto';
import { CreateMatchProposalDto } from './dto/create-match-proposal.dto';
import { RecordProjectEventDto } from './dto/record-project-event.dto';
import { GetProjectsQueryDto, ProjectQueryInput } from './dto/get-projects-query.dto';
import { AdminRevenueProjectionQueryDto } from './dto/admin-revenue-projection-query.dto';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * GET /api/projects
   * 등록된 전체 프로젝트 목록을 반환합니다.
   */
  @Get()
  async getProjects(
    @Query() query: GetProjectsQueryDto,
  ): Promise<Project[] | ProjectListPage> {
    const normalized = normalizeProjectQuery(query);

    if (normalized.page !== undefined || normalized.limit !== undefined) {
      return this.projectsService.getProjectList(normalized);
    }

    return this.projectsService.getAllProjects(normalized);
  }

  /**
   * GET /api/projects/config
   * 프론트엔드 선택지와 도메인 설정을 API 기반으로 공급합니다.
   */
  @Get('config')
  getMarketConfig() {
    return this.projectsService.getMarketConfig();
  }

  /**
   * GET /api/projects/stats
   * 등록 데이터에서 실시간 마켓 지표를 계산합니다.
   */
  @Get('stats')
  getMarketStats() {
    return this.projectsService.getMarketStats();
  }

  /**
   * GET /api/projects/admin-dashboard
   * 관리자 화면에서 사용할 고급 펀널/프로젝트 성과 지표를 반환합니다.
   */
  @Get('admin-dashboard')
  getAdminDashboard() {
    return this.projectsService.getAdminDashboard();
  }

  /**
   * GET /api/projects/admin-revenue-projection
   * 수익 가정값을 반영한 월간/연간 시뮬레이션과 KPI 시그널을 반환합니다.
   */
  @Get('admin-revenue-projection')
  getAdminRevenueProjection(@Query() query: AdminRevenueProjectionQueryDto) {
    return this.projectsService.getAdminRevenueProjection(query);
  }

  /**
   * POST /api/projects/refresh
   * 등록된 프로젝트의 라이브 URL 상태를 다시 확인합니다.
   */
  @Post('refresh')
  async refreshProjects(): Promise<Project[]> {
    return this.projectsService.refreshAllProjects();
  }

  /**
   * GET /api/projects/:id
   * ID로 단일 프로젝트를 조회합니다. 존재하지 않으면 404를 반환합니다.
   */
  @Get(':id')
  async getProjectById(@Param('id', ParseIntPipe) id: number): Promise<Project> {
    return this.projectsService.getProjectById(id);
  }

  /**
   * GET /api/projects/:id/events
   * 프로젝트별 관심 신호와 검증 이력을 반환합니다.
   */
  @Get(':id/events')
  getProjectEvents(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectEvents(id);
  }

  /**
   * POST /api/projects/validate
   * 프로젝트 제출 전 URL 유효성을 사전 검증합니다.
   */
  @Post('validate')
  async validateUrl(@Body() body: ValidateUrlDto) {
    return this.projectsService.validateUrl(body.url);
  }

  /**
   * POST /api/projects
   * 새로운 사용자/메이커를 필요 시 생성하고 프로젝트를 등록합니다.
   */
  @Post()
  async createProject(@Body() body: CreateProjectDto): Promise<Project> {
    return this.projectsService.createProject(body);
  }

  /**
   * POST /api/projects/:id/refresh
   * 단일 프로젝트의 라이브 상태를 갱신합니다.
   */
  @Post(':id/refresh')
  async refreshProject(@Param('id', ParseIntPipe) id: number): Promise<Project> {
    return this.projectsService.refreshProject(id);
  }

  /**
   * POST /api/projects/:id/events
   * 프리뷰/외부 열기 등 투자자 관심 신호를 기록합니다.
   */
  @Post(':id/events')
  recordProjectEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RecordProjectEventDto,
  ): Project {
    return this.projectsService.recordProjectEvent(id, body.type);
  }

  /**
   * POST /api/projects/:id/match
   * 투자자 의향서를 기록하고 프로젝트 매칭 지표를 갱신합니다.
   */
  @Post(':id/match')
  async createMatchProposal(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateMatchProposalDto,
  ): Promise<Project> {
    return this.projectsService.createMatchProposal(id, body);
  }

  /**
   * POST /api/projects/:id/invest
   * 프로젝트의 투자자 수를 증가시키고 업데이트된 프로젝트를 반환합니다.
   */
  @Post(':id/invest')
  async investInProject(@Param('id', ParseIntPipe) id: number): Promise<Project> {
    return this.projectsService.investInProject(id);
  }
}

function normalizeProjectQuery(query: GetProjectsQueryDto): ProjectQueryInput {
  return {
    category: query.category,
    accessMode: query.accessMode,
    q: query.q,
    minSignal: query.minSignal,
    minFundingAmount: query.minFundingAmount,
    maxFundingAmount: query.maxFundingAmount,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
    onlyVerified: query.onlyVerified === 'true',
  };
}

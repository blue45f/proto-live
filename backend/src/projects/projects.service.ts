import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import {
  FUNDING_RANGES,
  PROJECT_ACCESS_MODES,
  ProjectAccessMode,
  PROJECT_CATEGORIES,
  ProjectCategory,
} from './project.constants';
import { ProjectQueryInput, ProjectSortKey } from './dto/get-projects-query.dto';
import {
  MatchProposal,
  Project,
  ProjectEvent,
  ProjectEventType,
  ProjectsState,
  User,
  ValidationSnapshot,
} from './project.models';
import { CreateMatchProposalDto } from './dto/create-match-proposal.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { calculateProjectSignalScore, summarizeProjectEvents } from './project-signals';
import { JsonProjectsStore } from './projects.store';
import {
  assertResolvesToPublicInternet,
  normalizePublicHttpUrl,
  resolveRedirectUrl,
} from './url-security';

export interface ProjectListPage {
  data: Project[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private readonly store = new JsonProjectsStore();
  private users: User[];
  private projects: Project[];
  private proposals: MatchProposal[];
  private events: ProjectEvent[];
  private nextUserId: number;
  private nextProjectId: number;
  private nextProposalId: number;
  private nextEventId: number;

  constructor() {
    const state = this.store.read();
    this.users = state.users;
    this.projects = state.projects;
    this.proposals = state.proposals;
    this.events = state.events;
    this.nextUserId = state.nextUserId;
    this.nextProjectId = state.nextProjectId;
    this.nextProposalId = state.nextProposalId;
    this.nextEventId = state.nextEventId;
  }

  getMarketConfig() {
    return {
      categories: PROJECT_CATEGORIES,
      accessModes: PROJECT_ACCESS_MODES,
      fundingRanges: FUNDING_RANGES,
      refreshIntervalMs: 30000,
      benchmarkSignals: [
        'live_demo_required',
        'verification_telemetry',
        'investor_intent_capture',
        'real_attention_scoring',
      ],
    };
  }

  getMarketStats() {
    const totalProjects = this.projects.length;
    const verifiedProjects = this.projects.filter((project) => project.validation.success).length;
    const totalCommittedAmount = this.projects.reduce(
      (sum, project) => sum + project.committedAmountMax,
      0,
    );
    const totalInvestors = this.projects.reduce((sum, project) => sum + project.investorCount, 0);
    const checkedProjects = this.projects.filter((project) => project.validation.responseTimeMs);
    const averageResponseMs =
      checkedProjects.length === 0
        ? null
        : Math.round(
            checkedProjects.reduce(
              (sum, project) => sum + (project.validation.responseTimeMs ?? 0),
              0,
            ) / checkedProjects.length,
          );

    const categoryBreakdown = PROJECT_CATEGORIES.map((category) => ({
      category,
      count: this.projects.filter((project) => project.category === category).length,
    })).filter((item) => item.count > 0);
    const topSignals = this.projects
      .map((project) => this.hydrateProject(project))
      .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
      .slice(0, 3)
      .map((project) => ({
        id: project.id,
        title: project.title,
        category: project.category,
        signalScore: project.signalScore ?? 0,
        latestEventAt: project.eventSummary?.latestAt ?? null,
      }));

    return {
      totalProjects,
      verifiedProjects,
      verificationRate: totalProjects === 0 ? 0 : Math.round((verifiedProjects / totalProjects) * 100),
      totalCommittedAmount,
      totalInvestors,
      averageResponseMs,
      categoryBreakdown,
      totalSignals: this.events.length,
      topSignals,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * URL 유효성 검사 - 공인망 HTTP/HTTPS URL만 실제 네트워크 요청으로 검증합니다.
   */
  async validateUrl(url: string): Promise<ValidationSnapshot> {
    const checkedAt = new Date().toISOString();

    if (!url) {
      throw new BadRequestException('URL을 입력해주세요.');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = normalizePublicHttpUrl(url);
      await assertResolvesToPublicInternet(parsedUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'URL validation failed.';
      return {
        success: false,
        checkedAt,
        message,
      };
    }

    const startedAt = Date.now();
    this.logger.log(`Validating live URL: ${parsedUrl.href}`);

    try {
      const result = await this.probePublicUrl(parsedUrl);
      return {
        ...result,
        checkedAt,
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect to the server.';
      this.logger.warn(`URL validation failed for ${parsedUrl.href}: ${message}`);
      return {
        success: false,
        checkedAt,
        responseTimeMs: Date.now() - startedAt,
        message,
      };
    }
  }

  async getAllProjects(query: ProjectQueryInput = {}): Promise<Project[]> {
    const result = this.buildFilteredProjects(query);
    const { sort } = query;

    return this.applySort(result, sort ?? 'signal');
  }

  async getProjectList(query: ProjectQueryInput = {}): Promise<ProjectListPage> {
    const page = Math.max(1, query.page ?? 1);
    const defaultLimit = this.projects.length > 0 ? Math.min(this.projects.length, 100) : 12;
    const limit = Math.max(1, Math.min(100, query.limit ?? defaultLimit));

    const filtered = await this.getAllProjects(query);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const end = start + limit;

    return {
      data: filtered.slice(start, end),
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    };
  }

  private buildFilteredProjects(query: ProjectQueryInput): Project[] {
    const searchText = (query.q ?? '').trim().toLowerCase();
    const minSignal = query.minSignal;
    const minFundingAmount = query.minFundingAmount;
    const maxFundingAmount = query.maxFundingAmount;

    return this.projects
      .filter((project) => {
        if (query.category && project.category !== query.category) {
          return false;
        }

        if (query.accessMode && project.accessMode !== query.accessMode) {
          return false;
        }

        if (query.onlyVerified && !project.validation.success) {
          return false;
        }

        if (minFundingAmount !== undefined && project.committedAmountMax < minFundingAmount) {
          return false;
        }

        if (maxFundingAmount !== undefined && project.committedAmountMin > maxFundingAmount) {
          return false;
        }

        if (searchText.length > 0) {
          const payload = [
            project.title,
            project.description,
            project.category,
            project.liveUrl,
          ]
            .join(' ')
            .toLowerCase();

          if (!payload.includes(searchText)) {
            return false;
          }
        }

        return true;
      })
      .map((project) => this.hydrateProject(project))
      .filter((project) => {
        if (minSignal === undefined) {
          return true;
        }

        const score = project.signalScore ?? 0;
        return score >= minSignal;
      });
  }

  private applySort(projects: Project[], sortBy: ProjectSortKey): Project[] {
    return [...projects].sort((a, b) => {
      if (sortBy === 'recent') {
        const aTime = a.eventSummary?.latestAt ? new Date(a.eventSummary.latestAt).getTime() : 0;
        const bTime = b.eventSummary?.latestAt ? new Date(b.eventSummary.latestAt).getTime() : 0;
        const diff = bTime - aTime;
        if (diff !== 0) return diff;
      }

      if (sortBy === 'created') {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (diff !== 0) return diff;
      }

      if (sortBy === 'funding') {
        const diff = b.committedAmountMax - a.committedAmountMax;
        if (diff !== 0) return diff;
      }

      const scoreDiff = (b.signalScore ?? 0) - (a.signalScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getProjectById(id: number): Promise<Project> {
    return this.hydrateProject(this.findProject(id));
  }

  getProjectEvents(id: number): ProjectEvent[] {
    this.findProject(id);
    return this.events
      .filter((event) => event.projectId === id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async refreshProject(id: number): Promise<Project> {
    const project = this.findProject(id);
    project.validation = await this.validateUrl(project.liveUrl);
    this.addProjectEvent(id, 'refresh');
    this.persist();
    return this.hydrateProject(project);
  }

  async refreshAllProjects(): Promise<Project[]> {
    for (const project of this.projects) {
      project.validation = await this.validateUrl(project.liveUrl);
      this.addProjectEvent(project.id, 'refresh');
    }
    this.persist();
    return this.getAllProjects();
  }

  async createProject(data: CreateProjectDto): Promise<Project> {
    const { email, title, description, liveUrl, category, accessMode, protectionNoticeAccepted, thumbnail } = data;

    if (!PROJECT_CATEGORIES.includes(category as ProjectCategory)) {
      throw new BadRequestException('유효한 카테고리를 선택해주세요.');
    }

    if (!PROJECT_ACCESS_MODES.some((mode) => mode.id === accessMode)) {
      throw new BadRequestException('유효한 공개 범위를 선택해주세요.');
    }

    if (protectionNoticeAccepted !== true) {
      throw new BadRequestException('상용화 전 서비스 노출 위험과 제출 권한 안내를 확인해야 등록할 수 있습니다.');
    }

    const verification = await this.validateUrl(liveUrl);
    if (!verification.success) {
      throw new BadRequestException(`Live URL validation failed: ${verification.message}`);
    }

    const user = this.upsertMaker(email);
    const newProject: Project = {
      id: this.nextProjectId++,
      userId: user.id,
      title: title.trim(),
      description: description.trim(),
      liveUrl: normalizePublicHttpUrl(liveUrl).href,
      category: category as ProjectCategory,
      accessMode: accessMode as ProjectAccessMode,
      protectionNoticeAccepted,
      thumbnail: thumbnail ?? null,
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: verification,
      createdAt: new Date(),
    };

    this.projects.push(newProject);
    this.addProjectEvent(newProject.id, 'create');
    this.persist();
    this.logger.log(`Registered project "${newProject.title}" for maker ${user.id}`);

    return this.hydrateProject(newProject);
  }

  async createMatchProposal(id: number, data: CreateMatchProposalDto): Promise<Project> {
    const project = this.findProject(id);
    const fundingRange = FUNDING_RANGES.find((range) => range.id === data.fundingRangeId);
    if (!fundingRange) {
      throw new BadRequestException('유효한 투자 구간을 선택해주세요.');
    }

    this.proposals.push({
      id: this.nextProposalId++,
      projectId: id,
      fundingRangeId: fundingRange.id,
      message: data.message.trim(),
      createdAt: new Date(),
    });

    project.investorCount += 1;
    project.matchCount += 1;
    project.committedAmountMin += fundingRange.minAmount;
    project.committedAmountMax += fundingRange.maxAmount;

    this.addProjectEvent(id, 'match');
    this.persist();
    this.logger.log(`Match proposal recorded for project ${id}`);
    return this.hydrateProject(project);
  }

  recordProjectEvent(id: number, type: ProjectEventType): Project {
    if (type === 'create' || type === 'match') {
      throw new BadRequestException('해당 이벤트 타입은 내부 액션에서만 기록할 수 있습니다.');
    }

    const project = this.findProject(id);
    const hasApprovedAccess = project.accessMode === 'open' || project.matchCount > 0;
    if (project.accessMode === 'screened' && (type === 'preview' || type === 'outbound') && !hasApprovedAccess) {
      throw new BadRequestException('선별 공개 프로젝트는 매칭 요청 뒤 URL을 공유할 수 있습니다.');
    }

    this.addProjectEvent(id, type);
    this.persist();
    return this.hydrateProject(project);
  }

  async investInProject(id: number): Promise<Project> {
    return this.createMatchProposal(id, {
      fundingRangeId: 'seed-50-100',
      message: 'Legacy investor interest endpoint.',
    });
  }

  private findProject(id: number): Project {
    const project = this.projects.find((item) => item.id === id);
    if (!project) {
      throw new NotFoundException(`ID ${id}에 해당하는 프로젝트를 찾을 수 없습니다.`);
    }
    return project;
  }

  private upsertMaker(email: string): User {
    const normalizedEmail = email.trim().toLowerCase();
    let user = this.users.find((item) => item.email === normalizedEmail);
    if (!user) {
      user = {
        id: this.nextUserId++,
        email: normalizedEmail,
        role: 'maker',
      };
      this.users.push(user);
    }

    user.role = 'maker';
    return user;
  }

  private persist(): void {
    const state: ProjectsState = {
      users: this.users,
      projects: this.projects,
      proposals: this.proposals,
      events: this.events,
      nextUserId: this.nextUserId,
      nextProjectId: this.nextProjectId,
      nextProposalId: this.nextProposalId,
      nextEventId: this.nextEventId,
    };

    this.store.write(state);
  }

  private addProjectEvent(projectId: number, type: ProjectEventType): ProjectEvent {
    const event: ProjectEvent = {
      id: this.nextEventId++,
      projectId,
      type,
      createdAt: new Date(),
    };
    this.events.push(event);
    return event;
  }

  private hydrateProject(project: Project): Project {
    const events = this.events.filter((event) => event.projectId === project.id);
    const accessMode = project.accessMode ?? 'open';
    const displayUrl = accessMode === 'screened' ? this.redactUrl(project.liveUrl) : project.liveUrl;
    const displayFinalUrl =
      accessMode === 'screened' && project.validation.finalUrl
        ? this.redactUrl(project.validation.finalUrl)
        : project.validation.finalUrl;

    return {
      ...project,
      accessMode,
      protectionNoticeAccepted: project.protectionNoticeAccepted ?? true,
      liveUrl: displayUrl,
      validation: {
        ...project.validation,
        finalUrl: displayFinalUrl,
      },
      signalScore: calculateProjectSignalScore(project, events),
      eventSummary: summarizeProjectEvents(events),
    };
  }

  private redactUrl(value: string): string {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host}/protected-review`;
    } catch {
      return 'protected-review';
    }
  }

  private async probePublicUrl(initialUrl: URL): Promise<Omit<ValidationSnapshot, 'checkedAt'>> {
    let currentUrl = initialUrl;
    let response: AxiosResponse | null = null;

    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      await assertResolvesToPublicInternet(currentUrl);
      response = await this.requestUrl(currentUrl, 'HEAD');

      if (response.status === 403 || response.status === 405) {
        response = await this.requestUrl(currentUrl, 'GET');
      }

      if (response.status >= 300 && response.status < 400) {
        currentUrl = resolveRedirectUrl(currentUrl, response.headers.location);
        continue;
      }

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          status: response.status,
          finalUrl: currentUrl.href,
          message: `Successfully verified. Site is alive (HTTP ${response.status}).`,
        };
      }

      return {
        success: false,
        status: response.status,
        finalUrl: currentUrl.href,
        message: `Site returned HTTP ${response.status}. ProtoLive requires an active 2xx landing site.`,
      };
    }

    return {
      success: false,
      status: response?.status,
      finalUrl: currentUrl.href,
      message: 'Too many redirects while validating the live URL.',
    };
  }

  private async requestUrl(url: URL, method: 'HEAD' | 'GET'): Promise<AxiosResponse> {
    return axios.request({
      method,
      url: url.href,
      headers: {
        'User-Agent': 'ProtoLive-LinkVerifier/1.0 (+https://protolive.local)',
        Accept: method === 'HEAD' ? '*/*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Range: method === 'GET' ? 'bytes=0-65535' : undefined,
      },
      timeout: 6500,
      maxRedirects: 0,
      maxContentLength: 128 * 1024,
      maxBodyLength: 128 * 1024,
      validateStatus: () => true,
    });
  }
}

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
  AdminDashboardMetrics,
  AdminEventTrendPoint,
  AdminFunnelMetric,
  AdminRangeMetric,
  AdminActionRecommendation,
  AdminHealthIndicator,
  AdminTopProjectMetric,
  AdminRiskProject,
  AdminRevenueAssumption,
  AdminRevenueBenchmark,
  AdminRevenueProjection,
  AdminRevenueScenario,
  AdminRevenueTargetDriver,
  AdminRevenueTargetGap,
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
  private readonly defaultScenarioMultipliers = [0.75, 1, 1.25, 1.5];
  private readonly defaultMonthlyRevenueTarget = 2500000;
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

  getAdminRevenueProjection(
    overrides: Partial<AdminRevenueAssumption> & {
      scenarioMultipliers?: number[];
      targetMonthlyRevenue?: number;
    } = {},
  ): AdminRevenueProjection {
    const totalProjects = this.projects.length;
    const verifiedProjects = this.projects.filter((project) => project.validation.success).length;
    const totalInvestors = this.projects.reduce((sum, project) => sum + project.investorCount, 0);
    const totalCommittedAmount = this.projects.reduce((sum, project) => sum + project.committedAmountMax, 0);
    const conversionFunnel = this.buildAdminConversionFunnel();

    return this.computeRevenueProjection({
      totalProjects,
      totalInvestors,
      totalSignals: this.events.length,
      totalCommittedAmount,
      verifiedProjects,
      conversionFunnel,
      assumptions: {
        ...this.buildDefaultRevenueAssumptions(),
        ...overrides,
      },
      scenarioMultipliers: overrides.scenarioMultipliers,
      targetMonthlyRevenue: overrides.targetMonthlyRevenue,
    });
  }

  private buildDefaultRevenueAssumptions(): AdminRevenueAssumption {
    return {
      makerMonthlyFee: 25000,
      investorMonthlyFee: 19000,
      leadCaptureFee: 8000,
      makerConversionRate: 18,
      investorConversionRate: 14,
      closeLeadRate: 12,
      successFeeRate: 3.5,
      investorAcquisitionCost: 180000,
      makerAcquisitionCost: 280000,
      estimatedMonthlyChurnRate: 12,
    };
  }

  private computeRevenueProjection(params: {
    totalProjects: number;
    verifiedProjects: number;
    totalInvestors: number;
    totalSignals: number;
    totalCommittedAmount: number;
    conversionFunnel: AdminFunnelMetric;
    assumptions: AdminRevenueAssumption;
    scenarioMultipliers?: number[];
    targetMonthlyRevenue?: number;
  }): AdminRevenueProjection {
    const assumption = this.normalizeRevenueAssumptions(params.assumptions);
    const denominators = {
      project: Math.max(1, params.totalProjects),
      investor: Math.max(1, params.totalInvestors),
      signal: Math.max(1, params.totalSignals),
    };

    const verifiedProjectShare = params.verifiedProjects / Math.max(1, params.totalProjects);
    const averageCommittedPerInvestor =
      params.totalInvestors > 0
        ? Math.max(0, params.totalCommittedAmount / Math.max(1, params.totalInvestors))
        : 0;

    const makerMonthlyPlanConversionRate = assumption.makerConversionRate / 100;
    const investorMonthlyPlanConversionRate = assumption.investorConversionRate / 100;
    const leadCloseRate = assumption.closeLeadRate / 100;
    const transactionRate = assumption.successFeeRate / 100;

    const monthlyMakerPlanRevenue = Math.round(
      params.totalProjects * verifiedProjectShare * assumption.makerMonthlyFee * makerMonthlyPlanConversionRate,
    );

    const monthlyInvestorPlanRevenue = Math.round(
      params.totalInvestors * assumption.investorMonthlyFee * investorMonthlyPlanConversionRate,
    );
    const monthlyLeadRevenue = Math.round(params.totalSignals * assumption.leadCaptureFee);
    const projectedTransactionPool = params.totalInvestors * averageCommittedPerInvestor * leadCloseRate;
    const monthlyTransactionRevenue = Math.round(projectedTransactionPool * transactionRate);

    const totalMonthlyRevenue = Math.round(
      monthlyMakerPlanRevenue + monthlyInvestorPlanRevenue + monthlyLeadRevenue + monthlyTransactionRevenue,
    );
    const annualRevenue = totalMonthlyRevenue * 12;

    const arpu = totalMonthlyRevenue / denominators.project;
    const arppu = totalMonthlyRevenue / denominators.investor;
    const investorLtvMonths = this.estimateLtvMonths(assumption.estimatedMonthlyChurnRate);
    const investorLtvEstimate = Math.round((assumption.investorMonthlyFee * investorMonthlyPlanConversionRate + leadCloseRate * transactionRate * averageCommittedPerInvestor) * investorLtvMonths);
    const makerMonthlyLtv = assumption.makerMonthlyFee * makerMonthlyPlanConversionRate * verifiedProjectShare;
    const investorMonthlyLtv = assumption.investorMonthlyFee * investorMonthlyPlanConversionRate + leadCloseRate * transactionRate * averageCommittedPerInvestor;
    const makerPaybackMonths = this.estimatePaybackMonths(assumption.makerAcquisitionCost, makerMonthlyLtv);
    const investorPaybackMonths = this.estimatePaybackMonths(assumption.investorAcquisitionCost, investorMonthlyLtv);

    const benchmarkTargets = [
      {
        key: 'verifiedProjectShare',
        label: '검증 프로젝트 비중',
        actual: this.toPercent(verifiedProjectShare),
        target: 68,
        unit: 'percent' as const,
      },
      {
        key: 'previewToMatchRate',
        label: '프리뷰→매칭 전환',
        actual: params.conversionFunnel.previewToMatchRate,
        target: 12,
        unit: 'percent' as const,
      },
      {
        key: 'outboundToMatchRate',
        label: '아웃바운드→매칭 전환',
        actual: params.conversionFunnel.outboundToMatchRate,
        target: 18,
        unit: 'percent' as const,
      },
      {
        key: 'matchPerProjectRate',
        label: '프로젝트당 매칭율',
        actual: params.conversionFunnel.matchPerProjectRate,
        target: 30,
        unit: 'percent' as const,
      },
      {
        key: 'monthlyRevenue',
        label: '월 수익',
        actual: totalMonthlyRevenue,
        target: params.targetMonthlyRevenue ?? this.defaultMonthlyRevenueTarget,
        unit: 'currency' as const,
      },
      {
        key: 'arpu',
        label: 'ARPU',
        actual: arpu,
        target: 50000,
        unit: 'currency' as const,
      },
    ];

    const benchmarkGaps: AdminRevenueBenchmark[] = benchmarkTargets.map((entry) => {
      const gap = entry.actual - entry.target;
      const targetRatio = entry.target > 0 ? entry.actual / entry.target : 0;

      return {
        key: entry.key,
        label: entry.label,
        actual: this.roundMoney(entry.actual),
        target: this.roundMoney(entry.target),
        gap: this.roundMoney(gap),
        unit: entry.unit,
        status:
          targetRatio >= 1 ? 'good' : targetRatio >= 0.8 ? 'warning' : 'critical',
        comment: this.buildTargetGapComment({
          label: entry.label,
          gap,
          unit: entry.unit,
        }),
      };
    });

    const scenarios = this.buildRevenueScenarios({
      baseMonthlyRevenue: totalMonthlyRevenue,
      multipliers: this.resolveScenarioMultipliers(params.scenarioMultipliers),
    });

    const targetGap = this.buildRevenueTargetGap({
      targetMonthlyRevenue: params.targetMonthlyRevenue ?? this.defaultMonthlyRevenueTarget,
      totalMonthlyRevenue,
      totalProjects: params.totalProjects,
      totalInvestors: params.totalInvestors,
      totalSignals: params.totalSignals,
      averageCommittedPerInvestor,
      verifiedProjectShare,
      makerMonthlyFee: assumption.makerMonthlyFee,
      investorMonthlyFee: assumption.investorMonthlyFee,
      leadCaptureFee: assumption.leadCaptureFee,
      makerConversionRate: assumption.makerConversionRate,
      investorConversionRate: assumption.investorConversionRate,
      closeLeadRate: assumption.closeLeadRate,
      successFeeRate: assumption.successFeeRate,
    });

    return {
      assumptions: assumption,
      monthlyMakerPlanRevenue,
      monthlyInvestorPlanRevenue,
      monthlyLeadRevenue,
      monthlyTransactionRevenue,
      totalMonthlyRevenue,
      annualRevenue,
      verifiedProjectShare,
      averageCommittedPerInvestor: Math.round(averageCommittedPerInvestor),
      arpu: Math.round(arpu),
      arppu: Math.round(arppu),
      investorLtvEstimate: Math.round(investorLtvEstimate),
      makerPaybackMonths,
      investorPaybackMonths,
      benchmarkGaps,
      scenarios,
      targetGap,
    };
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

  getAdminDashboard(): AdminDashboardMetrics {
    const now = new Date();
    const eventTotals: Record<ProjectEventType, number> = {
      create: 0,
      preview: 0,
      outbound: 0,
      match: 0,
      refresh: 0,
    };

    const eventTrend14d = this.buildEventTrend(now);
    let previewCount = 0;
    let outboundCount = 0;
    let matchCount = 0;
    const eventsByProject = new Map<number, ProjectEvent[]>();

    for (const event of this.events) {
      const bucket = eventTotals[event.type];
      eventTotals[event.type] = bucket + 1;
      const projectEvents = eventsByProject.get(event.projectId);
      if (projectEvents) {
        projectEvents.push(event);
      } else {
        eventsByProject.set(event.projectId, [event]);
      }

      if (event.type === 'preview') {
        previewCount += 1;
      } else if (event.type === 'outbound') {
        outboundCount += 1;
      } else if (event.type === 'match') {
        matchCount += 1;
      }
    }

    const accessModeDistribution = [
      this.buildAccessModeMetric(this.projects.filter((project) => project.accessMode === 'open'), 'open'),
      this.buildAccessModeMetric(this.projects.filter((project) => project.accessMode === 'screened'), 'screened'),
    ];

    const rangeMetrics = this.buildProposalRangeDistribution();

    const totalProjects = this.projects.length;
    const verifiedProjects = this.projects.filter((project) => project.validation.success).length;
    const totalInvestors = this.projects.reduce((sum, project) => sum + project.investorCount, 0);
    const totalCommittedAmount = this.projects.reduce((sum, project) => sum + project.committedAmountMax, 0);

    const enrichedProjects = this.projects.map((project) => {
      const projectEvents = eventsByProject.get(project.id) ?? [];
      const lastEventAt = projectEvents.reduce<Date | null>((max, event) => {
        const created = event.createdAt.getTime();
        if (!max || created > max.getTime()) {
          return event.createdAt;
        }
        return max;
      }, null);
      const daysSinceActivity = lastEventAt
        ? Math.max(0, Math.floor((now.getTime() - lastEventAt.getTime()) / 86400000))
        : 9999;

      const riskScore = this.calculateProjectRiskScore({
        project,
        isVerified: project.validation.success,
        eventCount: projectEvents.length,
        daysSinceActivity,
        matchCount: project.matchCount,
        investorCount: project.investorCount,
        signalScore: calculateProjectSignalScore(project, projectEvents),
      });

      const reasons: string[] = [];
      if (!project.validation.success) {
        reasons.push('검증 실패');
      }
      if (projectEvents.length === 0) {
        reasons.push('최근 14일 내 이벤트가 없습니다');
      } else if (daysSinceActivity >= 14) {
        reasons.push('최근 활동이 14일 이상 지연');
      }
      if (project.matchCount === 0 && project.investorCount === 0) {
        reasons.push('매칭/투자 진척 없음');
      }

      const hydrated = this.hydrateProject(project);

      return {
        project: hydrated,
        riskScore,
        reason: reasons,
        daysSinceActivity,
      };
    });

    const riskProjects: AdminRiskProject[] = enrichedProjects
      .filter((entry) => entry.riskScore >= 45)
      .sort((a, b) => {
        const scoreDiff = b.riskScore - a.riskScore;
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return a.daysSinceActivity - b.daysSinceActivity;
      })
      .slice(0, 10)
      .map((entry) => ({
        projectId: entry.project.id,
        title: entry.project.title,
        reason: entry.reason.join(' · ') || '리스크 요인 정밀 점검 필요',
        riskScore: entry.riskScore,
        daysSinceActivity: entry.daysSinceActivity,
        lastActivityAt: entry.project.eventSummary?.latestAt ?? null,
      }));

    const topMatchProjects = enrichedProjects
      .map(({ project }) => ({
        id: project.id,
        title: project.title,
        category: project.category,
        accessMode: project.accessMode,
        signalScore: project.signalScore ?? 0,
        investorCount: project.investorCount,
        matchCount: project.matchCount,
        committedAmountMin: project.committedAmountMin,
        committedAmountMax: project.committedAmountMax,
      }))
      .sort((a, b) => {
        const matchCountDiff = b.matchCount - a.matchCount;
        if (matchCountDiff !== 0) {
          return matchCountDiff;
        }

        return b.investorCount - a.investorCount;
      })
      .slice(0, 8);

    const topSignalProjects = enrichedProjects
      .map(({ project }) => ({
        id: project.id,
        title: project.title,
        category: project.category,
        accessMode: project.accessMode,
        signalScore: project.signalScore ?? 0,
        investorCount: project.investorCount,
        matchCount: project.matchCount,
        committedAmountMin: project.committedAmountMin,
        committedAmountMax: project.committedAmountMax,
      }))
      .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
      .slice(0, 6);

    const categoryPerformance = PROJECT_CATEGORIES.map((category) => {
      const categoryProjects = this.projects.filter((project) => project.category === category);
      return {
        category,
        projects: categoryProjects.length,
        investorCount: categoryProjects.reduce((sum, project) => sum + project.investorCount, 0),
        matchCount: categoryProjects.reduce((sum, project) => sum + project.matchCount, 0),
        committedAmountMax: categoryProjects.reduce((sum, project) => sum + project.committedAmountMax, 0),
      };
    }).filter((item) => item.projects > 0);

    const conversionFunnel: AdminFunnelMetric = {
      previewToMatchRate: this.calculateRate(matchCount, previewCount),
      outboundToMatchRate: this.calculateRate(matchCount, outboundCount),
      matchPerProjectRate: this.calculateRate(
        this.projects.reduce((sum, project) => sum + project.matchCount, 0),
        Math.max(1, this.projects.length),
      ),
      matchCount,
      previewCount,
      outboundCount,
      totalEvents: this.events.length,
    };

    const health = this.buildAdminHealthIndicator({
      totalProjects,
      verifiedProjects,
      totalInvestors,
      totalCommittedAmount,
      conversionFunnel,
      totalEvents: this.events.length,
      averageResponseMs: this.calculateAverageResponseMs(),
      riskProjectCount: riskProjects.length,
    });

    const recommendations = this.buildAdminRecommendations({
      health,
      riskProjects,
      totalProjects,
      totalInvestors,
      totalSignals: this.events.length,
      verifiedProjects,
      riskProjectCount: riskProjects.length,
      conversionFunnel,
    });

    const revenue = this.computeRevenueProjection({
      totalProjects,
      verifiedProjects,
      totalInvestors,
      totalSignals: this.events.length,
      totalCommittedAmount,
      conversionFunnel,
      assumptions: this.buildDefaultRevenueAssumptions(),
    });

    return {
      conversionFunnel,
      eventTrend14d,
      eventTotals,
      accessModeDistribution,
      topMatchProjects,
      topSignalProjects,
      categoryPerformance,
      proposalRangeDistribution: rangeMetrics,
      riskProjects,
      health,
      recommendations,
      revenue,
      lastUpdatedAt: now.toISOString(),
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
    this.assertValidFundingRange(query);
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

  private assertValidFundingRange(query: ProjectQueryInput) {
    if (query.minFundingAmount === undefined || query.maxFundingAmount === undefined) {
      return;
    }

    if (query.maxFundingAmount < query.minFundingAmount) {
      throw new BadRequestException('최대 투자금은 최소 투자금보다 크거나 같아야 합니다.');
    }
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

  private buildAccessModeMetric(projects: Project[], accessMode: ProjectAccessMode) {
    const verified = projects.filter((project) => project.validation.success).length;

    return {
      accessMode,
      projects: projects.length,
      verified,
    };
  }

  private buildProposalRangeDistribution(): AdminRangeMetric[] {
    const rangeMap = new Map<string, AdminRangeMetric>(
      FUNDING_RANGES.map((range) => [
        range.id,
        {
          rangeId: range.id,
          label: range.label,
          proposalCount: 0,
          totalMinAmount: 0,
          totalMaxAmount: 0,
          averageAmount: 0,
        },
      ]),
    );

    for (const proposal of this.proposals) {
      const range = FUNDING_RANGES.find((item) => item.id === proposal.fundingRangeId);
      if (!range) {
        continue;
      }

      const metric = rangeMap.get(range.id);
      if (!metric) {
        continue;
      }

      metric.proposalCount += 1;
      metric.totalMinAmount += range.minAmount;
      metric.totalMaxAmount += range.maxAmount;
    }

    const metrics = Array.from(rangeMap.values()).map((metric) => {
      const averageAmount =
        metric.proposalCount > 0
          ? Math.round((metric.totalMinAmount + metric.totalMaxAmount) / (2 * metric.proposalCount))
          : 0;

      return {
        ...metric,
        averageAmount,
      };
    });

    return metrics
      .filter((metric) => metric.proposalCount > 0 || metric.totalMinAmount > 0 || metric.totalMaxAmount > 0)
      .sort((a, b) => b.proposalCount - a.proposalCount);
  }

  private calculateProjectRiskScore(params: {
    project: Project;
    isVerified: boolean;
    eventCount: number;
    daysSinceActivity: number;
    matchCount: number;
    investorCount: number;
    signalScore: number;
  }) {
    let score = 0;

    if (!params.isVerified) {
      score += 30;
    }
    if (params.eventCount === 0) {
      score += 28;
    } else if (params.daysSinceActivity >= 30) {
      score += 26;
    } else if (params.daysSinceActivity >= 14) {
      score += 16;
    }

    if (params.matchCount === 0 && params.investorCount === 0) {
      score += 20;
    }
    if (params.signalScore < 45) {
      score += 12;
    }

    if (params.project.validation.responseTimeMs && params.project.validation.responseTimeMs > 2500) {
      score += 8;
    }

    return Math.min(100, Math.max(0, score));
  }

  private buildAdminHealthIndicator(params: {
    totalProjects: number;
    verifiedProjects: number;
    totalInvestors: number;
    totalCommittedAmount: number;
    conversionFunnel: AdminFunnelMetric;
    totalEvents: number;
    averageResponseMs: number | null;
    riskProjectCount: number;
  }): AdminHealthIndicator {
    const verifiedHealth = this.calculateRate(params.verifiedProjects, Math.max(1, params.totalProjects));
    const hasPreviewOrOutbound = params.conversionFunnel.previewCount > 0 || params.conversionFunnel.outboundCount > 0;

    const conversionHealth = hasPreviewOrOutbound
      ? Math.round(
          (params.conversionFunnel.previewToMatchRate * 0.65) + (params.conversionFunnel.outboundToMatchRate * 0.35),
        )
      : params.conversionFunnel.matchPerProjectRate;

    const engagementHealth = Math.min(
      100,
      Math.round((params.totalEvents / Math.max(1, params.totalProjects)) * 18),
    );

    const responseHealth = params.averageResponseMs === null
      ? 70
      : Math.max(0, Math.min(100, Math.round(100 - Math.max(0, params.averageResponseMs - 250) / 40)));

    const warningCount =
      (verifiedHealth < 80 ? 1 : 0) +
      (conversionHealth < 50 ? 1 : 0) +
      (engagementHealth < 35 ? 1 : 0) +
      (responseHealth < 50 ? 1 : 0) +
      (params.riskProjectCount > 0 ? 1 : 0);

    return {
      healthScore: Math.round(
        verifiedHealth * 0.35 +
        conversionHealth * 0.3 +
        engagementHealth * 0.2 +
        responseHealth * 0.15,
      ),
      verifiedHealth,
      conversionHealth,
      engagementHealth,
      responseHealth,
      riskCount: params.riskProjectCount,
      warningCount,
    };
  }

  private buildAdminRecommendations(params: {
    health: AdminHealthIndicator;
    riskProjects: AdminRiskProject[];
    totalProjects: number;
    totalInvestors: number;
    totalSignals: number;
    verifiedProjects: number;
    riskProjectCount: number;
    conversionFunnel: AdminFunnelMetric;
  }): AdminActionRecommendation[] {
    const recommendations: AdminActionRecommendation[] = [];

    const investorToProjectRate =
      params.totalProjects > 0 ? Math.round((params.totalInvestors / params.totalProjects) * 1000) / 10 : 0;
    const avgSignalsPerProject =
      params.totalProjects > 0 ? Math.round((params.totalSignals / params.totalProjects) * 10) / 10 : 0;

    if (params.verifiedProjects === 0 && params.totalProjects > 0) {
      recommendations.push({
        priority: 'high',
        area: '검증 게이트',
        title: '검증률이 0%입니다',
        why: '승인/신뢰가 보장된 프로젝트가 없어 투자자 여정 전환율이 낮을 수 있습니다.',
        nextAction: '가이드 문구를 강화하고 재검증 실패 사유를 즉시 피드백해 제출 실패율을 낮추세요.',
        expectedImpact: '검증 성공률이 오르면 매칭 제안 전환까지의 신뢰 구간이 개선됩니다.',
      });
    }

    if (params.riskProjectCount >= 3) {
      const topRiskReason = params.riskProjects[0]?.reason ?? '지표 이탈';
      recommendations.push({
        priority: 'high',
        area: '리스크 관리',
        title: '리스크 프로젝트 집중 조치',
        why: `현재 위험 프로젝트 ${params.riskProjectCount}건이 임계값(45) 이상으로 누적되어 있습니다.`,
        nextAction: `우선 ${Math.min(3, params.riskProjectCount)}개 프로젝트를 리마인드해 이벤트 유입·투자 반응을 확인하세요. 대표 사유: ${topRiskReason}`,
        expectedImpact: '고위험 프로젝트 이탈을 줄이면 전체 전환율과 평균 신뢰도를 함께 개선할 수 있습니다.',
      });
    }

    if (params.health.conversionHealth < 35) {
      recommendations.push({
        priority: 'high',
        area: '퍼널 개선',
        title: '프리뷰→매칭 동선 전환 강화',
        why: `현재 프로젝트 전환률이 ${params.conversionFunnel.previewToMatchRate}% 수준입니다.`,
        nextAction: '외부열람 이후 제안 작성 CTA의 문구를 재배치하고, 매칭 마감 리마인드 메시지를 운영하세요.',
        expectedImpact: '매칭 제안 수 및 투자자 문의 전환이 동시에 개선될 가능성이 높습니다.',
      });
    }

    if (params.health.engagementHealth < 35) {
      recommendations.push({
        priority: 'medium',
        area: '활동성',
        title: '프로젝트별 활동량 최소화 정책 필요',
        why: `프로젝트당 평균 이벤트가 ${avgSignalsPerProject}건으로 낮아 운영 히트율이 제한됩니다.`,
        nextAction: '최근 7일 이벤트 없는 프로젝트를 필터로 분리해, 홍보·리마인드 알림을 자동 발송하세요.',
        expectedImpact: '짧은 주기 이벤트가 늘면 운영 대시보드의 트래픽 지표와 매칭 수가 개선될 수 있습니다.',
      });
    }

    if (params.health.responseHealth < 50) {
      recommendations.push({
        priority: 'medium',
        area: '인프라',
        title: '라이브 URL 응답성 이슈 완화',
        why: '평균 응답 시간이 임계값을 넘어 검증 소요와 신뢰도 점수에 영향을 줍니다.',
        nextAction: '캐시 헤더/타임아웃 정책 점검 후 URL 검증 재시도 정책을 짧은 주기로 정비하세요.',
        expectedImpact: '검증 통과 속도가 높아져 신규 등록 체감속도와 운영 신뢰가 향상됩니다.',
      });
    }

    if (params.health.conversionHealth >= 40 && params.health.engagementHealth >= 40 && params.totalProjects > 0) {
      recommendations.push({
        priority: 'low',
        area: '수익 모델',
        title: '월 구독 전환 퍼널 준비',
        why: `현재 프로젝트당 투자자 수치가 ${investorToProjectRate}%로 안정적인 초기 단계입니다.`,
        nextAction: '메이커/투자자 전환 가정을 리드 기반 수익 시나리오로 2개 구간 분리해 A/B 테스트하세요.',
        expectedImpact: '실측 전환율을 기반으로 수익 포인트를 조정하면 ARPU를 빠르게 비교할 수 있습니다.',
      });
    }

    if (params.totalSignals === 0) {
      recommendations.push({
        priority: 'low',
        area: '수익 안정성',
        title: '초기 트래픽 유입 설계 필요',
        why: '이벤트가 누적되지 않으면 매칭·리드 기반 수익 흐름이 시작되지 않습니다.',
        nextAction: '카테고리별 큐레이션 채널(테마 뉴스레터/커뮤니티 노출)로 첫 조회를 유도하세요.',
        expectedImpact: '데이터가 쌓이면 시그널 기반 권장 파트너 매칭 효율이 개선됩니다.',
      });
    }

    const priorityValue: Record<AdminActionRecommendation['priority'], number> = {
      high: 2,
      medium: 1,
      low: 0,
    };
    return recommendations.sort(
      (a, b) => priorityValue[b.priority] - priorityValue[a.priority] || a.area.localeCompare(b.area),
    );
  }

  private calculateAverageResponseMs() {
    const checkedProjects = this.projects.filter((project) => project.validation.responseTimeMs);
    if (checkedProjects.length === 0) {
      return null;
    }

    return Math.round(
      checkedProjects.reduce((sum, project) => sum + (project.validation.responseTimeMs ?? 0), 0) /
      checkedProjects.length,
    );
  }

  private buildEventTrend(referenceDate: Date): AdminEventTrendPoint[] {
    const now = new Date(referenceDate);
    const trend: AdminEventTrendPoint[] = [];
    const buckets = new Map<string, AdminEventTrendPoint>();

    for (let offset = 13; offset >= 0; offset--) {
      const day = new Date(now);
      day.setDate(day.getDate() - offset);

      const key = day.toISOString().slice(0, 10);
      buckets.set(key, {
        date: key,
        total: 0,
        create: 0,
        preview: 0,
        outbound: 0,
        match: 0,
        refresh: 0,
      });
    }

    for (const event of this.events) {
      const dateKey = event.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(dateKey);
      if (!bucket) {
        continue;
      }

      bucket[event.type] += 1;
      bucket.total += 1;
    }

    for (const point of buckets.values()) {
      trend.push(point);
    }

    return trend;
  }

  private calculateRate(numerator: number, denominator: number) {
    if (denominator <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 1000) / 10));
  }

  private buildAdminConversionFunnel(): AdminFunnelMetric {
    let previewCount = 0;
    let outboundCount = 0;
    let matchCount = 0;

    for (const event of this.events) {
      if (event.type === 'preview') {
        previewCount += 1;
      } else if (event.type === 'outbound') {
        outboundCount += 1;
      } else if (event.type === 'match') {
        matchCount += 1;
      }
    }

    return {
      previewToMatchRate: this.calculateRate(matchCount, previewCount),
      outboundToMatchRate: this.calculateRate(matchCount, outboundCount),
      matchPerProjectRate: this.calculateRate(
        this.projects.reduce((sum, project) => sum + project.matchCount, 0),
        Math.max(1, this.projects.length),
      ),
      matchCount,
      previewCount,
      outboundCount,
      totalEvents: this.events.length,
    };
  }

  private buildRevenueScenarios(params: {
    baseMonthlyRevenue: number;
    multipliers: number[];
  }): AdminRevenueScenario[] {
    const labels: Record<number, string> = {
      0.75: '보수',
      1: '기준',
      1.25: '성장',
      1.5: '확장',
    };

    return params.multipliers
      .map((multiplier) => ({
        label: labels[multiplier] ?? `${Math.round(multiplier * 100)}% 케이스`,
        multiplier: this.roundNumber(multiplier),
        monthlyRevenue: this.toPositiveInteger(params.baseMonthlyRevenue * multiplier, 0),
        annualRevenue:
          (this.toPositiveInteger(params.baseMonthlyRevenue * multiplier, 0) * 12),
      }))
      .sort((a, b) => a.multiplier - b.multiplier)
      .map((scenario) => {
        const normalizedMultiplier = scenario.multiplier;
        if (normalizedMultiplier <= 0) {
          return scenario;
        }

        return {
          ...scenario,
          annualRevenue: scenario.monthlyRevenue * 12,
        };
      });
  }

  private buildRevenueTargetGap(params: {
    targetMonthlyRevenue: number;
    totalMonthlyRevenue: number;
    totalProjects: number;
    totalInvestors: number;
    totalSignals: number;
    averageCommittedPerInvestor: number;
    verifiedProjectShare: number;
    makerMonthlyFee: number;
    investorMonthlyFee: number;
    leadCaptureFee: number;
    makerConversionRate: number;
    investorConversionRate: number;
    closeLeadRate: number;
    successFeeRate: number;
  }): AdminRevenueTargetGap {
    const targetMonthlyRevenue = Math.max(0, Math.floor(params.targetMonthlyRevenue));
    const shortfall = Math.max(0, targetMonthlyRevenue - params.totalMonthlyRevenue);
    const achievedRate =
      targetMonthlyRevenue === 0
        ? 100
        : this.roundRate(Math.max(0, Math.min(100, (params.totalMonthlyRevenue / targetMonthlyRevenue) * 100)));

    return {
      targetMonthlyRevenue,
      shortfall: this.roundMoney(shortfall),
      achievedRate,
      drivers: this.buildRevenueTargetDrivers({
        shortfall,
        totalProjects: Math.max(1, params.totalProjects),
        totalInvestors: Math.max(1, params.totalInvestors),
        totalSignals: Math.max(1, params.totalSignals),
        averageCommittedPerInvestor: Math.max(0, params.averageCommittedPerInvestor),
        verifiedProjectShare: params.verifiedProjectShare,
        makerMonthlyFee: params.makerMonthlyFee,
        investorMonthlyFee: params.investorMonthlyFee,
        leadCaptureFee: params.leadCaptureFee,
        makerConversionRate: params.makerConversionRate,
        investorConversionRate: params.investorConversionRate,
        closeLeadRate: params.closeLeadRate,
        successFeeRate: params.successFeeRate,
      }),
    };
  }

  private buildRevenueTargetDrivers(params: {
    shortfall: number;
    totalProjects: number;
    totalInvestors: number;
    totalSignals: number;
    averageCommittedPerInvestor: number;
    verifiedProjectShare: number;
    makerMonthlyFee: number;
    investorMonthlyFee: number;
    leadCaptureFee: number;
    makerConversionRate: number;
    investorConversionRate: number;
    closeLeadRate: number;
    successFeeRate: number;
  }): AdminRevenueTargetDriver[] {
    const baseRates = {
      makerMonthlyPlan: (params.totalProjects * params.verifiedProjectShare * (params.makerConversionRate / 100)),
      investorMonthlyPlan: (params.totalInvestors * (params.investorConversionRate / 100)),
      leadCapture: params.totalSignals,
    };

    const candidates: Array<{
      key: string;
      label: string;
      currentValue: number;
      unit: 'currency' | 'percent';
      currentContribution: number;
      impactPerUnit: number;
    }> = [
      {
        key: 'makerMonthlyFee',
        label: '메이커 월 정액',
        currentValue: params.makerMonthlyFee,
        unit: 'currency',
        currentContribution: Math.max(0, Math.round(baseRates.makerMonthlyPlan * params.makerMonthlyFee)),
        impactPerUnit: Math.max(0, baseRates.makerMonthlyPlan),
      },
      {
        key: 'investorMonthlyFee',
        label: '투자자 월 정액',
        currentValue: params.investorMonthlyFee,
        unit: 'currency',
        currentContribution: Math.max(0, Math.round(baseRates.investorMonthlyPlan * params.investorMonthlyFee)),
        impactPerUnit: Math.max(0, baseRates.investorMonthlyPlan),
      },
      {
        key: 'leadCaptureFee',
        label: '리드 캡처 단가',
        currentValue: params.leadCaptureFee,
        unit: 'currency',
        currentContribution: Math.max(0, baseRates.leadCapture * params.leadCaptureFee),
        impactPerUnit: Math.max(0, baseRates.leadCapture),
      },
      {
        key: 'makerConversionRate',
        label: '메이커 전환율 (퍼센트 포인트)',
        currentValue: params.makerConversionRate,
        unit: 'percent',
        currentContribution: Math.max(0, Math.round(baseRates.makerMonthlyPlan * params.makerMonthlyFee / 100)),
        impactPerUnit: Math.max(0, baseRates.makerMonthlyPlan * params.makerMonthlyFee / 100),
      },
      {
        key: 'investorConversionRate',
        label: '투자자 전환율 (퍼센트 포인트)',
        currentValue: params.investorConversionRate,
        unit: 'percent',
        currentContribution: Math.max(0, Math.round(baseRates.investorMonthlyPlan * params.investorMonthlyFee / 100)),
        impactPerUnit: Math.max(0, baseRates.investorMonthlyPlan * params.investorMonthlyFee / 100),
      },
      {
        key: 'closeLeadRate',
        label: '리드 전환율 (퍼센트 포인트)',
        currentValue: params.closeLeadRate,
        unit: 'percent',
        currentContribution: Math.max(
          0,
          Math.round(params.totalInvestors * params.averageCommittedPerInvestor * (params.successFeeRate / 100) * (params.closeLeadRate / 100)),
        ),
        impactPerUnit: Math.max(0, params.totalInvestors * params.averageCommittedPerInvestor * (params.successFeeRate / 100) / 100),
      },
      {
        key: 'successFeeRate',
        label: '수수료율 (퍼센트 포인트)',
        currentValue: params.successFeeRate,
        unit: 'percent',
        currentContribution: Math.max(
          0,
          Math.round(params.totalInvestors * params.averageCommittedPerInvestor * (params.closeLeadRate / 100) * (params.successFeeRate / 100)),
        ),
        impactPerUnit: Math.max(0, params.totalInvestors * params.averageCommittedPerInvestor * (params.closeLeadRate / 100) / 100),
      },
    ];

    const sorted = candidates
      .map((candidate) => {
        const requiredDelta =
          candidate.impactPerUnit <= 0 || params.shortfall <= 0
            ? 0
            : Math.ceil(params.shortfall / candidate.impactPerUnit);

        const normalizedRequiredDelta = this.toPositiveInteger(requiredDelta, 0);
        const normalizedCurrentValue =
          candidate.unit === 'percent'
            ? this.roundRate(candidate.currentValue)
            : this.toPositiveInteger(candidate.currentValue, 0);
        const normalizedRequiredValue =
          candidate.unit === 'percent'
            ? this.roundRate(Math.min(100, candidate.currentValue + requiredDelta))
            : Math.max(0, candidate.currentValue + requiredDelta);

        return {
          key: candidate.key,
          label: candidate.label,
          currentValue: normalizedCurrentValue,
          unit: candidate.unit,
          currentContribution: this.roundMoney(candidate.currentContribution),
          impactPerUnit: this.roundRate(candidate.impactPerUnit),
          requiredDelta: normalizedRequiredDelta,
          requiredValue: normalizedRequiredValue,
        };
      })
      .sort((a, b) => {
        const scoreA = a.impactPerUnit === 0 ? -1 : a.impactPerUnit;
        const scoreB = b.impactPerUnit === 0 ? -1 : b.impactPerUnit;
        return scoreB - scoreA;
      });

    return sorted.slice(0, 3);
  }

  private resolveScenarioMultipliers(requestedMultipliers?: number[]) {
    const source = requestedMultipliers && requestedMultipliers.length > 0
      ? requestedMultipliers
      : this.defaultScenarioMultipliers;

    const sanitized = source
      .filter((value) => Number.isFinite(value))
      .map((value) => {
        const clamped = Math.max(0.05, value);
        return Math.round(clamped * 100) / 100;
      })
      .filter((value) => value > 0);

    const unique = Array.from(new Set(sanitized));
    if (unique.length === 0) {
      return this.defaultScenarioMultipliers;
    }

    return unique.sort((a, b) => a - b);
  }

  private buildTargetGapComment(params: {
    label: string;
    gap: number;
    unit: 'percent' | 'currency' | 'count';
  }) {
    const gapDirection = params.gap >= 0 ? '초과' : '부족';
    const normalizedGap = this.roundNumber(params.gap);
    if (params.unit === 'percent') {
      return `${params.label}이(가) 목표 대비 ${Math.abs(normalizedGap)}% ${gapDirection}입니다.`;
    }

    if (params.unit === 'currency') {
      return `${params.label}이(가) 목표 대비 ${this.formatCurrency(Math.abs(params.gap))} ${gapDirection}입니다.`;
    }

    return `${params.label}이(가) 목표 대비 ${params.gap} 포인트 ${gapDirection}입니다.`;
  }

  private estimateLtvMonths(churnRatePercent: number) {
    const stableRate = Math.max(0.01, churnRatePercent);
    return this.roundNumber(100 / stableRate);
  }

  private estimatePaybackMonths(
    acquisitionCost: number,
    monthlyValuePerUnit: number,
  ) {
    if (acquisitionCost <= 0 || monthlyValuePerUnit <= 0) {
      return 0;
    }
    return this.roundNumber(acquisitionCost / monthlyValuePerUnit);
  }

  private toPercent(value: number) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return this.roundRate(value * 100);
  }

  private roundRate(value: number) {
    return this.roundNumber(value);
  }

  private roundMoney(value: number) {
    return this.roundRate(value);
  }

  private roundNumber(value: number) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value * 10) / 10;
  }

  private toPositiveInteger(value: number | undefined, fallback: number) {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(0, Math.floor(value));
  }

  private formatCurrency(value: number) {
    return `₩${Math.max(0, Math.round(Math.abs(value))).toLocaleString('ko-KR')}`;
  }

  private normalizeRevenueAssumptions(input: Partial<AdminRevenueAssumption>): AdminRevenueAssumption {
    const defaults = this.buildDefaultRevenueAssumptions();

    const clampRate = (value: number, fallback: number) => {
      const next = Number.isFinite(value) ? value : fallback;
      return this.roundRate(Math.max(0, Math.min(100, next)));
    };

    return {
      makerMonthlyFee: this.toPositiveInteger(input.makerMonthlyFee, defaults.makerMonthlyFee),
      investorMonthlyFee: this.toPositiveInteger(input.investorMonthlyFee, defaults.investorMonthlyFee),
      leadCaptureFee: this.toPositiveInteger(input.leadCaptureFee, defaults.leadCaptureFee),
      makerConversionRate: clampRate(input.makerConversionRate ?? defaults.makerConversionRate, defaults.makerConversionRate),
      investorConversionRate: clampRate(
        input.investorConversionRate ?? defaults.investorConversionRate,
        defaults.investorConversionRate,
      ),
      closeLeadRate: clampRate(input.closeLeadRate ?? defaults.closeLeadRate, defaults.closeLeadRate),
      successFeeRate: clampRate(input.successFeeRate ?? defaults.successFeeRate, defaults.successFeeRate),
      investorAcquisitionCost: this.toPositiveInteger(input.investorAcquisitionCost, defaults.investorAcquisitionCost),
      makerAcquisitionCost: this.toPositiveInteger(input.makerAcquisitionCost, defaults.makerAcquisitionCost),
      estimatedMonthlyChurnRate: this.roundRate(input.estimatedMonthlyChurnRate ?? defaults.estimatedMonthlyChurnRate),
    };
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

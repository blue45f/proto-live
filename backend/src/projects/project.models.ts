import { FundingRangeId, ProjectAccessMode, ProjectCategory } from './project.constants';

export interface ValidationSnapshot {
  success: boolean;
  status?: number;
  message: string;
  responseTimeMs?: number;
  checkedAt: string;
  finalUrl?: string;
}

export interface Project {
  id: number;
  userId: number;
  title: string;
  description: string;
  liveUrl: string;
  category: ProjectCategory;
  tags?: string[];
  accessMode: ProjectAccessMode;
  protectionNoticeAccepted: boolean;
  thumbnail?: string | null;
  investorCount: number;
  matchCount: number;
  committedAmountMin: number;
  committedAmountMax: number;
  validation: ValidationSnapshot;
  createdAt: Date;
  signalScore?: number;
  eventSummary?: ProjectEventSummary;
  reviewSummary?: ProjectReviewSummary;
}

export interface User {
  id: number;
  email: string;
  role: 'maker' | 'investor';
}

export interface MatchProposal {
  id: number;
  projectId: number;
  fundingRangeId: FundingRangeId;
  message: string;
  createdAt: Date;
}

export type ProjectReviewType = 'review' | 'support' | 'idea';

export type ProjectReviewAuthorRole = 'maker' | 'investor' | 'member';

export interface ProjectReview {
  id: number;
  projectId: number;
  parentId?: number | null;
  authorEmail: string;
  authorRole: ProjectReviewAuthorRole;
  type: ProjectReviewType;
  rating?: number | null;
  body: string;
  createdAt: Date;
}

export interface ProjectReviewSummary {
  total: number;
  rootCount: number;
  replyCount: number;
  reviewCount: number;
  supportCount: number;
  ideaCount: number;
  averageRating: number | null;
  latestAt: string | null;
  latest: {
    id: number;
    type: ProjectReviewType;
    authorEmail: string;
    body: string;
    createdAt: string;
  } | null;
}

export type ProjectEventType = 'create' | 'preview' | 'outbound' | 'match' | 'refresh';

export interface ProjectEvent {
  id: number;
  projectId: number;
  type: ProjectEventType;
  createdAt: Date;
}

export interface AdminEventTrendPoint {
  date: string;
  total: number;
  create: number;
  preview: number;
  outbound: number;
  match: number;
  refresh: number;
}

export interface AdminFunnelMetric {
  previewToMatchRate: number;
  outboundToMatchRate: number;
  matchPerProjectRate: number;
  matchCount: number;
  previewCount: number;
  outboundCount: number;
  totalEvents: number;
}

export interface AdminTopProjectMetric {
  id: number;
  title: string;
  category: string;
  accessMode: ProjectAccessMode;
  signalScore: number;
  investorCount: number;
  matchCount: number;
  committedAmountMin: number;
  committedAmountMax: number;
}

export interface AdminCategoryMetric {
  category: string;
  projects: number;
  investorCount: number;
  matchCount: number;
  committedAmountMax: number;
}

export interface AdminRangeMetric {
  rangeId: string;
  label: string;
  proposalCount: number;
  totalMinAmount: number;
  totalMaxAmount: number;
  averageAmount: number;
}

export type AdminAlertPriority = 'high' | 'medium' | 'low';

export interface AdminActionRecommendation {
  priority: AdminAlertPriority;
  area: string;
  title: string;
  why: string;
  nextAction: string;
  expectedImpact: string;
}

export interface AdminRiskProject {
  projectId: number;
  title: string;
  reason: string;
  riskScore: number;
  daysSinceActivity: number;
  lastActivityAt: string | null;
}

export interface AdminHealthIndicator {
  healthScore: number;
  verifiedHealth: number;
  conversionHealth: number;
  engagementHealth: number;
  responseHealth: number;
  riskCount: number;
  warningCount: number;
}

export interface AdminRevenueAssumption {
  makerMonthlyFee: number;
  investorMonthlyFee: number;
  leadCaptureFee: number;
  makerConversionRate: number;
  investorConversionRate: number;
  closeLeadRate: number;
  successFeeRate: number;
  investorAcquisitionCost: number;
  makerAcquisitionCost: number;
  estimatedMonthlyChurnRate: number;
}

export interface AdminRevenueBenchmark {
  key: string;
  label: string;
  actual: number;
  target: number;
  gap: number;
  unit: 'percent' | 'currency' | 'count';
  status: 'good' | 'warning' | 'critical';
  comment: string;
}

export interface AdminRevenueScenario {
  label: string;
  multiplier: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

export interface AdminRevenueTargetDriver {
  key: string;
  label: string;
  currentValue: number;
  unit: 'currency' | 'percent';
  currentContribution: number;
  impactPerUnit: number;
  requiredDelta: number;
  requiredValue: number;
  acquisitionCostPerUnit: number;
  estimatedPaybackMonths: number;
}

export interface AdminRevenueTargetGap {
  targetMonthlyRevenue: number;
  shortfall: number;
  achievedRate: number;
  drivers: AdminRevenueTargetDriver[];
}

export interface AdminRevenueProjection {
  assumptions: AdminRevenueAssumption;
  monthlyMakerPlanRevenue: number;
  monthlyInvestorPlanRevenue: number;
  monthlyLeadRevenue: number;
  monthlyTransactionRevenue: number;
  totalMonthlyRevenue: number;
  annualRevenue: number;
  verifiedProjectShare: number;
  averageCommittedPerInvestor: number;
  arpu: number;
  arppu: number;
  investorLtvEstimate: number;
  makerPaybackMonths: number;
  investorPaybackMonths: number;
  benchmarkGaps: AdminRevenueBenchmark[];
  scenarios: AdminRevenueScenario[];
  targetGap: AdminRevenueTargetGap;
}

export interface AdminDashboardMetrics {
  conversionFunnel: AdminFunnelMetric;
  eventTrend14d: AdminEventTrendPoint[];
  eventTotals: Record<ProjectEventType, number>;
  accessModeDistribution: Array<{ accessMode: ProjectAccessMode; projects: number; verified: number }>;
  topMatchProjects: AdminTopProjectMetric[];
  topSignalProjects: AdminTopProjectMetric[];
  categoryPerformance: AdminCategoryMetric[];
  proposalRangeDistribution: AdminRangeMetric[];
  riskProjects: AdminRiskProject[];
  health: AdminHealthIndicator;
  recommendations: AdminActionRecommendation[];
  revenue: AdminRevenueProjection;
  lastUpdatedAt: string;
}

export interface ProjectEventSummary {
  total: number;
  latestAt: string | null;
  counts: Record<ProjectEventType, number>;
}

export interface ProjectsState {
  users: User[];
  projects: Project[];
  proposals: MatchProposal[];
  events: ProjectEvent[];
  reviews: ProjectReview[];
  nextUserId: number;
  nextProjectId: number;
  nextProposalId: number;
  nextEventId: number;
  nextReviewId: number;
}

export function createEmptyProjectsState(): ProjectsState {
  return {
    users: [],
    projects: [],
    proposals: [],
    events: [],
    reviews: [],
    nextUserId: 1,
    nextProjectId: 1,
    nextProposalId: 1,
    nextEventId: 1,
    nextReviewId: 1,
  };
}

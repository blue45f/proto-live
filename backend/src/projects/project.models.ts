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

export type UserRole = 'maker' | 'investor' | 'member' | 'admin';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  password?: string;
  name?: string;
  description?: string;
  notes?: string;
}

export interface AuthSession {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  expiresAt: string;
}

export type MatchProposalStatus = 'submitted' | 'contacted' | 'closed';

export interface MatchProposal {
  id: number;
  projectId: number;
  investorEmail?: string;
  fundingRangeId: FundingRangeId;
  message: string;
  legalNoticeAccepted?: boolean;
  privacyConsentAccepted?: boolean;
  riskNoticeAccepted?: boolean;
  complianceAcceptedAt?: Date;
  status?: MatchProposalStatus;
  createdAt: Date;
}

export type ProjectReviewType = 'review' | 'support' | 'idea';

export type ProjectReviewAuthorRole = 'maker' | 'investor' | 'member';

export type ProjectReviewStatus = 'visible' | 'reported' | 'hidden';

export interface ProjectReviewReport {
  reporterEmail: string;
  reason?: string | null;
  createdAt: Date;
}

export interface ProjectReview {
  id: number;
  projectId: number;
  parentId?: number | null;
  authorEmail: string;
  authorRole: ProjectReviewAuthorRole;
  type: ProjectReviewType;
  rating?: number | null;
  body: string;
  status: ProjectReviewStatus;
  reportCount: number;
  reportedBy: string[];
  reportReasons?: ProjectReviewReport[];
  lastReportedAt?: Date | null;
  moderatedBy?: string | null;
  moderationNote?: string | null;
  lastModeratedAt?: Date | null;
  createdAt: Date;
}

export interface AdminReportedReview {
  review: ProjectReview;
  project: Pick<Project, 'id' | 'title' | 'category' | 'accessMode'>;
  replyCount: number;
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

export type AuditLogAction =
  | 'match_compliance_accepted'
  | 'review_reported'
  | 'review_hidden_auto'
  | 'review_moderated';

export interface AuditLog {
  id: number;
  action: AuditLogAction;
  actorEmail: string;
  targetType: 'project' | 'review' | 'match';
  targetId: number;
  projectId?: number;
  message: string;
  createdAt: Date;
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
  auditLogs: AuditLog[];
  nextUserId: number;
  nextProjectId: number;
  nextProposalId: number;
  nextEventId: number;
  nextReviewId: number;
  nextAuditLogId: number;
}

export function createEmptyProjectsState(): ProjectsState {
  return {
    users: [],
    projects: [],
    proposals: [],
    events: [],
    reviews: [],
    auditLogs: [],
    nextUserId: 1,
    nextProjectId: 1,
    nextProposalId: 1,
    nextEventId: 1,
    nextReviewId: 1,
    nextAuditLogId: 1,
  };
}

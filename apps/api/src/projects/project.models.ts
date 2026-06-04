import {
  FundingRangeId,
  ProjectAccessMode,
  ProjectCategory,
  ProjectMaturity,
  ProjectStack,
} from './project.constants'

export interface ValidationSnapshot {
  success: boolean
  status?: number
  message: string
  responseTimeMs?: number
  checkedAt: string
  finalUrl?: string
}

export interface Project {
  id: number
  userId: number
  title: string
  description: string
  liveUrl: string
  category: ProjectCategory
  // 런타임에서는 항상 채워진다(deserialize 백필 · createProject · hydrate 기본값).
  // 인터페이스는 레거시/테스트 리터럴 호환을 위해 옵셔널로 둔다.
  maturity?: ProjectMaturity
  // 빌드 유형 축(category=시장과 직교): 무엇을 만들었나.
  stack?: ProjectStack
  // 바이브코딩 표식: 메이커가 자가 신고한 제작 도구와 AI 제작 여부.
  builtWith?: string[]
  customTools?: string[]
  vibeCoded?: boolean
  upvoteCount?: number
  // 투자 사다리: 운영자가 검증된 상위 프로젝트를 투자 검토 대상으로 큐레이션한다.
  featured?: boolean
  // 커뮤니티 신호(업보트+리뷰어+검증)가 임계를 넘으면 true. 파생 신호이며 자동 승급은 아님.
  ladderEligible?: boolean
  tags?: string[]
  accessMode: ProjectAccessMode
  protectionNoticeAccepted: boolean
  thumbnail?: string | null
  investorCount: number
  matchCount: number
  committedAmountMin: number
  committedAmountMax: number
  validation: ValidationSnapshot
  createdAt: Date
  signalScore?: number
  eventSummary?: ProjectEventSummary
  reviewSummary?: ProjectReviewSummary
}

export type UserRole = 'maker' | 'investor' | 'member' | 'admin'

export interface User {
  id: number
  email: string
  role: UserRole
  password?: string
  name?: string
  description?: string
  notes?: string
}

export interface AuthSession {
  id: number
  email: string
  role: UserRole
  name: string
  expiresAt: string
}

export type MatchProposalStatus = 'submitted' | 'contacted' | 'closed'

export interface MatchProposal {
  id: number
  projectId: number
  investorEmail?: string
  fundingRangeId: FundingRangeId
  message: string
  legalNoticeAccepted?: boolean
  privacyConsentAccepted?: boolean
  riskNoticeAccepted?: boolean
  complianceAcceptedAt?: Date
  status?: MatchProposalStatus
  createdAt: Date
}

export type ProjectReviewType = 'review' | 'support' | 'idea'

export type ProjectReviewAuthorRole = 'maker' | 'investor' | 'member'

export type ProjectReviewStatus = 'visible' | 'reported' | 'hidden'

export interface ProjectReviewReport {
  reporterEmail: string
  reason?: string | null
  createdAt: Date
}

export interface ProjectReview {
  id: number
  projectId: number
  parentId?: number | null
  authorEmail: string
  authorRole: ProjectReviewAuthorRole
  type: ProjectReviewType
  rating?: number | null
  body: string
  status: ProjectReviewStatus
  reportCount: number
  reportedBy: string[]
  reportReasons?: ProjectReviewReport[]
  lastReportedAt?: Date | null
  moderatedBy?: string | null
  moderationNote?: string | null
  lastModeratedAt?: Date | null
  createdAt: Date
}

export interface AdminReportedReview {
  review: ProjectReview
  project: Pick<Project, 'id' | 'title' | 'category' | 'accessMode'>
  replyCount: number
}

export interface ProjectReviewSummary {
  total: number
  rootCount: number
  replyCount: number
  reviewCount: number
  supportCount: number
  ideaCount: number
  averageRating: number | null
  latestAt: string | null
  latest: {
    id: number
    type: ProjectReviewType
    authorEmail: string
    body: string
    createdAt: string
  } | null
}

export type ProjectEventType = 'create' | 'preview' | 'outbound' | 'match' | 'refresh'

export interface ProjectEvent {
  id: number
  projectId: number
  type: ProjectEventType
  createdAt: Date
}

/**
 * 업보트는 project_events와 분리해 저장한다(이벤트 타입 union을 건드리지 않아
 * admin 퍼널/시그널/트렌드 Record에 새지 않는다). 1인 1표는 (projectId,email) 유일성으로 보장.
 */
export interface ProjectUpvote {
  id: number
  projectId: number
  email: string
  createdAt: Date
}

/** 메이커로그: 프로젝트 작성자(메이커)가 남기는 제작 과정 기록. 작성=메이커 본인만, 열람=전원. */
export interface ProjectLogEntry {
  id: number
  projectId: number
  authorEmail: string
  body: string
  createdAt: Date
}

export interface AdminEventTrendPoint {
  date: string
  total: number
  create: number
  preview: number
  outbound: number
  match: number
  refresh: number
}

export interface AdminFunnelMetric {
  previewToMatchRate: number
  outboundToMatchRate: number
  matchPerProjectRate: number
  matchCount: number
  previewCount: number
  outboundCount: number
  totalEvents: number
}

export interface AdminTopProjectMetric {
  id: number
  title: string
  category: string
  accessMode: ProjectAccessMode
  signalScore: number
  investorCount: number
  matchCount: number
  committedAmountMin: number
  committedAmountMax: number
}

export interface AdminCategoryMetric {
  category: string
  projects: number
  investorCount: number
  matchCount: number
  committedAmountMax: number
}

export interface AdminRangeMetric {
  rangeId: string
  label: string
  proposalCount: number
  totalMinAmount: number
  totalMaxAmount: number
  averageAmount: number
}

export type AdminAlertPriority = 'high' | 'medium' | 'low'

export interface AdminActionRecommendation {
  priority: AdminAlertPriority
  area: string
  title: string
  why: string
  nextAction: string
  expectedImpact: string
}

export interface AdminRiskProject {
  projectId: number
  title: string
  reason: string
  riskScore: number
  daysSinceActivity: number
  lastActivityAt: string | null
}

export interface AdminHealthIndicator {
  healthScore: number
  verifiedHealth: number
  conversionHealth: number
  engagementHealth: number
  responseHealth: number
  riskCount: number
  warningCount: number
}

export interface AdminRevenueAssumption {
  makerMonthlyFee: number
  investorMonthlyFee: number
  leadCaptureFee: number
  makerConversionRate: number
  investorConversionRate: number
  closeLeadRate: number
  successFeeRate: number
  investorAcquisitionCost: number
  makerAcquisitionCost: number
  estimatedMonthlyChurnRate: number
}

export interface AdminRevenueBenchmark {
  key: string
  label: string
  actual: number
  target: number
  gap: number
  unit: 'percent' | 'currency' | 'count'
  status: 'good' | 'warning' | 'critical'
  comment: string
}

export interface AdminRevenueScenario {
  label: string
  multiplier: number
  monthlyRevenue: number
  annualRevenue: number
}

export interface AdminRevenueTargetDriver {
  key: string
  label: string
  currentValue: number
  unit: 'currency' | 'percent'
  currentContribution: number
  impactPerUnit: number
  requiredDelta: number
  requiredValue: number
  acquisitionCostPerUnit: number
  estimatedPaybackMonths: number
}

export interface AdminRevenueTargetGap {
  targetMonthlyRevenue: number
  shortfall: number
  achievedRate: number
  drivers: AdminRevenueTargetDriver[]
}

export interface AdminRevenueProjection {
  assumptions: AdminRevenueAssumption
  monthlyMakerPlanRevenue: number
  monthlyInvestorPlanRevenue: number
  monthlyLeadRevenue: number
  monthlyTransactionRevenue: number
  totalMonthlyRevenue: number
  annualRevenue: number
  verifiedProjectShare: number
  averageCommittedPerInvestor: number
  arpu: number
  arppu: number
  investorLtvEstimate: number
  makerPaybackMonths: number
  investorPaybackMonths: number
  benchmarkGaps: AdminRevenueBenchmark[]
  scenarios: AdminRevenueScenario[]
  targetGap: AdminRevenueTargetGap
}

export interface AdminDashboardMetrics {
  conversionFunnel: AdminFunnelMetric
  eventTrend14d: AdminEventTrendPoint[]
  eventTotals: Record<ProjectEventType, number>
  accessModeDistribution: Array<{
    accessMode: ProjectAccessMode
    projects: number
    verified: number
  }>
  topMatchProjects: AdminTopProjectMetric[]
  topSignalProjects: AdminTopProjectMetric[]
  categoryPerformance: AdminCategoryMetric[]
  proposalRangeDistribution: AdminRangeMetric[]
  riskProjects: AdminRiskProject[]
  health: AdminHealthIndicator
  recommendations: AdminActionRecommendation[]
  revenue: AdminRevenueProjection
  lastUpdatedAt: string
}

export type AuditLogAction =
  | 'match_compliance_accepted'
  | 'review_reported'
  | 'review_hidden_auto'
  | 'review_moderated'

export interface AuditLog {
  id: number
  action: AuditLogAction
  actorEmail: string
  targetType: 'project' | 'review' | 'match'
  targetId: number
  projectId?: number
  message: string
  createdAt: Date
}

export interface ProjectEventSummary {
  total: number
  latestAt: string | null
  counts: Record<ProjectEventType, number>
}

export interface ProjectsState {
  users: User[]
  projects: Project[]
  proposals: MatchProposal[]
  events: ProjectEvent[]
  reviews: ProjectReview[]
  upvotes: ProjectUpvote[]
  logEntries: ProjectLogEntry[]
  auditLogs: AuditLog[]
  nextUserId: number
  nextProjectId: number
  nextProposalId: number
  nextEventId: number
  nextReviewId: number
  nextUpvoteId: number
  nextLogEntryId: number
  nextAuditLogId: number
}

export function createEmptyProjectsState(): ProjectsState {
  return {
    users: [],
    projects: [],
    proposals: [],
    events: [],
    reviews: [],
    upvotes: [],
    logEntries: [],
    auditLogs: [],
    nextUserId: 1,
    nextProjectId: 1,
    nextProposalId: 1,
    nextEventId: 1,
    nextReviewId: 1,
    nextUpvoteId: 1,
    nextLogEntryId: 1,
    nextAuditLogId: 1,
  }
}

import axios, { AxiosError } from 'axios'

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
  category: string
  maturity: ProjectMaturity
  stack?: ProjectStack
  builtWith?: string[]
  customTools?: string[]
  vibeCoded?: boolean
  upvoteCount?: number
  featured?: boolean
  tags?: string[]
  accessMode: ProjectAccessMode
  protectionNoticeAccepted?: boolean
  thumbnail?: string | null
  investorCount: number
  matchCount: number
  committedAmountMin: number
  committedAmountMax: number
  validation: ValidationSnapshot
  createdAt: string
  signalScore?: number
  eventSummary?: ProjectEventSummary
  reviewSummary?: ProjectReviewSummary
}

export type ProjectAccessMode = 'screened' | 'open'
export type ProjectMaturity = 'early' | 'building' | 'live'
export type ProjectStack = 'web' | 'app' | 'game' | 'tools'
export type ProjectEventType = 'create' | 'preview' | 'outbound' | 'match' | 'refresh'
export type ProjectReviewType = 'review' | 'support' | 'idea'
export type ProjectReviewAuthorRole = 'maker' | 'investor' | 'member'
export type ProjectReviewStatus = 'visible' | 'reported' | 'hidden'
export type AuthRole = 'maker' | 'investor' | 'member' | 'admin'

export interface AuthSession {
  id: number
  email: string
  role: AuthRole
  name: string
  expiresAt: string
}

export interface ProjectEventSummary {
  total: number
  latestAt: string | null
  counts: Record<ProjectEventType, number>
}

export interface ProjectEvent {
  id: number
  projectId: number
  type: ProjectEventType
  createdAt: string
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
  lastReportedAt?: string | null
  reportReasons?: Array<{
    reporterEmail: string
    reason?: string | null
    createdAt: string
  }>
  moderatedBy?: string | null
  moderationNote?: string | null
  lastModeratedAt?: string | null
  createdAt: string
}

export interface AdminReportedReview {
  review: ProjectReview
  project: Pick<Project, 'id' | 'title' | 'category' | 'accessMode'>
  replyCount: number
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
  createdAt: string
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

export interface FundingRange {
  id: string
  label: string
  stage: string
  minAmount: number
  maxAmount: number
}

export interface MarketConfig {
  categories: string[]
  accessModes: Array<{
    id: ProjectAccessMode
    label: string
    description: string
  }>
  fundingRanges: FundingRange[]
  refreshIntervalMs: number
  benchmarkSignals: string[]
}

export interface MarketStats {
  totalProjects: number
  verifiedProjects: number
  verificationRate: number
  totalCommittedAmount: number
  totalInvestors: number
  averageResponseMs: number | null
  categoryBreakdown: Array<{ category: string; count: number }>
  totalSignals: number
  topSignals: Array<{
    id: number
    title: string
    category: string
    signalScore: number
    latestEventAt: string | null
  }>
  lastUpdatedAt: string
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
  tags?: string[]
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

export interface AdminRevenueProjectionRequest extends AdminRevenueAssumption {
  scenarioMultipliers?: number[]
  targetMonthlyRevenue?: number
}

export interface AdminActionRecommendation {
  priority: 'high' | 'medium' | 'low'
  area: string
  title: string
  why: string
  nextAction: string
  expectedImpact: string
}

export interface AdminDashboardSnapshot {
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

export interface CreateProjectPayload {
  email: string
  title: string
  description: string
  liveUrl: string
  category: string
  maturity?: ProjectMaturity
  stack?: ProjectStack
  builtWith?: string[]
  customTools?: string[]
  vibeCoded?: boolean
  tags?: string[]
  accessMode: ProjectAccessMode
  protectionNoticeAccepted: boolean
}

export interface CreateMatchPayload {
  fundingRangeId: string
  message: string
  legalNoticeAccepted: boolean
  privacyConsentAccepted: boolean
  riskNoticeAccepted: boolean
}

export interface CreateProjectReviewPayload {
  type: ProjectReviewType
  rating?: number
  parentId?: number
  body: string
}

export interface CreateProjectReviewResponse {
  review: ProjectReview
  project: Project
}

export interface ReportProjectReviewPayload {
  reason?: string
}

export interface ReportProjectReviewResponse {
  review: ProjectReview
  project: Project
}

export interface ModerateProjectReviewPayload {
  action: 'keep' | 'hide' | 'restore'
  note?: string
}

export interface ModerateProjectReviewResponse {
  review: ProjectReview
  project: Project
}

export interface ProjectListQuery {
  q?: string
  category?: string
  tag?: string
  accessMode?: ProjectAccessMode
  sort?: 'signal' | 'recent' | 'created' | 'funding' | 'upvotes'
  stack?: ProjectStack
  minSignal?: number
  minFundingAmount?: number
  maxFundingAmount?: number
  onlyVerified?: boolean
  page?: number
  limit?: number
}

export interface ProjectListResponse {
  data: Project[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

export type ProjectListPayload = Project[] | ProjectListResponse

interface ApiErrorBody {
  message?: string | string[]
}

type ApiErrorResponse = AxiosError<ApiErrorBody>

const DEFAULT_API_PORT = 3003

function sanitizeApiBase(raw: string): string {
  return raw.trim().replace(/\/$/, '')
}

function getBrowserOriginApiBase() {
  const protocol =
    typeof window !== 'undefined' && window.location?.protocol ? window.location.protocol : 'http:'
  const host =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost'

  return sanitizeApiBase(`${protocol}//${host}:${DEFAULT_API_PORT}/api`)
}

export const API_BASE = sanitizeApiBase(
  import.meta.env.VITE_API_BASE_URL || getBrowserOriginApiBase()
)

export const API_BASE_FALLBACKS = Array.from(
  new Set([API_BASE, 'http://localhost:3003/api', 'http://127.0.0.1:3003/api'].map(sanitizeApiBase))
)

const client = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  withCredentials: true,
})

export async function loginUser(email: string, password: string) {
  const response = await client.post<AuthSession>('/projects/auth/login', { email, password })
  return response.data
}

export async function fetchAuthSession() {
  const response = await client.get<AuthSession | null>('/projects/auth/session')
  return response.data
}

export async function logoutUser() {
  const response = await client.post<{ success: boolean }>('/projects/auth/logout')
  return response.data
}

export async function fetchMarketConfig() {
  const response = await client.get<MarketConfig>('/projects/config')
  return response.data
}

export async function fetchMarketStats() {
  const response = await client.get<MarketStats>('/projects/stats')
  return response.data
}

export async function fetchAdminDashboard() {
  const response = await client.get<AdminDashboardSnapshot>('/projects/admin-dashboard')
  return response.data
}

export async function fetchAdminRevenueProjection(config: AdminRevenueProjectionRequest) {
  const response = await client.get<AdminRevenueProjection>('/projects/admin-revenue-projection', {
    params: config,
    paramsSerializer: (params) => {
      const searchParams = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return
        }

        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','))
          return
        }

        searchParams.set(key, String(value))
      })

      return searchParams.toString()
    },
  })
  return response.data
}

export async function fetchAdminReportedReviews() {
  const response = await client.get<AdminReportedReview[]>('/projects/admin-reported-reviews')
  return response.data
}

export async function fetchAdminAuditLogs(limit = 30) {
  const response = await client.get<AuditLog[]>('/projects/admin-audit-logs', {
    params: { limit },
  })
  return response.data
}

export async function fetchProjects(query: ProjectListQuery = {}): Promise<ProjectListPayload> {
  const response = await client.get<ProjectListPayload>('/projects', {
    params: normalizeProjectQuery(query),
  })
  return response.data
}

export async function fetchMarketSnapshot() {
  const [config, stats, projects] = await Promise.all([
    fetchMarketConfig(),
    fetchMarketStats(),
    fetchProjects(),
  ])

  return {
    config,
    stats,
    projects: extractProjects(projects),
  }
}

export async function validateLiveUrl(url: string) {
  const response = await client.post<ValidationSnapshot>('/projects/validate', { url })
  return response.data
}

export async function createProject(payload: CreateProjectPayload) {
  const response = await client.post<Project>('/projects', payload)
  return response.data
}

export async function refreshAllProjects() {
  const response = await client.post<Project[]>('/projects/refresh')
  return response.data
}

export async function refreshProject(id: number) {
  const response = await client.post<Project>(`/projects/${id}/refresh`)
  return response.data
}

export async function createMatchProposal(id: number, payload: CreateMatchPayload) {
  const response = await client.post<Project>(`/projects/${id}/match`, payload)
  return response.data
}

export async function recordProjectEvent(id: number, type: 'preview' | 'outbound' | 'refresh') {
  const response = await client.post<Project>(`/projects/${id}/events`, { type })
  return response.data
}

export async function toggleProjectUpvote(id: number) {
  const response = await client.post<{ project: Project; viewerUpvoted: boolean }>(
    `/projects/${id}/upvote`,
    {}
  )
  return response.data
}

export async function setProjectFeatured(id: number, featured: boolean) {
  const response = await client.post<Project>(`/projects/${id}/featured`, { featured })
  return response.data
}

export async function fetchProjectEvents(id: number) {
  const response = await client.get<ProjectEvent[]>(`/projects/${id}/events`)
  return response.data
}

export async function fetchProjectReviews(id: number) {
  const response = await client.get<ProjectReview[]>(`/projects/${id}/reviews`)
  return response.data
}

export async function createProjectReview(id: number, payload: CreateProjectReviewPayload) {
  const response = await client.post<CreateProjectReviewResponse>(
    `/projects/${id}/reviews`,
    payload
  )
  return response.data
}

export async function reportProjectReview(
  id: number,
  reviewId: number,
  payload: ReportProjectReviewPayload
) {
  const response = await client.post<ReportProjectReviewResponse>(
    `/projects/${id}/reviews/${reviewId}/report`,
    payload
  )
  return response.data
}

export async function moderateProjectReview(
  id: number,
  reviewId: number,
  payload: ModerateProjectReviewPayload
) {
  const response = await client.post<ModerateProjectReviewResponse>(
    `/projects/${id}/reviews/${reviewId}/moderate`,
    payload
  )
  return response.data
}

export function extractProjects(payload: ProjectListPayload): Project[] {
  return Array.isArray(payload) ? payload : payload.data
}

export function hasPagination(payload: ProjectListPayload): payload is ProjectListResponse {
  return !Array.isArray(payload) && typeof payload.total === 'number'
}

function normalizeProjectQuery(query: ProjectListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}

  if (query.q?.trim()) params.q = query.q.trim()
  if (query.category?.trim()) params.category = query.category.trim()
  if (query.tag?.trim()) params.tag = query.tag.trim()
  if (query.accessMode) params.accessMode = query.accessMode
  if (query.sort && query.sort !== 'signal') params.sort = query.sort
  if (query.minSignal !== undefined && Number.isFinite(query.minSignal))
    params.minSignal = query.minSignal
  if (query.minFundingAmount !== undefined && Number.isFinite(query.minFundingAmount))
    params.minFundingAmount = query.minFundingAmount
  if (query.maxFundingAmount !== undefined && Number.isFinite(query.maxFundingAmount))
    params.maxFundingAmount = query.maxFundingAmount
  if (query.onlyVerified === true) params.onlyVerified = 'true'
  if (query.page && Number.isFinite(query.page)) params.page = query.page
  if (query.limit && Number.isFinite(query.limit)) params.limit = query.limit

  return params
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseError = error as ApiErrorResponse
    const rawMessage = responseError.response?.data?.message

    if (Array.isArray(rawMessage)) {
      return rawMessage.join(' ')
    }

    if (typeof rawMessage === 'string' && rawMessage.trim()) {
      return rawMessage
    }

    if (typeof responseError.message === 'string' && responseError.message.trim()) {
      return responseError.message
    }
  }

  return fallback
}

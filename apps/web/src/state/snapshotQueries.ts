import {
  type AdminDashboardSnapshot,
  type AdminRevenueProjection,
  type AdminReportedReview,
  type AuditLog,
  type MarketConfig,
  type MarketStats,
  type ProjectListPayload,
  type ProjectListQuery,
  type AdminRevenueProjectionRequest,
  fetchAdminAuditLogs,
  fetchAdminDashboard,
  fetchAdminReportedReviews,
  fetchAdminRevenueProjection,
  fetchMarketConfig,
  fetchMarketStats,
  fetchProjects,
} from '../infrastructure/api'

/**
 * 서버 상태(스냅샷) react-query 키. 기존 단일 loadSnapshot 이 묶어 가져오던 자원을
 * react-query 캐시 단위로 쪼개되, 가시 동작(폴링·뷰 게이팅·낙관적 갱신)은 그대로 둔다.
 */
export const snapshotKeys = {
  config: ['market', 'config'] as const,
  stats: ['market', 'stats'] as const,
  projects: (query: ProjectListQuery) => ['market', 'projects', query] as const,
  adminSnapshot: (params: AdminRevenueProjectionRequest) => ['admin', 'snapshot', params] as const,
}

export interface AdminSnapshotPayload {
  dashboard: AdminDashboardSnapshot
  revenue: AdminRevenueProjection
  reportedReviews: AdminReportedReview[]
  auditLogs: AuditLog[]
}

export function fetchConfigQuery(): Promise<MarketConfig> {
  return fetchMarketConfig()
}

export function fetchStatsQuery(): Promise<MarketStats> {
  return fetchMarketStats()
}

export function fetchProjectsQuery(query: ProjectListQuery): Promise<ProjectListPayload> {
  return fetchProjects(query)
}

/**
 * 운영 콘솔 번들 — 기존 loadSnapshot 의 admin 분기가 한 Promise.all 로 받던
 * 대시보드/수익추정/신고리뷰/감사로그를 그대로 묶어 한 쿼리로 가져온다(원자성 동일).
 */
export async function fetchAdminSnapshotQuery(
  params: AdminRevenueProjectionRequest
): Promise<AdminSnapshotPayload> {
  const [dashboard, revenue, reportedReviews, auditLogs] = await Promise.all([
    fetchAdminDashboard(),
    fetchAdminRevenueProjection(params),
    fetchAdminReportedReviews(),
    fetchAdminAuditLogs(30),
  ])

  return { dashboard, revenue, reportedReviews, auditLogs }
}

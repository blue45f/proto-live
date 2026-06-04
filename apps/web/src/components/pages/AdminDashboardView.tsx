import { useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  ChartBarBig,
  Clock3,
  DollarSign,
  CalendarClock,
  Loader2,
  Radar,
  ShieldCheck,
  Signal,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import type {
  AdminActionRecommendation,
  AdminDashboardSnapshot,
  AdminReportedReview,
  AuditLog,
  SeasonChallenge,
} from '../../api'
import {
  ADMIN_DASHBOARD_TREND_KEY_DAYS,
  DECIMAL_DIGITS,
  MAX_SCENARIO_MULTIPLIER,
  MIN_SCENARIO_MULTIPLIER,
  REVENUE_MODEL_FIELDS,
  REVENUE_PRESETS,
  type RevenueModelConfig,
} from '../../lib/revenue-config'
import { PRIORITY_COPY } from '../../lib/format'
import {
  formatCurrency,
  formatDaysSince,
  formatDriverValue,
  formatHealthScore,
  formatPaybackValue,
  formatRate,
  formatRelativeTime,
  formatTrendDate,
  formatWon,
  getAuditActionLabel,
  getDriverActionHint,
  getRecommendationAreaMeta,
  getRecommendationPriorityLabel,
  getRecommendationPriorityTone,
  getRecommendationTone,
  isEqualPreset,
  maskEmail,
} from '../../lib/format'

type AdminTrendMetrics = {
  trend: AdminDashboardSnapshot['eventTrend14d']
  recentTotal: number
  previousTotal: number
  trendDelta: number
  maxDaily: number
}

type AdminRevenueProjectionParams = RevenueModelConfig & {
  scenarioMultipliers: number[]
  targetMonthlyRevenue: number
}

export function AdminDashboardView({
  adminDashboard,
  adminDashboardError,
  adminReportedReviews,
  adminAuditLogs,
  moderatingReviewId,
  recommendationSummary,
  orderedAdminRecommendations,
  isApplyingAllAdminRecommendations,
  adminRevenueConfig,
  adminScenarioMultipliers,
  adminRevenueTargetMonthly,
  adminRevenueProjectionParams,
  revenueProjection,
  adminRevenueTargetGap,
  targetGapRate,
  adminRevenueHealthScore,
  adminRevenueHealthTone,
  adminTrendMetrics,
  isAdminDashboardAvailable,
  onModerateReview,
  onApplyAllRecommendations,
  onApplyRecommendation,
  onCopyRevenueSnapshot,
  onExportRevenueReport,
  onApplyObservedConversionRates,
  onApplyRevenueModelPreset,
  onResetScenarioMultipliers,
  onScenarioMultiplierChange,
  onRevenueTargetChange,
  onRevenueInputChange,
  challenge,
  onSetChallenge,
}: {
  adminDashboard: AdminDashboardSnapshot
  adminDashboardError: string
  adminReportedReviews: AdminReportedReview[]
  adminAuditLogs: AuditLog[]
  moderatingReviewId: number | null
  recommendationSummary: { high: number; medium: number; low: number }
  orderedAdminRecommendations: AdminActionRecommendation[]
  isApplyingAllAdminRecommendations: boolean
  adminRevenueConfig: RevenueModelConfig
  adminScenarioMultipliers: number[]
  adminRevenueTargetMonthly: number
  adminRevenueProjectionParams: AdminRevenueProjectionParams
  revenueProjection: AdminDashboardSnapshot['revenue']
  adminRevenueTargetGap: AdminDashboardSnapshot['revenue']['targetGap']
  targetGapRate: number
  adminRevenueHealthScore: number
  adminRevenueHealthTone: string
  adminTrendMetrics: AdminTrendMetrics
  isAdminDashboardAvailable: boolean
  onModerateReview: (entry: AdminReportedReview, action: 'keep' | 'hide' | 'restore') => void
  onApplyAllRecommendations: () => void
  onApplyRecommendation: (entry: AdminActionRecommendation) => void
  onCopyRevenueSnapshot: () => void
  onExportRevenueReport: (format: 'json' | 'csv') => void
  onApplyObservedConversionRates: () => void
  onApplyRevenueModelPreset: (config: RevenueModelConfig) => void
  onResetScenarioMultipliers: () => void
  onScenarioMultiplierChange: (index: number, rawValue: string) => void
  onRevenueTargetChange: (rawValue: string) => void
  onRevenueInputChange: (key: keyof RevenueModelConfig, rawValue: string) => void
  challenge: SeasonChallenge | null
  onSetChallenge: (title: string, description: string) => void
}) {
  const [challengeTitle, setChallengeTitle] = useState(challenge?.title ?? '')
  const [challengeDescription, setChallengeDescription] = useState(challenge?.description ?? '')

  return (
    <section className="col-span-full space-y-6">
      <div className="protolive-panel rounded-xl border border-stone-800 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">시즌 챌린지</p>
        <h3 className="mt-1 text-lg font-black text-stone-50">피드 배너에 노출할 테마</h3>
        <div className="mt-3 grid gap-2">
          <input
            type="text"
            value={challengeTitle}
            maxLength={100}
            onChange={(event) => setChallengeTitle(event.target.value)}
            placeholder="제목 (예: 이번 주 — AI 생산성 도구)"
            className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
          <textarea
            value={challengeDescription}
            maxLength={280}
            rows={2}
            onChange={(event) => setChallengeDescription(event.target.value)}
            placeholder="설명 (제목·설명을 모두 비우고 해제하면 배너가 사라집니다)"
            className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setChallengeTitle('')
                setChallengeDescription('')
                onSetChallenge('', '')
              }}
              className="min-h-10 rounded-lg border border-stone-700 px-4 text-sm font-black text-stone-300 transition hover:text-stone-100"
            >
              해제
            </button>
            <button
              type="button"
              onClick={() => onSetChallenge(challengeTitle, challengeDescription)}
              className="min-h-10 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950"
            >
              게시
            </button>
          </div>
        </div>
      </div>
      <div className="protolive-hero rounded-xl border border-cyan-900/50 bg-[oklch(99.2%_0.004_95)] p-5 shadow-[0_24px_80px_oklch(8%_0.02_205/0.45)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="protolive-badge mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              <DollarSign className="h-3.5 w-3.5" />
              투자 연결 수익 모델 모드
            </p>
            <h2 className="protolive-hero-title text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
              투자 딜 성사율을 높이는 운영 정책을 수익 가정 기반으로 설계하세요.
            </h2>
            <p className="protolive-subtitle mt-3 max-w-[70ch] text-sm leading-6 text-stone-300">
              투자자 유입, 연결 전환, 투자 관심 단계를 기준으로 월/연 매출과 딜 파이프라인 성과를
              즉시 계산해 의사결정에 쓰는 내부 운영 현황입니다.
            </p>
          </div>
          <div className="protolive-mini-tile rounded-lg border border-stone-700/70 bg-stone-950/55 p-3 text-xs text-stone-400">
            <div className="flex items-center gap-2 font-black text-stone-200">
              <CalendarClock className="h-4 w-4 text-cyan-200" />
              최근 업데이트
            </div>
            <p className="mt-1">{formatRelativeTime(adminDashboard.lastUpdatedAt)}</p>
          </div>
        </div>
      </div>

      {adminDashboardError && (
        <div className="rounded-xl border border-red-400/25 bg-red-950/30 p-4 text-sm text-red-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-black">관리자 대시보드 수집 중 문제가 발생했습니다.</p>
              <p className="mt-1 text-red-100/80">{adminDashboardError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section className="protolive-ops-panel rounded-xl border border-amber-300/25 bg-stone-950/65 p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">
                Trust operations
              </p>
              <h3 className="mt-1 text-lg font-black text-stone-50">신고 리뷰 검토 큐</h3>
              <p className="mt-1 text-sm leading-6 text-stone-400">
                신고된 의견을 운영자가 확인하고 공개 유지, 숨김, 복구로 처리합니다.
              </p>
            </div>
            <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
              대기 {adminReportedReviews.length}
            </span>
          </div>
          {adminReportedReviews.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950/45 p-4 text-sm text-stone-400">
              검토 대기 중인 신고 의견이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3">
              {adminReportedReviews.map((entry) => (
                <article
                  key={entry.review.id}
                  className="rounded-xl border border-stone-700/80 bg-[oklch(96.2%_0.008_92)] p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-black text-stone-100">{entry.project.title}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {entry.project.category} · {entry.project.accessMode} · 답글{' '}
                        {entry.replyCount}개
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                        entry.review.status === 'hidden'
                          ? 'border-red-300/45 bg-red-300/10 text-red-100'
                          : 'border-amber-300/45 bg-amber-300/10 text-amber-100'
                      }`}
                    >
                      {entry.review.status === 'hidden'
                        ? '숨김 처리됨'
                        : `신고 ${entry.review.reportCount}회`}
                    </span>
                  </div>
                  <p className="mt-3 overflow-wrap-anywhere rounded-lg border border-stone-800 bg-stone-950/45 p-3 leading-6 text-stone-200">
                    {entry.review.body}
                  </p>
                  <div className="mt-2 grid gap-2 text-xs text-stone-400 sm:grid-cols-2">
                    <p>작성자: {maskEmail(entry.review.authorEmail)}</p>
                    <p>
                      최근 신고:{' '}
                      {entry.review.lastReportedAt
                        ? formatRelativeTime(entry.review.lastReportedAt)
                        : '기록 없음'}
                    </p>
                  </div>
                  {(entry.review.reportReasons ?? []).length > 0 ? (
                    <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/10 p-2 text-xs text-amber-50">
                      <p className="font-black">최근 신고 사유</p>
                      <p className="mt-1 overflow-wrap-anywhere">
                        {(entry.review.reportReasons ?? [])[
                          (entry.review.reportReasons ?? []).length - 1
                        ]?.reason ?? '사유 없음'}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={moderatingReviewId === entry.review.id}
                      onClick={() => void onModerateReview(entry, 'keep')}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-lime-300/45 px-3 text-xs font-black text-lime-100 disabled:opacity-50"
                    >
                      공개 유지
                    </button>
                    <button
                      type="button"
                      disabled={moderatingReviewId === entry.review.id}
                      onClick={() => void onModerateReview(entry, 'hide')}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-300/45 px-3 text-xs font-black text-red-100 disabled:opacity-50"
                    >
                      숨김 처리
                    </button>
                    {entry.review.status === 'hidden' ? (
                      <button
                        type="button"
                        disabled={moderatingReviewId === entry.review.id}
                        onClick={() => void onModerateReview(entry, 'restore')}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-cyan-300/45 px-3 text-xs font-black text-cyan-100 disabled:opacity-50"
                      >
                        복구
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="protolive-ops-panel rounded-xl border border-cyan-300/25 bg-stone-950/65 p-4">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
              Audit trail
            </p>
            <h3 className="mt-1 text-lg font-black text-stone-50">운영 감사 로그</h3>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              신고, 자동 숨김, 운영 처리, 투자 동의 기록을 최신순으로 남깁니다.
            </p>
          </div>
          {adminAuditLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950/45 p-4 text-sm text-stone-400">
              아직 감사 로그가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {adminAuditLogs.slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-stone-800 bg-stone-950/45 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-stone-100">
                      {getAuditActionLabel(entry.action)}
                    </span>
                    <span className="text-stone-500">{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                  <p className="mt-1 overflow-wrap-anywhere text-stone-300">{entry.message}</p>
                  <p className="mt-1 text-stone-500">
                    {maskEmail(entry.actorEmail)} · {entry.targetType} #{entry.targetId}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="protolive-panel rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-lime-200" />
            <h3 className="font-black text-stone-100">플랫폼 건강도</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-black text-stone-300">총점</span>
              <span className="text-stone-100">
                {formatHealthScore(adminDashboard.health.healthScore)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime-300 to-cyan-200"
                style={{ width: `${Math.min(100, adminDashboard.health.healthScore)}%` }}
              />
            </div>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between border-b border-stone-800 pb-1 text-stone-400">
                <span>확인 완료율</span>
                <span className="text-stone-100">
                  {formatRate(adminDashboard.health.verifiedHealth)}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-800 pb-1 text-stone-400">
                <span>퍼널 효율</span>
                <span className="text-stone-100">
                  {formatRate(adminDashboard.health.conversionHealth)}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-800 pb-1 text-stone-400">
                <span>활동성</span>
                <span className="text-stone-100">
                  {formatRate(adminDashboard.health.engagementHealth)}
                </span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>응답성</span>
                <span className="text-stone-100">
                  {formatRate(adminDashboard.health.responseHealth)}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-stone-700 bg-[oklch(96.2%_0.008_92)] p-2 text-xs text-stone-400">
              경고 {adminDashboard.health.warningCount}건 / 리스크 {adminDashboard.health.riskCount}
              건
            </div>
          </div>
        </div>

        <div className="protolive-panel rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-amber-200" />
            <h3 className="font-black text-stone-100">리스크 상위 사이트</h3>
          </div>
          {adminDashboard.riskProjects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
              현재 추적 대상 리스크 사이트가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {adminDashboard.riskProjects.slice(0, 5).map((entry) => (
                <div
                  key={entry.projectId}
                  className="rounded-lg border border-amber-400/30 bg-amber-950/20 p-2 text-xs text-stone-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-black text-stone-100">{entry.title}</p>
                    <span className="rounded-full border border-red-400/50 px-2 py-0.5 text-[10px] text-red-200">
                      위험도 {entry.riskScore}
                    </span>
                  </div>
                  <p className="mt-1 text-stone-400">{entry.reason}</p>
                  <p className="mt-1 text-stone-500">
                    마지막 활동: {formatDaysSince(entry.daysSinceActivity)}
                    {entry.lastActivityAt ? ` · ${formatRelativeTime(entry.lastActivityAt)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="protolive-panel rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <AlertTriangle className="h-4 w-4 text-cyan-200" />
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="font-black text-stone-100">운영 추천 액션</h3>
              <span className="protolive-badge rounded-full border border-stone-700/55 bg-stone-900/55 px-2 py-0.5 text-[10px] font-black tracking-[0.16em] text-stone-300">
                {recommendationSummary.high}/{recommendationSummary.medium}/
                {recommendationSummary.low} (고/중/저)
              </span>
              <span className="protolive-badge rounded-full border border-cyan-300/35 bg-cyan-950/40 px-2 py-0.5 text-xs font-black text-cyan-100">
                {orderedAdminRecommendations.length}건
              </span>
              {orderedAdminRecommendations[0] ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${getRecommendationPriorityTone(
                    orderedAdminRecommendations[0].priority
                  )}`}
                >
                  최상위: {getRecommendationPriorityLabel(orderedAdminRecommendations[0].priority)}{' '}
                  우선순위
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void onApplyAllRecommendations()}
              className={`protolive-btn inline-flex min-h-8 min-w-32 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black text-cyan-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isApplyingAllAdminRecommendations
                  ? 'border-amber-300/45 bg-amber-950/45 animate-pulse hover:bg-amber-900/20'
                  : 'border-cyan-300/45 hover:bg-cyan-300/12'
              }`}
              disabled={
                orderedAdminRecommendations.length === 0 || isApplyingAllAdminRecommendations
              }
            >
              {isApplyingAllAdminRecommendations ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Radar className="h-3.5 w-3.5" />
              )}
              {isApplyingAllAdminRecommendations ? '일괄 적용 중...' : '우선순위 일괄 실행'}
            </button>
          </div>
          {isApplyingAllAdminRecommendations ? (
            <p className="mb-3 rounded-lg border border-amber-300/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
              우선순위 큐 전체 {orderedAdminRecommendations.length}건을 즉시 순차 실행합니다. 적용
              완료 토스트를 확인하세요.
            </p>
          ) : null}
          {orderedAdminRecommendations.length === 0 ? (
            <p className="protolive-empty rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-400">
              즉시 조치할 항목은 없습니다.
              <Sparkles className="ml-2 inline h-3.5 w-3.5 text-cyan-200" />
            </p>
          ) : (
            <div className="protolive-reco-stack space-y-3">
              {orderedAdminRecommendations.map((entry, index) => {
                const areaMeta = getRecommendationAreaMeta(entry.area)
                const AreaIcon = areaMeta.icon

                return (
                  <div
                    key={`${entry.area}-${index}`}
                    className={`protolive-reco-item animate-panel-slide-in rounded-lg border p-3 text-xs ${getRecommendationTone(
                      entry.priority
                    )}`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${areaMeta.tone}`}
                      >
                        <AreaIcon className="h-3 w-3" />
                        {areaMeta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-stone-700/55 bg-stone-900/55 px-2 py-1 text-[10px] font-black text-stone-200">
                        <Sparkles className="h-3 w-3 text-cyan-200" />
                        {PRIORITY_COPY[entry.priority]}
                      </span>
                    </div>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black leading-tight">
                        [{entry.area}] {entry.title}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${getRecommendationPriorityTone(
                          entry.priority
                        )}`}
                      >
                        {getRecommendationPriorityLabel(entry.priority)}
                      </span>
                    </div>
                    <p className="leading-5 text-stone-300">{entry.why}</p>
                    <p className="mt-1 break-words text-stone-200">
                      <span className="font-black">Action:</span> {entry.nextAction}
                    </p>
                    <p className="mt-1 text-stone-200">효과 추정: {entry.expectedImpact}</p>
                    <button
                      type="button"
                      onClick={() => onApplyRecommendation(entry)}
                      className="protolive-btn mt-2 inline-flex min-h-8 items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-sky-950/40 px-3 text-[11px] font-black text-cyan-100 transition hover:bg-cyan-300/20"
                    >
                      <Radar className="h-3.5 w-3.5" />
                      추천 적용
                    </button>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-stone-400">
                      <Sparkles className="h-3 w-3" />
                      {PRIORITY_COPY[entry.priority]} 액션으로 처리 흐름 정리
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-lime-200" />
              <h3 className="font-black text-stone-100">프로젝션 기본 가정</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onCopyRevenueSnapshot()}
                className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100"
              >
                스냅샷 복사
              </button>
              <button
                type="button"
                onClick={() => onExportRevenueReport('json')}
                className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-100"
              >
                JSON 내보내기
              </button>
              <button
                type="button"
                onClick={() => onExportRevenueReport('csv')}
                className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-100"
              >
                CSV 내보내기
              </button>
            </div>
          </div>
          <div className="mb-3 rounded-lg border border-stone-700 bg-stone-950/55 p-3 text-xs">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
              운영 데이터 반영
            </p>
            <p className="mt-1 text-sm font-black text-stone-100">
              관측된 전환율로 수익 가정을 빠르게 덮어씌워 시나리오를 조정하세요.
            </p>
            <button
              type="button"
              onClick={() => void onApplyObservedConversionRates()}
              disabled={!isAdminDashboardAvailable}
              className="mt-3 inline-flex min-h-8 items-center gap-2 rounded-lg border border-cyan-300/50 px-3 py-1 text-[11px] font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              관측 전환율 적용
            </button>
          </div>
          <div className="grid gap-3">
            {REVENUE_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                onClick={() => onApplyRevenueModelPreset(preset.config)}
                className={`rounded-lg border p-3 text-left transition ${
                  isEqualPreset(preset.config, adminRevenueConfig)
                    ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                    : 'border-stone-700 hover:border-cyan-300/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-stone-100">{preset.label}</p>
                  <span className="rounded-full border border-stone-700 px-2 py-1 text-[10px] font-black text-stone-400">
                    {preset.name}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-400">{preset.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-stone-700 bg-stone-950/55 p-3 text-xs">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-black uppercase tracking-[0.14em] text-stone-400">시나리오 배율</p>
              <button
                type="button"
                onClick={onResetScenarioMultipliers}
                className="rounded-lg border border-stone-700 px-2 py-1 text-[10px] font-black text-stone-300"
              >
                기본값
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {adminScenarioMultipliers.map((multiplier, index) => (
                <label
                  key={index}
                  className="block rounded-lg border border-stone-600 bg-stone-900/40 p-2"
                >
                  <span className="mb-1 block text-stone-300">x{index + 1}</span>
                  <input
                    type="number"
                    min={MIN_SCENARIO_MULTIPLIER}
                    max={MAX_SCENARIO_MULTIPLIER}
                    step={0.05}
                    value={multiplier}
                    onChange={(event) => onScenarioMultiplierChange(index, event.target.value)}
                    className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-xs font-black text-stone-100"
                  />
                  <p className="mt-1 truncate text-[10px] text-stone-500">월매출 x {multiplier}</p>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <ChartBarBig className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">월간 수익 지표</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3 md:col-span-2 xl:col-span-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                목표 월매출
              </p>
              <div className="mt-2 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <label className="block text-xs">
                    <span className="font-black text-stone-300">목표값(월)</span>
                    <input
                      type="number"
                      min={0}
                      step={100000}
                      value={adminRevenueTargetMonthly}
                      onChange={(event) => {
                        onRevenueTargetChange(event.target.value)
                      }}
                      className="mt-2 w-full rounded bg-stone-900 border border-stone-700 px-3 py-2 text-xs font-black text-stone-100"
                    />
                  </label>
                  <div className="rounded-lg border border-stone-700/80 p-2">
                    <p className="text-xs text-stone-300">
                      현재 {formatCurrency(revenueProjection.totalMonthlyRevenue)} / 목표{' '}
                      {formatCurrency(adminRevenueProjectionParams.targetMonthlyRevenue ?? 0)}
                    </p>
                    <p className="mt-1 text-sm font-black text-stone-100">
                      달성률 {formatRate(targetGapRate)}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      부족분 {formatCurrency(adminRevenueTargetGap.shortfall)}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-900">
                      <div
                        className={`h-full rounded-full ${
                          adminRevenueTargetGap.shortfall > 0
                            ? 'bg-gradient-to-r from-amber-300 to-red-300'
                            : 'bg-gradient-to-r from-cyan-300 to-lime-200'
                        }`}
                        style={{ width: `${targetGapRate}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                    달성 제안 (상위 3)
                  </p>
                  {adminRevenueTargetGap.drivers.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-stone-700 p-2 text-[11px] text-stone-500">
                      현재 수치로 계산 가능한 제안이 없습니다.
                    </p>
                  ) : (
                    <div className="grid gap-2 lg:grid-cols-3">
                      {adminRevenueTargetGap.drivers.map((driver) => (
                        <div
                          key={driver.key}
                          className="rounded-lg border border-stone-700 bg-stone-950/55 p-2 text-[11px]"
                        >
                          <p className="font-black text-stone-100">{driver.label}</p>
                          <p className="mt-1 text-stone-300">
                            액션 제안: {getDriverActionHint(driver.key)}
                          </p>
                          <p className="mt-1 text-stone-300">
                            현재 {formatDriverValue(driver.currentValue, driver.unit)} · 기여도{' '}
                            {formatCurrency(driver.currentContribution)}
                          </p>
                          <p className="mt-1 text-stone-300">
                            1단위 개선 시 +{formatCurrency(driver.impactPerUnit)} (필요 증분:{' '}
                            {formatDriverValue(driver.requiredDelta, driver.unit)})
                          </p>
                          <p className="mt-1 text-stone-200">
                            달성 목표: {formatDriverValue(driver.requiredValue, driver.unit)}
                          </p>
                          <p className="mt-1 text-stone-400">
                            획득비용 {formatCurrency(driver.acquisitionCostPerUnit)} / 회수{' '}
                            {formatPaybackValue(driver.estimatedPaybackMonths)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={`min-w-0 rounded-lg border p-3 text-xs ${adminRevenueHealthTone}`}>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                수익 건강도
              </p>
              <p className="mt-1 break-words text-lg font-black text-stone-50">
                {adminRevenueHealthScore} / 100
              </p>
              <p className="mt-1">
                {adminRevenueHealthScore >= 80
                  ? '건전'
                  : adminRevenueHealthScore >= 60
                    ? '주의'
                    : '위험'}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-lime-200"
                  style={{ width: `${adminRevenueHealthScore}%` }}
                />
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                월 누적 추정
              </p>
              <p className="mt-1 break-words text-lg font-black text-stone-50">
                {formatCurrency(revenueProjection.totalMonthlyRevenue)}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                연환산 추정
              </p>
              <p className="mt-1 break-words text-lg font-black text-stone-50">
                {formatCurrency(revenueProjection.annualRevenue)}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                확인된 사이트 비중
              </p>
              <p className="mt-1 break-words text-lg font-black text-stone-50">
                {formatRate(revenueProjection.verifiedProjectShare * 100)}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">목표 68%</p>
            </div>
            <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                ARPU / ARPPU
              </p>
              <p className="mt-1 break-words text-sm font-black leading-5 text-stone-50">
                {formatCurrency(revenueProjection.arpu)} / {formatCurrency(revenueProjection.arppu)}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">목표 50,000원 / 500,000원</p>
            </div>
            <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                투자자 LTV & Payback
              </p>
              <p className="mt-1 break-words text-lg font-black leading-6 text-stone-50">
                {formatCurrency(revenueProjection.investorLtvEstimate)} ·{' '}
                {revenueProjection.investorPaybackMonths}개월
              </p>
              <p className="mt-1 text-[11px] text-stone-500">
                창업자 {revenueProjection.makerPaybackMonths}개월
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Signal className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">운영 퍼널</h3>
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                미리보기→연결
              </p>
              <p className="mt-1 text-2xl font-black text-stone-50">
                {formatRate(adminDashboard.conversionFunnel.previewToMatchRate)}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                연결 수치 {adminDashboard.conversionFunnel.matchCount}건 / 미리보기{' '}
                {adminDashboard.conversionFunnel.previewCount}건
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                아웃바운드→연결
              </p>
              <p className="mt-1 text-2xl font-black text-stone-50">
                {formatRate(adminDashboard.conversionFunnel.outboundToMatchRate)}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                연결 수치 {adminDashboard.conversionFunnel.matchCount}건 / 외부열람{' '}
                {adminDashboard.conversionFunnel.outboundCount}건
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                사이트당 연결율
              </p>
              <p className="mt-1 text-2xl font-black text-stone-50">
                {formatRate(adminDashboard.conversionFunnel.matchPerProjectRate)}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                총 이벤트 {adminDashboard.conversionFunnel.totalEvents}건
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <ChartBarBig className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">14일 이벤트 추이</h3>
          </div>
          {!isAdminDashboardAvailable ? (
            <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
              집계가 준비되지 않았습니다.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="mb-1 text-sm font-black text-stone-100">
                최근 {Math.min(adminTrendMetrics.trend.length, ADMIN_DASHBOARD_TREND_KEY_DAYS)}일
                추이 · 최근 7일 {adminTrendMetrics.recentTotal}건 | 이전 7일{' '}
                {adminTrendMetrics.previousTotal}건
                <span
                  className={`ml-2 rounded-full border px-2 py-1 text-[10px] font-black ${
                    adminTrendMetrics.trendDelta >= 0
                      ? 'border-lime-400/40 text-lime-200'
                      : 'border-red-400/40 text-red-200'
                  }`}
                >
                  {adminTrendMetrics.trendDelta >= 0 ? '+' : ''}
                  {adminTrendMetrics.trendDelta}%
                </span>
              </div>
              {adminTrendMetrics.trend.map((point) => {
                const width = (point.total / adminTrendMetrics.maxDaily) * 100
                return (
                  <div key={point.date} className="grid gap-1 text-xs">
                    <div className="flex items-center justify-between text-stone-300">
                      <span>{formatTrendDate(point.date)}</span>
                      <span className="font-black text-stone-100">{point.total}건</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-lime-200 transition-[width]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-200" />
            <h3 className="font-black text-stone-100">이벤트 타입 구성</h3>
          </div>
          <div className="space-y-2">
            {[
              ['create', '등록', adminDashboard.eventTotals.create],
              ['preview', '미리보기', adminDashboard.eventTotals.preview],
              ['outbound', '외부열람', adminDashboard.eventTotals.outbound],
              ['match', '연결', adminDashboard.eventTotals.match],
              ['refresh', '갱신', adminDashboard.eventTotals.refresh],
            ].map(([type, label, count]) => (
              <div
                key={type}
                className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-2"
              >
                <div className="flex items-center justify-between text-xs font-black text-stone-300">
                  <span>{label}</span>
                  <span className="text-stone-50">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">수익 모델 파라미터</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {REVENUE_MODEL_FIELDS.map((field) => (
              <label
                key={field.key}
                className="block rounded-lg border border-stone-700 bg-stone-950/55 p-3 text-xs"
              >
                <span className="mb-1 block font-black text-stone-200">{field.label}</span>
                <input
                  type="number"
                  min={field.kind === 'percent' ? 0 : 0}
                  max={field.kind === 'percent' ? 100 : undefined}
                  step={field.kind === 'percent' ? 0.1 : 1000}
                  value={
                    field.kind === 'percent'
                      ? adminRevenueConfig[field.key].toFixed(DECIMAL_DIGITS)
                      : adminRevenueConfig[field.key]
                  }
                  onChange={(event) => {
                    onRevenueInputChange(field.key, event.target.value)
                  }}
                  className="mt-2 w-full rounded bg-stone-900 border border-stone-700 px-3 py-2 text-xs font-black text-stone-100"
                />
                <p className="mt-2 break-words text-[11px] leading-5 text-stone-500">
                  {field.helper}
                </p>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Signal className="h-4 w-4 text-amber-200" />
            <h3 className="font-black text-stone-100">수익 구성 (월)</h3>
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                창업자 플랜 수익
              </p>
              <p className="mt-1 text-sm font-black text-stone-50">
                {formatCurrency(revenueProjection.monthlyMakerPlanRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                투자자 플랜 수익
              </p>
              <p className="mt-1 text-sm font-black text-stone-50">
                {formatCurrency(revenueProjection.monthlyInvestorPlanRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                리드 기반 수익
              </p>
              <p className="mt-1 text-sm font-black text-stone-50">
                {formatCurrency(revenueProjection.monthlyLeadRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                성공 수수료 수익
              </p>
              <p className="mt-1 text-sm font-black text-stone-50">
                {formatCurrency(revenueProjection.monthlyTransactionRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-200" />
            <h3 className="font-black text-stone-100">벤치마크 갭</h3>
          </div>
          <div className="space-y-2">
            {revenueProjection.benchmarkGaps.map((entry) => (
              <div
                key={entry.key}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  entry.status === 'good'
                    ? 'border-lime-300/40 bg-lime-950/20 text-lime-100'
                    : entry.status === 'warning'
                      ? 'border-amber-300/45 bg-amber-950/20 text-amber-100'
                      : 'border-red-300/45 bg-red-950/20 text-red-100'
                }`}
              >
                <p className="font-black">{entry.label}</p>
                <p className="mt-1">
                  목표:{' '}
                  {entry.unit === 'percent'
                    ? formatRate(entry.target)
                    : formatCurrency(entry.target)}
                </p>
                <p className="mt-1">
                  실적:{' '}
                  {entry.unit === 'percent'
                    ? formatRate(entry.actual)
                    : formatCurrency(entry.actual)}
                </p>
                <p className="mt-1 text-stone-200">{entry.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">시나리오별 월매출</h3>
          </div>
          <div className="space-y-2">
            {revenueProjection.scenarios.map((entry) => (
              <div
                key={entry.label}
                className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-2 text-xs"
              >
                <p className="font-black text-stone-100">
                  {entry.label} ({entry.multiplier}x)
                </p>
                <p className="mt-1 text-stone-300">
                  월 {formatCurrency(entry.monthlyRevenue)} / 연{' '}
                  {formatCurrency(entry.annualRevenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Signal className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">매출 기여도 상위 사이트</h3>
          </div>
          {adminDashboard.topMatchProjects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
              현재 데이터로 계산 가능한 사이트가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {adminDashboard.topMatchProjects.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid rounded-lg border border-stone-700 bg-[oklch(96.2%_0.008_92)] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4"
                >
                  <p className="text-sm font-black text-stone-100">#{index + 1}</p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-stone-100">{entry.title}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      연결/투자가입 {entry.matchCount}/{entry.investorCount} · 투자 신호{' '}
                      {entry.signalScore} · {entry.accessMode}
                    </p>
                  </div>
                  <p className="text-right text-sm font-black text-lime-200">
                    {formatCurrency(entry.committedAmountMax)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Signal className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">신호 기준 상위 사이트</h3>
          </div>
          {adminDashboard.topSignalProjects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
              현재 데이터로 계산 가능한 사이트가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {adminDashboard.topSignalProjects.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid rounded-lg border border-stone-700 bg-[oklch(96.2%_0.008_92)] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4"
                >
                  <p className="text-sm font-black text-stone-100">#{index + 1}</p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-stone-100">{entry.title}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      투자 신호 {entry.signalScore} · 연결/투자가입 {entry.matchCount}/
                      {entry.investorCount}
                    </p>
                  </div>
                  <p className="text-right text-sm font-black text-cyan-200">
                    {formatWon(entry.committedAmountMax)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">카테고리 성과</h3>
          </div>
          {adminDashboard.categoryPerformance.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
              분류할 사이트가 아직 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {adminDashboard.categoryPerformance.map((item) => {
                const denominator = Math.max(
                  1,
                  adminDashboard.categoryPerformance.reduce(
                    (sum, target) => sum + target.projects,
                    0
                  )
                )
                const ratio = (item.projects / denominator) * 100
                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-black text-stone-100">{item.category}</p>
                      <p className="text-stone-400">
                        {item.projects}개 / 투자자 {item.investorCount}명
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-200"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <p className="text-xs text-stone-500">
                      연결 {item.matchCount}건 · 총 커밋 {formatWon(item.committedAmountMax)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Signal className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">연결 제안 구간</h3>
          </div>
          {adminDashboard.proposalRangeDistribution.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
              연결 제안이 아직 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {adminDashboard.proposalRangeDistribution.map((item) => {
                const denominator = Math.max(
                  1,
                  adminDashboard.proposalRangeDistribution.reduce(
                    (sum, target) => sum + target.proposalCount,
                    0
                  )
                )
                const ratio = (item.proposalCount / denominator) * 100
                return (
                  <div
                    key={item.rangeId}
                    className="space-y-2 rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-2"
                  >
                    <div className="flex items-center justify-between text-xs font-black text-stone-200">
                      <span>{item.label}</span>
                      <span className="text-stone-100">{item.proposalCount}건</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full rounded-full bg-lime-300"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-stone-500">
                      평균 예상액 {formatWon(item.averageAmount)} / 총{' '}
                      {formatWon(item.totalMinAmount + item.totalMaxAmount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

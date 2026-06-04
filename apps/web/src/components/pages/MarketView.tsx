import React from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarClock,
  ChartBarBig,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gauge,
  Globe2,
  Link2,
  Radar,
  Search,
  Signal,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import type { AuthSession } from '../../local-auth'
import type {
  FundingRange,
  MarketConfig,
  MarketStats,
  Project,
  ProjectAccessMode,
  ProjectEvent,
  ProjectReview,
  ProjectReviewType,
} from '../../api'
import {
  type ProjectListViewMode,
  PROJECT_LIST_VIEW_OPTIONS,
  benchmarkCopy,
} from '../../lib/constants'
import { formatRelativeTime } from '../../lib/format'
import { ProofKpiRail } from '../ProofKpiRail'
import { ProjectDetailRoute } from '../ProjectDetailRoute'
import { ProjectCard } from '../ProjectCard'
import { EmptyState } from '../EmptyState'
import { ProjectSkeleton } from '../ProjectSkeleton'
import { DifferentiationPanel } from '../DifferentiationPanel'

type ProjectMeta = {
  total: number
  page: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
  limit: number
}

type ActiveFilter = { id: string; label: string; onClear: () => void }

export function MarketView(props: {
  // status / stats
  apiOnline: boolean
  stats: MarketStats
  config: MarketConfig
  isInitialLoading: boolean
  loadError: string
  protectedProjectCount: number
  publicProjectCount: number
  fastestResponseProject: Project | null
  averageSignalDensity: number
  // detail route
  detailProjectId: number | null
  detailProject: Project | null
  diligenceEvents: ProjectEvent[]
  projectReviews: ProjectReview[]
  session: AuthSession | null
  isDiligenceEventsLoading: boolean
  isProjectReviewsLoading: boolean
  reviewType: ProjectReviewType
  reviewRating: number
  reviewBody: string
  replyToReview: ProjectReview | null
  isSendingReview: boolean
  reportingReviewId: number | null
  canRefreshProject: (project: Project) => boolean
  searchInputRef: React.RefObject<HTMLInputElement | null>
  // filters
  categoryOptions: string[]
  tagOptions: string[]
  accessModeOptions: Array<'All' | ProjectAccessMode>
  selectedCategory: string
  selectedTag: string
  selectedAccessMode: 'All' | ProjectAccessMode
  searchQuery: string
  sortMode: 'signal' | 'recent' | 'created' | 'funding'
  projectListView: ProjectListViewMode
  onlyVerified: boolean
  minSignal: number
  minFundingAmount: number
  maxFundingAmount: number
  showFavoritesOnly: boolean
  showAdvancedFilters: boolean
  hasFundingRangeError: boolean
  favoriteProjectCount: number
  favoriteProjectIds: Set<number>
  pageSize: number
  projectMeta: ProjectMeta
  activeFilters: ActiveFilter[]
  activeFilterCount: number
  visibleProjects: Project[]
  signalRankByProjectId: Map<number, number>
  // handlers (detail)
  onBack: () => void
  onDetailPreview: () => void
  onDetailMatch: () => void
  onDetailRefresh: () => void
  onDetailOutbound: () => void
  onSubmitReview: (event: React.FormEvent) => void
  onReviewTypeChange: (type: ProjectReviewType) => void
  onReviewRatingChange: (rating: number) => void
  onReviewBodyChange: (body: string) => void
  onReplyTo: (review: ProjectReview) => void
  onCancelReply: () => void
  onReportReview: (review: ProjectReview) => void
  onDetailLogin: () => void
  // handlers (filters)
  onSelectCategory: (category: string) => void
  onSelectTag: (tag: string) => void
  onSelectAccessMode: (mode: 'All' | ProjectAccessMode) => void
  onSearchChange: (value: string) => void
  onToggleAdvancedFilters: () => void
  onProjectListViewChange: (view: ProjectListViewMode) => void
  onSortSignal: () => void
  onSortRecentClean: () => void
  onSortFunding: () => void
  onToggleOnlyVerified: () => void
  onToggleFavoritesOnly: () => void
  onOnlyVerifiedChange: (value: boolean) => void
  onMinSignalChange: (value: number) => void
  onMinFundingAmountChange: (value: number) => void
  onMaxFundingAmountChange: (value: number) => void
  onClearFundingRange: () => void
  onApplyFundingRange: (range: FundingRange) => void
  onToggleFavoritesOnlyAdvanced: () => void
  onPageSizeChange: (value: number) => void
  onCopyFilterLink: () => void
  onResetFilters: () => void
  onPrevPage: () => void
  onNextPage: () => void
  // handlers (list)
  onCreate: () => void
  onOpenDetail: (project: Project) => void
  onToggleFavorite: (projectId: number) => void
}) {
  const {
    apiOnline,
    stats,
    config,
    isInitialLoading,
    loadError,
    protectedProjectCount,
    publicProjectCount,
    fastestResponseProject,
    averageSignalDensity,
    detailProjectId,
    detailProject,
    diligenceEvents,
    projectReviews,
    session,
    isDiligenceEventsLoading,
    isProjectReviewsLoading,
    reviewType,
    reviewRating,
    reviewBody,
    replyToReview,
    isSendingReview,
    reportingReviewId,
    canRefreshProject,
    searchInputRef,
    categoryOptions,
    tagOptions,
    accessModeOptions,
    selectedCategory,
    selectedTag,
    selectedAccessMode,
    searchQuery,
    sortMode,
    projectListView,
    onlyVerified,
    minSignal,
    minFundingAmount,
    maxFundingAmount,
    showFavoritesOnly,
    showAdvancedFilters,
    hasFundingRangeError,
    favoriteProjectCount,
    favoriteProjectIds,
    pageSize,
    projectMeta,
    activeFilters,
    activeFilterCount,
    visibleProjects,
    signalRankByProjectId,
    onBack,
    onDetailPreview,
    onDetailMatch,
    onDetailRefresh,
    onDetailOutbound,
    onSubmitReview,
    onReviewTypeChange,
    onReviewRatingChange,
    onReviewBodyChange,
    onReplyTo,
    onCancelReply,
    onReportReview,
    onDetailLogin,
    onSelectCategory,
    onSelectTag,
    onSelectAccessMode,
    onSearchChange,
    onToggleAdvancedFilters,
    onProjectListViewChange,
    onSortSignal,
    onSortRecentClean,
    onSortFunding,
    onToggleOnlyVerified,
    onToggleFavoritesOnly,
    onOnlyVerifiedChange,
    onMinSignalChange,
    onMinFundingAmountChange,
    onMaxFundingAmountChange,
    onClearFundingRange,
    onApplyFundingRange,
    onToggleFavoritesOnlyAdvanced,
    onPageSizeChange,
    onCopyFilterLink,
    onResetFilters,
    onPrevPage,
    onNextPage,
    onCreate,
    onOpenDetail,
    onToggleFavorite,
  } = props

  return (
    <>
      <section className="min-w-0 space-y-6">
        <div className="grid gap-4">
          <section className="protolive-hero overflow-hidden rounded-xl border border-cyan-900/50 bg-[linear-gradient(135deg,oklch(19%_0.024_205),oklch(15%_0.02_170)_52%,oklch(17%_0.022_88))] p-4 shadow-[0_24px_80px_oklch(8%_0.02_205/0.45)] sm:p-5">
            <div className="grid min-w-0 gap-5">
              <div className="min-w-0 max-w-3xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                  <Radar className="h-3.5 w-3.5" />
                  프로토타입 프로토타입 둘러보기
                </p>
                <h2 className="overflow-wrap-anywhere text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
                  사이트 주소만 등록하면 평가와 투자 검토가 시작됩니다
                </h2>
                <p className="mt-3 max-w-[72ch] overflow-wrap-anywhere text-sm leading-6 text-stone-300">
                  창업자는 만든 사이트를 올리고, 투자자는 실제 화면을 보고 리뷰한 뒤 투자 관심을
                  남길 수 있습니다.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="protolive-flow-step min-w-0 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-cyan-100">01</span>
                      <Globe2 className="h-4 w-4 text-cyan-100" />
                    </div>
                    <p className="text-sm font-black text-stone-50">사이트 확인</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">
                      입력한 주소가 열리는지 먼저 확인합니다.
                    </p>
                  </div>
                  <div className="protolive-flow-step min-w-0 rounded-lg border border-lime-300/35 bg-lime-300/10 px-3 py-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-lime-100">02</span>
                      <Activity className="h-4 w-4 text-lime-100" />
                    </div>
                    <p className="text-sm font-black text-stone-50">화면 리뷰</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">
                      투자자가 직접 보고 의견과 관심을 남깁니다.
                    </p>
                  </div>
                  <div className="protolive-flow-step min-w-0 rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-100">03</span>
                      <Briefcase className="h-4 w-4 text-amber-100" />
                    </div>
                    <p className="text-sm font-black text-stone-50">투자 관심</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">
                      관심 금액과 메시지를 남겨 다음 대화로 이어집니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="protolive-market-status rounded-lg border border-stone-700/70 bg-stone-950/60 p-4 text-xs text-stone-400">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-black text-stone-100">
                    <Gauge className="h-4 w-4 text-lime-200" />
                    현재 진행 상황
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${apiOnline ? 'bg-lime-300' : 'bg-red-300'}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-3">
                    <p className="text-stone-500">확인 완료율</p>
                    <p className="mt-1 text-lg font-black text-stone-50">
                      {stats.verificationRate}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-3">
                    <p className="text-stone-500">관심 활동</p>
                    <p className="mt-1 text-lg font-black text-stone-50">{stats.totalSignals}</p>
                  </div>
                  <div className="col-span-2 rounded-lg border border-stone-800 bg-stone-950/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500">등록된 사이트</span>
                      <span className="font-black text-stone-100">{stats.totalProjects}개</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-lime-300 to-cyan-300"
                        style={{ width: `${Math.max(4, Math.min(100, stats.verificationRate))}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-2 text-stone-500">
                  <Clock3 className="h-3.5 w-3.5 text-cyan-200" />
                  최근 업데이트 {formatRelativeTime(stats.lastUpdatedAt)}
                </p>
              </div>
            </div>
          </section>
        </div>

        <ProofKpiRail
          stats={stats}
          protectedProjectCount={protectedProjectCount}
          publicProjectCount={publicProjectCount}
          fastestResponseProject={fastestResponseProject}
        />

        {detailProjectId &&
          (detailProject ? (
            <ProjectDetailRoute
              project={detailProject}
              events={diligenceEvents}
              reviews={projectReviews}
              session={session}
              isEventsLoading={isDiligenceEventsLoading}
              isReviewsLoading={isProjectReviewsLoading}
              reviewType={reviewType}
              reviewRating={reviewRating}
              reviewBody={reviewBody}
              replyToReview={replyToReview}
              isSendingReview={isSendingReview}
              canRefresh={canRefreshProject(detailProject)}
              onBack={onBack}
              onPreview={onDetailPreview}
              onMatch={onDetailMatch}
              onRefresh={onDetailRefresh}
              onOutbound={onDetailOutbound}
              onSubmitReview={onSubmitReview}
              onReviewTypeChange={onReviewTypeChange}
              onReviewRatingChange={onReviewRatingChange}
              onReviewBodyChange={onReviewBodyChange}
              onReplyTo={onReplyTo}
              onCancelReply={onCancelReply}
              onReportReview={onReportReview}
              reportingReviewId={reportingReviewId}
              onLogin={onDetailLogin}
            />
          ) : (
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-6 text-sm text-stone-300">
              사이트 상세 정보를 불러오는 중입니다. 잠시만 기다려주세요.
            </div>
          ))}

        {!apiOnline && !isInitialLoading && (
          <div className="rounded-xl border border-red-400/25 bg-red-950/30 p-4 text-sm text-red-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-black">실시간 API 연결이 필요합니다.</p>
                <p className="mt-1 text-red-100/80">{loadError}</p>
                <code className="mt-3 block overflow-x-auto rounded-lg border border-red-300/20 bg-red-950/40 px-3 py-2 text-xs text-red-50">
                  npm run dev
                </code>
              </div>
            </div>
          </div>
        )}

        {!detailProjectId && (
          <>
            <div className="rounded-xl border border-stone-800 bg-[oklch(99.2%_0.004_95)] p-4">
              <div className="space-y-3">
                <div className="protolive-chip-row flex flex-wrap items-center gap-2">
                  {categoryOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onSelectCategory(item)}
                      className={`min-h-10 rounded-lg border px-3 text-xs font-black transition ${
                        selectedCategory === item
                          ? 'border-lime-300/50 bg-lime-300 text-slate-950'
                          : 'border-stone-700 bg-stone-950/50 text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100'
                      }`}
                    >
                      {item === 'All' ? '전체' : item}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={onToggleAdvancedFilters}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 text-xs font-black text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100"
                  >
                    {showAdvancedFilters ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {showAdvancedFilters ? '필터 접기' : '필터 더보기'}
                  </button>
                </div>
                {tagOptions.length > 1 && (
                  <div className="protolive-chip-row flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-black text-stone-500">태그</span>
                    {tagOptions.slice(0, 24).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => onSelectTag(item)}
                        aria-pressed={selectedTag === item}
                        className={`min-h-9 rounded-full border px-3 text-xs font-black transition ${
                          selectedTag === item
                            ? 'border-cyan-300/60 bg-cyan-300 text-slate-950'
                            : 'border-stone-700 bg-stone-950/50 text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100'
                        }`}
                      >
                        {item === 'All' ? '전체 태그' : `#${item}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:w-[360px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder="이름, 설명, URL, 카테고리, 태그 검색"
                      className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950/70 pl-10 pr-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-cyan-300/60"
                    />
                  </div>
                  <div className="protolive-segmented flex w-full overflow-x-auto rounded-lg border border-stone-700 bg-stone-950/60 p-1 lg:w-auto">
                    {PROJECT_LIST_VIEW_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`${option.label} 보기 적용`}
                        aria-pressed={projectListView === option.id}
                        onClick={() => onProjectListViewChange(option.id)}
                        className={`min-h-10 shrink-0 rounded-md px-3 text-left text-xs font-black transition ${
                          projectListView === option.id
                            ? 'bg-lime-300 text-slate-950'
                            : 'text-stone-400 hover:text-stone-100'
                        }`}
                      >
                        <span className="block">{option.label}</span>
                        <span
                          className={`block text-[10px] font-bold ${projectListView === option.id ? 'text-slate-700' : 'text-stone-500'}`}
                        >
                          {option.helper}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="protolive-chip-row flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={sortMode === 'signal'}
                    onClick={onSortSignal}
                    className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                      sortMode === 'signal'
                        ? 'border-cyan-300/70 bg-cyan-300/20 text-cyan-100'
                        : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100'
                    }`}
                  >
                    관심 많은 사이트
                  </button>
                  <button
                    type="button"
                    aria-pressed={sortMode === 'recent' && !onlyVerified && minSignal === 0}
                    onClick={onSortRecentClean}
                    className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                      sortMode === 'recent' && !onlyVerified && minSignal === 0
                        ? 'border-cyan-300/70 bg-cyan-300/20 text-cyan-100'
                        : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100'
                    }`}
                  >
                    최근 움직임 우선
                  </button>
                  <button
                    type="button"
                    aria-pressed={sortMode === 'funding'}
                    onClick={onSortFunding}
                    className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                      sortMode === 'funding'
                        ? 'border-cyan-300/70 bg-cyan-300/20 text-cyan-100'
                        : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100'
                    }`}
                  >
                    예상 투자금 많은 순
                  </button>
                  <button
                    type="button"
                    aria-pressed={onlyVerified}
                    aria-label={onlyVerified ? '확인된 사이트만 토글 해제' : '확인된 사이트만 토글'}
                    onClick={onToggleOnlyVerified}
                    className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                      onlyVerified
                        ? 'border-lime-300/70 bg-lime-300/20 text-lime-100'
                        : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100'
                    }`}
                  >
                    {onlyVerified ? '확인된 사이트만 ON' : '확인된 사이트만'}
                  </button>
                  <button
                    type="button"
                    aria-pressed={showFavoritesOnly}
                    aria-label={showFavoritesOnly ? '즐겨찾기만 보기 해제' : '즐겨찾기만 보기 적용'}
                    onClick={onToggleFavoritesOnly}
                    className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                      showFavoritesOnly
                        ? 'border-amber-300/70 bg-amber-300/20 text-amber-100'
                        : favoriteProjectCount === 0
                          ? 'cursor-not-allowed border-stone-700/80 bg-stone-950/30 text-stone-600'
                          : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-amber-300/50 hover:text-amber-100'
                    }`}
                    disabled={favoriteProjectCount === 0}
                  >
                    <Star
                      className={`h-4 w-4 ${showFavoritesOnly ? 'fill-amber-100 text-amber-100' : 'text-stone-300'}`}
                    />
                    {showFavoritesOnly ? '저장한 사이트만 ON' : '저장한 사이트만'}
                  </button>
                </div>
                {showAdvancedFilters && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {accessModeOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => onSelectAccessMode(item)}
                          className={`min-h-10 rounded-lg border px-3 text-xs font-black transition ${
                            selectedAccessMode === item
                              ? 'border-cyan-300/50 bg-cyan-300 text-slate-950'
                              : 'border-stone-700 bg-stone-950/50 text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-black text-stone-300">투자금 프리셋</p>
                      <div className="flex flex-wrap gap-2">
                        {config.fundingRanges.map((range) => (
                          <button
                            key={range.id}
                            type="button"
                            onClick={() => onApplyFundingRange(range)}
                            className={`min-h-8 rounded-full border px-3 py-1 text-[11px] font-black transition ${
                              range.minAmount === minFundingAmount &&
                              range.maxAmount === maxFundingAmount
                                ? 'border-cyan-300/70 bg-cyan-300/20 text-cyan-100'
                                : 'border-stone-700 bg-stone-950/50 text-stone-300 hover:border-cyan-300/40'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={onClearFundingRange}
                          className="min-h-8 rounded-full border border-stone-700 bg-stone-950/50 px-3 py-1 text-[11px] font-black text-stone-300 hover:border-cyan-300/40"
                        >
                          수동 직접입력
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-black text-stone-300">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 py-2 text-xs">
                        <input
                          type="checkbox"
                          checked={onlyVerified}
                          onChange={(event) => onOnlyVerifiedChange(event.target.checked)}
                        />
                        <span>확인된 사이트만</span>
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 py-2">
                        최소 관심
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={minSignal}
                          onChange={(event) => {
                            const next = Number(event.target.value)
                            onMinSignalChange(
                              Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0
                            )
                          }}
                          className="ml-1 w-20 rounded bg-stone-950 border border-stone-700 px-2 py-1 text-right text-xs font-black text-stone-100 outline-none"
                        />
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 py-2">
                        최소 투자금
                        <input
                          type="number"
                          min={0}
                          step={1000000}
                          value={minFundingAmount}
                          onChange={(event) => {
                            const next = Number(event.target.value)
                            onMinFundingAmountChange(
                              Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0
                            )
                          }}
                          className="ml-1 w-28 rounded bg-stone-950 border border-stone-700 px-2 py-1 text-right text-xs font-black text-stone-100 outline-none"
                        />
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 py-2">
                        최대 투자금
                        <input
                          type="number"
                          min={0}
                          step={1000000}
                          value={maxFundingAmount}
                          onChange={(event) => {
                            const next = Number(event.target.value)
                            onMaxFundingAmountChange(
                              Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0
                            )
                          }}
                          className="ml-1 w-28 rounded bg-stone-950 border border-stone-700 px-2 py-1 text-right text-xs font-black text-stone-100 outline-none"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={onToggleFavoritesOnlyAdvanced}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 ${
                          showFavoritesOnly
                            ? 'border-amber-300/60 bg-amber-300/20 text-amber-100'
                            : 'border-stone-700 bg-stone-950/55 text-stone-300'
                        }`}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            showFavoritesOnly ? 'fill-amber-100 text-amber-100' : 'text-stone-300'
                          }`}
                        />
                        즐겨찾기만
                      </button>
                      <label className="inline-flex min-w-[120px] items-center justify-between gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 py-2">
                        <span>페이지</span>
                        <select
                          value={pageSize}
                          onChange={(event) => {
                            const next = Number(event.target.value)
                            onPageSizeChange(Number.isFinite(next) ? next : 12)
                          }}
                          className="rounded border border-stone-700 bg-stone-900/80 px-2 py-1 text-xs font-black text-stone-100"
                        >
                          {[12, 24, 36, 60, 100].map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p
                      className={`text-xs font-black ${hasFundingRangeError ? 'text-red-300' : 'text-stone-500'}`}
                    >
                      {hasFundingRangeError
                        ? '최소 투자금보다 최대 투자금을 크게 입력해야 합니다.'
                        : '최소/최대 투자금은 각각 개별 입력 후 결합해 검색됩니다.'}
                    </p>
                  </>
                )}
                {activeFilters.length > 0 && (
                  <div className="rounded-lg border border-stone-700 bg-stone-950/45 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                        현재 필터
                        {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                      </span>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onCopyFilterLink}
                          className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/20"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          링크 복사
                        </button>
                        <button
                          type="button"
                          onClick={onResetFilters}
                          className="text-xs font-black text-cyan-200 hover:text-cyan-100"
                        >
                          전체 초기화
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeFilters.map((filter) => (
                        <button
                          type="button"
                          key={filter.id}
                          onClick={filter.onClear}
                          className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100"
                        >
                          <span>{filter.label}</span>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-3 text-xs text-stone-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  {projectMeta.total === 0
                    ? '조회 결과 0건'
                    : `${(projectMeta.page - 1) * projectMeta.limit + 1}-${Math.min(
                        projectMeta.page * projectMeta.limit,
                        projectMeta.total
                      )} / ${projectMeta.total}건`}
                </p>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onPrevPage}
                    disabled={!projectMeta.hasPrev}
                    className={`inline-flex min-h-9 items-center rounded-lg border px-3 font-black transition ${
                      projectMeta.hasPrev
                        ? 'border-stone-700 text-stone-200 hover:border-cyan-300/50 hover:text-cyan-100'
                        : 'cursor-not-allowed border-stone-800 text-stone-500'
                    }`}
                  >
                    이전
                  </button>
                  <span className="rounded-lg border border-stone-700 px-3 py-2">
                    {projectMeta.page} / {projectMeta.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={onNextPage}
                    disabled={!projectMeta.hasNext}
                    className={`inline-flex min-h-9 items-center rounded-lg border px-3 font-black transition ${
                      projectMeta.hasNext
                        ? 'border-stone-700 text-stone-200 hover:border-cyan-300/50 hover:text-cyan-100'
                        : 'cursor-not-allowed border-stone-800 text-stone-500'
                    }`}
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>

            {isInitialLoading ? (
              <ProjectSkeleton />
            ) : visibleProjects.length === 0 ? (
              <EmptyState
                apiOnline={apiOnline}
                onCreate={onCreate}
                onResetFilters={onResetFilters}
                hasActiveFilters={activeFilterCount > 0}
              />
            ) : (
              <div
                className={projectListView === 'cards' ? 'grid gap-4 md:grid-cols-2' : 'grid gap-3'}
              >
                {visibleProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    viewMode={projectListView}
                    signalRank={signalRankByProjectId.get(project.id) ?? null}
                    onOpenDetail={() => onOpenDetail(project)}
                    isFavorite={favoriteProjectIds.has(project.id)}
                    onToggleFavorite={() => onToggleFavorite(project.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <aside className="min-w-0 space-y-4">
        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ChartBarBig className="h-4 w-4 text-cyan-200" />
              <h3 className="font-black text-stone-100">전체 진행 현황</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 bg-stone-900/70 px-2 py-1 text-[10px] font-black text-stone-300">
              <CalendarClock className="h-3 w-3" />
              {formatRelativeTime(stats.lastUpdatedAt)} 갱신
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                확인 완료율
              </p>
              <p className="mt-1 text-lg font-black text-stone-50">{stats.verificationRate}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-300 to-cyan-300 transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, stats.verificationRate))}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                사이트당 관심 활동
              </p>
              <p className="mt-1 text-lg font-black text-stone-50">{averageSignalDensity}</p>
              <p className="mt-2 text-xs text-stone-500">
                투자자가 실제로 살펴본 정도를 보여줍니다.
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-[oklch(96.2%_0.008_92)] p-3 sm:col-span-2">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                최근 활동
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-200">
                누적 활동: <span className="text-cyan-200">{stats.totalSignals}</span> · 등록된
                사이트:{' '}
                <span className="inline-flex items-center gap-1 text-lime-200">
                  <Users className="h-3.5 w-3.5" />
                  {stats.totalProjects}
                </span>{' '}
                · 투자 후보: <span className="text-amber-200">{stats.totalInvestors}</span>
              </p>
            </div>
          </div>
        </div>

        <DifferentiationPanel />

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-lime-200" />
            <h3 className="font-black text-stone-100">투자자가 많이 본 사이트</h3>
          </div>
          {stats.topSignals.length === 0 ? (
            <p className="text-sm leading-6 text-stone-400">
              미리보기, 새 탭 열람, 투자 관심이 쌓이면 실시간 연결 우선순위가 계산됩니다.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topSignals.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-stone-800 bg-[oklch(99.2%_0.004_95)] p-3 transition hover:border-cyan-300/45"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-lime-200">
                        #{index + 1} · {item.category}
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-stone-100">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {formatRelativeTime(item.latestEventAt ?? undefined)}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 text-[11px] font-black text-stone-400">
                        <TrendingUp className="h-3 w-3" />
                        최근 관심 활동 반영
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-2 py-1 text-xs font-black text-slate-950">
                      <Signal className="h-3 w-3" />
                      {item.signalScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Signal className="h-4 w-4 text-cyan-200" />
            <h3 className="font-black text-stone-100">투자 검토 흐름</h3>
          </div>
          <div className="space-y-3">
            {config.benchmarkSignals.map((signal) => {
              const item = benchmarkCopy[signal] ?? {
                title: signal,
                body: 'API에서 전달된 시장 신호입니다.',
              }
              return (
                <div
                  key={signal}
                  className="rounded-lg border border-stone-800 bg-[oklch(99.2%_0.004_95)] p-3"
                >
                  <p className="text-sm font-black text-stone-100">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-400">{item.body}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-200" />
            <h3 className="font-black text-stone-100">분야별 등록</h3>
          </div>
          {stats.categoryBreakdown.length === 0 ? (
            <p className="text-sm leading-6 text-stone-400">
              아직 집계할 사이트가 없습니다. 첫 확인 등록 후 카테고리 분포가 실시간 계산됩니다.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.categoryBreakdown.map((item) => {
                const ratio =
                  stats.totalProjects === 0 ? 0 : (item.count / stats.totalProjects) * 100
                return (
                  <div key={item.category}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-300">{item.category}</span>
                      <span className="text-stone-500">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full rounded-full bg-cyan-300"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

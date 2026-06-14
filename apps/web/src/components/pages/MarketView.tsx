import {
  Activity,
  AlertTriangle,
  ArrowRight,
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
  Loader2,
  Radar,
  Search,
  SearchX,
  Signal,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import React from 'react'

import { ProjectCard } from '../../domains/projects/ProjectCard'
import { ProjectDetailRoute } from '../../domains/projects/ProjectDetailRoute'
import { ProjectSkeleton } from '../../domains/projects/ProjectSkeleton'
import { ProofKpiRail } from '../../domains/projects/ProofKpiRail'
import {
  type ProjectListViewMode,
  PROJECT_LIST_VIEW_OPTIONS,
  benchmarkCopy,
} from '../../lib/constants'
import { formatChallengeDday, formatRelativeTime } from '../../lib/format'
import { downloadIcs } from '../../lib/ics'
import { DifferentiationPanel } from '../DifferentiationPanel'
import { EmptyState } from '../EmptyState'
import { OnboardingTip } from '../OnboardingTip'

import type {
  FundingRange,
  MarketConfig,
  MarketStats,
  Project,
  ProjectAccessMode,
  ProjectEvent,
  ProjectLogEntry,
  ProjectReview,
  ProjectReviewType,
} from '../../infrastructure/api'
import type { AuthSession } from '../../infrastructure/local-auth'

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
  fastestResponseProject: Project | null
  averageSignalDensity: number
  // detail route
  detailProjectId: number | null
  detailProject: Project | null
  isDetailUnavailable: boolean
  diligenceEvents: ProjectEvent[]
  projectReviews: ProjectReview[]
  projectLog: ProjectLogEntry[]
  isProjectLogLoading: boolean
  logBody: string
  onLogBodyChange: (body: string) => void
  onSubmitLog: (event: React.FormEvent) => void
  isSubmittingLog: boolean
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
  sortMode: 'signal' | 'recent' | 'created' | 'funding' | 'upvotes'
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
  upvotedProjectIds: Set<number>
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
  onSortUpvotes: () => void
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
  onOpenAbout: () => void
  onOpenDetail: (project: Project) => void
  onOpenMaker: (makerId: number) => void
  onOpenDiscussions?: () => void
  onToggleFavorite: (projectId: number) => void
  onToggleUpvote: (project: Project) => void
  onToggleFeatured: (project: Project) => void
  canFeature: boolean
}) {
  const {
    apiOnline,
    stats,
    config,
    isInitialLoading,
    loadError,
    fastestResponseProject,
    averageSignalDensity,
    detailProjectId,
    detailProject,
    isDetailUnavailable,
    diligenceEvents,
    projectReviews,
    projectLog,
    isProjectLogLoading,
    logBody,
    onLogBodyChange,
    onSubmitLog,
    isSubmittingLog,
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
    upvotedProjectIds,
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
    onSortUpvotes,
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
    onOpenAbout,
    onOpenDetail,
    onOpenMaker,
    onOpenDiscussions,
    onToggleFavorite,
    onToggleUpvote,
    onToggleFeatured,
    canFeature,
  } = props

  const challenge = config.challenge ?? null
  const challengeDday = challenge?.endsAt ? formatChallengeDday(challenge.endsAt) : null

  /** 챌린지 마감 1시간 전~마감 시각을 리마인더 일정으로 캘린더 앱에 내려준다. */
  function handleAddChallengeToCalendar() {
    if (!challenge?.endsAt) return
    const deadline = new Date(challenge.endsAt)
    if (Number.isNaN(deadline.getTime())) return
    downloadIcs({
      uid: `protolive-challenge-${challenge.updatedAt}`,
      title: `[ProtoLive] ${challenge.title} 마감`,
      description: challenge.description,
      startAt: new Date(deadline.getTime() - 60 * 60 * 1000),
      endAt: deadline,
      url: window.location.origin,
    })
  }

  return (
    <>
      <section className="min-w-0 space-y-6">
        {!detailProjectId && <OnboardingTip onOpenAbout={onOpenAbout} onCreate={onCreate} />}
        {!detailProjectId && challenge && (
          <section className="rounded-xl border border-lime-300/30 bg-lime-300/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">
                  이번 시즌 챌린지
                  {challengeDday && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-lime-300/40 bg-lime-300/15 px-2 py-0.5 text-[11px] font-black normal-case tracking-normal text-lime-100">
                      <Clock3 className="h-3 w-3" />
                      {challengeDday}
                    </span>
                  )}
                </p>
                <h3 className="mt-1 text-lg font-black text-stone-50">{challenge.title}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-300">
                  {challenge.description}
                </p>
              </div>
              {challengeDday && (
                <button
                  type="button"
                  onClick={handleAddChallengeToCalendar}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-lime-300/40 px-3 text-xs font-black text-lime-200 transition hover:bg-lime-300/10"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  캘린더에 추가
                </button>
              )}
            </div>
          </section>
        )}
        <div className="grid gap-4">
          <section className="protolive-hero overflow-hidden rounded-2xl p-5 sm:p-7">
            <div className="grid min-w-0 gap-5">
              <div className="min-w-0 max-w-3xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-200">
                  <Radar className="h-3.5 w-3.5" />
                  메이커 라운지 · 라이브 검증
                </p>
                <h2 className="overflow-wrap-anywhere text-2xl font-black leading-tight tracking-tight text-stone-50 sm:text-3xl">
                  바이브코딩으로 만든 웹앱,
                  <br className="hidden sm:block" />
                  <span className="text-lime-300">살아있는 채로</span> 공유하고 피드백받으세요
                </h2>
                <p className="mt-3 max-w-[68ch] overflow-wrap-anywhere text-sm leading-6 text-stone-300">
                  데모·프로토타입·갓 시작한 초기 빌드도 환영합니다. 진짜 떠 있는 빌드만 올라오고,
                  검증된 상위 빌드는 투자자에게 연결됩니다.
                </p>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                  <div className="protolive-flow-step min-w-0 rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3.5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-lime-200">01</span>
                      <Globe2 className="h-4 w-4 text-lime-200" />
                    </div>
                    <p className="text-sm font-black text-stone-50">공유</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">
                      주소가 실제로 열리는지 서버가 먼저 자동 확인합니다.
                    </p>
                  </div>
                  <div className="protolive-flow-step min-w-0 rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3.5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-lime-200">02</span>
                      <Activity className="h-4 w-4 text-lime-200" />
                    </div>
                    <p className="text-sm font-black text-stone-50">피드백</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">
                      커뮤니티가 단계에 맞춰 리뷰·업보트를 남깁니다.
                    </p>
                  </div>
                  <div className="protolive-flow-step min-w-0 rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3.5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-200">03</span>
                      <Briefcase className="h-4 w-4 text-amber-200" />
                    </div>
                    <p className="text-sm font-black text-stone-50">투자 연결</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">
                      검증된 상위 빌드는 투자자에게 관심으로 이어집니다.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onCreate}
                    className="protolive-btn protolive-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px"
                  >
                    내 사이트 등록하기
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAbout}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-700 px-5 text-sm font-black text-stone-200 transition hover:border-lime-300/50 hover:text-lime-100"
                  >
                    작동 방식 보기
                  </button>
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

        <ProofKpiRail stats={stats} fastestResponseProject={fastestResponseProject} />

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
              projectLog={projectLog}
              isProjectLogLoading={isProjectLogLoading}
              logBody={logBody}
              onLogBodyChange={onLogBodyChange}
              onSubmitLog={onSubmitLog}
              isSubmittingLog={isSubmittingLog}
              onOpenMaker={onOpenMaker}
              onOpenDiscussions={onOpenDiscussions}
            />
          ) : isDetailUnavailable ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-300/10 p-6">
              <div className="flex items-start gap-3">
                <SearchX className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-200" />
                <div className="min-w-0">
                  <p className="font-black text-amber-100">프로젝트를 찾을 수 없어요.</p>
                  <p className="mt-1 text-sm leading-6 text-amber-100/80">
                    삭제되었거나 주소가 잘못되었을 수 있습니다. 피드에서 살아있는 빌드들을
                    둘러보세요.
                  </p>
                  <button
                    type="button"
                    onClick={onBack}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
                  >
                    피드로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/60 p-6 text-sm text-stone-300"
            >
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-lime-200" />
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
            <div className="rounded-xl border border-stone-800 bg-raised p-4">
              <div className="space-y-3">
                <div className="protolive-chip-row flex flex-wrap items-center gap-2">
                  {categoryOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onSelectCategory(item)}
                      aria-pressed={selectedCategory === item}
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
                      aria-label="프로토타입 검색"
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
                    aria-pressed={sortMode === 'upvotes'}
                    onClick={onSortUpvotes}
                    className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                      sortMode === 'upvotes'
                        ? 'border-cyan-300/70 bg-cyan-300/20 text-cyan-100'
                        : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100'
                    }`}
                  >
                    추천순
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
                          aria-pressed={selectedAccessMode === item}
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
                            aria-pressed={
                              range.minAmount === minFundingAmount &&
                              range.maxAmount === maxFundingAmount
                            }
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
                        aria-pressed={showFavoritesOnly}
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
                    isUpvoted={upvotedProjectIds.has(project.id)}
                    onToggleUpvote={() => onToggleUpvote(project)}
                    canFeature={canFeature}
                    onToggleFeatured={() => onToggleFeatured(project)}
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
            <div className="rounded-lg border border-stone-800 bg-sunken p-3">
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
            <div className="rounded-lg border border-stone-800 bg-sunken p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                사이트당 관심 활동
              </p>
              <p className="mt-1 text-lg font-black text-stone-50">{averageSignalDensity}</p>
              <p className="mt-2 text-xs text-stone-500">
                투자자가 실제로 살펴본 정도를 보여줍니다.
              </p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-sunken p-3 sm:col-span-2">
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
                  className="rounded-lg border border-stone-800 bg-raised p-3 transition hover:border-cyan-300/45"
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
                <div key={signal} className="rounded-lg border border-stone-800 bg-raised p-3">
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

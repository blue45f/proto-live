import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  API_BASE,
  AuditLog,
  FundingRange,
  ProjectListQuery,
  AdminReportedReview,
  AdminActionRecommendation,
  MarketConfig,
  MarketStats,
  AdminDashboardSnapshot,
  Project,
  ProjectAccessMode,
  ProjectMaturity,
  ProjectStack,
  ProjectEvent,
  ProjectReview,
  ProjectLogEntry,
  MakerProfile,
  hasPagination,
  createMatchProposal,
  createProject,
  createProjectReview,
  fetchMarketConfig,
  fetchAdminDashboard,
  fetchAdminAuditLogs,
  fetchAdminReportedReviews,
  fetchAdminRevenueProjection,
  fetchAuthSession,
  fetchMarketStats,
  extractProjects,
  fetchProjects,
  fetchProjectEvents,
  fetchProjectLog,
  addProjectLogEntry,
  fetchMakerProfile,
  fetchProjectReviews,
  getApiErrorMessage,
  loginUser,
  logoutUser,
  recordProjectEvent,
  toggleProjectUpvote,
  setProjectFeatured,
  setSeasonChallenge,
  refreshAllProjects,
  refreshProject,
  moderateProjectReview,
  reportProjectReview,
  validateLiveUrl,
} from '../api'
import {
  type AuthSession,
  type TestAccount,
  listTestAccounts,
  readSession,
  resolveRoleLabel,
} from '../local-auth'
import { toast } from '../components/ToastContainer'
import {
  type RevenueModelConfig,
  DEFAULT_SCENARIO_MULTIPLIERS,
  ADMIN_REVENUE_CONFIG_STORAGE_KEY,
  ADMIN_REVENUE_SCENARIO_STORAGE_KEY,
  ADMIN_REVENUE_TARGET_STORAGE_KEY,
  ADMIN_DASHBOARD_POLL_INTERVAL_MS,
  ADMIN_DASHBOARD_TREND_KEY_DAYS,
} from '../lib/revenue-config'
import {
  type AppView,
  type ProjectListViewMode,
  LOGIN_MODAL_KEY,
  ADMIN_PATH_SEGMENT,
  EMPTY_STATS,
  EMPTY_ADMIN_DASHBOARD,
  EMPTY_CONFIG,
  FILTER_PRESET_STORAGE_KEY,
  FILTER_UI_STORAGE_KEY,
  LIST_VIEW_STORAGE_KEY,
  MAX_BUILD_TOOLS,
} from '../lib/constants'
import {
  formatCurrency,
  formatDriverValue,
  formatPaybackValue,
  formatWon,
  getRecommendationSummary,
  isPercentValue,
  normalizeAmountInput,
  normalizeScenarioInputValue,
  percentChange,
  sortAdminRecommendationsByPriority,
  getDriverActionHint,
  upsertProject,
} from '../lib/format'
import { getDialogFocusableElements } from '../lib/dialog'
import {
  clampPageSize,
  clampRate,
  parseTagInput,
  readAdminRevenueConfig,
  readAdminRevenueTarget,
  readAdminScenarioMultipliers,
  readFilterPreset,
  readProjectListViewMode,
} from './storage'
import { matchRoute, navigate, routePath } from '../router/route'
import { useFavorites } from './useFavorites'
import { useReviewComposer } from './useReviewComposer'
import { useUpvotedProjects } from './useUpvotedProjects'

export function useProtoLiveApp() {
  const filterPreset = useMemo(() => readFilterPreset(), [])

  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<MarketStats>(EMPTY_STATS)
  const [config, setConfig] = useState<MarketConfig>(EMPTY_CONFIG)
  const [adminDashboard, setAdminDashboard] =
    useState<AdminDashboardSnapshot>(EMPTY_ADMIN_DASHBOARD)
  const [adminDashboardError, setAdminDashboardError] = useState('')
  const [apiOnline, setApiOnline] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isApplyingAllAdminRecommendations, setIsApplyingAllAdminRecommendations] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [view, setView] = useState<AppView>(() => matchRoute().view)
  const [detailProjectId, setDetailProjectId] = useState<number | null>(
    () => matchRoute().projectId
  )
  const [makerProfileId, setMakerProfileId] = useState<number | null>(() => matchRoute().makerId)
  const [makerProfile, setMakerProfile] = useState<MakerProfile | null>(null)
  const [isMakerProfileLoading, setIsMakerProfileLoading] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const [isSessionHydrating, setIsSessionHydrating] = useState(true)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const testAccounts = useMemo<TestAccount[]>(() => listTestAccounts(), [])
  const testAccountsByRole = useMemo(() => {
    return {
      maker: testAccounts.filter((account) => account.role === 'maker'),
      investor: testAccounts.filter((account) => account.role === 'investor'),
      member: testAccounts.filter((account) => account.role === 'member'),
      admin: testAccounts.filter((account) => account.role === 'admin'),
    }
  }, [testAccounts])
  const [loginEmail, setLoginEmail] = useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    try {
      const raw = localStorage.getItem(LOGIN_MODAL_KEY)
      if (!raw) {
        return ''
      }

      const parsed = JSON.parse(raw) as { email?: string }
      return typeof parsed.email === 'string' ? parsed.email : ''
    } catch {
      return ''
    }
  })
  const [loginPassword, setLoginPassword] = useState('')
  const isAuthenticated = session !== null
  const isMaker = session?.role === 'maker'
  const isInvestor = session?.role === 'investor'
  const isAdmin = session?.role === 'admin'
  const canSubmitProject = isMaker
  const canMatch = isInvestor
  const canAccessAdmin = isAdmin
  const canRefreshProject = useCallback(
    (project: Project) =>
      canAccessAdmin || (session?.role === 'maker' && session.id === project.userId),
    [canAccessAdmin, session]
  )
  const shouldShowLogin = isLoginOpen

  useEffect(() => {
    let isMounted = true

    fetchAuthSession()
      .then((nextSession) => {
        if (isMounted) {
          setSession(nextSession)
          setIsSessionHydrating(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null)
          setIsSessionHydrating(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const effectiveView = useMemo<AppView>(() => {
    if (view === 'admin' && isSessionHydrating) {
      return 'admin'
    }

    if (!session) {
      return 'market'
    }

    return view === 'admin' && !canAccessAdmin ? 'market' : view
  }, [session, view, canAccessAdmin, isSessionHydrating])

  const [adminRevenueConfig, setAdminRevenueConfig] =
    useState<RevenueModelConfig>(readAdminRevenueConfig)
  const [adminReportedReviews, setAdminReportedReviews] = useState<AdminReportedReview[]>([])
  const [adminAuditLogs, setAdminAuditLogs] = useState<AuditLog[]>([])
  const [moderatingReviewId, setModeratingReviewId] = useState<number | null>(null)
  const [adminRevenueTargetMonthly, setAdminRevenueTargetMonthly] = useState(readAdminRevenueTarget)
  const [debouncedAdminRevenueTargetMonthly, setDebouncedAdminRevenueTargetMonthly] =
    useState(adminRevenueTargetMonthly)
  const [adminScenarioMultipliers, setAdminScenarioMultipliers] = useState<number[]>(
    readAdminScenarioMultipliers
  )
  const [debouncedAdminRevenueConfig, setDebouncedAdminRevenueConfig] =
    useState<RevenueModelConfig>(adminRevenueConfig)
  const [debouncedScenarioMultipliers, setDebouncedScenarioMultipliers] =
    useState<number[]>(adminScenarioMultipliers)

  const [searchQuery, setSearchQuery] = useState(filterPreset.q ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(filterPreset.category ?? 'All')
  const [selectedTag, setSelectedTag] = useState(filterPreset.tag ?? 'All')
  const [projectListView, setProjectListView] =
    useState<ProjectListViewMode>(readProjectListViewMode)
  const [selectedAccessMode, setSelectedAccessMode] = useState<'All' | ProjectAccessMode>(
    filterPreset.accessMode === 'open' || filterPreset.accessMode === 'screened'
      ? filterPreset.accessMode
      : 'All'
  )
  const [sortMode, setSortMode] = useState<'signal' | 'recent' | 'created' | 'funding' | 'upvotes'>(
    filterPreset.sort as 'signal' | 'recent' | 'created' | 'funding' | 'upvotes'
  )
  const [page, setPage] = useState(filterPreset.page ?? 1)
  const [pageSize, setPageSize] = useState(clampPageSize(filterPreset.limit ?? 12))
  const [minFundingAmount, setMinFundingAmount] = useState(filterPreset.minFundingAmount ?? 0)
  const [maxFundingAmount, setMaxFundingAmount] = useState(filterPreset.maxFundingAmount ?? 0)
  const [projectMeta, setProjectMeta] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
    limit: 12,
  })
  const [onlyVerified, setOnlyVerified] = useState(filterPreset.onlyVerified ?? false)
  const [minSignal, setMinSignal] = useState(filterPreset.minSignal ?? 0)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(filterPreset.favorites ?? false)
  const { favoriteProjectIds, toggleFavorite } = useFavorites()

  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [category, setCategory] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [accessMode, setAccessMode] = useState<ProjectAccessMode>('screened')
  const [protectionNoticeAccepted, setProtectionNoticeAccepted] = useState(false)
  const [maturity, setMaturity] = useState<ProjectMaturity>('building')
  const [stack, setStack] = useState<ProjectStack | ''>('')
  const [builtWith, setBuiltWith] = useState<string[]>([])
  const [customToolsInput, setCustomToolsInput] = useState('')
  const [vibeCoded, setVibeCoded] = useState(false)
  const { upvotedProjectIds, applyUpvoteResult } = useUpvotedProjects()
  const [urlCheckStatus, setUrlCheckStatus] = useState<'idle' | 'checking' | 'success' | 'error'>(
    'idle'
  )
  const [urlCheckMessage, setUrlCheckMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [previewProject, setPreviewProject] = useState<Project | null>(null)
  const [previewEvents, setPreviewEvents] = useState<ProjectEvent[]>([])
  const [isPreviewEventsLoading, setIsPreviewEventsLoading] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [iframeLoading, setIframeLoading] = useState(false)
  const [diligenceProject, setDiligenceProject] = useState<Project | null>(null)
  const [diligenceEvents, setDiligenceEvents] = useState<ProjectEvent[]>([])
  const [isDiligenceEventsLoading, setIsDiligenceEventsLoading] = useState(false)

  const [matchingProject, setMatchingProject] = useState<Project | null>(null)
  const [fundingRangeId, setFundingRangeId] = useState('')
  const [matchMessage, setMatchMessage] = useState('')
  const [matchLegalNoticeAccepted, setMatchLegalNoticeAccepted] = useState(false)
  const [matchPrivacyConsentAccepted, setMatchPrivacyConsentAccepted] = useState(false)
  const [matchRiskNoticeAccepted, setMatchRiskNoticeAccepted] = useState(false)
  const [isSendingMatch, setIsSendingMatch] = useState(false)
  const [reviewProject, setReviewProject] = useState<Project | null>(null)
  const [projectReviews, setProjectReviews] = useState<ProjectReview[]>([])
  const [isProjectReviewsLoading, setIsProjectReviewsLoading] = useState(false)
  const [projectLog, setProjectLog] = useState<ProjectLogEntry[]>([])
  const [isProjectLogLoading, setIsProjectLogLoading] = useState(false)
  const [logBody, setLogBody] = useState('')
  const [isSubmittingLog, setIsSubmittingLog] = useState(false)
  const {
    reviewType,
    setReviewType,
    reviewRating,
    setReviewRating,
    reviewBody,
    setReviewBody,
    replyToReview,
    setReplyToReview,
    resetReviewComposer,
  } = useReviewComposer()
  const [isSendingReview, setIsSendingReview] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(null)
  const detailProject = useMemo(
    () => projects.find((project) => project.id === detailProjectId) ?? null,
    [detailProjectId, projects]
  )
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    const hasAdvancedFilterPreset =
      (filterPreset.accessMode !== 'All' && filterPreset.accessMode !== undefined) ||
      (filterPreset.onlyVerified ?? false) ||
      (filterPreset.favorites ?? false) ||
      (filterPreset.minSignal ?? 0) > 0 ||
      (filterPreset.minFundingAmount ?? 0) > 0 ||
      (filterPreset.maxFundingAmount ?? 0) > 0

    try {
      const raw = localStorage.getItem(FILTER_UI_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.showAdvancedFilters === 'boolean') {
          return parsed.showAdvancedFilters
        }
      }
    } catch {
      // Ignore UI persistence reads errors and fall back to presets.
    }

    return hasAdvancedFilterPreset
  })
  const isFilterInitialized = useRef(false)
  const previewDialogRef = useRef<HTMLElement>(null)
  const diligenceDialogRef = useRef<HTMLElement>(null)
  const matchModalRef = useRef<HTMLElement>(null)
  const reviewModalRef = useRef<HTMLElement>(null)
  const loginModalRef = useRef<HTMLElement>(null)
  const submitModalRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [isMobileProjectTimelineOpen, setIsMobileProjectTimelineOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const onPopState = () => {
      const route = matchRoute()
      setMakerProfileId(route.makerId)
      setDetailProjectId(route.projectId)
      setView(route.view)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!detailProjectId) {
      return
    }

    fetchProjectReviews(detailProjectId)
      .then((reviews) => setProjectReviews(reviews))
      .catch((error) => {
        toast(
          'error',
          '리뷰 불러오기 실패',
          getApiErrorMessage(error, '리뷰와 답글을 불러오지 못했습니다.')
        )
      })
      .finally(() => setIsProjectReviewsLoading(false))

    fetchProjectEvents(detailProjectId)
      .then((events) => setDiligenceEvents(events))
      .catch(() => setDiligenceEvents([]))
      .finally(() => setIsDiligenceEventsLoading(false))

    setIsProjectLogLoading(true)
    fetchProjectLog(detailProjectId)
      .then((entries) => setProjectLog(entries))
      .catch(() => setProjectLog([]))
      .finally(() => setIsProjectLogLoading(false))
  }, [detailProjectId])

  useEffect(() => {
    if (!makerProfileId) {
      setMakerProfile(null)
      return
    }

    setIsMakerProfileLoading(true)
    fetchMakerProfile(makerProfileId)
      .then((profile) => setMakerProfile(profile))
      .catch(() => setMakerProfile(null))
      .finally(() => setIsMakerProfileLoading(false))
  }, [makerProfileId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const nextPayload = { email: loginEmail.trim() }
      if (nextPayload.email) {
        localStorage.setItem(LOGIN_MODAL_KEY, JSON.stringify(nextPayload))
      } else {
        localStorage.removeItem(LOGIN_MODAL_KEY)
      }
    } catch {
      // Ignore local persistence failures.
    }
  }, [loginEmail])

  useEffect(() => {
    if (session && view === 'admin' && !canAccessAdmin) {
      toast('error', '접근 제한', '관리자 화면은 운영자 계정에서만 접근할 수 있습니다.')
    }
  }, [session, view, canAccessAdmin])

  const categoryOptions = useMemo(() => ['All', ...config.categories], [config.categories])
  const tagOptions = useMemo(
    () => [
      'All',
      ...Array.from(
        new Set([
          ...projects.flatMap((project) => project.tags ?? []),
          ...(selectedTag === 'All' ? [] : [selectedTag]),
        ])
      ).sort((a, b) => a.localeCompare(b, 'ko-KR')),
    ],
    [projects, selectedTag]
  )

  const normalizedCategory =
    selectedCategory === 'All' || config.categories.includes(selectedCategory)
      ? selectedCategory
      : 'All'
  const normalizedTag =
    selectedTag === 'All' || tagOptions.includes(selectedTag) ? selectedTag : 'All'
  const normalizedAccessMode =
    selectedAccessMode === 'All' ||
    config.accessModes.some((mode) => mode.id === selectedAccessMode)
      ? selectedAccessMode
      : 'All'

  const hasFundingRangeError =
    maxFundingAmount > 0 && minFundingAmount > 0 && maxFundingAmount < minFundingAmount

  const projectQuery = useMemo<ProjectListQuery>(() => {
    return {
      q: debouncedSearch,
      category: normalizedCategory === 'All' ? undefined : normalizedCategory,
      tag: normalizedTag === 'All' ? undefined : normalizedTag,
      accessMode: normalizedAccessMode === 'All' ? undefined : normalizedAccessMode,
      sort: sortMode,
      page,
      limit: pageSize,
      minSignal: minSignal > 0 ? minSignal : undefined,
      minFundingAmount:
        minFundingAmount > 0 && !hasFundingRangeError ? minFundingAmount : undefined,
      maxFundingAmount:
        maxFundingAmount > 0 && !hasFundingRangeError ? maxFundingAmount : undefined,
      onlyVerified,
    }
  }, [
    debouncedSearch,
    hasFundingRangeError,
    minSignal,
    maxFundingAmount,
    minFundingAmount,
    onlyVerified,
    normalizedAccessMode,
    normalizedCategory,
    normalizedTag,
    sortMode,
    page,
    pageSize,
  ])

  const adminRevenueProjectionParams = useMemo(
    () => ({
      ...debouncedAdminRevenueConfig,
      scenarioMultipliers: debouncedScenarioMultipliers,
      targetMonthlyRevenue: debouncedAdminRevenueTargetMonthly,
    }),
    [debouncedAdminRevenueConfig, debouncedAdminRevenueTargetMonthly, debouncedScenarioMultipliers]
  )

  const activeFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; onClear: () => void }> = []

    if (debouncedSearch) {
      filters.push({
        id: 'search',
        label: `검색: ${debouncedSearch}`,
        onClear: () => {
          setSearchQuery('')
          setDebouncedSearch('')
          setPage(1)
        },
      })
    }

    if (normalizedCategory !== 'All') {
      filters.push({
        id: 'category',
        label: `카테고리: ${normalizedCategory}`,
        onClear: () => {
          setSelectedCategory('All')
          setPage(1)
        },
      })
    }

    if (normalizedTag !== 'All') {
      filters.push({
        id: 'tag',
        label: `태그: #${normalizedTag}`,
        onClear: () => {
          setSelectedTag('All')
          setPage(1)
        },
      })
    }

    if (normalizedAccessMode !== 'All') {
      filters.push({
        id: 'accessMode',
        label: `공개범위: ${normalizedAccessMode === 'open' ? '공개' : '선별'}`,
        onClear: () => {
          setSelectedAccessMode('All')
          setPage(1)
        },
      })
    }

    if (sortMode !== 'signal') {
      const sortLabel =
        sortMode === 'recent' ? '최신 신호순' : sortMode === 'created' ? '등록순' : '예상 투자금순'
      filters.push({
        id: 'sortMode',
        label: `정렬: ${sortLabel}`,
        onClear: () => {
          setSortMode('signal')
          setPage(1)
        },
      })
    }

    if (onlyVerified) {
      filters.push({
        id: 'verified',
        label: '확인된 사이트만',
        onClear: () => {
          setOnlyVerified(false)
          setPage(1)
        },
      })
    }

    if (showFavoritesOnly) {
      filters.push({
        id: 'favorites',
        label: '즐겨찾기만',
        onClear: () => {
          setShowFavoritesOnly(false)
          setPage(1)
        },
      })
    }

    if (minSignal > 0) {
      filters.push({
        id: 'minSignal',
        label: `최소 관심 ${minSignal}`,
        onClear: () => {
          setMinSignal(0)
          setPage(1)
        },
      })
    }

    if (!hasFundingRangeError && (minFundingAmount > 0 || maxFundingAmount > 0)) {
      const fundingLabel =
        minFundingAmount > 0 && maxFundingAmount > 0
          ? `${formatWon(minFundingAmount)} ~ ${formatWon(maxFundingAmount)}`
          : minFundingAmount > 0
            ? `${formatWon(minFundingAmount)} 이상`
            : `${formatWon(maxFundingAmount)} 이하`

      filters.push({
        id: 'fundingRange',
        label: `투자금 ${fundingLabel}`,
        onClear: () => {
          setMinFundingAmount(0)
          setMaxFundingAmount(0)
          setPage(1)
        },
      })
    }

    return filters
  }, [
    debouncedSearch,
    maxFundingAmount,
    minFundingAmount,
    minSignal,
    onlyVerified,
    normalizedAccessMode,
    normalizedCategory,
    normalizedTag,
    showFavoritesOnly,
    sortMode,
    hasFundingRangeError,
  ])

  const favoriteProjectCount = favoriteProjectIds.size

  const isAdminView = effectiveView === 'admin'
  const isAdminDashboardAvailable =
    adminDashboard.lastUpdatedAt !== EMPTY_ADMIN_DASHBOARD.lastUpdatedAt
  const orderedAdminRecommendations = useMemo(
    () => sortAdminRecommendationsByPriority(adminDashboard.recommendations),
    [adminDashboard.recommendations]
  )
  const recommendationSummary = useMemo(
    () => getRecommendationSummary(orderedAdminRecommendations),
    [orderedAdminRecommendations]
  )

  const revenueProjection = adminDashboard.revenue
  const adminRevenueTargetGap = revenueProjection.targetGap
  const targetGapRate = clampRate(adminRevenueTargetGap.achievedRate, 0, 100)

  const adminTrendMetrics = useMemo(() => {
    const trend = adminDashboard.eventTrend14d
    const totalDays = trend.length
    const splitIndex = Math.max(0, totalDays - ADMIN_DASHBOARD_TREND_KEY_DAYS / 2)
    const recent = trend.slice(splitIndex)
    const previous = splitIndex === 0 ? [] : trend.slice(0, splitIndex)
    const recentTotal = recent.reduce((sum, item) => sum + item.total, 0)
    const previousTotal = previous.reduce((sum, item) => sum + item.total, 0)
    const maxDaily = Math.max(1, ...trend.map((item) => item.total))

    return {
      trend,
      recentTotal,
      previousTotal,
      trendDelta: percentChange(previousTotal, recentTotal),
      maxDaily,
    }
  }, [adminDashboard])

  const adminRevenueHealthScore = useMemo(() => {
    const scores = revenueProjection.benchmarkGaps.map((entry) => {
      if (entry.status === 'good') return 100
      if (entry.status === 'warning') return 65
      return 30
    })

    if (scores.length === 0) {
      return 0
    }

    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length
    return Math.round(average)
  }, [revenueProjection])

  const adminRevenueHealthTone =
    adminRevenueHealthScore >= 80
      ? 'border-lime-300/45 bg-lime-950/20 text-lime-100'
      : adminRevenueHealthScore >= 60
        ? 'border-amber-300/45 bg-amber-950/20 text-amber-100'
        : 'border-red-300/45 bg-red-950/20 text-red-100'

  const applyFundingRange = useCallback((range: FundingRange) => {
    setMinFundingAmount(range.minAmount)
    setMaxFundingAmount(range.maxAmount)
    setPage(1)
  }, [])

  const applyObservedConversionRates = useCallback((): boolean => {
    if (!isAdminDashboardAvailable) {
      toast(
        'error',
        '데이터 없음',
        '관리자 대시보드 집계가 준비되지 않았습니다. 새로고침 후 다시 시도하세요.'
      )
      return false
    }

    const observedMakerRate =
      stats.totalProjects > 0
        ? clampRate((stats.verifiedProjects / stats.totalProjects) * 100)
        : adminRevenueConfig.makerConversionRate
    const observedInvestorRate =
      adminDashboard.conversionFunnel.matchPerProjectRate > 0
        ? adminDashboard.conversionFunnel.matchPerProjectRate
        : adminRevenueConfig.investorConversionRate
    const observedCloseRate =
      adminDashboard.conversionFunnel.previewToMatchRate > 0
        ? adminDashboard.conversionFunnel.previewToMatchRate
        : adminRevenueConfig.closeLeadRate

    setAdminRevenueConfig((current) => ({
      ...current,
      makerConversionRate: observedMakerRate,
      investorConversionRate: observedInvestorRate,
      closeLeadRate: observedCloseRate,
    }))

    toast('info', '운영 데이터 반영', '관측된 전환율로 수익 모델 가정을 업데이트했습니다.')
    return true
  }, [
    adminDashboard.conversionFunnel.matchPerProjectRate,
    adminDashboard.conversionFunnel.previewToMatchRate,
    isAdminDashboardAvailable,
    stats.totalProjects,
    stats.verifiedProjects,
    adminRevenueConfig.closeLeadRate,
    adminRevenueConfig.investorConversionRate,
    adminRevenueConfig.makerConversionRate,
  ])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearch('')
    setSelectedCategory('All')
    setSelectedTag('All')
    setSelectedAccessMode('All')
    setSortMode('signal')
    setMinSignal(0)
    setMinFundingAmount(0)
    setMaxFundingAmount(0)
    setOnlyVerified(false)
    setShowFavoritesOnly(false)
    setPage(1)
  }, [])

  const applyAdminRecommendation = useCallback(
    (entry: AdminActionRecommendation): boolean => {
      const moveToMarket = () => {
        setView('market')
        setPage(1)
      }
      const focusRiskProject = adminDashboard.riskProjects[0]

      if (entry.area === '수익 모델') {
        return applyObservedConversionRates()
      }

      resetFilters()

      if (entry.area === '리스크 관리' && focusRiskProject) {
        setSearchQuery(focusRiskProject.title)
        setDebouncedSearch(focusRiskProject.title)
        setSortMode('recent')
        moveToMarket()
        toast('info', '추천 액션 적용', `${focusRiskProject.title} 리스크 점검 필터를 열었습니다.`)
        return true
      }

      if (entry.area === '퍼널 개선') {
        setOnlyVerified(true)
        setSortMode('funding')
        moveToMarket()
        toast(
          'info',
          '추천 액션 적용',
          '확인된 사이트를 투자 규모순으로 열어 연결 CTA 점검 대상을 좁혔습니다.'
        )
        return true
      }

      if (entry.area === '활동성') {
        setSortMode('recent')
        moveToMarket()
        toast(
          'info',
          '추천 액션 적용',
          '최신 신호순으로 전환해 활동이 낮은 사이트를 빠르게 비교합니다.'
        )
        return true
      }

      if (entry.area === '인프라' || entry.area === '확인 게이트') {
        setSortMode('recent')
        moveToMarket()
        toast(
          'info',
          '추천 액션 적용',
          '최근 등록/확인 흐름으로 이동해 URL 응답 상태를 재점검합니다.'
        )
        return true
      }

      moveToMarket()
      toast('info', '추천 액션 적용', '시장 워크스페이스로 이동해 추천 기준을 점검합니다.')
      return true
    },
    [adminDashboard.riskProjects, applyObservedConversionRates, resetFilters]
  )

  const applyAllAdminRecommendations = useCallback(() => {
    if (isApplyingAllAdminRecommendations) {
      return
    }

    if (orderedAdminRecommendations.length === 0) {
      toast('info', '일괄 적용 미실행', '현재 처리할 운영 추천 항목이 없습니다.')
      return
    }

    setIsApplyingAllAdminRecommendations(true)
    const orderedQueue = [...orderedAdminRecommendations]
    let appliedCount = 0
    let skippedCount = 0

    try {
      orderedQueue.forEach((entry) => {
        const applied = applyAdminRecommendation(entry)
        if (applied) {
          appliedCount += 1
        } else {
          skippedCount += 1
        }
      })

      if (skippedCount === 0) {
        toast(
          'success',
          '일괄 추천 적용',
          `우선순위 순으로 운영 추천 ${appliedCount}건을 모두 실행했습니다.`
        )
      } else {
        toast(
          'info',
          '일괄 추천 적용',
          `운영 추천 ${orderedQueue.length}건 중 ${appliedCount}건 실행, ${skippedCount}건은 현재 조건으로 건너뛰었습니다.`
        )
      }
    } finally {
      setIsApplyingAllAdminRecommendations(false)
    }
  }, [isApplyingAllAdminRecommendations, orderedAdminRecommendations, applyAdminRecommendation])

  const loadSnapshot = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsRefreshing(true)

      try {
        const shouldFetchMarketProjects = !isAdminView
        const [configData, statsData] = await Promise.all([fetchMarketConfig(), fetchMarketStats()])

        setConfig(configData)
        setStats(statsData)
        setAdminDashboardError('')

        if (shouldFetchMarketProjects) {
          const projectsPayload = await fetchProjects(projectQuery)
          const projectPayload = extractProjects(projectsPayload)
          setProjects(projectPayload)
          if (hasPagination(projectsPayload)) {
            setProjectMeta({
              total: projectsPayload.total,
              page: projectsPayload.page,
              totalPages: projectsPayload.totalPages,
              hasPrev: projectsPayload.hasPrev,
              hasNext: projectsPayload.hasNext,
              limit: projectsPayload.limit,
            })
          } else {
            setProjectMeta({
              total: projectPayload.length,
              page: 1,
              totalPages: 1,
              hasPrev: false,
              hasNext: false,
              limit: projectPayload.length,
            })
          }

          setAdminDashboard(EMPTY_ADMIN_DASHBOARD)
        } else {
          const [dashboardPayload, revenueProjection, reportedReviewsPayload, auditLogsPayload] =
            await Promise.all([
              fetchAdminDashboard(),
              fetchAdminRevenueProjection(adminRevenueProjectionParams),
              fetchAdminReportedReviews(),
              fetchAdminAuditLogs(30),
            ])

          setAdminDashboard({
            ...dashboardPayload,
            revenue: revenueProjection,
          })
          setAdminReportedReviews(reportedReviewsPayload)
          setAdminAuditLogs(auditLogsPayload)
        }

        setApiOnline(true)
        setLoadError('')

        if (!fundingRangeId && configData.fundingRanges.length > 0) {
          setFundingRangeId(configData.fundingRanges[2]?.id ?? configData.fundingRanges[0].id)
        }
      } catch (error) {
        const hasResponseError = isAxiosError(error) && Boolean(error.response)
        const message = getApiErrorMessage(error, '요청 처리 중 오류가 발생했습니다.')

        if (hasResponseError) {
          setApiOnline(true)
          setLoadError(message)
          if (isAdminView) {
            setAdminDashboardError(message)
          }
        } else {
          setApiOnline(false)
          setLoadError(
            `백엔드 API에 연결할 수 없습니다. 현재 요청 대상: ${API_BASE}. 서버 실행 후 다시 시도하세요.`
          )
          if (isAdminView) {
            setAdminDashboardError(
              `백엔드 API에 연결할 수 없습니다. 현재 요청 대상: ${API_BASE}. 서버 실행 후 다시 시도하세요.`
            )
          }
        }

        if (showLoading) {
          toast('error', '요청 실패', hasResponseError ? message : `요청 대상: ${API_BASE}`)
        }
      } finally {
        setIsInitialLoading(false)
        setIsRefreshing(false)
      }
    },
    [adminRevenueProjectionParams, fundingRangeId, isAdminView, projectQuery]
  )

  const loadProjectEvents = useCallback(async (projectId: number) => {
    setIsPreviewEventsLoading(true)
    try {
      setPreviewEvents(await fetchProjectEvents(projectId))
    } catch {
      setPreviewEvents([])
    } finally {
      setIsPreviewEventsLoading(false)
    }
  }, [])

  const loadDiligenceEvents = useCallback(async (projectId: number) => {
    setIsDiligenceEventsLoading(true)
    try {
      setDiligenceEvents(await fetchProjectEvents(projectId))
    } catch {
      setDiligenceEvents([])
    } finally {
      setIsDiligenceEventsLoading(false)
    }
  }, [])

  const visibleProjects = useMemo(() => {
    return showFavoritesOnly
      ? projects.filter((project) => favoriteProjectIds.has(project.id))
      : projects
  }, [projects, favoriteProjectIds, showFavoritesOnly])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedAdminRevenueConfig(adminRevenueConfig)
      setDebouncedScenarioMultipliers(adminScenarioMultipliers)
      setDebouncedAdminRevenueTargetMonthly(adminRevenueTargetMonthly)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [adminRevenueConfig, adminRevenueTargetMonthly, adminScenarioMultipliers])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(ADMIN_REVENUE_CONFIG_STORAGE_KEY, JSON.stringify(adminRevenueConfig))
  }, [adminRevenueConfig])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(
      ADMIN_REVENUE_SCENARIO_STORAGE_KEY,
      JSON.stringify(adminScenarioMultipliers)
    )
  }, [adminScenarioMultipliers])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(
      ADMIN_REVENUE_TARGET_STORAGE_KEY,
      JSON.stringify({ targetMonthlyRevenue: adminRevenueTargetMonthly })
    )
  }, [adminRevenueTargetMonthly])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(FILTER_UI_STORAGE_KEY, JSON.stringify({ showAdvancedFilters }))
  }, [showAdvancedFilters])

  useEffect(() => {
    if (!isFilterInitialized.current) {
      isFilterInitialized.current = true
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams()
    const trimmedSearch = debouncedSearch.trim()
    if (trimmedSearch) {
      params.set('q', trimmedSearch)
    }

    if (normalizedCategory !== 'All') {
      params.set('category', normalizedCategory)
    }

    if (normalizedTag !== 'All') {
      params.set('tag', normalizedTag)
    }

    if (normalizedAccessMode !== 'All') {
      params.set('accessMode', normalizedAccessMode)
    }

    if (sortMode !== 'signal') {
      params.set('sort', sortMode)
    }

    if (page > 1) {
      params.set('page', String(page))
    }

    if (pageSize !== 12) {
      params.set('limit', String(pageSize))
    }

    if (minSignal > 0) {
      params.set('minSignal', String(minSignal))
    }

    if (minFundingAmount > 0 && !hasFundingRangeError) {
      params.set('minFundingAmount', String(minFundingAmount))
    }

    if (maxFundingAmount > 0 && !hasFundingRangeError) {
      params.set('maxFundingAmount', String(maxFundingAmount))
    }

    if (onlyVerified) {
      params.set('onlyVerified', 'true')
    }

    if (showFavoritesOnly) {
      params.set('favorites', 'true')
    }

    if (effectiveView === 'admin') {
      params.set('view', 'admin')
    }

    const query = params.toString()
    const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
    const pathSegments = normalizedPath.split('/').filter(Boolean)
    const isAdminPath =
      pathSegments.length > 0 && pathSegments[pathSegments.length - 1] === ADMIN_PATH_SEGMENT
    if (isAdminPath) {
      pathSegments.pop()
    }
    const basePath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : ''
    const nextPathname =
      effectiveView === 'admin' ? `${basePath}/${ADMIN_PATH_SEGMENT}` : basePath || '/'
    const safePathname = `/${nextPathname}`.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/'

    window.history.replaceState({}, '', `${safePathname}${query ? `?${query}` : ''}`)

    localStorage.setItem(
      FILTER_PRESET_STORAGE_KEY,
      JSON.stringify({
        q: trimmedSearch,
        category: normalizedCategory,
        tag: normalizedTag,
        accessMode: normalizedAccessMode,
        sort: sortMode,
        page,
        limit: pageSize,
        minSignal,
        minFundingAmount,
        maxFundingAmount,
        onlyVerified,
        favorites: showFavoritesOnly,
      })
    )
  }, [
    debouncedSearch,
    hasFundingRangeError,
    minFundingAmount,
    maxFundingAmount,
    minSignal,
    normalizedCategory,
    normalizedTag,
    normalizedAccessMode,
    onlyVerified,
    page,
    pageSize,
    showFavoritesOnly,
    effectiveView,
    sortMode,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(LIST_VIEW_STORAGE_KEY, projectListView)
  }, [projectListView])

  const accessModeOptions: Array<'All' | ProjectAccessMode> = [
    'All',
    ...config.accessModes.map((item) => item.id),
  ]
  const activeFundingRange = config.fundingRanges.find((range) => range.id === fundingRangeId)

  const openSubmitDialog = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true)
      toast('error', '로그인 필요', '사이트 제출은 로그인 후 이용할 수 있습니다.')
      return
    }

    if (!canSubmitProject) {
      toast('error', '권한 제한', '사이트 등록은 창업자 계정만 가능합니다.')
      return
    }

    if (!apiOnline || config.categories.length === 0) {
      toast('error', '제출 준비 미완료', '카테고리/공개 범위 설정을 불러온 뒤 다시 시도하세요.')
      return
    }

    if (config.categories.length > 0) {
      setCategory(config.categories.includes(category) ? category : config.categories[0])
    }

    const accessModeIds = config.accessModes.map((item) => item.id)
    if (accessModeIds.length > 0) {
      setAccessMode(accessModeIds.includes(accessMode) ? accessMode : accessModeIds[0])
    }

    setIsSubmitOpen(true)
  }, [
    accessMode,
    apiOnline,
    category,
    canSubmitProject,
    config.accessModes,
    config.categories,
    session,
  ])

  const handleLogin = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()

      try {
        const authenticated = await loginUser(loginEmail, loginPassword)
        setSession(authenticated)
        setIsLoginOpen(false)
        setLoginPassword('')
        toast(
          'success',
          '로그인 성공',
          `${authenticated.name}님, ${resolveRoleLabel(authenticated.role)}로 입장했습니다.`
        )
      } catch (error) {
        toast(
          'error',
          '로그인 실패',
          getApiErrorMessage(error, '이메일 또는 비밀번호가 일치하지 않습니다.')
        )
      }
    },
    [loginEmail, loginPassword]
  )

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser()
    } catch {
      // 서버 세션이 이미 만료된 경우에도 화면 상태는 즉시 정리합니다.
    }

    setSession(null)
    setIsLoginOpen(true)
    setLoginPassword('')
    toast('info', '로그아웃', '세션이 종료되었습니다. 다시 로그인해주세요.')
  }, [])

  const handleRequireMakerOnly = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true)
      toast('error', '로그인 필요', '이 기능은 로그인 후 이용 가능합니다.')
      return false
    }

    if (!canSubmitProject) {
      toast('error', '권한 제한', '권한이 없거나 접근이 제한된 기능입니다.')
      return false
    }

    return true
  }, [canSubmitProject, session])

  const handleRequireInvestorOnly = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true)
      toast('error', '로그인 필요', '이 기능은 로그인 후 이용 가능합니다.')
      return false
    }

    if (!canMatch) {
      toast('error', '권한 제한', '연결/투자 관심은 투자자 계정에서만 가능합니다.')
      return false
    }

    return true
  }, [canMatch, session])

  const handleRequireAdminAccess = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true)
      toast('error', '로그인 필요', '관리자 페이지는 로그인 후 이용 가능합니다.')
      return false
    }

    if (!canAccessAdmin) {
      toast('error', '접근 제한', '관리자 페이지는 운영자 계정에서만 이용할 수 있습니다.')
      return false
    }

    return true
  }, [canAccessAdmin, session])

  const closeModalStack = useCallback(() => {
    setIsSubmitOpen(false)
    setMatchingProject(null)
    setPreviewProject(null)
    setPreviewEvents([])
    setDiligenceProject(null)
    setDiligenceEvents([])
    setIframeLoading(false)
    setIsMobileProjectTimelineOpen(false)
  }, [])

  const switchView = useCallback(
    (nextView: AppView) => {
      if (nextView === view) {
        return
      }

      if (nextView === 'admin' && !handleRequireAdminAccess()) {
        return
      }

      setMakerProfileId(null)
      setView(nextView)
      closeModalStack()
    },
    [closeModalStack, handleRequireAdminAccess, view]
  )

  const applyRevenueModelPreset = useCallback((nextConfig: RevenueModelConfig) => {
    setAdminRevenueConfig(nextConfig)
    toast('info', '수익 모델 템플릿 적용', '관리자 수익 가정을 새 템플릿으로 교체했습니다.')
  }, [])

  const updateRevenueInput = useCallback((key: keyof RevenueModelConfig, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue)
    if (
      key === 'successFeeRate' ||
      key === 'makerConversionRate' ||
      key === 'investorConversionRate' ||
      key === 'closeLeadRate' ||
      key === 'estimatedMonthlyChurnRate'
    ) {
      setAdminRevenueConfig((current) => ({
        ...current,
        [key]: isPercentValue(Number.isFinite(parsed) ? parsed : 0) ? parsed : current[key],
      }))
      return
    }

    setAdminRevenueConfig((current) => ({
      ...current,
      [key]: normalizeAmountInput(parsed),
    }))
  }, [])

  const updateRevenueTargetInput = useCallback((rawValue: string) => {
    const parsed = Number.parseFloat(rawValue)
    setAdminRevenueTargetMonthly((current) =>
      Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : current
    )
  }, [])

  const updateScenarioMultiplier = useCallback((index: number, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue)
    setAdminScenarioMultipliers((current) => {
      const next = [...current]
      next[index] = normalizeScenarioInputValue(Number.isFinite(parsed) ? parsed : current[index])
      if (next[index] <= 0) {
        return current
      }
      return next
    })
  }, [])

  const resetAdminScenarioMultipliers = useCallback(() => {
    setAdminScenarioMultipliers([...DEFAULT_SCENARIO_MULTIPLIERS])
    toast('info', '시나리오 초기화', '시나리오 배율을 기본 값으로 되돌렸습니다.')
  }, [])

  const activeFilterCount = activeFilters.length

  const signalRankByProjectId = useMemo(() => {
    const sorted = [...projects]
      .filter((project) => project.validation !== undefined)
      .sort((a, b) => {
        const aScore = a.signalScore ?? 0
        const bScore = b.signalScore ?? 0
        if (bScore !== aScore) {
          return bScore - aScore
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

    const rankById = new Map<number, number>()
    sorted.forEach((project, index) => {
      rankById.set(project.id, index + 1)
    })

    return rankById
  }, [projects])

  const averageSignalDensity = useMemo(() => {
    if (stats.totalProjects <= 0) return 0
    return Math.round((stats.totalSignals / stats.totalProjects) * 10) / 10
  }, [stats.totalSignals, stats.totalProjects])

  const protectedProjectCount = useMemo(
    () => projects.filter((project) => project.accessMode === 'screened').length,
    [projects]
  )

  const publicProjectCount = useMemo(
    () => projects.filter((project) => project.accessMode === 'open').length,
    [projects]
  )

  const fastestResponseProject = useMemo(() => {
    return (
      [...projects]
        .filter((project) => typeof project.validation.responseTimeMs === 'number')
        .sort(
          (a, b) =>
            (a.validation.responseTimeMs ?? Number.MAX_SAFE_INTEGER) -
            (b.validation.responseTimeMs ?? Number.MAX_SAFE_INTEGER)
        )[0] ?? null
    )
  }, [projects])

  const copyFilterLink = useCallback(async () => {
    if (typeof window === 'undefined') {
      return
    }

    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`
    try {
      await navigator.clipboard.writeText(url)
      toast('success', '필터 링크 복사', '현재 조회 조건 링크가 클립보드에 복사되었습니다.')
    } catch {
      toast('error', '클립보드 복사 실패', '브라우저 권한을 확인하고 다시 시도해 주세요.')
    }
  }, [])

  const buildAdminRevenueSnapshot = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      view: 'admin',
      revenueConfig: adminRevenueConfig,
      scenarioMultipliers: adminScenarioMultipliers,
      query: {
        ...adminRevenueProjectionParams,
      },
      derivedProjection: revenueProjection,
      filters: {
        q: debouncedSearch,
        category: normalizedCategory,
        accessMode: normalizedAccessMode,
        sortMode,
        minSignal,
        minFundingAmount,
        maxFundingAmount,
        onlyVerified,
      },
      adminDashboard: isAdminView
        ? {
            conversionFunnel: adminDashboard.conversionFunnel,
            eventTotals: adminDashboard.eventTotals,
            topMatchProjects: adminDashboard.topMatchProjects,
            riskProjects: adminDashboard.riskProjects,
            health: adminDashboard.health,
            recommendations: adminDashboard.recommendations,
            revenue: adminDashboard.revenue,
          }
        : null,
      projectTotals: {
        totalProjects: stats.totalProjects,
        totalInvestors: stats.totalInvestors,
        verifiedProjects: stats.verifiedProjects,
        totalSignals: stats.totalSignals,
      },
    }
  }, [
    adminDashboard.conversionFunnel,
    adminDashboard.eventTotals,
    adminDashboard.health,
    adminDashboard.recommendations,
    adminDashboard.riskProjects,
    adminDashboard.revenue,
    adminDashboard.topMatchProjects,
    adminRevenueConfig,
    adminRevenueProjectionParams,
    adminScenarioMultipliers,
    debouncedSearch,
    isAdminView,
    maxFundingAmount,
    minFundingAmount,
    minSignal,
    normalizedAccessMode,
    normalizedCategory,
    onlyVerified,
    revenueProjection,
    sortMode,
    stats.totalInvestors,
    stats.totalProjects,
    stats.totalSignals,
    stats.verifiedProjects,
  ])

  const copyAdminRevenueSnapshot = useCallback(async () => {
    const snapshot = buildAdminRevenueSnapshot()
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
      toast(
        'success',
        '수익 가정 저장',
        '현재 관리자 수익 모델/지표 스냅샷이 클립보드에 복사되었습니다.'
      )
    } catch {
      toast('error', '복사 실패', '클립보드 권한을 확인하고 다시 시도하세요.')
    }
  }, [buildAdminRevenueSnapshot])

  const downloadText = useCallback((filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [])

  const escapeCsvValue = (value: unknown) => {
    const escaped = String(value ?? '')
      .replace(/"/g, '""')
      .replace(/\r?\n/g, ' ')
    return `"${escaped}"`
  }

  const exportAdminRevenueReport = useCallback(
    (format: 'json' | 'csv') => {
      try {
        const timestamp = new Date().toISOString()
        const fileBase = `protolive-admin-revenue-${timestamp.replace(/[:.]/g, '-')}`
        const snapshot = buildAdminRevenueSnapshot()

        if (format === 'json') {
          downloadText(
            `${fileBase}.json`,
            JSON.stringify(snapshot, null, 2),
            'application/json;charset=utf-8'
          )
        } else {
          const rows = [
            ['섹션', '항목', '값'],
            ['요약', '기준 월 매출', snapshot.derivedProjection.totalMonthlyRevenue],
            ['요약', '기준 연 매출', snapshot.derivedProjection.annualRevenue],
            ['요약', '수익 건강도', adminRevenueHealthScore],
            ['요약', '목표 월 매출', snapshot.derivedProjection.targetGap.targetMonthlyRevenue],
            ['요약', '목표 달성률', `${snapshot.derivedProjection.targetGap.achievedRate}%`],
            ['요약', '목표 달성 부족분', snapshot.derivedProjection.targetGap.shortfall],
            ['요약', '투자자 LTV', snapshot.derivedProjection.investorLtvEstimate],
            ['요약', '투자자 Payback', snapshot.derivedProjection.investorPaybackMonths],
            ['요약', '창업자 Payback', snapshot.derivedProjection.makerPaybackMonths],
            ['가정', '창업자 월 정액', snapshot.revenueConfig.makerMonthlyFee],
            ['가정', '투자자 월 정액', snapshot.revenueConfig.investorMonthlyFee],
            ['가정', '리드 캡처 단가', snapshot.revenueConfig.leadCaptureFee],
            ['가정', '창업자 전환율', snapshot.revenueConfig.makerConversionRate],
            ['가정', '투자자 전환율', snapshot.revenueConfig.investorConversionRate],
            ['가정', '리드 전환율', snapshot.revenueConfig.closeLeadRate],
            ['가정', '수수료율', snapshot.revenueConfig.successFeeRate],
            ['가정', '창업자 CAC', snapshot.revenueConfig.makerAcquisitionCost],
            ['가정', '투자자 CAC', snapshot.revenueConfig.investorAcquisitionCost],
            ['가정', '월 이탈률', snapshot.revenueConfig.estimatedMonthlyChurnRate],
          ]

          snapshot.scenarioMultipliers.forEach((multiplier) => {
            rows.push(['시나리오 배율', `x${multiplier}`, multiplier])
          })

          snapshot.derivedProjection.scenarios.forEach((entry) => {
            rows.push([
              '시나리오',
              entry.label,
              `${entry.multiplier}x / ${entry.monthlyRevenue} / ${entry.annualRevenue}`,
            ])
          })

          snapshot.derivedProjection.benchmarkGaps.forEach((entry) => {
            rows.push([
              '벤치마크',
              entry.label,
              `${entry.actual} / ${entry.target} / ${entry.gap} / ${entry.status}`,
            ])
          })

          snapshot.derivedProjection.targetGap.drivers.forEach((driver) => {
            rows.push([
              '목표 달성 제안',
              `${driver.label} (현행: ${formatDriverValue(driver.currentValue, driver.unit)} / 1단위효과: ${formatCurrency(
                driver.impactPerUnit
              )} / 필요 증분: ${formatDriverValue(driver.requiredDelta, driver.unit)})`,
              `${getDriverActionHint(driver.key)} / 목표 ${formatDriverValue(driver.requiredValue, driver.unit)} / ${formatCurrency(
                driver.acquisitionCostPerUnit
              )}/단위 / 회수 ${formatPaybackValue(driver.estimatedPaybackMonths)} / 현재 기여 ${formatCurrency(
                driver.currentContribution
              )}`,
            ])
          })

          const csv = rows
            .map((row) => row.map((item) => escapeCsvValue(item)).join(','))
            .join('\n')
          downloadText(`${fileBase}.csv`, csv, 'text/csv;charset=utf-8')
        }

        toast(
          'success',
          '보고서 내보내기',
          `관리자 보고서를 ${format.toUpperCase()} 형식으로 저장했습니다.`
        )
      } catch {
        toast('error', '보고서 내보내기 실패', '브라우저 다운로드 권한을 확인하세요.')
      }
    },
    [adminRevenueHealthScore, buildAdminRevenueSnapshot, downloadText]
  )

  const handleRefreshAll = useCallback(async () => {
    if (!session) {
      setIsLoginOpen(true)
      toast('error', '로그인 필요', '전체 사이트 상태 갱신은 운영자 계정에서만 가능합니다.')
      return
    }

    if (!canAccessAdmin) {
      toast('error', '운영자 권한 필요', '전체 사이트 상태 갱신은 운영자 계정에서만 가능합니다.')
      return
    }

    if (!apiOnline || isRefreshing) {
      return
    }

    setIsRefreshing(true)
    try {
      const refreshed = await refreshAllProjects()
      setProjects(refreshed)
      await loadSnapshot()
      toast('success', '확인 갱신 완료', '모든 사이트의 라이브 상태를 다시 확인했습니다.')
    } catch {
      toast('error', '갱신 실패', '백엔드 사이트 확인 API 응답을 확인하세요.')
    } finally {
      setIsRefreshing(false)
    }
  }, [apiOnline, canAccessAdmin, isRefreshing, loadSnapshot, session])

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [])

  const handleGlobalShortcut = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')

      if (isTypingTarget) {
        return
      }

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        focusSearchInput()
        return
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault()
        openSubmitDialog()
        return
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === 'r' || event.key === 'R')) {
        if (!isRefreshing && apiOnline && canAccessAdmin && projects.length > 0) {
          event.preventDefault()
          void handleRefreshAll()
        }
        return
      }
    },
    [
      apiOnline,
      canAccessAdmin,
      focusSearchInput,
      handleRefreshAll,
      isRefreshing,
      openSubmitDialog,
      projects.length,
    ]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalShortcut)
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcut)
    }
  }, [handleGlobalShortcut])

  useEffect(() => {
    const initialize = async () => {
      await loadSnapshot()
    }
    void initialize()
  }, [loadSnapshot])

  useEffect(() => {
    const timer = window.setInterval(
      () => {
        void loadSnapshot()
      },
      isAdminView ? ADMIN_DASHBOARD_POLL_INTERVAL_MS : config.refreshIntervalMs || 30000
    )

    return () => window.clearInterval(timer)
  }, [config.refreshIntervalMs, isAdminView, loadSnapshot])

  useEffect(() => {
    const hasOverlayOpen = Boolean(
      previewProject ||
      diligenceProject ||
      matchingProject ||
      reviewProject ||
      isSubmitOpen ||
      shouldShowLogin
    )
    if (!hasOverlayOpen) {
      return
    }

    const activeDialogRef = previewProject
      ? previewDialogRef
      : diligenceProject
        ? diligenceDialogRef
        : matchingProject
          ? matchModalRef
          : reviewProject
            ? reviewModalRef
            : shouldShowLogin
              ? loginModalRef
              : submitModalRef

    if (!activeDialogRef.current) {
      return
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : previousFocusRef.current

    const focusables = getDialogFocusableElements(activeDialogRef.current)
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      activeDialogRef.current.focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()

        if (previewProject) {
          setPreviewProject(null)
          setPreviewEvents([])
          return
        }

        if (diligenceProject) {
          setDiligenceProject(null)
          setDiligenceEvents([])
          return
        }

        if (matchingProject) {
          setMatchingProject(null)
          return
        }

        if (reviewProject) {
          setReviewProject(null)
          setProjectReviews([])
          resetReviewComposer()
          return
        }

        if (isSubmitOpen) {
          setIsSubmitOpen(false)
          return
        }

        if (shouldShowLogin) {
          setIsLoginOpen(false)
        }
        return
      }

      if (event.key !== 'Tab' || focusables.length === 0) {
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeElement = document.activeElement as HTMLElement | null

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)

      const restoreTarget = previousFocusRef.current
      if (restoreTarget) {
        restoreTarget.focus()
      }
    }
  }, [
    diligenceProject,
    matchingProject,
    previewProject,
    reviewProject,
    shouldShowLogin,
    isSubmitOpen,
  ])

  async function handleVerifyUrl() {
    if (!liveUrl.trim()) {
      setUrlCheckStatus('error')
      setUrlCheckMessage('확인할 URL을 입력하세요.')
      return
    }

    setUrlCheckStatus('checking')
    setUrlCheckMessage('공인망 HTTP/HTTPS URL과 실제 응답 상태를 확인 중입니다.')

    try {
      const result = await validateLiveUrl(liveUrl)
      setUrlCheckStatus(result.success ? 'success' : 'error')
      setUrlCheckMessage(
        `${result.message}${result.responseTimeMs ? ` · ${result.responseTimeMs}ms` : ''}`
      )
    } catch {
      setUrlCheckStatus('error')
      setUrlCheckMessage('API 확인 요청이 실패했습니다. 백엔드 연결 상태를 확인하세요.')
    }
  }

  async function handleToggleUpvote(project: Project) {
    if (!session) {
      setIsLoginOpen(true)
      return
    }

    try {
      const { project: updated, viewerUpvoted } = await toggleProjectUpvote(project.id)
      setProjects((current) => upsertProject(current, updated))
      applyUpvoteResult(project.id, viewerUpvoted)
    } catch (error) {
      toast('error', '추천 실패', getApiErrorMessage(error, '추천을 처리하지 못했습니다.'))
    }
  }

  async function handleSetChallenge(title: string, description: string) {
    if (!canAccessAdmin) {
      return
    }

    try {
      const challenge = await setSeasonChallenge(title, description)
      setConfig((current) => ({ ...current, challenge }))
      toast(
        'success',
        '시즌 챌린지 업데이트',
        challenge ? '챌린지를 게시했습니다.' : '챌린지를 해제했습니다.'
      )
    } catch (error) {
      toast('error', '업데이트 실패', getApiErrorMessage(error, '챌린지를 변경하지 못했습니다.'))
    }
  }

  async function handleToggleFeatured(project: Project) {
    if (!canAccessAdmin) {
      return
    }

    try {
      const updated = await setProjectFeatured(project.id, !project.featured)
      setProjects((current) => upsertProject(current, updated))
      toast(
        'success',
        updated.featured ? '투자 검토 대상 등록' : '투자 검토 대상 해제',
        `${updated.title} 상태를 업데이트했습니다.`
      )
    } catch (error) {
      toast('error', '처리 실패', getApiErrorMessage(error, '투자 검토 상태를 바꾸지 못했습니다.'))
    }
  }

  function toggleBuildTool(id: string) {
    setBuiltWith((current) =>
      current.includes(id)
        ? current.filter((tool) => tool !== id)
        : current.length >= MAX_BUILD_TOOLS
          ? current
          : [...current, id]
    )
  }

  async function handleSubmitProject(event: React.FormEvent) {
    event.preventDefault()
    if (!handleRequireMakerOnly()) {
      return
    }

    if (!protectionNoticeAccepted) {
      toast(
        'error',
        '노출 위험 확인 필요',
        '상용화 전 서비스 보호 안내와 제출 권한을 확인해야 합니다.'
      )
      return
    }

    if (urlCheckStatus !== 'success') {
      toast('error', '사이트 확인 필요', '실시간 사이트 확인을 통과한 뒤 등록할 수 있습니다.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await createProject({
        email: session?.email ?? '',
        title,
        description,
        liveUrl,
        category,
        maturity,
        stack: stack || undefined,
        builtWith: builtWith.length > 0 ? builtWith : undefined,
        customTools: parseTagInput(customToolsInput),
        vibeCoded,
        tags: parseTagInput(tagInput),
        accessMode,
        protectionNoticeAccepted,
      })

      setProjects((current) => upsertProject(current, created))
      await loadSnapshot()
      setTitle('')
      setDescription('')
      setLiveUrl('')
      setTagInput('')
      setAccessMode('screened')
      setMaturity('building')
      setStack('')
      setBuiltWith([])
      setCustomToolsInput('')
      setVibeCoded(false)
      setProtectionNoticeAccepted(false)
      setUrlCheckStatus('idle')
      setUrlCheckMessage('')
      setIsSubmitOpen(false)
      toast('success', '확인 등록 완료', `${created.title}이(가) 라이브 마켓에 등록되었습니다.`)
    } catch (error) {
      toast('error', '등록 실패', getApiErrorMessage(error, '사이트 등록에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRefreshProject(project: Project) {
    if (!session) {
      setIsLoginOpen(true)
      toast('error', '로그인 필요', '사이트 상태 재확인은 운영자 또는 등록한 창업자만 가능합니다.')
      return
    }

    if (!canRefreshProject(project)) {
      toast(
        'error',
        '권한 제한',
        '사이트 상태 재확인은 운영자 또는 이 프로젝트를 등록한 창업자만 가능합니다.'
      )
      return
    }

    setProjects((current) =>
      current.map((item) =>
        item.id === project.id
          ? {
              ...item,
              validation: {
                ...item.validation,
                message: '상태 재확인 중입니다.',
              },
            }
          : item
      )
    )

    try {
      const refreshed = await refreshProject(project.id)
      setProjects((current) => upsertProject(current, refreshed))
      setDiligenceProject((current) => (current?.id === refreshed.id ? refreshed : current))
      await loadSnapshot()
      toast('success', '사이트 갱신', `${refreshed.title} 상태를 갱신했습니다.`)
    } catch (error) {
      toast(
        'error',
        '사이트 갱신 실패',
        getApiErrorMessage(error, `${project.title} 상태를 갱신하지 못했습니다.`)
      )
    }
  }

  function closePreview() {
    setPreviewProject(null)
    setPreviewEvents([])
    setIsMobileProjectTimelineOpen(false)
  }

  function closeDiligence() {
    setDiligenceProject(null)
    setDiligenceEvents([])
  }

  function closeReviewDialog() {
    setReviewProject(null)
    setProjectReviews([])
    resetReviewComposer()
  }

  async function handleSubmitLog(event: React.FormEvent) {
    event.preventDefault()
    if (!detailProject) {
      return
    }
    if (!session) {
      setIsLoginOpen(true)
      return
    }

    const body = logBody.trim()
    if (!body) {
      return
    }

    setIsSubmittingLog(true)
    try {
      const entries = await addProjectLogEntry(detailProject.id, body)
      setProjectLog(entries)
      setLogBody('')
      toast('success', '메이커로그 등록', '제작 과정 기록을 추가했습니다.')
    } catch (error) {
      toast('error', '등록 실패', getApiErrorMessage(error, '메이커로그를 추가하지 못했습니다.'))
    } finally {
      setIsSubmittingLog(false)
    }
  }

  async function handleSubmitReview(event: React.FormEvent) {
    event.preventDefault()

    const targetProject = reviewProject ?? detailProject
    if (!targetProject) return

    if (!session) {
      closeReviewDialog()
      setIsLoginOpen(true)
      toast('error', '로그인이 필요합니다', '로그인한 회원만 평가, 리뷰, 답글을 남길 수 있습니다.')
      return
    }

    const body = reviewBody.trim()
    if (body.length < 5) {
      toast('error', '조금 더 자세히 적어주세요', '의견은 5자 이상 입력해야 합니다.')
      return
    }

    setIsSendingReview(true)
    try {
      const result = await createProjectReview(targetProject.id, {
        type: replyToReview?.type ?? reviewType,
        rating: replyToReview ? undefined : reviewType === 'review' ? reviewRating : undefined,
        parentId: replyToReview?.id,
        body,
      })

      setProjectReviews((current) =>
        current.some((review) => review.id === result.review.id)
          ? current.map((review) => (review.id === result.review.id ? result.review : review))
          : [...current, result.review]
      )
      setProjects((current) => upsertProject(current, result.project))
      setReviewProject((current) => (current?.id === result.project.id ? result.project : current))
      await loadSnapshot()
      setReviewBody('')
      setReplyToReview(null)
      toast(
        'success',
        replyToReview ? '답글 등록 완료' : '리뷰 등록 완료',
        replyToReview
          ? '대댓글이 스레드에 추가되었습니다.'
          : '회원 의견이 사이트 성장 기록에 반영되었습니다.'
      )
    } catch (error) {
      toast('error', '리뷰 저장 실패', getApiErrorMessage(error, '의견을 저장하지 못했습니다.'))
    } finally {
      setIsSendingReview(false)
    }
  }

  async function handleReportReview(review: ProjectReview) {
    const targetProject = reviewProject ?? detailProject
    if (!targetProject) return

    if (!session) {
      closeReviewDialog()
      setIsLoginOpen(true)
      toast('error', '로그인이 필요합니다', '로그인한 회원만 커뮤니티 의견을 신고할 수 있습니다.')
      return
    }

    setReportingReviewId(review.id)
    try {
      const result = await reportProjectReview(targetProject.id, review.id, {
        reason: '커뮤니티 운영 검토 요청',
      })

      setProjectReviews((current) => {
        if (result.review.status === 'hidden') {
          return current.filter(
            (entry) => entry.id !== result.review.id && entry.parentId !== result.review.id
          )
        }

        return current.map((entry) => (entry.id === result.review.id ? result.review : entry))
      })
      setProjects((current) => upsertProject(current, result.project))
      setReviewProject((current) => (current?.id === result.project.id ? result.project : current))
      await loadSnapshot()
      toast(
        'success',
        result.review.status === 'hidden' ? '의견 숨김 처리' : '신고 접수',
        result.review.status === 'hidden'
          ? '반복 신고 기준을 넘어 커뮤니티 목록에서 숨겼습니다.'
          : '운영 검토 대기 상태로 표시됩니다.'
      )
    } catch (error) {
      toast('error', '신고 실패', getApiErrorMessage(error, '의견 신고를 저장하지 못했습니다.'))
    } finally {
      setReportingReviewId(null)
    }
  }

  async function handleModerateReview(
    entry: AdminReportedReview,
    action: 'keep' | 'hide' | 'restore'
  ) {
    if (!session || !canAccessAdmin) {
      toast('error', '운영자 권한 필요', '신고 검토는 운영자 계정에서만 처리할 수 있습니다.')
      return
    }

    setModeratingReviewId(entry.review.id)
    try {
      const result = await moderateProjectReview(entry.project.id, entry.review.id, {
        action,
        note:
          action === 'hide'
            ? '운영자가 신고 내용을 확인하고 숨김 처리했습니다.'
            : action === 'restore'
              ? '운영자가 숨김 의견을 복구했습니다.'
              : '운영자가 신고 내용을 확인하고 공개 유지 처리했습니다.',
      })

      setAdminReportedReviews((current) =>
        action === 'keep' || action === 'restore'
          ? current.filter((item) => item.review.id !== entry.review.id)
          : current.map((item) =>
              item.review.id === entry.review.id ? { ...item, review: result.review } : item
            )
      )
      setProjects((current) => upsertProject(current, result.project))
      setAdminAuditLogs(await fetchAdminAuditLogs(30))
      await loadSnapshot(false)
      toast(
        'success',
        action === 'hide'
          ? '의견 숨김 완료'
          : action === 'restore'
            ? '의견 복구 완료'
            : '공개 유지 완료',
        '운영 검토 기록이 감사 로그에 저장되었습니다.'
      )
    } catch (error) {
      toast(
        'error',
        '운영 처리 실패',
        getApiErrorMessage(error, '신고 의견을 처리하지 못했습니다.')
      )
    } finally {
      setModeratingReviewId(null)
    }
  }

  async function handleProjectEvent(project: Project, type: 'preview' | 'outbound' | 'refresh') {
    try {
      const updated = await recordProjectEvent(project.id, type)
      setProjects((current) => upsertProject(current, updated))
      setPreviewProject((current) => (current?.id === updated.id ? updated : current))
      setDiligenceProject((current) => (current?.id === updated.id ? updated : current))
      await loadSnapshot()
      return updated
    } catch {
      // Interaction telemetry must not block the investor workflow.
      return null
    }
  }

  async function handleOpenPreview(project: Project) {
    if (project.accessMode === 'screened') {
      if (!handleRequireInvestorOnly()) {
        return
      }

      toast(
        'match',
        '요청 후 공개 사이트',
        'URL과 미리보기는 창업자 승인 또는 연결 요청 이후 공유하는 흐름으로 보호합니다.'
      )
      setMatchingProject(project)
      return
    }

    setPreviewProject(project)
    setIframeKey((current) => current + 1)
    setIframeLoading(true)
    setIsMobileProjectTimelineOpen(false)

    const updated = await handleProjectEvent(project, 'preview')
    await loadProjectEvents(project.id)
    if (updated) {
      setPreviewProject(updated)
    }
  }

  async function handleSubmitMatch(event: React.FormEvent) {
    event.preventDefault()
    if (!handleRequireInvestorOnly()) {
      return
    }

    if (!matchingProject || !activeFundingRange) return

    if (!matchLegalNoticeAccepted || !matchPrivacyConsentAccepted || !matchRiskNoticeAccepted) {
      toast(
        'error',
        '필수 확인 필요',
        '투자 관심 기록 전 법무 고지, 개인정보 연락 동의, 초기 위험 안내를 모두 확인해야 합니다.'
      )
      return
    }

    setIsSendingMatch(true)
    try {
      const updated = await createMatchProposal(matchingProject.id, {
        fundingRangeId: activeFundingRange.id,
        message: matchMessage,
        legalNoticeAccepted: matchLegalNoticeAccepted,
        privacyConsentAccepted: matchPrivacyConsentAccepted,
        riskNoticeAccepted: matchRiskNoticeAccepted,
      })
      setProjects((current) => upsertProject(current, updated))
      await loadSnapshot()
      toast(
        'match',
        '투자 관심 기록 완료',
        `${matchingProject.title}에 ${activeFundingRange.label} 구간의 의향이 반영되었습니다.`
      )
      setMatchingProject(null)
      setMatchMessage('')
      setMatchLegalNoticeAccepted(false)
      setMatchPrivacyConsentAccepted(false)
      setMatchRiskNoticeAccepted(false)
    } catch (error) {
      toast('error', '연결 실패', getApiErrorMessage(error, '투자 관심 기록에 실패했습니다.'))
    } finally {
      setIsSendingMatch(false)
    }
  }

  const handleOpenMatchDialog = useCallback(
    (project: Project) => {
      if (!handleRequireInvestorOnly()) {
        return
      }

      setMatchingProject(project)
      setMatchLegalNoticeAccepted(false)
      setMatchPrivacyConsentAccepted(false)
      setMatchRiskNoticeAccepted(false)
    },
    [handleRequireInvestorOnly]
  )

  const openProjectDetail = useCallback((project: Project) => {
    setProjectReviews([])
    setDiligenceEvents([])
    setIsProjectReviewsLoading(true)
    setIsDiligenceEventsLoading(true)
    setMakerProfileId(null)
    setDetailProjectId(project.id)
    setView('market')
    if (typeof window !== 'undefined') {
      navigate(routePath.detail(project.id), { projectId: project.id })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const closeProjectDetail = useCallback(() => {
    setDetailProjectId(null)
    setProjectReviews([])
    setDiligenceEvents([])
    setReplyToReview(null)
    if (typeof window !== 'undefined') {
      navigate(routePath.market())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const openMakerProfile = useCallback((makerId: number) => {
    setDetailProjectId(null)
    setMakerProfileId(makerId)
    setView('market')
    if (typeof window !== 'undefined') {
      navigate(routePath.maker(makerId), { makerId })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const closeMakerProfile = useCallback(() => {
    setMakerProfileId(null)
    if (typeof window !== 'undefined') {
      navigate(routePath.market())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  return {
    accessMode,
    accessModeOptions,
    activeFilterCount,
    makerProfileId,
    makerProfile,
    isMakerProfileLoading,
    openMakerProfile,
    closeMakerProfile,
    activeFilters,
    adminAuditLogs,
    adminDashboard,
    adminDashboardError,
    adminReportedReviews,
    adminRevenueConfig,
    adminRevenueHealthScore,
    adminRevenueHealthTone,
    adminRevenueProjectionParams,
    adminRevenueTargetGap,
    adminRevenueTargetMonthly,
    adminScenarioMultipliers,
    adminTrendMetrics,
    apiOnline,
    applyAdminRecommendation,
    applyAllAdminRecommendations,
    applyFundingRange,
    applyObservedConversionRates,
    applyRevenueModelPreset,
    averageSignalDensity,
    canAccessAdmin,
    canSubmitProject,
    canRefreshProject,
    category,
    categoryOptions,
    closeDiligence,
    closePreview,
    closeProjectDetail,
    closeReviewDialog,
    config,
    copyAdminRevenueSnapshot,
    copyFilterLink,
    description,
    detailProject,
    detailProjectId,
    diligenceDialogRef,
    diligenceEvents,
    diligenceProject,
    exportAdminRevenueReport,
    fastestResponseProject,
    favoriteProjectCount,
    favoriteProjectIds,
    fundingRangeId,
    handleLogin,
    handleLogout,
    handleModerateReview,
    handleOpenMatchDialog,
    handleOpenPreview,
    handleProjectEvent,
    handleRefreshAll,
    handleRefreshProject,
    handleReportReview,
    handleSubmitMatch,
    handleSubmitProject,
    handleSubmitReview,
    handleVerifyUrl,
    hasFundingRangeError,
    iframeKey,
    iframeLoading,
    isAdminDashboardAvailable,
    isAdminView,
    isApplyingAllAdminRecommendations,
    isAuthenticated,
    isDiligenceEventsLoading,
    isInitialLoading,
    isMobileProjectTimelineOpen,
    isPreviewEventsLoading,
    isProjectReviewsLoading,
    projectLog,
    isProjectLogLoading,
    logBody,
    setLogBody,
    handleSubmitLog,
    isSubmittingLog,
    isRefreshing,
    isSendingMatch,
    isSendingReview,
    isSubmitOpen,
    isSubmitting,
    liveUrl,
    loadDiligenceEvents,
    loadError,
    loadProjectEvents,
    loginEmail,
    loginModalRef,
    loginPassword,
    matchLegalNoticeAccepted,
    matchMessage,
    matchModalRef,
    matchPrivacyConsentAccepted,
    matchRiskNoticeAccepted,
    matchingProject,
    maxFundingAmount,
    minFundingAmount,
    minSignal,
    moderatingReviewId,
    onlyVerified,
    openProjectDetail,
    openSubmitDialog,
    orderedAdminRecommendations,
    pageSize,
    previewDialogRef,
    previewEvents,
    previewProject,
    projectListView,
    projectMeta,
    projectReviews,
    projects,
    protectedProjectCount,
    protectionNoticeAccepted,
    maturity,
    setMaturity,
    stack,
    setStack,
    builtWith,
    toggleBuildTool,
    customToolsInput,
    setCustomToolsInput,
    vibeCoded,
    setVibeCoded,
    upvotedProjectIds,
    handleToggleUpvote,
    handleToggleFeatured,
    handleSetChallenge,
    publicProjectCount,
    recommendationSummary,
    replyToReview,
    reportingReviewId,
    resetAdminScenarioMultipliers,
    resetFilters,
    revenueProjection,
    reviewBody,
    reviewModalRef,
    reviewProject,
    reviewRating,
    reviewType,
    searchInputRef,
    searchQuery,
    selectedAccessMode,
    selectedCategory,
    selectedTag,
    session,
    setAccessMode,
    setCategory,
    setDescription,
    setFundingRangeId,
    setIframeKey,
    setIframeLoading,
    setIsLoginOpen,
    setIsMobileProjectTimelineOpen,
    setIsSubmitOpen,
    setLiveUrl,
    setLoginEmail,
    setLoginPassword,
    setMatchLegalNoticeAccepted,
    setMatchMessage,
    setMatchPrivacyConsentAccepted,
    setMatchRiskNoticeAccepted,
    setMatchingProject,
    setMaxFundingAmount,
    setMinFundingAmount,
    setMinSignal,
    setOnlyVerified,
    setPage,
    setPageSize,
    setProjectListView,
    setProtectionNoticeAccepted,
    setReplyToReview,
    setReviewBody,
    setReviewRating,
    setReviewType,
    setSearchQuery,
    setSelectedAccessMode,
    setSelectedCategory,
    setSelectedTag,
    setShowAdvancedFilters,
    setShowFavoritesOnly,
    setSortMode,
    setTagInput,
    setTitle,
    setUrlCheckMessage,
    setUrlCheckStatus,
    shouldShowLogin,
    showAdvancedFilters,
    showFavoritesOnly,
    signalRankByProjectId,
    sortMode,
    stats,
    submitModalRef,
    switchView,
    tagInput,
    tagOptions,
    targetGapRate,
    testAccountsByRole,
    title,
    toggleFavorite,
    updateRevenueInput,
    updateRevenueTargetInput,
    updateScenarioMultiplier,
    urlCheckMessage,
    urlCheckStatus,
    visibleProjects,
  }
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gauge,
  Globe2,
  Layers3,
  Loader2,
  ShieldCheck,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Send,
  Signal,
  Sparkles,
  Star,
  TimerReset,
  X,
  Zap,
} from 'lucide-react';
import {
  API_BASE,
  FundingRange,
  ProjectListQuery,
  MarketConfig,
  MarketStats,
  Project,
  ProjectAccessMode,
  ProjectEvent,
  ProjectEventType,
  ValidationSnapshot,
  hasPagination,
  createMatchProposal,
  createProject,
  fetchMarketConfig,
  fetchMarketStats,
  extractProjects,
  fetchProjects,
  fetchProjectEvents,
  getApiErrorMessage,
  recordProjectEvent,
  refreshAllProjects,
  refreshProject,
  validateLiveUrl,
} from './api';
import ToastContainer, { toast } from './components/ToastContainer';

const EMPTY_STATS: MarketStats = {
  totalProjects: 0,
  verifiedProjects: 0,
  verificationRate: 0,
  totalCommittedAmount: 0,
  totalInvestors: 0,
  averageResponseMs: null,
  categoryBreakdown: [],
  totalSignals: 0,
  topSignals: [],
  lastUpdatedAt: new Date(0).toISOString(),
};

const EMPTY_CONFIG: MarketConfig = {
  categories: [],
  accessModes: [],
  fundingRanges: [],
  refreshIntervalMs: 30000,
  benchmarkSignals: [],
};

const benchmarkCopy: Record<string, { title: string; body: string }> = {
  live_demo_required: {
    title: 'Live demo gate',
    body: '등록 전 공인 URL 검증을 통과한 제품만 노출합니다.',
  },
  verification_telemetry: {
    title: 'Verification telemetry',
    body: '응답 코드, 지연 시간, 확인 시각을 투자 판단 신호로 보여줍니다.',
  },
  investor_intent_capture: {
    title: 'Structured intent',
    body: '관심 표현을 금액 구간과 메시지로 기록해 매칭 지표로 환산합니다.',
  },
  real_attention_scoring: {
    title: 'Attention signal ready',
    body: '탐색, 프리뷰, 매칭 이벤트를 향후 랭킹 신호로 확장할 수 있습니다.',
  },
};

const eventCopy: Record<ProjectEventType, { icon: LucideIcon; label: string; tone: string }> = {
  create: {
    icon: Plus,
    label: '등록',
    tone: 'border-lime-300/25 bg-lime-300/10 text-lime-100',
  },
  preview: {
    icon: Sparkles,
    label: '프리뷰',
    tone: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
  },
  outbound: {
    icon: ArrowUpRight,
    label: '새 탭',
    tone: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  },
  match: {
    icon: Briefcase,
    label: '매칭',
    tone: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  },
  refresh: {
    icon: RefreshCw,
    label: '갱신',
    tone: 'border-stone-500/30 bg-stone-800/50 text-stone-200',
  },
};

function formatWon(amount: number) {
  if (amount <= 0) return '₩0';
  if (amount >= 100000000) {
    const value = amount / 100000000;
    return `₩${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}억`;
  }
  return `₩${Math.round(amount / 10000).toLocaleString('ko-KR')}만`;
}

function formatRelativeTime(value?: string) {
  if (!value) return '아직 없음';
  const then = new Date(value).getTime();
  if (Number.isNaN(then) || then <= 0) return '아직 없음';

  const diff = Date.now() - then;
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function getValidationTone(validation?: ValidationSnapshot) {
  if (!validation) return 'text-stone-300 bg-stone-900/60 border-stone-700/60';
  if (validation.success) return 'text-lime-200 bg-lime-950/40 border-lime-500/30';
  return 'text-red-200 bg-red-950/40 border-red-500/30';
}

function upsertProject(projects: Project[], nextProject: Project) {
  const exists = projects.some((project) => project.id === nextProject.id);
  if (!exists) return [nextProject, ...projects];
  return projects.map((project) => (project.id === nextProject.id ? nextProject : project));
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<MarketStats>(EMPTY_STATS);
  const [config, setConfig] = useState<MarketConfig>(EMPTY_CONFIG);
  const [apiOnline, setApiOnline] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAccessMode, setSelectedAccessMode] = useState<'All' | ProjectAccessMode>('All');
  const [sortMode, setSortMode] = useState<'signal' | 'recent' | 'created' | 'funding'>('signal');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [minFundingAmount, setMinFundingAmount] = useState(0);
  const [maxFundingAmount, setMaxFundingAmount] = useState(0);
  const [projectMeta, setProjectMeta] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
    limit: 12,
  });
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [minSignal, setMinSignal] = useState(0);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') {
      return new Set<number>();
    }

    try {
      const raw = localStorage.getItem('protolive:favorites');
      if (!raw) {
        return new Set<number>();
      }

      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<number>();
    }
  });

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [category, setCategory] = useState('');
  const [accessMode, setAccessMode] = useState<ProjectAccessMode>('screened');
  const [protectionNoticeAccepted, setProtectionNoticeAccepted] = useState(false);
  const [urlCheckStatus, setUrlCheckStatus] = useState<'idle' | 'checking' | 'success' | 'error'>(
    'idle',
  );
  const [urlCheckMessage, setUrlCheckMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [previewEvents, setPreviewEvents] = useState<ProjectEvent[]>([]);
  const [isPreviewEventsLoading, setIsPreviewEventsLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(false);

  const [matchingProject, setMatchingProject] = useState<Project | null>(null);
  const [fundingRangeId, setFundingRangeId] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  const [isSendingMatch, setIsSendingMatch] = useState(false);

  const hasFundingRangeError = maxFundingAmount > 0 && minFundingAmount > 0 && maxFundingAmount < minFundingAmount;

  const projectQuery = useMemo<ProjectListQuery>(() => {
    return {
      q: debouncedSearch,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      accessMode: selectedAccessMode === 'All' ? undefined : selectedAccessMode,
      sort: sortMode,
      page,
      limit: pageSize,
      minSignal: minSignal > 0 ? minSignal : undefined,
      minFundingAmount:
        minFundingAmount > 0 && !hasFundingRangeError ? minFundingAmount : undefined,
      maxFundingAmount:
        maxFundingAmount > 0 && !hasFundingRangeError ? maxFundingAmount : undefined,
      onlyVerified,
    };
  }, [
    debouncedSearch,
    hasFundingRangeError,
    minSignal,
    maxFundingAmount,
    minFundingAmount,
    onlyVerified,
    selectedAccessMode,
    selectedCategory,
    sortMode,
    page,
    pageSize,
  ]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; onClear: () => void }> = [];

    if (debouncedSearch) {
      filters.push({
        id: 'search',
        label: `검색: ${debouncedSearch}`,
        onClear: () => {
          setSearchQuery('');
          setDebouncedSearch('');
          setPage(1);
        },
      });
    }

    if (selectedCategory !== 'All') {
      filters.push({
        id: 'category',
        label: `카테고리: ${selectedCategory}`,
        onClear: () => {
          setSelectedCategory('All');
          setPage(1);
        },
      });
    }

    if (selectedAccessMode !== 'All') {
      filters.push({
        id: 'accessMode',
        label: `공개범위: ${selectedAccessMode === 'open' ? '공개' : '선별'}`,
        onClear: () => {
          setSelectedAccessMode('All');
          setPage(1);
        },
      });
    }

    if (sortMode !== 'signal') {
      const sortLabel =
        sortMode === 'recent'
          ? '최신 신호순'
          : sortMode === 'created'
            ? '등록순'
            : '투자규모순';
      filters.push({
        id: 'sortMode',
        label: `정렬: ${sortLabel}`,
        onClear: () => {
          setSortMode('signal');
          setPage(1);
        },
      });
    }

    if (onlyVerified) {
      filters.push({
        id: 'verified',
        label: '검증된 프로젝트만',
        onClear: () => {
          setOnlyVerified(false);
          setPage(1);
        },
      });
    }

    if (showFavoritesOnly) {
      filters.push({
        id: 'favorites',
        label: '즐겨찾기만',
        onClear: () => {
          setShowFavoritesOnly(false);
        },
      });
    }

    if (minSignal > 0) {
      filters.push({
        id: 'minSignal',
        label: `최소 시그널 ${minSignal}`,
        onClear: () => {
          setMinSignal(0);
          setPage(1);
        },
      });
    }

    if (minFundingAmount > 0 || maxFundingAmount > 0) {
      const fundingLabel =
        minFundingAmount > 0 && maxFundingAmount > 0
          ? `${formatWon(minFundingAmount)} ~ ${formatWon(maxFundingAmount)}`
          : minFundingAmount > 0
            ? `${formatWon(minFundingAmount)} 이상`
            : `${formatWon(maxFundingAmount)} 이하`;

      filters.push({
        id: 'fundingRange',
        label: `투자금 ${fundingLabel}`,
        onClear: () => {
          setMinFundingAmount(0);
          setMaxFundingAmount(0);
          setPage(1);
        },
      });
    }

    return filters;
  }, [
    debouncedSearch,
    maxFundingAmount,
    minFundingAmount,
    minSignal,
    onlyVerified,
    selectedAccessMode,
    selectedCategory,
    showFavoritesOnly,
    sortMode,
  ]);

  const applyFundingRange = useCallback((range: FundingRange) => {
    setMinFundingAmount(range.minAmount);
    setMaxFundingAmount(range.maxAmount);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedAccessMode('All');
    setSortMode('signal');
    setMinSignal(0);
    setMinFundingAmount(0);
    setMaxFundingAmount(0);
    setOnlyVerified(false);
    setShowFavoritesOnly(false);
    setPage(1);
  }, []);

  const loadSnapshot = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);

    try {
      const [configData, statsData, projectsData] = await Promise.all([
        fetchMarketConfig(),
        fetchMarketStats(),
        fetchProjects(projectQuery),
      ]);

      const projectPayload = extractProjects(projectsData);

      setConfig(configData);
      setStats(statsData);
      setProjects(projectPayload);
      if (hasPagination(projectsData)) {
        setProjectMeta({
          total: projectsData.total,
          page: projectsData.page,
          totalPages: projectsData.totalPages,
          hasPrev: projectsData.hasPrev,
          hasNext: projectsData.hasNext,
          limit: projectsData.limit,
        });
      } else {
        setProjectMeta({
          total: projectPayload.length,
          page: 1,
          totalPages: 1,
          hasPrev: false,
          hasNext: false,
          limit: projectPayload.length,
        });
      }
      setApiOnline(true);
      setLoadError('');

      if (!fundingRangeId && configData.fundingRanges.length > 0) {
        setFundingRangeId(configData.fundingRanges[2]?.id ?? configData.fundingRanges[0].id);
      }
    } catch (error) {
      const hasResponseError = isAxiosError(error) && Boolean(error.response);
      const message = getApiErrorMessage(error, '요청 처리 중 오류가 발생했습니다.');

      if (hasResponseError) {
        setApiOnline(true);
        setLoadError(message);
      } else {
        setApiOnline(false);
        setLoadError('백엔드 API에 연결할 수 없습니다. 서버를 실행한 뒤 다시 시도하세요.');
      }

      if (showLoading) {
        toast('error', '요청 실패', hasResponseError ? message : `요청 대상: ${API_BASE}`);
      }
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [fundingRangeId, projectQuery]);

  const loadProjectEvents = useCallback(async (projectId: number) => {
    setIsPreviewEventsLoading(true);
    try {
      setPreviewEvents(await fetchProjectEvents(projectId));
    } catch {
      setPreviewEvents([]);
    } finally {
      setIsPreviewEventsLoading(false);
    }
  }, []);

  const visibleProjects = useMemo(() => {
    return showFavoritesOnly ? projects.filter((project) => favoriteProjectIds.has(project.id)) : projects;
  }, [projects, favoriteProjectIds, showFavoritesOnly]);

  const toggleFavorite = useCallback((projectId: number) => {
    setFavoriteProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem('protolive:favorites', JSON.stringify(Array.from(favoriteProjectIds)));
  }, [favoriteProjectIds]);

  const categoryOptions = useMemo(() => ['All', ...config.categories], [config.categories]);
  const accessModeOptions: Array<'All' | ProjectAccessMode> = ['All', ...config.accessModes.map((item) => item.id)];
  const activeFundingRange = config.fundingRanges.find((range) => range.id === fundingRangeId);

  useEffect(() => {
    const initialize = async () => {
      await loadSnapshot();
    };
    void initialize();
  }, [loadSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadSnapshot();
    }, config.refreshIntervalMs || 30000);

    return () => window.clearInterval(timer);
  }, [config.refreshIntervalMs, loadSnapshot]);

  async function handleVerifyUrl() {
    if (!liveUrl.trim()) {
      setUrlCheckStatus('error');
      setUrlCheckMessage('검증할 URL을 입력하세요.');
      return;
    }

    setUrlCheckStatus('checking');
    setUrlCheckMessage('공인망 HTTP/HTTPS URL과 실제 응답 상태를 확인 중입니다.');

    try {
      const result = await validateLiveUrl(liveUrl);
      setUrlCheckStatus(result.success ? 'success' : 'error');
      setUrlCheckMessage(
        `${result.message}${result.responseTimeMs ? ` · ${result.responseTimeMs}ms` : ''}`,
      );
    } catch {
      setUrlCheckStatus('error');
      setUrlCheckMessage('API 검증 요청이 실패했습니다. 백엔드 연결 상태를 확인하세요.');
    }
  }

  async function handleSubmitProject(event: React.FormEvent) {
    event.preventDefault();

    if (!protectionNoticeAccepted) {
      toast('error', '노출 위험 확인 필요', '상용화 전 서비스 보호 안내와 제출 권한을 확인해야 합니다.');
      return;
    }

    if (urlCheckStatus !== 'success') {
      toast('error', 'URL 검증 필요', '실시간 URL 검증을 통과한 뒤 등록할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProject({
        email,
        title,
        description,
        liveUrl,
        category,
        accessMode,
        protectionNoticeAccepted,
      });

      setProjects((current) => upsertProject(current, created));
      await loadSnapshot();
      setEmail('');
      setTitle('');
      setDescription('');
      setLiveUrl('');
      setAccessMode('screened');
      setProtectionNoticeAccepted(false);
      setUrlCheckStatus('idle');
      setUrlCheckMessage('');
      setIsSubmitOpen(false);
      toast('success', '검증 등록 완료', `${created.title}이(가) 라이브 마켓에 등록되었습니다.`);
    } catch (error) {
      toast(
        'error',
        '등록 실패',
        getApiErrorMessage(error, '프로젝트 등록에 실패했습니다.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefreshAll() {
    setIsRefreshing(true);
    try {
      const refreshed = await refreshAllProjects();
      setProjects(refreshed);
      await loadSnapshot();
      toast('success', '검증 갱신 완료', '모든 프로젝트의 라이브 상태를 다시 확인했습니다.');
    } catch {
      toast('error', '갱신 실패', '백엔드 URL 검증 API 응답을 확인하세요.');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRefreshProject(project: Project) {
    setProjects((current) =>
      current.map((item) =>
        item.id === project.id
          ? {
              ...item,
              validation: {
                ...item.validation,
                message: '상태 재검증 중입니다.',
              },
            }
          : item,
      ),
    );

    try {
      const refreshed = await refreshProject(project.id);
      setProjects((current) => upsertProject(current, refreshed));
      await loadSnapshot();
      toast('success', '프로젝트 갱신', `${refreshed.title} 상태를 갱신했습니다.`);
    } catch {
      toast('error', '프로젝트 갱신 실패', `${project.title} 상태를 갱신하지 못했습니다.`);
    }
  }

  function closePreview() {
    setPreviewProject(null);
    setPreviewEvents([]);
  }

  async function handleProjectEvent(project: Project, type: 'preview' | 'outbound' | 'refresh') {
    try {
      const updated = await recordProjectEvent(project.id, type);
      setProjects((current) => upsertProject(current, updated));
      setPreviewProject((current) => (current?.id === updated.id ? updated : current));
      await loadSnapshot();
      return updated;
    } catch {
      // Interaction telemetry must not block the investor workflow.
      return null;
    }
  }

  async function handleOpenPreview(project: Project) {
    if (project.accessMode === 'screened') {
      toast(
        'match',
        '선별 공개 프로젝트',
        'URL과 프리뷰는 메이커 승인 또는 매칭 요청 이후 공유하는 흐름으로 보호합니다.',
      );
      setMatchingProject(project);
      return;
    }

    setPreviewProject(project);
    setIframeKey((current) => current + 1);
    setIframeLoading(true);

    const updated = await handleProjectEvent(project, 'preview');
    await loadProjectEvents(project.id);
    if (updated) {
      setPreviewProject(updated);
    }
  }

  async function handleSubmitMatch(event: React.FormEvent) {
    event.preventDefault();
    if (!matchingProject || !activeFundingRange) return;

    setIsSendingMatch(true);
    try {
      const updated = await createMatchProposal(matchingProject.id, {
        fundingRangeId: activeFundingRange.id,
        message: matchMessage,
      });
      setProjects((current) => upsertProject(current, updated));
      await loadSnapshot();
      toast(
        'match',
        '투자 의향 기록 완료',
        `${matchingProject.title}에 ${activeFundingRange.label} 구간의 의향이 반영되었습니다.`,
      );
      setMatchingProject(null);
      setMatchMessage('');
    } catch (error) {
      toast('error', '매칭 실패', getApiErrorMessage(error, '투자 의향 기록에 실패했습니다.'));
    } finally {
      setIsSendingMatch(false);
    }
  }

  return (
    <div className="min-h-screen bg-[oklch(14%_0.018_205)] text-stone-100">
      <ToastContainer />

      <header className="sticky top-0 z-40 border-b border-cyan-900/40 bg-[oklch(14%_0.018_205)/0.92] backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime-300 text-slate-950 shadow-[0_0_0_1px_oklch(89%_0.18_125/0.25)]">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-stone-50">ProtoLive</h1>
                <span className="rounded-full border border-lime-400/30 bg-lime-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
                  Live Diligence
                </span>
              </div>
              <p className="truncate text-xs font-medium text-stone-400">
                검증된 MVP만 검토하는 실시간 투자 매칭 워크스페이스
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold md:flex ${
                apiOnline
                  ? 'border-lime-400/30 bg-lime-300/10 text-lime-200'
                  : 'border-red-400/30 bg-red-500/10 text-red-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${apiOnline ? 'bg-lime-300' : 'bg-red-300'}`} />
              {apiOnline ? 'API Online' : 'API Offline'}
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
              disabled={isRefreshing || !apiOnline || projects.length === 0}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="전체 프로젝트 상태 새로고침"
              title="전체 프로젝트 상태 새로고침"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsSubmitOpen(true)}
              disabled={!apiOnline || config.categories.length === 0}
              aria-label="프로토타입 등록"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">프로토타입 등록</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
            <div className="rounded-xl border border-cyan-900/50 bg-[oklch(18%_0.018_205)] p-5 shadow-[0_24px_80px_oklch(8%_0.02_205/0.45)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                    <Radar className="h-3.5 w-3.5" />
                    Benchmark 적용: 데모 우선 탐색, 라이브 신호, 구조화된 딜 플로우
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
                    슬라이드가 아니라 응답하는 제품을 봅니다.
                  </h2>
                  <p className="mt-3 max-w-[68ch] text-sm leading-6 text-stone-300">
                    등록 URL은 백엔드가 직접 공인망 응답을 확인하고, 투자자는 상태 코드와 응답 시간,
                    프리뷰, 매칭 의향을 한 화면에서 검토합니다.
                  </p>
                </div>
                <div className="rounded-lg border border-stone-700/70 bg-stone-950/55 p-3 text-xs text-stone-400">
                  <div className="flex items-center gap-2 font-bold text-stone-200">
                    <Clock3 className="h-4 w-4 text-cyan-200" />
                    최근 동기화
                  </div>
                  <p className="mt-1">{formatRelativeTime(stats.lastUpdatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <Metric icon={ShieldCheck} label="검증 프로젝트" value={`${stats.verifiedProjects}/${stats.totalProjects}`} />
              <Metric icon={Gauge} label="검증률" value={`${stats.verificationRate}%`} />
              <Metric
                icon={TimerReset}
                label="평균 응답"
                value={stats.averageResponseMs === null ? 'N/A' : `${stats.averageResponseMs}ms`}
              />
              <Metric icon={Briefcase} label="매칭 규모" value={formatWon(stats.totalCommittedAmount)} />
              <Metric icon={Signal} label="관심 신호" value={`${stats.totalSignals}`} />
            </div>
          </div>

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

          <div className="rounded-xl border border-stone-800 bg-[oklch(17%_0.018_205)] p-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(item);
                      setPage(1);
                    }}
                    className={`min-h-10 rounded-lg border px-3 text-xs font-black transition ${
                      selectedCategory === item
                        ? 'border-lime-300/50 bg-lime-300 text-slate-950'
                        : 'border-stone-700 bg-stone-950/50 text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:w-[360px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setPage(1);
                      setSearchQuery(event.target.value);
                    }}
                    placeholder="이름, 설명, URL, 카테고리 검색"
                    className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950/70 pl-10 pr-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-cyan-300/60"
                  />
                </div>
                <div className="flex rounded-lg border border-stone-700 bg-stone-950/60 p-1">
                  {[
                    ['signal', 'Signal'],
                    ['recent', '최근 신호'],
                    ['created', '등록순'],
                    ['funding', '투자규모'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSortMode(value as typeof sortMode);
                        setPage(1);
                      }}
                      className={`min-h-9 rounded-md px-3 text-xs font-black transition ${
                        sortMode === value
                          ? 'bg-cyan-300 text-slate-950'
                          : 'text-stone-400 hover:text-stone-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {accessModeOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSelectedAccessMode(item);
                      setPage(1);
                    }}
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
                      onClick={() => applyFundingRange(range)}
                      className={`min-h-8 rounded-full border px-3 py-1 text-[11px] font-black transition ${
                        range.minAmount === minFundingAmount && range.maxAmount === maxFundingAmount
                          ? 'border-cyan-300/70 bg-cyan-300/20 text-cyan-100'
                          : 'border-stone-700 bg-stone-950/50 text-stone-300 hover:border-cyan-300/40'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setMinFundingAmount(0);
                      setMaxFundingAmount(0);
                      setPage(1);
                    }}
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
                    onChange={(event) => {
                      setOnlyVerified(event.target.checked);
                      setPage(1);
                    }}
                  />
                  <span>검증된 프로젝트만</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 py-2">
                  최소 시그널
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={minSignal}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setMinSignal(Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0);
                      setPage(1);
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
                      const next = Number(event.target.value);
                      setMinFundingAmount(Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0);
                      setPage(1);
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
                      const next = Number(event.target.value);
                      setMaxFundingAmount(Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0);
                      setPage(1);
                    }}
                    className="ml-1 w-28 rounded bg-stone-950 border border-stone-700 px-2 py-1 text-right text-xs font-black text-stone-100 outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowFavoritesOnly((value) => !value)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 ${
                    showFavoritesOnly
                      ? 'border-amber-300/60 bg-amber-300/20 text-amber-100'
                      : 'border-stone-700 bg-stone-950/55 text-stone-300'
                  }`}
                >
                  <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-amber-100 text-amber-100' : 'text-stone-300'}`} />
                  즐겨찾기만
                </button>
                <label className="inline-flex min-w-[120px] items-center justify-between gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 py-2">
                  <span>페이지</span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setPageSize(Number.isFinite(next) ? next : 12);
                      setPage(1);
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
              {activeFilters.length > 0 && (
                <div className="rounded-lg border border-stone-700 bg-stone-950/45 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">현재 필터</span>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-xs font-black text-cyan-200 hover:text-cyan-100"
                    >
                      전체 초기화
                    </button>
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
                      projectMeta.total,
                    )} / ${projectMeta.total}건`}
              </p>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={!projectMeta.hasPrev}
                  className={`inline-flex min-h-9 items-center rounded-lg border px-3 font-black transition ${
                    projectMeta.hasPrev
                      ? 'border-stone-700 text-stone-200 hover:border-cyan-300/50 hover:text-cyan-100'
                      : 'cursor-not-allowed border-stone-800 text-stone-500'
                  }`}
                >
                  이전
                </button>
                <span className="rounded-lg border border-stone-700 px-3 py-2">{projectMeta.page} / {projectMeta.totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((value) => (projectMeta.hasNext ? value + 1 : value))}
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
            <EmptyState apiOnline={apiOnline} onCreate={() => setIsSubmitOpen(true)} />
          ) : (
            <div className="grid gap-4">
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onPreview={() => void handleOpenPreview(project)}
                  onMatch={() => setMatchingProject(project)}
                  onRefresh={() => void handleRefreshProject(project)}
                  onOutbound={() => void handleProjectEvent(project, 'outbound')}
                  isFavorite={favoriteProjectIds.has(project.id)}
                  onToggleFavorite={() => toggleFavorite(project.id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-lime-200" />
              <h3 className="font-black text-stone-100">Signal Leaderboard</h3>
            </div>
            {stats.topSignals.length === 0 ? (
              <p className="text-sm leading-6 text-stone-400">
                프리뷰, 새 탭 열기, 투자 의향이 쌓이면 실시간 우선순위가 계산됩니다.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topSignals.map((item, index) => (
                  <div key={item.id} className="rounded-lg border border-stone-800 bg-[oklch(16%_0.016_205)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-lime-200">#{index + 1} · {item.category}</p>
                        <p className="mt-1 truncate text-sm font-black text-stone-100">{item.title}</p>
                        <p className="mt-1 text-xs text-stone-500">{formatRelativeTime(item.latestEventAt ?? undefined)}</p>
                      </div>
                      <span className="rounded-lg bg-lime-300 px-2 py-1 text-xs font-black text-slate-950">
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
              <h3 className="font-black text-stone-100">Live Signal Stack</h3>
            </div>
            <div className="space-y-3">
              {config.benchmarkSignals.map((signal) => {
                const item = benchmarkCopy[signal] ?? { title: signal, body: 'API에서 전달된 시장 신호입니다.' };
                return (
                  <div key={signal} className="rounded-lg border border-stone-800 bg-[oklch(16%_0.016_205)] p-3">
                    <p className="text-sm font-black text-stone-100">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-4">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-200" />
              <h3 className="font-black text-stone-100">Category Flow</h3>
            </div>
            {stats.categoryBreakdown.length === 0 ? (
              <p className="text-sm leading-6 text-stone-400">
                아직 집계할 프로젝트가 없습니다. 첫 검증 등록 후 카테고리 분포가 실시간 계산됩니다.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.categoryBreakdown.map((item) => {
                  const ratio = stats.totalProjects === 0 ? 0 : (item.count / stats.totalProjects) * 100;
                  return (
                    <div key={item.category}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-300">{item.category}</span>
                        <span className="text-stone-500">{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </main>

      {previewProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closePreview}
            aria-label="프리뷰 닫기"
          />
          <section className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-stone-700 bg-[oklch(13%_0.016_205)] shadow-2xl lg:w-[72vw] xl:w-[62vw]">
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-stone-800 px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-stone-100">{previewProject.title}</p>
                <p className="truncate text-xs text-stone-500">{previewProject.liveUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                {iframeLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />}
                <button
                  type="button"
                  onClick={async () => {
                    await handleProjectEvent(previewProject, 'refresh');
                    await loadProjectEvents(previewProject.id);
                    setIframeKey((current) => current + 1);
                    setIframeLoading(true);
                  }}
                  className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100"
                  aria-label="프리뷰 새로고침"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <a
                  href={previewProject.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  onClick={() => {
                    void handleProjectEvent(previewProject, 'outbound').then(() =>
                      loadProjectEvents(previewProject.id),
                    );
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-200 hover:border-lime-300/50 hover:text-lime-100"
                >
                  새 탭
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={closePreview}
                  className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:border-red-300/40 hover:text-red-100"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 bg-stone-950 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative min-h-0">
                <iframe
                  key={iframeKey}
                  src={previewProject.liveUrl}
                  title={`ProtoLive demo preview: ${previewProject.title}`}
                  className="h-full w-full border-0 bg-stone-950"
                  sandbox="allow-scripts allow-popups allow-forms"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onLoad={() => setIframeLoading(false)}
                />
                <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-stone-700 bg-stone-950/90 p-3 text-xs text-stone-300 shadow-xl">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-200" />
                      iframe 차단 정책이 있는 사이트는 새 탭에서 계속 검토할 수 있습니다.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMatchingProject(previewProject);
                        closePreview();
                      }}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-lime-300 px-3 font-black text-slate-950"
                    >
                      매칭 제안
                    </button>
                  </div>
                </div>
              </div>
              <SignalTimeline events={previewEvents} isLoading={isPreviewEventsLoading} />
            </div>
          </section>
        </div>
      )}

      {matchingProject && (
        <Modal title="투자 의향 기록" subtitle={matchingProject.title} onClose={() => setMatchingProject(null)}>
          <form onSubmit={handleSubmitMatch} className="space-y-4">
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                Verified target
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-300">{matchingProject.description}</p>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-stone-300">투자 희망 구간</span>
              <select
                value={fundingRangeId}
                onChange={(event) => setFundingRangeId(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-lime-300/60"
              >
                {config.fundingRanges.map((range: FundingRange) => (
                  <option key={range.id} value={range.id}>
                    {range.label} ({range.stage})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-stone-300">메이커에게 보낼 메시지</span>
              <textarea
                required
                maxLength={700}
                rows={4}
                value={matchMessage}
                onChange={(event) => setMatchMessage(event.target.value)}
                placeholder="실사 요청, 미팅 가능 일정, 관심 있는 지표를 남겨주세요."
                className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
              />
            </label>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMatchingProject(null)}
                className="min-h-11 flex-1 rounded-lg border border-stone-700 text-sm font-black text-stone-300 hover:text-stone-100"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSendingMatch}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-lime-300 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {isSendingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                의향 기록
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isSubmitOpen && (
        <Modal title="라이브 프로토타입 등록" subtitle="공인 URL 검증 후 마켓에 반영됩니다." onClose={() => setIsSubmitOpen(false)}>
          <form onSubmit={handleSubmitProject} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-stone-300">메이커 이메일</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="maker@example.com"
                className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-stone-300">프로젝트 이름</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: SignalDesk"
                  className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black text-stone-300">카테고리</span>
                <select
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-lime-300/60"
                >
                  {config.categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-100" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-amber-50">상용화 전 서비스 보호 설정</p>
                  <p className="mt-1 text-xs leading-5 text-amber-50/75">
                    공개 URL을 제출하면 제품 흐름, 카피, 가격 실험, 내부 데모 계정이 외부에 노출될 수
                    있습니다. 민감한 기능은 데모 데이터, 제한 계정, 워터마크, 별도 빌드로 보호하세요.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(config.accessModes.length > 0
                  ? config.accessModes
                  : [
                      {
                        id: 'screened' as ProjectAccessMode,
                        label: '선별 공개',
                        description: 'URL과 프리뷰를 매칭 요청 뒤 공유합니다.',
                      },
                      {
                        id: 'open' as ProjectAccessMode,
                        label: '공개 프리뷰',
                        description: '목록에서 바로 라이브 URL을 열람할 수 있습니다.',
                      },
                    ]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setAccessMode(mode.id)}
                    className={`min-h-20 rounded-lg border p-3 text-left transition ${
                      accessMode === mode.id
                        ? 'border-lime-300/60 bg-lime-300 text-slate-950'
                        : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/40'
                    }`}
                  >
                    <span className="block text-sm font-black">{mode.label}</span>
                    <span className={`mt-1 block text-xs leading-5 ${accessMode === mode.id ? 'text-slate-800' : 'text-stone-500'}`}>
                      {mode.description}
                    </span>
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-start gap-3 rounded-lg border border-amber-300/20 bg-stone-950/45 p-3 text-xs leading-5 text-amber-50/85">
                <input
                  type="checkbox"
                  required
                  checked={protectionNoticeAccepted}
                  onChange={(event) => setProtectionNoticeAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-amber-300/50 bg-stone-950 accent-lime-300"
                />
                <span>
                  제출 권한이 있는 서비스이며, 공개 URL 검증 및 선택한 공개 범위에 따라 외부 투자자에게
                  정보가 노출될 수 있음을 확인합니다.
                </span>
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-stone-300">핵심 설명</span>
              <textarea
                required
                maxLength={1000}
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="투자자가 바로 검토할 수 있게 문제, 작동 범위, 차별점을 압축해 적어주세요."
                className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-stone-300">
                <span>라이브 데모 URL</span>
                <span className="text-cyan-200">HTTP/HTTPS, 공인망만 허용</span>
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  required
                  value={liveUrl}
                  onChange={(event) => {
                    setLiveUrl(event.target.value);
                    setUrlCheckStatus('idle');
                    setUrlCheckMessage('');
                  }}
                  placeholder="https://your-live-demo.com"
                  className="min-h-11 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
                />
                <button
                  type="button"
                  onClick={() => void handleVerifyUrl()}
                  disabled={urlCheckStatus === 'checking'}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/10 disabled:opacity-50"
                >
                  {urlCheckStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
                  URL 검증
                </button>
              </div>
            </label>
            {urlCheckStatus !== 'idle' && (
              <div className={`rounded-lg border p-3 text-sm ${getValidationTone({ success: urlCheckStatus === 'success', message: urlCheckMessage, checkedAt: new Date().toISOString() })}`}>
                <div className="flex items-start gap-2">
                  {urlCheckStatus === 'checking' ? (
                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
                  ) : urlCheckStatus === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                  )}
                  <p className="leading-6">{urlCheckMessage}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitOpen(false)}
                className="min-h-11 flex-1 rounded-lg border border-stone-700 text-sm font-black text-stone-300 hover:text-stone-100"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || urlCheckStatus !== 'success' || !protectionNoticeAccepted}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-lime-300 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                검증 등록
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-[oklch(16%_0.016_205)] p-3">
      <Icon className="mb-3 h-4 w-4 text-lime-200" />
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 break-words text-lg font-black text-stone-50">{value}</p>
    </div>
  );
}

function SignalTimeline({
  events,
  isLoading,
}: {
  events: ProjectEvent[];
  isLoading: boolean;
}) {
  const totals = events.reduce<Record<ProjectEventType, number>>(
    (counts, event) => {
      counts[event.type] += 1;
      return counts;
    },
    { create: 0, preview: 0, outbound: 0, match: 0, refresh: 0 },
  );

  return (
    <aside className="hidden min-h-0 border-l border-stone-800 bg-[oklch(15%_0.016_205)] xl:flex xl:flex-col">
      <div className="border-b border-stone-800 p-4">
        <div className="flex items-center gap-2">
          <Signal className="h-4 w-4 text-lime-200" />
          <h3 className="font-black text-stone-100">Activity Timeline</h3>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['preview', 'outbound', 'match'] as ProjectEventType[]).map((type) => {
            const meta = eventCopy[type];
            return (
              <div key={type} className={`rounded-lg border p-2 ${meta.tone}`}>
                <p className="text-base font-black">{totals[type]}</p>
                <p className="mt-0.5 text-[11px] font-bold opacity-75">{meta.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center text-sm text-stone-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            신호 로딩
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 p-4 text-sm leading-6 text-stone-400">
            아직 이 프로젝트에 기록된 활동이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 20).map((event) => {
              const meta = eventCopy[event.type];
              const Icon = meta.icon;
              return (
                <div key={event.id} className="rounded-lg border border-stone-800 bg-stone-950/55 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-black ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                    <span className="text-xs text-stone-500">{formatRelativeTime(event.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function ProjectCard({
  project,
  onPreview,
  onMatch,
  onRefresh,
  onOutbound,
  onToggleFavorite,
  isFavorite,
}: {
  project: Project;
  onPreview: () => void;
  onMatch: () => void;
  onRefresh: () => void;
  onOutbound: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}) {
  const isProtected = project.accessMode === 'screened';

  return (
    <article className="rounded-xl border border-stone-800 bg-[oklch(18%_0.018_205)] p-4 transition hover:border-cyan-300/35">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/60 px-2.5 text-xs font-bold text-stone-300">
              <Layers3 className="h-3.5 w-3.5 text-cyan-200" />
              {project.category}
            </span>
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-black ${getValidationTone(project.validation)}`}>
              {project.validation.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {project.validation.success ? `HTTP ${project.validation.status ?? 'OK'}` : 'Needs check'}
            </span>
            {project.validation.responseTimeMs && (
              <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 text-xs font-black text-cyan-100">
                <TimerReset className="h-3.5 w-3.5" />
                {project.validation.responseTimeMs}ms
              </span>
            )}
            {isProtected && (
              <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 text-xs font-black text-amber-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                선별 공개
              </span>
            )}
          </div>
          <h3 className="text-xl font-black tracking-tight text-stone-50">{project.title}</h3>
          <p className="mt-2 max-w-[82ch] overflow-wrap-anywhere text-sm leading-6 text-stone-300">
            {project.description}
          </p>
          <div className="mt-4 flex min-w-0 items-center gap-2 text-xs text-stone-500">
            <Globe2 className="h-4 w-4 flex-shrink-0 text-stone-400" />
            <span className="truncate font-mono">{project.validation.finalUrl ?? project.liveUrl}</span>
          </div>
        </div>

        <div className="grid content-between gap-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-lime-300/20 bg-lime-300/10 p-3">
              <p className="font-black text-lime-100">{project.signalScore ?? 0}</p>
              <p className="mt-1 text-lime-100/70">Signal</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950/55 p-3">
              <p className="font-black text-stone-100">{project.matchCount}</p>
              <p className="mt-1 text-stone-500">매칭 의향</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950/55 p-3">
              <p className="font-black text-stone-100">{formatWon(project.committedAmountMax)}</p>
              <p className="mt-1 text-stone-500">상단 금액</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950/55 p-3">
              <p className="font-black text-stone-100">{project.eventSummary?.total ?? 0}</p>
              <p className="mt-1 text-stone-500">관심 신호</p>
            </div>
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`grid min-h-10 place-items-center rounded-lg border text-xs font-black transition ${
                isFavorite
                  ? 'border-amber-300/70 bg-amber-300/10 text-amber-100'
                  : 'border-stone-700 text-stone-300 hover:border-stone-500'
              }`}
              aria-label={isFavorite ? `${project.title} 즐겨찾기 해제` : `${project.title} 즐겨찾기 추가`}
              title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-100' : ''}`} />
            </button>
            <button
              type="button"
              onClick={isProtected ? onMatch : onPreview}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-black transition ${
                isProtected
                  ? 'border border-amber-300/35 text-amber-100 hover:bg-amber-300/10'
                  : 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
              }`}
            >
              {isProtected ? <ShieldCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {isProtected ? '선별 접근 요청' : '라이브 프리뷰'}
            </button>
            <div className="grid grid-cols-3 gap-2">
              {isProtected ? (
                <button
                  type="button"
                  onClick={onMatch}
                  className="grid min-h-10 place-items-center rounded-lg border border-stone-700 text-amber-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
                  aria-label={`${project.title} 접근 요청`}
                  title="접근 요청"
                >
                  <ShieldCheck className="h-4 w-4" />
                </button>
              ) : (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  onClick={onOutbound}
                  className="grid min-h-10 place-items-center rounded-lg border border-stone-700 text-stone-300 transition hover:border-lime-300/40 hover:text-lime-100"
                  aria-label={`${project.title} 새 탭 열기`}
                  title="새 탭 열기"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                onClick={onRefresh}
                className="grid min-h-10 place-items-center rounded-lg border border-stone-700 text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                aria-label={`${project.title} 상태 재검증`}
                title="상태 재검증"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onMatch}
                className="grid min-h-10 place-items-center rounded-lg border border-amber-300/35 text-amber-100 transition hover:bg-amber-300/10"
                aria-label={`${project.title} 투자 의향 기록`}
                title="투자 의향 기록"
              >
                <Briefcase className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ apiOnline, onCreate }: { apiOnline: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-700 bg-stone-950/50 p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-lime-300 text-slate-950">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-xl font-black text-stone-50">아직 검증된 라이브 프로젝트가 없습니다.</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
        샘플 데이터를 보여주지 않습니다. 백엔드 API에 실제 제출된 프로젝트만 노출해 투자자가 가짜
        신호와 실제 신호를 혼동하지 않도록 했습니다.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={!apiOnline}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
      >
        <Plus className="h-4 w-4" />
        첫 프로젝트 검증 등록
      </button>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-stone-800 bg-[oklch(18%_0.018_205)] p-4">
          <div className="h-4 w-32 rounded bg-stone-800" />
          <div className="mt-4 h-6 w-64 max-w-full rounded bg-stone-800" />
          <div className="mt-3 h-4 w-full rounded bg-stone-800" />
          <div className="mt-2 h-4 w-2/3 rounded bg-stone-800" />
        </div>
      ))}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="닫기" />
      <section className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-stone-700 bg-[oklch(16%_0.018_205)] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-stone-50">{title}</h2>
            <p className="mt-1 text-sm text-stone-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:text-stone-50"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

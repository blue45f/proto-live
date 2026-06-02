import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  BarChart3,
  ChartBarBig,
  Briefcase,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Clock3,
  ExternalLink,
  Gauge,
  Globe2,
  Layers3,
  Link2,
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
  Users,
} from 'lucide-react';
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
  ProjectEvent,
  ProjectEventType,
  ProjectReview,
  ProjectReviewType,
  ValidationSnapshot,
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
  fetchProjectReviews,
  getApiErrorMessage,
  loginUser,
  logoutUser,
  recordProjectEvent,
  refreshAllProjects,
  refreshProject,
  moderateProjectReview,
  reportProjectReview,
  validateLiveUrl,
} from './api';
import {
  type AuthSession,
  type TestAccount,
  listTestAccounts,
  readSession,
  resolveRoleLabel,
} from './local-auth';
import ToastContainer, { toast } from './components/ToastContainer';

const DIALOG_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type AppView = 'market' | 'admin';

type RevenueModelConfig = {
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
};

const ADMIN_REVENUE_CONFIG_STORAGE_KEY = 'protolive:admin-revenue:v1';
const ADMIN_REVENUE_SCENARIO_STORAGE_KEY = 'protolive:admin-revenue-scenarios:v1';
const ADMIN_REVENUE_TARGET_STORAGE_KEY = 'protolive:admin-revenue-target:v1';
const LOGIN_MODAL_KEY = 'protolive:login-form:v1';
const ADMIN_PATH_SEGMENT = 'admin';

const DEFAULT_REVENUE_TARGET = 2500000;

const DEFAULT_REVENUE_CONFIG: RevenueModelConfig = {
  makerMonthlyFee: 25000,
  investorMonthlyFee: 19000,
  leadCaptureFee: 8000,
  makerConversionRate: 18,
  investorConversionRate: 14,
  closeLeadRate: 12,
  successFeeRate: 3.5,
  investorAcquisitionCost: 180000,
  makerAcquisitionCost: 280000,
  estimatedMonthlyChurnRate: 12,
};

const DEFAULT_SCENARIO_MULTIPLIERS: number[] = [0.75, 1, 1.25, 1.5];

const ADMIN_DASHBOARD_POLL_INTERVAL_MS = 30000;
const ADMIN_DASHBOARD_TREND_KEY_DAYS = 14;

const REVENUE_PRESETS: Array<{ id: string; name: string; label: string; description: string; config: RevenueModelConfig }> =
  [
    {
      id: 'lean',
      name: 'Lean',
      label: '보수적 베이직',
      description: '월 1회 운영 중심, 수익은 적지만 안정적으로 시작',
      config: {
        ...DEFAULT_REVENUE_CONFIG,
        makerMonthlyFee: 15000,
        investorMonthlyFee: 12000,
        leadCaptureFee: 4000,
        makerConversionRate: 10,
        investorConversionRate: 8,
        closeLeadRate: 8,
        investorAcquisitionCost: 240000,
        makerAcquisitionCost: 320000,
        estimatedMonthlyChurnRate: 16,
      },
    },
    {
      id: 'growth',
      name: 'Growth',
      label: '성장형 믹스',
      description: '확인·연결 비용을 함께 고려한 실전 운영형 모델',
      config: DEFAULT_REVENUE_CONFIG,
    },
    {
      id: 'scale',
      name: 'Scale',
      label: '확장형 프리미엄',
      description: '고빈도 투자 활동을 전제로 강하게 수익률을 당겨가는 시나리오',
      config: {
        ...DEFAULT_REVENUE_CONFIG,
        makerMonthlyFee: 42000,
        investorMonthlyFee: 33000,
        leadCaptureFee: 12000,
        makerConversionRate: 25,
        investorConversionRate: 20,
        closeLeadRate: 18,
        successFeeRate: 5,
        investorAcquisitionCost: 150000,
        makerAcquisitionCost: 240000,
        estimatedMonthlyChurnRate: 9,
      },
    },
  ];

const MIN_REVENUE_RATE = 0;
const MAX_REVENUE_RATE = 100;
const DECIMAL_DIGITS = 1;
const MIN_SCENARIO_MULTIPLIER = 0.05;
const MAX_SCENARIO_MULTIPLIER = 5;

type RevenueModelFieldKind = 'currency' | 'percent';

const REVENUE_MODEL_FIELDS: Array<{
  key: keyof RevenueModelConfig;
  label: string;
  helper: string;
  kind: RevenueModelFieldKind;
  }> = [
  {
    key: 'makerMonthlyFee',
    label: '창업자 월 정액',
    helper: '확인된 사이트가 월 1회 플랜 이용한다는 가정',
    kind: 'currency',
  },
  {
    key: 'investorMonthlyFee',
    label: '투자자 월 정액',
    helper: '활성 투자자에게 부과되는 월 구독료',
    kind: 'currency',
  },
  {
    key: 'leadCaptureFee',
    label: '리드 캡처 단가',
      helper: '연결·미리보기·아웃바운드 이벤트를 리드로 가정할 때',
      kind: 'currency',
    },
    {
      key: 'investorAcquisitionCost',
      label: '투자자 획득비용(CAC)',
      helper: '신규 투자자 1명 확보 시 투입되는 운영 비용을 월 단위로 환산한 값',
      kind: 'currency',
    },
    {
      key: 'makerAcquisitionCost',
      label: '창업자 획득비용(CAC)',
      helper: '사이트 주도형 창업자 1명을 유입/온보딩하는 데 필요한 비용',
      kind: 'currency',
    },
    {
      key: 'estimatedMonthlyChurnRate',
      label: '예상 월 이탈률',
      helper: '구독/활동 기반 이탈 비율을 월 단위로 반영한 LTV 산정값',
      kind: 'percent',
    },
    {
      key: 'makerConversionRate',
      label: '창업자 전환률',
      helper: '확인된 사이트 중 유효 플랜 전환 비율',
      kind: 'percent',
  },
  {
    key: 'investorConversionRate',
    label: '투자자 전환률',
    helper: '총 투자자 중 유효 과금으로 전환하는 비율',
    kind: 'percent',
  },
  {
    key: 'closeLeadRate',
    label: '리드→거래 전환률',
    helper: '리드가 실제 거래로 이어지는 비율',
    kind: 'percent',
  },
  {
    key: 'successFeeRate',
    label: '거래 성공 수수료율',
    helper: '클로징 금액 대비 성과 수수료 비율',
    kind: 'percent',
  },
];

function getDialogFocusableElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR)).filter((element) => {
    const computed = window.getComputedStyle(element);
    return computed.visibility !== 'hidden' && computed.display !== 'none';
  });
}

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

const EMPTY_ADMIN_DASHBOARD: AdminDashboardSnapshot = {
  conversionFunnel: {
    previewToMatchRate: 0,
    outboundToMatchRate: 0,
    matchPerProjectRate: 0,
    matchCount: 0,
    previewCount: 0,
    outboundCount: 0,
    totalEvents: 0,
  },
  eventTrend14d: [],
  eventTotals: {
    create: 0,
    preview: 0,
    outbound: 0,
    match: 0,
    refresh: 0,
  },
  accessModeDistribution: [],
  topMatchProjects: [],
  topSignalProjects: [],
  categoryPerformance: [],
  proposalRangeDistribution: [],
  riskProjects: [],
  health: {
    healthScore: 0,
    verifiedHealth: 0,
    conversionHealth: 0,
    engagementHealth: 0,
    responseHealth: 0,
    riskCount: 0,
    warningCount: 0,
  },
  recommendations: [],
  revenue: {
    assumptions: {
      ...DEFAULT_REVENUE_CONFIG,
    },
    monthlyMakerPlanRevenue: 0,
    monthlyInvestorPlanRevenue: 0,
    monthlyLeadRevenue: 0,
    monthlyTransactionRevenue: 0,
    totalMonthlyRevenue: 0,
    annualRevenue: 0,
    verifiedProjectShare: 0,
    averageCommittedPerInvestor: 0,
    arpu: 0,
    arppu: 0,
    investorLtvEstimate: 0,
    makerPaybackMonths: 0,
    investorPaybackMonths: 0,
    benchmarkGaps: [
      {
        key: 'verifiedProjectShare',
        label: '확인된 사이트 비중',
        actual: 0,
        target: 68,
        gap: -68,
        unit: 'percent',
        status: 'critical',
        comment: '확인된 사이트 비중이 목표 대비 68% 부족입니다.',
      },
      {
        key: 'previewToMatchRate',
        label: '미리보기→연결 전환',
        actual: 0,
        target: 12,
        gap: -12,
        unit: 'percent',
        status: 'critical',
        comment: '미리보기→연결 전환이 목표 대비 12% 부족입니다.',
      },
      {
        key: 'outboundToMatchRate',
        label: '아웃바운드→연결 전환',
        actual: 0,
        target: 18,
        gap: -18,
        unit: 'percent',
        status: 'critical',
        comment: '아웃바운드→연결 전환이 목표 대비 18% 부족입니다.',
      },
      {
        key: 'matchPerProjectRate',
        label: '사이트당 연결율',
        actual: 0,
        target: 30,
        gap: -30,
        unit: 'percent',
        status: 'critical',
        comment: '사이트당 연결율이 목표 대비 30% 부족입니다.',
      },
      {
        key: 'monthlyRevenue',
        label: '월 수익',
        actual: 0,
        target: 2500000,
        gap: -2500000,
        unit: 'currency',
        status: 'critical',
        comment: '월 수익이 목표 대비 2,500,000원 부족입니다.',
      },
      {
        key: 'arpu',
        label: 'ARPU',
        actual: 0,
        target: 50000,
        gap: -50000,
        unit: 'currency',
        status: 'critical',
        comment: 'ARPU가 목표 대비 50,000원 부족입니다.',
      },
    ],
    scenarios: [
      {
        label: '보수',
        multiplier: 0.75,
        monthlyRevenue: 0,
        annualRevenue: 0,
      },
      {
        label: '기준',
        multiplier: 1,
        monthlyRevenue: 0,
        annualRevenue: 0,
      },
      {
        label: '성장',
        multiplier: 1.25,
        monthlyRevenue: 0,
        annualRevenue: 0,
      },
      {
        label: '확장',
        multiplier: 1.5,
        monthlyRevenue: 0,
        annualRevenue: 0,
      },
    ],
    targetGap: {
      targetMonthlyRevenue: DEFAULT_REVENUE_TARGET,
      shortfall: 0,
      achievedRate: 0,
      drivers: [],
    },
  },
  lastUpdatedAt: new Date(0).toISOString(),
};

const EMPTY_CONFIG: MarketConfig = {
  categories: [],
  accessModes: [],
  fundingRanges: [],
  refreshIntervalMs: 30000,
  benchmarkSignals: [],
};

const FILTER_PRESET_STORAGE_KEY = 'protolive:filters:v1';
const FILTER_UI_STORAGE_KEY = 'protolive:filters-ui:v1';
const LIST_VIEW_STORAGE_KEY = 'protolive:list-view:v1';

type ProjectListViewMode = 'compact' | 'cards' | 'reviews';

const PROJECT_LIST_VIEW_OPTIONS: Array<{
  id: ProjectListViewMode;
  label: string;
  helper: string;
}> = [
  { id: 'compact', label: '간단 목록', helper: '빠르게 훑어보기' },
  { id: 'cards', label: '큰 카드', helper: '스크린샷 중심' },
  { id: 'reviews', label: '리뷰 중심', helper: '회원 반응 먼저' },
];

const FUNDING_SORT_OPTIONS: ProjectListQuery['sort'][] = ['signal', 'recent', 'created', 'funding'];

type RawFilterSnapshot = {
  q?: string;
  category?: string;
  tag?: string;
  accessMode?: string;
  sort?: string;
  page?: number;
  limit?: number;
  minSignal?: number;
  minFundingAmount?: number;
  maxFundingAmount?: number;
  onlyVerified?: boolean;
  favorites?: boolean;
};

function safeInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return toBoolean(value, fallback);
  return fallback;
}

function parseTagInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n#]+/)
        .map((tag) => tag.trim().replace(/\s+/g, ' '))
        .filter((tag) => tag.length >= 2 && tag.length <= 24),
    ),
  ).slice(0, 8);
}

function clampPageSize(value: number) {
  if (Number.isNaN(value)) return 12;
  return Math.max(1, Math.min(100, Math.floor(value)));
}

function clampSort(value: string | null) {
  if (!value) return 'signal';
  return FUNDING_SORT_OPTIONS.includes(value as (typeof FUNDING_SORT_OPTIONS)[number])
    ? (value as ProjectListQuery['sort'])
    : 'signal';
}

function readAdminRevenueConfig(): RevenueModelConfig {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_REVENUE_CONFIG };
  }

  try {
    const raw = localStorage.getItem(ADMIN_REVENUE_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_REVENUE_CONFIG };

    const parsed = JSON.parse(raw) as Partial<RevenueModelConfig>;
    return {
      makerMonthlyFee: safePositiveNumber(parsed.makerMonthlyFee, DEFAULT_REVENUE_CONFIG.makerMonthlyFee),
      investorMonthlyFee: safePositiveNumber(
      parsed.investorMonthlyFee,
      DEFAULT_REVENUE_CONFIG.investorMonthlyFee,
    ),
    leadCaptureFee: safePositiveNumber(parsed.leadCaptureFee, DEFAULT_REVENUE_CONFIG.leadCaptureFee),
    investorAcquisitionCost: safePositiveNumber(
      parsed.investorAcquisitionCost,
      DEFAULT_REVENUE_CONFIG.investorAcquisitionCost,
    ),
    makerAcquisitionCost: safePositiveNumber(
      parsed.makerAcquisitionCost,
      DEFAULT_REVENUE_CONFIG.makerAcquisitionCost,
    ),
    estimatedMonthlyChurnRate: clampRate(
      safeNumber(parsed.estimatedMonthlyChurnRate, DEFAULT_REVENUE_CONFIG.estimatedMonthlyChurnRate),
      0.01,
      99.99,
    ),
    makerConversionRate: clampRate(safeNumber(parsed.makerConversionRate, DEFAULT_REVENUE_CONFIG.makerConversionRate)),
      investorConversionRate: clampRate(
        safeNumber(parsed.investorConversionRate, DEFAULT_REVENUE_CONFIG.investorConversionRate),
      ),
      closeLeadRate: clampRate(safeNumber(parsed.closeLeadRate, DEFAULT_REVENUE_CONFIG.closeLeadRate)),
      successFeeRate: clampRate(safeNumber(parsed.successFeeRate, DEFAULT_REVENUE_CONFIG.successFeeRate), 0.1, 30),
    };
  } catch {
    return { ...DEFAULT_REVENUE_CONFIG };
  }
}

function normalizeScenarioMultipliers(values: unknown): number[] {
  const fallback = [...DEFAULT_SCENARIO_MULTIPLIERS];
  if (!Array.isArray(values)) {
    return fallback;
  }

  const parsed = values
    .map((value) => (typeof value === 'number' ? value : Number.parseFloat(String(value))))
    .filter((value) => Number.isFinite(value))
    .map((value) => {
      return Math.max(MIN_SCENARIO_MULTIPLIER, Math.min(MAX_SCENARIO_MULTIPLIER, value));
    })
    .map((value) => Math.round(value * 100) / 100);

  if (parsed.length === 0) {
    return fallback;
  }

  const unique = Array.from(new Set(parsed));
  if (unique.length === 0) {
    return fallback;
  }

  return unique.sort((a, b) => a - b);
}

function readAdminScenarioMultipliers(): number[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_SCENARIO_MULTIPLIERS];
  }

  try {
    const raw = localStorage.getItem(ADMIN_REVENUE_SCENARIO_STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_SCENARIO_MULTIPLIERS];
    }

    const parsed = JSON.parse(raw) as unknown;
    return normalizeScenarioMultipliers(parsed);
  } catch {
    return [...DEFAULT_SCENARIO_MULTIPLIERS];
  }
}

function readAdminRevenueTarget(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_REVENUE_TARGET;
  }

  try {
    const raw = localStorage.getItem(ADMIN_REVENUE_TARGET_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_REVENUE_TARGET;
    }

    const parsed = JSON.parse(raw);
    return safePositiveNumber((parsed as { targetMonthlyRevenue?: unknown }).targetMonthlyRevenue, DEFAULT_REVENUE_TARGET);
  } catch {
    return DEFAULT_REVENUE_TARGET;
  }
}

function safePositiveNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  return fallback;
}

function safeNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

function clampRate(value: number, min = MIN_REVENUE_RATE, max = MAX_REVENUE_RATE) {
  return Math.max(min, Math.min(max, value));
}

function readFilterPreset(): RawFilterSnapshot {
  const fallback: RawFilterSnapshot = {
    q: '',
    category: 'All',
    tag: 'All',
    accessMode: 'All',
    sort: 'signal',
    page: 1,
    limit: 12,
    minSignal: 0,
    minFundingAmount: 0,
    maxFundingAmount: 0,
    onlyVerified: false,
    favorites: false,
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  let stored: Partial<RawFilterSnapshot> = {};
  try {
    const raw = localStorage.getItem(FILTER_PRESET_STORAGE_KEY);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch {
    stored = {};
  }

  const url = new URL(window.location.href);
  const saved = {
    q: url.searchParams.get('q') ?? null,
    category: url.searchParams.get('category') ?? null,
    tag: url.searchParams.get('tag') ?? null,
    accessMode: url.searchParams.get('accessMode') ?? null,
    sort: url.searchParams.get('sort') ?? null,
    page: url.searchParams.get('page'),
    limit: url.searchParams.get('limit'),
    minSignal: url.searchParams.get('minSignal'),
    minFundingAmount: url.searchParams.get('minFundingAmount'),
    maxFundingAmount: url.searchParams.get('maxFundingAmount'),
    onlyVerified: url.searchParams.get('onlyVerified'),
    favorites: url.searchParams.get('favorites'),
  };

  const hasAnyQuery = Array.from(url.searchParams.keys()).length > 0;
  if (!hasAnyQuery) {
    return {
      q: stored.q ?? fallback.q,
      category: stored.category ?? fallback.category,
      tag: stored.tag ?? fallback.tag,
      accessMode: stored.accessMode ?? fallback.accessMode,
      sort: clampSort(stored.sort ?? fallback.sort ?? null) as string,
      page: Math.max(1, safeInt(stored.page?.toString() ?? null, fallback.page ?? 1)),
      limit: clampPageSize(stored.limit ?? (fallback.limit ?? 12)),
      minSignal: Math.max(0, safeInt(stored.minSignal?.toString() ?? null, fallback.minSignal ?? 0)),
      minFundingAmount: Math.max(
        0,
        safeInt(stored.minFundingAmount?.toString() ?? null, fallback.minFundingAmount ?? 0),
      ),
      maxFundingAmount: Math.max(
        0,
        safeInt(stored.maxFundingAmount?.toString() ?? null, fallback.maxFundingAmount ?? 0),
      ),
      onlyVerified: parseBoolean(stored.onlyVerified, false),
      favorites: parseBoolean(stored.favorites, false),
    };
  }

  return {
    q: saved.q ?? fallback.q,
    category: saved.category ?? fallback.category,
    tag: saved.tag ?? fallback.tag,
    accessMode: saved.accessMode ?? fallback.accessMode,
    sort: clampSort(saved.sort) as string,
    page: safeInt(saved.page, fallback.page ?? 1),
    limit: safeInt(saved.limit, fallback.limit ?? 12),
    minSignal: Math.max(0, safeInt(saved.minSignal, fallback.minSignal ?? 0)),
    minFundingAmount: Math.max(0, safeInt(saved.minFundingAmount, fallback.minFundingAmount ?? 0)),
    maxFundingAmount: Math.max(0, safeInt(saved.maxFundingAmount, fallback.maxFundingAmount ?? 0)),
    onlyVerified: toBoolean(saved.onlyVerified, false),
    favorites: toBoolean(saved.favorites, false),
  };
}

function readProjectListViewMode(): ProjectListViewMode {
  if (typeof window === 'undefined') {
    return 'compact';
  }

  const raw = localStorage.getItem(LIST_VIEW_STORAGE_KEY);
  return raw === 'cards' || raw === 'reviews' || raw === 'compact' ? raw : 'compact';
}

const benchmarkCopy: Record<string, { title: string; body: string }> = {
  live_demo_required: {
    title: '사이트 등록 전 확인',
    body: '공인망 사이트 확인을 통과한 제품만 시장에 노출되어, 확인된 사이트만 탐색 대상으로 남습니다.',
  },
  verification_telemetry: {
    title: '열림 상태',
    body: '응답 시간과 최근 확인 시각을 쉽게 보여줍니다.',
  },
  investor_intent_capture: {
    title: '관심 남기기',
    body: '관심 금액과 메시지를 남겨 다음 연락으로 이어갑니다.',
  },
  real_attention_scoring: {
    title: '관심 점수',
    body: '검색, 보기, 리뷰 요청을 모아 어떤 사이트가 주목받는지 보여줍니다.',
  },
};

const differentiationRows: Array<{
  label: string;
  usual: string;
  protolive: string;
}> = [
  {
    label: '일반 소개 페이지',
    usual: '노출, 투표, 댓글 중심',
    protolive: '응답 코드와 미리보기 가능 상태를 먼저 봅니다.',
  },
  {
    label: '자료실',
    usual: '문서 열람과 페이지 분석 중심',
    protolive: '작동 중인 제품 URL과 접근 보호를 같은 레일에서 다룹니다.',
  },
  {
    label: '투자자 관리',
    usual: '연락처, 파이프라인, 업데이트 중심',
    protolive: '관심 행동을 금액 의향과 사이트 신호로 연결합니다.',
  },
  {
    label: '회사 목록',
    usual: '정적 프로필과 외부 데이터 검색 중심',
    protolive: '최신 확인 시간, 응답 속도, 연결 이벤트가 화면을 갱신합니다.',
  },
];

const eventCopy: Record<ProjectEventType, { icon: LucideIcon; label: string; tone: string }> = {
  create: {
    icon: Plus,
    label: '등록',
    tone: 'border-lime-300/25 bg-lime-300/10 text-lime-100',
  },
  preview: {
    icon: Sparkles,
    label: '미리보기',
    tone: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
  },
  outbound: {
    icon: ArrowUpRight,
    label: '새 탭',
    tone: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
  },
  match: {
    icon: Briefcase,
    label: '연결',
    tone: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  },
  refresh: {
    icon: RefreshCw,
    label: '갱신',
    tone: 'border-stone-500/30 bg-stone-800/50 text-stone-200',
  },
};

const reviewTypeCopy: Record<ProjectReviewType, { label: string; helper: string; tone: string }> = {
  review: {
    label: '평가 리뷰',
    helper: '좋았던 점, 불편했던 점, 별점을 남겨주세요.',
    tone: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
  },
  support: {
    label: '성장 도움',
    helper: '고객 연결, 테스트, 운영 조언처럼 실제 성장에 도움 되는 제안을 남겨주세요.',
    tone: 'border-lime-300/35 bg-lime-300/10 text-lime-100',
  },
  idea: {
    label: '아이디어',
    helper: '다음 기능, 더 쉬운 사용법, 새로운 고객군 아이디어를 남겨주세요.',
    tone: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100',
  },
};

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const safeName = name.length <= 2 ? `${name[0] ?? '*'}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
}

function getRoleLabel(role: string) {
  if (role === 'maker') return '창업자';
  if (role === 'investor') return '투자자';
  if (role === 'admin') return '운영자';
  return '회원';
}

function getAuditActionLabel(action: string) {
  if (action === 'match_compliance_accepted') return '투자 관심 동의';
  if (action === 'review_reported') return '리뷰 신고';
  if (action === 'review_hidden_auto') return '자동 숨김';
  if (action === 'review_moderated') return '운영 검토';
  return '운영 기록';
}

function getRootReviews(reviews: ProjectReview[]) {
  return reviews.filter((review) => !review.parentId);
}

function getRepliesByParent(reviews: ProjectReview[]) {
  return reviews.reduce<Record<number, ProjectReview[]>>((acc, review) => {
    if (!review.parentId) return acc;
    acc[review.parentId] = [...(acc[review.parentId] ?? []), review];
    return acc;
  }, {});
}

function getResponseTimeTone(responseTimeMs?: number) {
  if (typeof responseTimeMs !== 'number') {
    return {
      label: '미측정',
      tone: 'border-stone-700/70 bg-stone-900/55 text-stone-300',
    };
  }

  if (responseTimeMs <= 300) {
    return {
      label: '빠름',
      tone: 'border-lime-300/25 bg-lime-300/10 text-lime-200',
    };
  }

  if (responseTimeMs <= 1000) {
    return {
      label: '보통',
      tone: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
    };
  }

  if (responseTimeMs <= 2000) {
    return {
      label: '느림',
      tone: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    };
  }

  return {
    label: '매우 느림',
    tone: 'border-red-300/25 bg-red-500/10 text-red-200',
  };
}

function getSignalQuality(score?: number) {
  if (typeof score !== 'number') {
    return {
      label: '초기',
      tone: 'border-stone-700/70 bg-stone-900/55 text-stone-300',
    };
  }

  if (score >= 90) {
    return {
      label: '상위 10%',
      tone: 'border-lime-300/35 bg-lime-300/10 text-lime-100',
    };
  }

  if (score >= 70) {
    return {
      label: '핫',
      tone: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100',
    };
  }

  if (score >= 45) {
    return {
      label: '주목',
      tone: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
    };
  }

  return {
    label: '모니터',
    tone: 'border-stone-700/70 bg-stone-900/55 text-stone-300',
  };
}

function formatWon(amount: number) {
  if (amount <= 0) return '₩0';
  if (amount >= 100000000) {
    const value = amount / 100000000;
    return `₩${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}억`;
  }
  return `₩${Math.round(amount / 10000).toLocaleString('ko-KR')}만`;
}

function formatCurrency(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '₩0';
  }

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function formatRate(value: number) {
  return `${value.toFixed(DECIMAL_DIGITS)}%`;
}

function formatDriverValue(value: number, unit: 'currency' | 'percent') {
  return unit === 'percent' ? formatRate(value) : formatCurrency(value);
}

function percentChange(previousValue: number, currentValue: number) {
  if (previousValue <= 0) {
    return 0;
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
}

function isEqualPreset(a: RevenueModelConfig, b: RevenueModelConfig) {
  const bValues = b as Record<keyof RevenueModelConfig, number>;
  return Object.entries(a).every(([key, value]) => {
    return value === bValues[key as keyof RevenueModelConfig];
  });
}

function formatTrendDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}

function normalizeAmountInput(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function normalizeScenarioInputValue(value: number) {
  if (!Number.isFinite(value)) return 1;
  const clamped = Math.max(MIN_SCENARIO_MULTIPLIER, Math.min(MAX_SCENARIO_MULTIPLIER, value));
  return Math.round(clamped * 100) / 100;
}

function readInitialProjectId(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const match = window.location.pathname.match(/\/projects\/(\d+)\/?$/);
  if (!match) {
    return null;
  }

  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

function readInitialView(): AppView {
  if (typeof window === 'undefined') {
    return 'market';
  }

  const url = new URL(window.location.href);
  const pathParts = url.pathname
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .slice(-1)[0];
  const isAdminPath = pathParts === ADMIN_PATH_SEGMENT;

  return url.searchParams.get('view') === 'admin' || isAdminPath ? 'admin' : 'market';
}

function isPercentValue(value: number) {
  return value >= MIN_REVENUE_RATE && value <= MAX_REVENUE_RATE;
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

function formatHealthScore(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))} / 100`;
}

function formatDaysSince(value: number) {
  if (!Number.isFinite(value)) {
    return '자료 없음';
  }

  if (value >= 9999) {
    return '활동 없음';
  }

  return `${Math.max(0, Math.floor(value))}일 전`;
}

function getRecommendationTone(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'border-red-300/35 bg-red-950/30 text-red-100';
  if (priority === 'medium') return 'border-amber-300/35 bg-amber-950/30 text-amber-100';
  return 'border-cyan-300/35 bg-cyan-950/30 text-cyan-100';
}

function getRecommendationPriorityTone(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'border-red-300/45 bg-red-500/14 text-red-100';
  if (priority === 'medium') return 'border-amber-300/45 bg-amber-500/14 text-amber-100';
  return 'border-cyan-300/45 bg-cyan-500/14 text-cyan-100';
}

function getRecommendationPriorityLabel(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return '긴급';
  if (priority === 'medium') return '중간';
  return '완화';
}

function getRecommendationAreaMeta(area: string) {
  if (area === '수익 모델') {
    return {
      icon: DollarSign,
      tone: 'border-emerald-300/45 bg-emerald-950/30 text-emerald-100',
      label: '수익 가정',
    };
  }

  if (area === '리스크 관리') {
    return {
      icon: ShieldCheck,
      tone: 'border-red-300/45 bg-red-950/30 text-red-100',
      label: '리스크 점검',
    };
  }

  if (area === '퍼널 개선') {
    return {
      icon: Signal,
      tone: 'border-sky-300/45 bg-sky-950/30 text-sky-100',
      label: '퍼널 개선',
    };
  }

  if (area === '활동성') {
    return {
      icon: Activity,
      tone: 'border-lime-300/45 bg-lime-950/30 text-lime-100',
      label: '활동 모니터링',
    };
  }

  if (area === '인프라') {
    return {
      icon: Layers3,
      tone: 'border-indigo-300/45 bg-indigo-950/30 text-indigo-100',
      label: '인프라 점검',
    };
  }

  if (area === '확인 게이트') {
    return {
      icon: TimerReset,
      tone: 'border-violet-300/45 bg-violet-950/30 text-violet-100',
      label: '확인 게이트',
    };
  }

  return {
    icon: Gauge,
    tone: 'border-cyan-300/45 bg-cyan-950/30 text-cyan-100',
    label: area,
  };
}

const PRIORITY_COPY: Record<'high' | 'medium' | 'low', string> = {
  high: '긴급 대응',
  medium: '우선 조치',
  low: '세밀 보완',
};

function getRecommendationSummary(recommendations: AdminActionRecommendation[]) {
  return recommendations.reduce(
    (acc, entry) => {
      acc[entry.priority] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

const PRIORITY_WEIGHT: Record<AdminActionRecommendation['priority'], number> = {
  high: 2,
  medium: 1,
  low: 0,
};

function sortAdminRecommendationsByPriority(recommendations: AdminActionRecommendation[]) {
  return [...recommendations].sort((a, b) => {
    if (PRIORITY_WEIGHT[b.priority] !== PRIORITY_WEIGHT[a.priority]) {
      return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    }
    return a.area.localeCompare(b.area);
  });
}

const DRIVER_ACTION_HINT: Record<string, string> = {
  makerMonthlyFee: '창업자 가격 정책은 A/B로 분기화하세요. 기본형/비즈니스형 플랜 혜택을 분리해 2주 단위로 전환률을 추적합니다.',
  investorMonthlyFee: '투자자용 플랜은 업셀링 문구(성과 리포트, 우선 지원권)와 함께 노출해 가격 동의 전환 장벽을 낮춥니다.',
  leadCaptureFee: '채널별 리드 단가 대비 실제 전환율이 좋은 채널을 선별하고, 저품질 채널은 즉시 배제해 재배치하세요.',
  makerConversionRate:
    '창업자 온보딩 완료율을 올리세요. 라이브 점검 가이드, 체크리스트 자동 알림, 업로드 품질 규정 준수율로 전환을 2주 내 개선합니다.',
  investorConversionRate:
    '투자자 참여 유입 후 24시간 내 첫 팔로업, 사례 기반 제안 메시지, 담당자 연결 예약을 기본 플로우로 넣어 전환을 단축합니다.',
  closeLeadRate:
    '연결 건 단위로 1차 리마인드·성공 KPI 템플릿을 운영해 리드 닫기 절차를 표준화하고 반송률을 줄입니다.',
  successFeeRate:
    '수수료율 인상은 계약 문구 업데이트와 거래 완료 보상 플로우 안정화 후 단계적으로 적용해 이탈 없이 진행하세요.',
};

function getDriverActionHint(driverKey: string) {
  return DRIVER_ACTION_HINT[driverKey] ?? '현재 데이터 기반으로 병목 구간을 실험군 단위로 분해해 개선 포인트를 확인하세요.';
}

function formatPaybackValue(months: number) {
  if (months <= 0 || !Number.isFinite(months)) {
    return '회수 계산 미제공';
  }
  return `${months}개월`;
}

function upsertProject(projects: Project[], nextProject: Project) {
  const exists = projects.some((project) => project.id === nextProject.id);
  if (!exists) return [nextProject, ...projects];
  return projects.map((project) => (project.id === nextProject.id ? nextProject : project));
}

export default function App() {
  const filterPreset = useMemo(() => readFilterPreset(), []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<MarketStats>(EMPTY_STATS);
  const [config, setConfig] = useState<MarketConfig>(EMPTY_CONFIG);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboardSnapshot>(EMPTY_ADMIN_DASHBOARD);
  const [adminDashboardError, setAdminDashboardError] = useState('');
  const [apiOnline, setApiOnline] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApplyingAllAdminRecommendations, setIsApplyingAllAdminRecommendations] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<AppView>(readInitialView());
  const [detailProjectId, setDetailProjectId] = useState<number | null>(readInitialProjectId);
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [isSessionHydrating, setIsSessionHydrating] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const testAccounts = useMemo<TestAccount[]>(() => listTestAccounts(), []);
  const testAccountsByRole = useMemo(() => {
    return {
      maker: testAccounts.filter((account) => account.role === 'maker'),
      investor: testAccounts.filter((account) => account.role === 'investor'),
      member: testAccounts.filter((account) => account.role === 'member'),
      admin: testAccounts.filter((account) => account.role === 'admin'),
    };
  }, [testAccounts]);
  const [loginEmail, setLoginEmail] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    try {
      const raw = localStorage.getItem(LOGIN_MODAL_KEY);
      if (!raw) {
        return '';
      }

      const parsed = JSON.parse(raw) as { email?: string };
      return typeof parsed.email === 'string' ? parsed.email : '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const isAuthenticated = session !== null;
  const isMaker = session?.role === 'maker';
  const isInvestor = session?.role === 'investor';
  const isAdmin = session?.role === 'admin';
  const canSubmitProject = isMaker;
  const canMatch = isInvestor;
  const canAccessAdmin = isAdmin;
  const shouldShowLogin = isLoginOpen;

  useEffect(() => {
    let isMounted = true;

    fetchAuthSession()
      .then((nextSession) => {
        if (isMounted) {
          setSession(nextSession);
          setIsSessionHydrating(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
          setIsSessionHydrating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveView = useMemo<AppView>(() => {
    if (view === 'admin' && isSessionHydrating) {
      return 'admin';
    }

    if (!session) {
      return 'market';
    }

    return view === 'admin' && !canAccessAdmin ? 'market' : view;
  }, [session, view, canAccessAdmin, isSessionHydrating]);

  const [adminRevenueConfig, setAdminRevenueConfig] = useState<RevenueModelConfig>(
    readAdminRevenueConfig,
  );
  const [adminReportedReviews, setAdminReportedReviews] = useState<AdminReportedReview[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AuditLog[]>([]);
  const [moderatingReviewId, setModeratingReviewId] = useState<number | null>(null);
  const [adminRevenueTargetMonthly, setAdminRevenueTargetMonthly] = useState(readAdminRevenueTarget);
  const [debouncedAdminRevenueTargetMonthly, setDebouncedAdminRevenueTargetMonthly] =
    useState(adminRevenueTargetMonthly);
  const [adminScenarioMultipliers, setAdminScenarioMultipliers] = useState<number[]>(readAdminScenarioMultipliers);
  const [debouncedAdminRevenueConfig, setDebouncedAdminRevenueConfig] = useState<RevenueModelConfig>(adminRevenueConfig);
  const [debouncedScenarioMultipliers, setDebouncedScenarioMultipliers] =
    useState<number[]>(adminScenarioMultipliers);

  const [searchQuery, setSearchQuery] = useState(filterPreset.q ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(filterPreset.category ?? 'All');
  const [selectedTag, setSelectedTag] = useState(filterPreset.tag ?? 'All');
  const [projectListView, setProjectListView] = useState<ProjectListViewMode>(readProjectListViewMode);
  const [selectedAccessMode, setSelectedAccessMode] = useState<'All' | ProjectAccessMode>(
    filterPreset.accessMode === 'open' || filterPreset.accessMode === 'screened'
      ? filterPreset.accessMode
      : 'All',
  );
  const [sortMode, setSortMode] = useState<'signal' | 'recent' | 'created' | 'funding'>(
    filterPreset.sort as 'signal' | 'recent' | 'created' | 'funding',
  );
  const [page, setPage] = useState(filterPreset.page ?? 1);
  const [pageSize, setPageSize] = useState(clampPageSize(filterPreset.limit ?? 12));
  const [minFundingAmount, setMinFundingAmount] = useState(filterPreset.minFundingAmount ?? 0);
  const [maxFundingAmount, setMaxFundingAmount] = useState(filterPreset.maxFundingAmount ?? 0);
  const [projectMeta, setProjectMeta] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
    limit: 12,
  });
  const [onlyVerified, setOnlyVerified] = useState(filterPreset.onlyVerified ?? false);
  const [minSignal, setMinSignal] = useState(filterPreset.minSignal ?? 0);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(filterPreset.favorites ?? false);
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
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
  const [diligenceProject, setDiligenceProject] = useState<Project | null>(null);
  const [diligenceEvents, setDiligenceEvents] = useState<ProjectEvent[]>([]);
  const [isDiligenceEventsLoading, setIsDiligenceEventsLoading] = useState(false);

  const [matchingProject, setMatchingProject] = useState<Project | null>(null);
  const [fundingRangeId, setFundingRangeId] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  const [matchLegalNoticeAccepted, setMatchLegalNoticeAccepted] = useState(false);
  const [matchPrivacyConsentAccepted, setMatchPrivacyConsentAccepted] = useState(false);
  const [matchRiskNoticeAccepted, setMatchRiskNoticeAccepted] = useState(false);
  const [isSendingMatch, setIsSendingMatch] = useState(false);
  const [reviewProject, setReviewProject] = useState<Project | null>(null);
  const [projectReviews, setProjectReviews] = useState<ProjectReview[]>([]);
  const [isProjectReviewsLoading, setIsProjectReviewsLoading] = useState(false);
  const [reviewType, setReviewType] = useState<ProjectReviewType>('review');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [replyToReview, setReplyToReview] = useState<ProjectReview | null>(null);
  const [isSendingReview, setIsSendingReview] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(null);
  const detailProject = useMemo(
    () => projects.find((project) => project.id === detailProjectId) ?? null,
    [detailProjectId, projects],
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    const hasAdvancedFilterPreset =
      (filterPreset.accessMode !== 'All' && filterPreset.accessMode !== undefined) ||
      (filterPreset.onlyVerified ?? false) ||
      (filterPreset.favorites ?? false) ||
      (filterPreset.minSignal ?? 0) > 0 ||
      (filterPreset.minFundingAmount ?? 0) > 0 ||
      (filterPreset.maxFundingAmount ?? 0) > 0;

    try {
      const raw = localStorage.getItem(FILTER_UI_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.showAdvancedFilters === 'boolean') {
          return parsed.showAdvancedFilters;
        }
      }
    } catch {
      // Ignore UI persistence reads errors and fall back to presets.
    }

    return (
      hasAdvancedFilterPreset
    );
  });
  const isFilterInitialized = useRef(false);
  const previewDialogRef = useRef<HTMLElement>(null);
  const diligenceDialogRef = useRef<HTMLElement>(null);
  const matchModalRef = useRef<HTMLElement>(null);
  const reviewModalRef = useRef<HTMLElement>(null);
  const loginModalRef = useRef<HTMLElement>(null);
  const submitModalRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isMobileProjectTimelineOpen, setIsMobileProjectTimelineOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onPopState = () => {
      setDetailProjectId(readInitialProjectId());
      setView(readInitialView());
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!detailProjectId) {
      return;
    }

    fetchProjectReviews(detailProjectId)
      .then((reviews) => setProjectReviews(reviews))
      .catch((error) => {
        toast('error', '리뷰 불러오기 실패', getApiErrorMessage(error, '리뷰와 답글을 불러오지 못했습니다.'));
      })
      .finally(() => setIsProjectReviewsLoading(false));

    fetchProjectEvents(detailProjectId)
      .then((events) => setDiligenceEvents(events))
      .catch(() => setDiligenceEvents([]))
      .finally(() => setIsDiligenceEventsLoading(false));
  }, [detailProjectId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const nextPayload = { email: loginEmail.trim() };
      if (nextPayload.email) {
        localStorage.setItem(LOGIN_MODAL_KEY, JSON.stringify(nextPayload));
      } else {
        localStorage.removeItem(LOGIN_MODAL_KEY);
      }
    } catch {
      // Ignore local persistence failures.
    }
  }, [loginEmail]);

  useEffect(() => {
    if (session && view === 'admin' && !canAccessAdmin) {
      toast('error', '접근 제한', '관리자 화면은 운영자 계정에서만 접근할 수 있습니다.');
    }
  }, [session, view, canAccessAdmin]);

  const categoryOptions = useMemo(() => ['All', ...config.categories], [config.categories]);
  const tagOptions = useMemo(
    () => [
      'All',
      ...Array.from(
        new Set([
          ...projects.flatMap((project) => project.tags ?? []),
          ...(selectedTag === 'All' ? [] : [selectedTag]),
        ]),
      ).sort((a, b) => a.localeCompare(b, 'ko-KR')),
    ],
    [projects, selectedTag],
  );

  const normalizedCategory =
    selectedCategory === 'All' || config.categories.includes(selectedCategory)
      ? selectedCategory
      : 'All';
  const normalizedTag = selectedTag === 'All' || tagOptions.includes(selectedTag) ? selectedTag : 'All';
  const normalizedAccessMode =
    selectedAccessMode === 'All' || config.accessModes.some((mode) => mode.id === selectedAccessMode)
      ? selectedAccessMode
      : 'All';

  const hasFundingRangeError = maxFundingAmount > 0 && minFundingAmount > 0 && maxFundingAmount < minFundingAmount;

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
    };
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
  ]);

  const adminRevenueProjectionParams = useMemo(() => ({
    ...debouncedAdminRevenueConfig,
    scenarioMultipliers: debouncedScenarioMultipliers,
    targetMonthlyRevenue: debouncedAdminRevenueTargetMonthly,
  }), [debouncedAdminRevenueConfig, debouncedAdminRevenueTargetMonthly, debouncedScenarioMultipliers]);

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

    if (normalizedCategory !== 'All') {
      filters.push({
        id: 'category',
        label: `카테고리: ${normalizedCategory}`,
        onClear: () => {
          setSelectedCategory('All');
          setPage(1);
        },
      });
    }

    if (normalizedTag !== 'All') {
      filters.push({
        id: 'tag',
        label: `태그: #${normalizedTag}`,
        onClear: () => {
          setSelectedTag('All');
          setPage(1);
        },
      });
    }

    if (normalizedAccessMode !== 'All') {
      filters.push({
        id: 'accessMode',
        label: `공개범위: ${normalizedAccessMode === 'open' ? '공개' : '선별'}`,
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
            : '예상 투자금순';
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
        label: '확인된 사이트만',
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
          setPage(1);
        },
      });
    }

    if (minSignal > 0) {
      filters.push({
        id: 'minSignal',
        label: `최소 관심 ${minSignal}`,
        onClear: () => {
          setMinSignal(0);
          setPage(1);
        },
      });
    }

    if (!hasFundingRangeError && (minFundingAmount > 0 || maxFundingAmount > 0)) {
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
    normalizedAccessMode,
    normalizedCategory,
    normalizedTag,
    showFavoritesOnly,
    sortMode,
    hasFundingRangeError,
  ]);

  const favoriteProjectCount = favoriteProjectIds.size;

  const isAdminView = effectiveView === 'admin';
  const isAdminDashboardAvailable = adminDashboard.lastUpdatedAt !== EMPTY_ADMIN_DASHBOARD.lastUpdatedAt;
  const orderedAdminRecommendations = useMemo(
    () => sortAdminRecommendationsByPriority(adminDashboard.recommendations),
    [adminDashboard.recommendations],
  );
  const recommendationSummary = useMemo(() => getRecommendationSummary(orderedAdminRecommendations), [orderedAdminRecommendations]);

  const revenueProjection = adminDashboard.revenue;
  const adminRevenueTargetGap = revenueProjection.targetGap;
  const targetGapRate = clampRate(adminRevenueTargetGap.achievedRate, 0, 100);

  const adminTrendMetrics = useMemo(() => {
    const trend = adminDashboard.eventTrend14d;
    const totalDays = trend.length;
    const splitIndex = Math.max(0, totalDays - ADMIN_DASHBOARD_TREND_KEY_DAYS / 2);
    const recent = trend.slice(splitIndex);
    const previous = splitIndex === 0 ? [] : trend.slice(0, splitIndex);
    const recentTotal = recent.reduce((sum, item) => sum + item.total, 0);
    const previousTotal = previous.reduce((sum, item) => sum + item.total, 0);
    const maxDaily = Math.max(1, ...trend.map((item) => item.total));

    return {
      trend,
      recentTotal,
      previousTotal,
      trendDelta: percentChange(previousTotal, recentTotal),
      maxDaily,
    };
  }, [adminDashboard]);

  const adminRevenueHealthScore = useMemo(() => {
    const scores = revenueProjection.benchmarkGaps.map((entry) => {
      if (entry.status === 'good') return 100;
      if (entry.status === 'warning') return 65;
      return 30;
    });

    if (scores.length === 0) {
      return 0;
    }

    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    return Math.round(average);
  }, [revenueProjection]);

  const adminRevenueHealthTone =
    adminRevenueHealthScore >= 80
      ? 'border-lime-300/45 bg-lime-950/20 text-lime-100'
      : adminRevenueHealthScore >= 60
        ? 'border-amber-300/45 bg-amber-950/20 text-amber-100'
        : 'border-red-300/45 bg-red-950/20 text-red-100';

  const applyFundingRange = useCallback((range: FundingRange) => {
    setMinFundingAmount(range.minAmount);
    setMaxFundingAmount(range.maxAmount);
    setPage(1);
  }, []);

  const applyObservedConversionRates = useCallback((): boolean => {
    if (!isAdminDashboardAvailable) {
      toast('error', '데이터 없음', '관리자 대시보드 집계가 준비되지 않았습니다. 새로고침 후 다시 시도하세요.');
      return false;
    }

    const observedMakerRate =
      stats.totalProjects > 0 ? clampRate((stats.verifiedProjects / stats.totalProjects) * 100) : adminRevenueConfig.makerConversionRate;
    const observedInvestorRate =
      adminDashboard.conversionFunnel.matchPerProjectRate > 0
        ? adminDashboard.conversionFunnel.matchPerProjectRate
        : adminRevenueConfig.investorConversionRate;
    const observedCloseRate =
      adminDashboard.conversionFunnel.previewToMatchRate > 0
        ? adminDashboard.conversionFunnel.previewToMatchRate
        : adminRevenueConfig.closeLeadRate;

    setAdminRevenueConfig((current) => ({
      ...current,
      makerConversionRate: observedMakerRate,
      investorConversionRate: observedInvestorRate,
      closeLeadRate: observedCloseRate,
    }));

    toast('info', '운영 데이터 반영', '관측된 전환율로 수익 모델 가정을 업데이트했습니다.');
    return true;
  }, [
    adminDashboard.conversionFunnel.matchPerProjectRate,
    adminDashboard.conversionFunnel.previewToMatchRate,
    isAdminDashboardAvailable,
    stats.totalProjects,
    stats.verifiedProjects,
    adminRevenueConfig.closeLeadRate,
    adminRevenueConfig.investorConversionRate,
    adminRevenueConfig.makerConversionRate,
  ]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedTag('All');
    setSelectedAccessMode('All');
    setSortMode('signal');
    setMinSignal(0);
    setMinFundingAmount(0);
    setMaxFundingAmount(0);
    setOnlyVerified(false);
    setShowFavoritesOnly(false);
    setPage(1);
  }, []);

  const applyAdminRecommendation = useCallback((entry: AdminActionRecommendation): boolean => {
    const moveToMarket = () => {
      setView('market');
      setPage(1);
    };
    const focusRiskProject = adminDashboard.riskProjects[0];

    if (entry.area === '수익 모델') {
      return applyObservedConversionRates();
    }

    resetFilters();

    if (entry.area === '리스크 관리' && focusRiskProject) {
      setSearchQuery(focusRiskProject.title);
      setDebouncedSearch(focusRiskProject.title);
      setSortMode('recent');
      moveToMarket();
      toast('info', '추천 액션 적용', `${focusRiskProject.title} 리스크 점검 필터를 열었습니다.`);
      return true;
    }

    if (entry.area === '퍼널 개선') {
      setOnlyVerified(true);
      setSortMode('funding');
      moveToMarket();
      toast('info', '추천 액션 적용', '확인된 사이트를 투자 규모순으로 열어 연결 CTA 점검 대상을 좁혔습니다.');
      return true;
    }

    if (entry.area === '활동성') {
      setSortMode('recent');
      moveToMarket();
      toast('info', '추천 액션 적용', '최신 신호순으로 전환해 활동이 낮은 사이트를 빠르게 비교합니다.');
      return true;
    }

    if (entry.area === '인프라' || entry.area === '확인 게이트') {
      setSortMode('recent');
      moveToMarket();
      toast('info', '추천 액션 적용', '최근 등록/확인 흐름으로 이동해 URL 응답 상태를 재점검합니다.');
      return true;
    }

    moveToMarket();
    toast('info', '추천 액션 적용', '시장 워크스페이스로 이동해 추천 기준을 점검합니다.');
    return true;
  }, [adminDashboard.riskProjects, applyObservedConversionRates, resetFilters]);

  const applyAllAdminRecommendations = useCallback(() => {
    if (isApplyingAllAdminRecommendations) {
      return;
    }

    if (orderedAdminRecommendations.length === 0) {
      toast('info', '일괄 적용 미실행', '현재 처리할 운영 추천 항목이 없습니다.');
      return;
    }

    setIsApplyingAllAdminRecommendations(true);
    const orderedQueue = [...orderedAdminRecommendations];
    let appliedCount = 0;
    let skippedCount = 0;

    try {
      orderedQueue.forEach((entry) => {
        const applied = applyAdminRecommendation(entry);
        if (applied) {
          appliedCount += 1;
        } else {
          skippedCount += 1;
        }
      });

      if (skippedCount === 0) {
        toast(
          'success',
          '일괄 추천 적용',
          `우선순위 순으로 운영 추천 ${appliedCount}건을 모두 실행했습니다.`,
        );
      } else {
        toast(
          'info',
          '일괄 추천 적용',
          `운영 추천 ${orderedQueue.length}건 중 ${appliedCount}건 실행, ${skippedCount}건은 현재 조건으로 건너뛰었습니다.`,
        );
      }
    } finally {
      setIsApplyingAllAdminRecommendations(false);
    }
  }, [isApplyingAllAdminRecommendations, orderedAdminRecommendations, applyAdminRecommendation]);

  const loadSnapshot = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);

    try {
      const shouldFetchMarketProjects = !isAdminView;
      const [configData, statsData] = await Promise.all([fetchMarketConfig(), fetchMarketStats()]);

      setConfig(configData);
      setStats(statsData);
      setAdminDashboardError('');

      if (shouldFetchMarketProjects) {
        const projectsPayload = await fetchProjects(projectQuery);
        const projectPayload = extractProjects(projectsPayload);
        setProjects(projectPayload);
        if (hasPagination(projectsPayload)) {
          setProjectMeta({
            total: projectsPayload.total,
            page: projectsPayload.page,
            totalPages: projectsPayload.totalPages,
            hasPrev: projectsPayload.hasPrev,
            hasNext: projectsPayload.hasNext,
            limit: projectsPayload.limit,
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

        setAdminDashboard(EMPTY_ADMIN_DASHBOARD);
      } else {
        const [dashboardPayload, revenueProjection, reportedReviewsPayload, auditLogsPayload] = await Promise.all([
          fetchAdminDashboard(),
          fetchAdminRevenueProjection(adminRevenueProjectionParams),
          fetchAdminReportedReviews(),
          fetchAdminAuditLogs(30),
        ]);

        setAdminDashboard({
          ...dashboardPayload,
          revenue: revenueProjection,
        });
        setAdminReportedReviews(reportedReviewsPayload);
        setAdminAuditLogs(auditLogsPayload);
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
        if (isAdminView) {
          setAdminDashboardError(message);
        }
      } else {
        setApiOnline(false);
        setLoadError(`백엔드 API에 연결할 수 없습니다. 현재 요청 대상: ${API_BASE}. 서버 실행 후 다시 시도하세요.`);
        if (isAdminView) {
          setAdminDashboardError(`백엔드 API에 연결할 수 없습니다. 현재 요청 대상: ${API_BASE}. 서버 실행 후 다시 시도하세요.`);
        }
      }

      if (showLoading) {
        toast('error', '요청 실패', hasResponseError ? message : `요청 대상: ${API_BASE}`);
      }
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [adminRevenueProjectionParams, fundingRangeId, isAdminView, projectQuery]);

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

  const loadDiligenceEvents = useCallback(async (projectId: number) => {
    setIsDiligenceEventsLoading(true);
    try {
      setDiligenceEvents(await fetchProjectEvents(projectId));
    } catch {
      setDiligenceEvents([]);
    } finally {
      setIsDiligenceEventsLoading(false);
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
    const timer = window.setTimeout(() => {
      setDebouncedAdminRevenueConfig(adminRevenueConfig);
      setDebouncedScenarioMultipliers(adminScenarioMultipliers);
      setDebouncedAdminRevenueTargetMonthly(adminRevenueTargetMonthly);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [adminRevenueConfig, adminRevenueTargetMonthly, adminScenarioMultipliers]);

  useEffect(() => {
    localStorage.setItem('protolive:favorites', JSON.stringify(Array.from(favoriteProjectIds)));
  }, [favoriteProjectIds]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(ADMIN_REVENUE_CONFIG_STORAGE_KEY, JSON.stringify(adminRevenueConfig));
  }, [adminRevenueConfig]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(
      ADMIN_REVENUE_SCENARIO_STORAGE_KEY,
      JSON.stringify(adminScenarioMultipliers),
    );
  }, [adminScenarioMultipliers]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(
      ADMIN_REVENUE_TARGET_STORAGE_KEY,
      JSON.stringify({ targetMonthlyRevenue: adminRevenueTargetMonthly }),
    );
  }, [adminRevenueTargetMonthly]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(FILTER_UI_STORAGE_KEY, JSON.stringify({ showAdvancedFilters }));
  }, [showAdvancedFilters]);

  useEffect(() => {
    if (!isFilterInitialized.current) {
      isFilterInitialized.current = true;
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams();
    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch) {
      params.set('q', trimmedSearch);
    }

    if (normalizedCategory !== 'All') {
      params.set('category', normalizedCategory);
    }

    if (normalizedTag !== 'All') {
      params.set('tag', normalizedTag);
    }

    if (normalizedAccessMode !== 'All') {
      params.set('accessMode', normalizedAccessMode);
    }

    if (sortMode !== 'signal') {
      params.set('sort', sortMode);
    }

    if (page > 1) {
      params.set('page', String(page));
    }

    if (pageSize !== 12) {
      params.set('limit', String(pageSize));
    }

    if (minSignal > 0) {
      params.set('minSignal', String(minSignal));
    }

    if (minFundingAmount > 0 && !hasFundingRangeError) {
      params.set('minFundingAmount', String(minFundingAmount));
    }

    if (maxFundingAmount > 0 && !hasFundingRangeError) {
      params.set('maxFundingAmount', String(maxFundingAmount));
    }

    if (onlyVerified) {
      params.set('onlyVerified', 'true');
    }

    if (showFavoritesOnly) {
      params.set('favorites', 'true');
    }

    if (effectiveView === 'admin') {
      params.set('view', 'admin');
    }

    const query = params.toString();
    const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const isAdminPath = pathSegments.length > 0 && pathSegments[pathSegments.length - 1] === ADMIN_PATH_SEGMENT;
    if (isAdminPath) {
      pathSegments.pop();
    }
    const basePath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
    const nextPathname =
      effectiveView === 'admin' ? `${basePath}/${ADMIN_PATH_SEGMENT}` : basePath || '/';
    const safePathname = `/${nextPathname}`.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';

    window.history.replaceState({}, '', `${safePathname}${query ? `?${query}` : ''}`);

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
      }),
    );
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
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(LIST_VIEW_STORAGE_KEY, projectListView);
  }, [projectListView]);

  const accessModeOptions: Array<'All' | ProjectAccessMode> = ['All', ...config.accessModes.map((item) => item.id)];
  const activeFundingRange = config.fundingRanges.find((range) => range.id === fundingRangeId);

  const openSubmitDialog = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true);
      toast('error', '로그인 필요', '사이트 제출은 로그인 후 이용할 수 있습니다.');
      return;
    }

    if (!canSubmitProject) {
      toast('error', '권한 제한', '사이트 등록은 창업자 계정만 가능합니다.');
      return;
    }

    if (!apiOnline || config.categories.length === 0) {
      toast('error', '제출 준비 미완료', '카테고리/공개 범위 설정을 불러온 뒤 다시 시도하세요.');
      return;
    }

    if (config.categories.length > 0) {
      setCategory(config.categories.includes(category) ? category : config.categories[0]);
    }

    const accessModeIds = config.accessModes.map((item) => item.id);
    if (accessModeIds.length > 0) {
      setAccessMode(accessModeIds.includes(accessMode) ? accessMode : accessModeIds[0]);
    }

    setIsSubmitOpen(true);
  }, [accessMode, apiOnline, category, canSubmitProject, config.accessModes, config.categories, session]);

  const handleLogin = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const authenticated = await loginUser(loginEmail, loginPassword);
      setSession(authenticated);
      setIsLoginOpen(false);
      setLoginPassword('');
      toast('success', '로그인 성공', `${authenticated.name}님, ${resolveRoleLabel(authenticated.role)}로 입장했습니다.`);
    } catch (error) {
      toast('error', '로그인 실패', getApiErrorMessage(error, '이메일 또는 비밀번호가 일치하지 않습니다.'));
    }
  }, [loginEmail, loginPassword]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // 서버 세션이 이미 만료된 경우에도 화면 상태는 즉시 정리합니다.
    }

    setSession(null);
    setIsLoginOpen(true);
    setLoginPassword('');
    toast('info', '로그아웃', '세션이 종료되었습니다. 다시 로그인해주세요.');
  }, []);

  const handleRequireMakerOnly = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true);
      toast('error', '로그인 필요', '이 기능은 로그인 후 이용 가능합니다.');
      return false;
    }

    if (!canSubmitProject) {
      toast('error', '권한 제한', '권한이 없거나 접근이 제한된 기능입니다.');
      return false;
    }

    return true;
  }, [canSubmitProject, session]);

  const handleRequireInvestorOnly = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true);
      toast('error', '로그인 필요', '이 기능은 로그인 후 이용 가능합니다.');
      return false;
    }

    if (!canMatch) {
      toast('error', '권한 제한', '연결/투자 관심은 투자자 계정에서만 가능합니다.');
      return false;
    }

    return true;
  }, [canMatch, session]);

  const handleRequireAdminAccess = useCallback(() => {
    if (!session) {
      setIsLoginOpen(true);
      toast('error', '로그인 필요', '관리자 페이지는 로그인 후 이용 가능합니다.');
      return false;
    }

    if (!canAccessAdmin) {
      toast('error', '접근 제한', '관리자 페이지는 운영자 계정에서만 이용할 수 있습니다.');
      return false;
    }

    return true;
  }, [canAccessAdmin, session]);

  const closeModalStack = useCallback(() => {
    setIsSubmitOpen(false);
    setMatchingProject(null);
    setPreviewProject(null);
    setPreviewEvents([]);
    setDiligenceProject(null);
    setDiligenceEvents([]);
    setIframeLoading(false);
    setIsMobileProjectTimelineOpen(false);
  }, []);

  const switchView = useCallback((nextView: AppView) => {
    if (nextView === view) {
      return;
    }

    if (nextView === 'admin' && !handleRequireAdminAccess()) {
      return;
    }

    setView(nextView);
    closeModalStack();
  }, [closeModalStack, handleRequireAdminAccess, view]);

  const applyRevenueModelPreset = useCallback((nextConfig: RevenueModelConfig) => {
    setAdminRevenueConfig(nextConfig);
    toast('info', '수익 모델 템플릿 적용', '관리자 수익 가정을 새 템플릿으로 교체했습니다.');
  }, []);

  const updateRevenueInput = useCallback((key: keyof RevenueModelConfig, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue);
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
      }));
      return;
    }

    setAdminRevenueConfig((current) => ({
      ...current,
      [key]: normalizeAmountInput(parsed),
    }));
  }, []);

  const updateRevenueTargetInput = useCallback((rawValue: string) => {
    const parsed = Number.parseFloat(rawValue);
    setAdminRevenueTargetMonthly((current) =>
      Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : current,
    );
  }, []);

  const updateScenarioMultiplier = useCallback((index: number, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue);
    setAdminScenarioMultipliers((current) => {
      const next = [...current];
      next[index] = normalizeScenarioInputValue(Number.isFinite(parsed) ? parsed : current[index]);
      if (next[index] <= 0) {
        return current;
      }
      return next;
    });
  }, []);

  const resetAdminScenarioMultipliers = useCallback(() => {
    setAdminScenarioMultipliers([...DEFAULT_SCENARIO_MULTIPLIERS]);
    toast('info', '시나리오 초기화', '시나리오 배율을 기본 값으로 되돌렸습니다.');
  }, []);

  const activeFilterCount = activeFilters.length;

  const signalRankByProjectId = useMemo(() => {
    const sorted = [...projects]
      .filter((project) => project.validation !== undefined)
      .sort((a, b) => {
        const aScore = a.signalScore ?? 0;
        const bScore = b.signalScore ?? 0;
        if (bScore !== aScore) {
          return bScore - aScore;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const rankById = new Map<number, number>();
    sorted.forEach((project, index) => {
      rankById.set(project.id, index + 1);
    });

    return rankById;
  }, [projects]);


  const averageSignalDensity = useMemo(() => {
    if (stats.totalProjects <= 0) return 0;
    return Math.round((stats.totalSignals / stats.totalProjects) * 10) / 10;
  }, [stats.totalSignals, stats.totalProjects]);

  const protectedProjectCount = useMemo(
    () => projects.filter((project) => project.accessMode === 'screened').length,
    [projects],
  );

  const publicProjectCount = useMemo(
    () => projects.filter((project) => project.accessMode === 'open').length,
    [projects],
  );

  const fastestResponseProject = useMemo(() => {
    return [...projects]
      .filter((project) => typeof project.validation.responseTimeMs === 'number')
      .sort((a, b) => (a.validation.responseTimeMs ?? Number.MAX_SAFE_INTEGER) - (b.validation.responseTimeMs ?? Number.MAX_SAFE_INTEGER))[0] ?? null;
  }, [projects]);

  const copyFilterLink = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('success', '필터 링크 복사', '현재 조회 조건 링크가 클립보드에 복사되었습니다.');
    } catch {
      toast('error', '클립보드 복사 실패', '브라우저 권한을 확인하고 다시 시도해 주세요.');
    }
  }, []);

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
    };
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
  ]);

  const copyAdminRevenueSnapshot = useCallback(async () => {
    const snapshot = buildAdminRevenueSnapshot();
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      toast('success', '수익 가정 저장', '현재 관리자 수익 모델/지표 스냅샷이 클립보드에 복사되었습니다.');
    } catch {
      toast('error', '복사 실패', '클립보드 권한을 확인하고 다시 시도하세요.');
    }
  }, [buildAdminRevenueSnapshot]);

  const downloadText = useCallback((filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const escapeCsvValue = (value: unknown) => {
    const escaped = String(value ?? '')
      .replace(/"/g, '""')
      .replace(/\r?\n/g, ' ');
    return `"${escaped}"`;
  };

  const exportAdminRevenueReport = useCallback((format: 'json' | 'csv') => {
    try {
      const timestamp = new Date().toISOString();
      const fileBase = `protolive-admin-revenue-${timestamp.replace(/[:.]/g, '-')}`;
      const snapshot = buildAdminRevenueSnapshot();

      if (format === 'json') {
        downloadText(
          `${fileBase}.json`,
          JSON.stringify(snapshot, null, 2),
          'application/json;charset=utf-8',
        );
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
        ];

        snapshot.scenarioMultipliers.forEach((multiplier) => {
          rows.push(['시나리오 배율', `x${multiplier}`, multiplier]);
        });

        snapshot.derivedProjection.scenarios.forEach((entry) => {
          rows.push([
            '시나리오',
            entry.label,
            `${entry.multiplier}x / ${entry.monthlyRevenue} / ${entry.annualRevenue}`,
          ]);
        });

        snapshot.derivedProjection.benchmarkGaps.forEach((entry) => {
          rows.push([
            '벤치마크',
            entry.label,
            `${entry.actual} / ${entry.target} / ${entry.gap} / ${entry.status}`,
          ]);
        });

        snapshot.derivedProjection.targetGap.drivers.forEach((driver) => {
          rows.push([
            '목표 달성 제안',
            `${driver.label} (현행: ${formatDriverValue(driver.currentValue, driver.unit)} / 1단위효과: ${formatCurrency(
              driver.impactPerUnit,
            )} / 필요 증분: ${formatDriverValue(driver.requiredDelta, driver.unit)})`,
            `${getDriverActionHint(driver.key)} / 목표 ${formatDriverValue(driver.requiredValue, driver.unit)} / ${formatCurrency(
              driver.acquisitionCostPerUnit,
            )}/단위 / 회수 ${formatPaybackValue(driver.estimatedPaybackMonths)} / 현재 기여 ${formatCurrency(
              driver.currentContribution,
            )}`,
          ]);
        });

        const csv = rows.map((row) => row.map((item) => escapeCsvValue(item)).join(',')).join('\n');
        downloadText(`${fileBase}.csv`, csv, 'text/csv;charset=utf-8');
      }

      toast('success', '보고서 내보내기', `관리자 보고서를 ${format.toUpperCase()} 형식으로 저장했습니다.`);
    } catch {
      toast('error', '보고서 내보내기 실패', '브라우저 다운로드 권한을 확인하세요.');
    }
  }, [adminRevenueHealthScore, buildAdminRevenueSnapshot, downloadText]);

  const handleRefreshAll = useCallback(async () => {
    if (!apiOnline || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      const refreshed = await refreshAllProjects();
      setProjects(refreshed);
      await loadSnapshot();
      toast('success', '확인 갱신 완료', '모든 사이트의 라이브 상태를 다시 확인했습니다.');
    } catch {
      toast('error', '갱신 실패', '백엔드 사이트 확인 API 응답을 확인하세요.');
    } finally {
      setIsRefreshing(false);
    }
  }, [apiOnline, isRefreshing, loadSnapshot]);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const handleGlobalShortcut = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (isTypingTarget) {
        return;
      }

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        focusSearchInput();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        openSubmitDialog();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === 'r' || event.key === 'R')) {
        if (!isRefreshing && apiOnline && projects.length > 0) {
          event.preventDefault();
          void handleRefreshAll();
        }
        return;
      }
    },
    [apiOnline, focusSearchInput, handleRefreshAll, isRefreshing, openSubmitDialog, projects.length],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcut);
    };
  }, [handleGlobalShortcut]);

  useEffect(() => {
    const initialize = async () => {
      await loadSnapshot();
    };
    void initialize();
  }, [loadSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadSnapshot();
    }, isAdminView ? ADMIN_DASHBOARD_POLL_INTERVAL_MS : config.refreshIntervalMs || 30000);

    return () => window.clearInterval(timer);
  }, [config.refreshIntervalMs, isAdminView, loadSnapshot]);

  useEffect(() => {
    const hasOverlayOpen = Boolean(
      previewProject || diligenceProject || matchingProject || reviewProject || isSubmitOpen || shouldShowLogin,
    );
    if (!hasOverlayOpen) {
      return;
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
              : submitModalRef;

    if (!activeDialogRef.current) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : previousFocusRef.current;

    const focusables = getDialogFocusableElements(activeDialogRef.current);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      activeDialogRef.current.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        if (previewProject) {
          setPreviewProject(null);
          setPreviewEvents([]);
          return;
        }

        if (diligenceProject) {
          setDiligenceProject(null);
          setDiligenceEvents([]);
          return;
        }

        if (matchingProject) {
          setMatchingProject(null);
          return;
        }

        if (reviewProject) {
          setReviewProject(null);
          setProjectReviews([]);
          setReviewType('review');
          setReviewRating(5);
          setReviewBody('');
          setReplyToReview(null);
          return;
        }

        if (isSubmitOpen) {
          setIsSubmitOpen(false);
          return;
        }

        if (shouldShowLogin) {
          setIsLoginOpen(false);
        }
        return;
      }

      if (event.key !== 'Tab' || focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);

      const restoreTarget = previousFocusRef.current;
      if (restoreTarget) {
        restoreTarget.focus();
      }
    };
  }, [diligenceProject, matchingProject, previewProject, reviewProject, shouldShowLogin, isSubmitOpen]);

  async function handleVerifyUrl() {
    if (!liveUrl.trim()) {
      setUrlCheckStatus('error');
      setUrlCheckMessage('확인할 URL을 입력하세요.');
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
      setUrlCheckMessage('API 확인 요청이 실패했습니다. 백엔드 연결 상태를 확인하세요.');
    }
  }

  async function handleSubmitProject(event: React.FormEvent) {
    event.preventDefault();
    if (!handleRequireMakerOnly()) {
      return;
    }

    if (!protectionNoticeAccepted) {
      toast('error', '노출 위험 확인 필요', '상용화 전 서비스 보호 안내와 제출 권한을 확인해야 합니다.');
      return;
    }

    if (urlCheckStatus !== 'success') {
      toast('error', '사이트 확인 필요', '실시간 사이트 확인을 통과한 뒤 등록할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProject({
        email: session?.email ?? '',
        title,
        description,
        liveUrl,
        category,
        tags: parseTagInput(tagInput),
        accessMode,
        protectionNoticeAccepted,
      });

      setProjects((current) => upsertProject(current, created));
      await loadSnapshot();
      setTitle('');
      setDescription('');
      setLiveUrl('');
      setTagInput('');
      setAccessMode('screened');
      setProtectionNoticeAccepted(false);
      setUrlCheckStatus('idle');
      setUrlCheckMessage('');
      setIsSubmitOpen(false);
      toast('success', '확인 등록 완료', `${created.title}이(가) 라이브 마켓에 등록되었습니다.`);
    } catch (error) {
      toast(
        'error',
        '등록 실패',
        getApiErrorMessage(error, '사이트 등록에 실패했습니다.'),
      );
    } finally {
      setIsSubmitting(false);
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
                message: '상태 재확인 중입니다.',
              },
            }
          : item,
      ),
    );

    try {
      const refreshed = await refreshProject(project.id);
      setProjects((current) => upsertProject(current, refreshed));
      setDiligenceProject((current) => (current?.id === refreshed.id ? refreshed : current));
      await loadSnapshot();
      toast('success', '사이트 갱신', `${refreshed.title} 상태를 갱신했습니다.`);
    } catch {
      toast('error', '사이트 갱신 실패', `${project.title} 상태를 갱신하지 못했습니다.`);
    }
  }

  function closePreview() {
    setPreviewProject(null);
    setPreviewEvents([]);
    setIsMobileProjectTimelineOpen(false);
  }

  function closeDiligence() {
    setDiligenceProject(null);
    setDiligenceEvents([]);
  }

  function closeReviewDialog() {
    setReviewProject(null);
    setProjectReviews([]);
    setReviewType('review');
    setReviewRating(5);
    setReviewBody('');
    setReplyToReview(null);
  }

  async function handleSubmitReview(event: React.FormEvent) {
    event.preventDefault();

    const targetProject = reviewProject ?? detailProject;
    if (!targetProject) return;

    if (!session) {
      closeReviewDialog();
      setIsLoginOpen(true);
      toast('error', '로그인이 필요합니다', '로그인한 회원만 평가, 리뷰, 답글을 남길 수 있습니다.');
      return;
    }

    const body = reviewBody.trim();
    if (body.length < 5) {
      toast('error', '조금 더 자세히 적어주세요', '의견은 5자 이상 입력해야 합니다.');
      return;
    }

    setIsSendingReview(true);
    try {
      const result = await createProjectReview(targetProject.id, {
        type: replyToReview?.type ?? reviewType,
        rating: replyToReview ? undefined : reviewType === 'review' ? reviewRating : undefined,
        parentId: replyToReview?.id,
        body,
      });

      setProjectReviews((current) =>
        current.some((review) => review.id === result.review.id)
          ? current.map((review) => (review.id === result.review.id ? result.review : review))
          : [...current, result.review],
      );
      setProjects((current) => upsertProject(current, result.project));
      setReviewProject((current) => (current?.id === result.project.id ? result.project : current));
      await loadSnapshot();
      setReviewBody('');
      setReplyToReview(null);
      toast(
        'success',
        replyToReview ? '답글 등록 완료' : '리뷰 등록 완료',
        replyToReview ? '대댓글이 스레드에 추가되었습니다.' : '회원 의견이 사이트 성장 기록에 반영되었습니다.',
      );
    } catch (error) {
      toast('error', '리뷰 저장 실패', getApiErrorMessage(error, '의견을 저장하지 못했습니다.'));
    } finally {
      setIsSendingReview(false);
    }
  }

  async function handleReportReview(review: ProjectReview) {
    const targetProject = reviewProject ?? detailProject;
    if (!targetProject) return;

    if (!session) {
      closeReviewDialog();
      setIsLoginOpen(true);
      toast('error', '로그인이 필요합니다', '로그인한 회원만 커뮤니티 의견을 신고할 수 있습니다.');
      return;
    }

    setReportingReviewId(review.id);
    try {
      const result = await reportProjectReview(targetProject.id, review.id, {
        reason: '커뮤니티 운영 검토 요청',
      });

      setProjectReviews((current) => {
        if (result.review.status === 'hidden') {
          return current.filter(
            (entry) => entry.id !== result.review.id && entry.parentId !== result.review.id,
          );
        }

        return current.map((entry) => (entry.id === result.review.id ? result.review : entry));
      });
      setProjects((current) => upsertProject(current, result.project));
      setReviewProject((current) => (current?.id === result.project.id ? result.project : current));
      await loadSnapshot();
      toast(
        'success',
        result.review.status === 'hidden' ? '의견 숨김 처리' : '신고 접수',
        result.review.status === 'hidden'
          ? '반복 신고 기준을 넘어 커뮤니티 목록에서 숨겼습니다.'
          : '운영 검토 대기 상태로 표시됩니다.',
      );
    } catch (error) {
      toast('error', '신고 실패', getApiErrorMessage(error, '의견 신고를 저장하지 못했습니다.'));
    } finally {
      setReportingReviewId(null);
    }
  }

  async function handleModerateReview(entry: AdminReportedReview, action: 'keep' | 'hide' | 'restore') {
    if (!session || !canAccessAdmin) {
      toast('error', '운영자 권한 필요', '신고 검토는 운영자 계정에서만 처리할 수 있습니다.');
      return;
    }

    setModeratingReviewId(entry.review.id);
    try {
      const result = await moderateProjectReview(entry.project.id, entry.review.id, {
        action,
        note:
          action === 'hide'
            ? '운영자가 신고 내용을 확인하고 숨김 처리했습니다.'
            : action === 'restore'
              ? '운영자가 숨김 의견을 복구했습니다.'
              : '운영자가 신고 내용을 확인하고 공개 유지 처리했습니다.',
      });

      setAdminReportedReviews((current) =>
        action === 'keep' || action === 'restore'
          ? current.filter((item) => item.review.id !== entry.review.id)
          : current.map((item) =>
              item.review.id === entry.review.id ? { ...item, review: result.review } : item,
            ),
      );
      setProjects((current) => upsertProject(current, result.project));
      setAdminAuditLogs(await fetchAdminAuditLogs(30));
      await loadSnapshot(false);
      toast(
        'success',
        action === 'hide' ? '의견 숨김 완료' : action === 'restore' ? '의견 복구 완료' : '공개 유지 완료',
        '운영 검토 기록이 감사 로그에 저장되었습니다.',
      );
    } catch (error) {
      toast('error', '운영 처리 실패', getApiErrorMessage(error, '신고 의견을 처리하지 못했습니다.'));
    } finally {
      setModeratingReviewId(null);
    }
  }

  async function handleProjectEvent(project: Project, type: 'preview' | 'outbound' | 'refresh') {
    try {
      const updated = await recordProjectEvent(project.id, type);
      setProjects((current) => upsertProject(current, updated));
      setPreviewProject((current) => (current?.id === updated.id ? updated : current));
      setDiligenceProject((current) => (current?.id === updated.id ? updated : current));
      await loadSnapshot();
      return updated;
    } catch {
      // Interaction telemetry must not block the investor workflow.
      return null;
    }
  }

  async function handleOpenPreview(project: Project) {
    if (project.accessMode === 'screened') {
      if (!handleRequireInvestorOnly()) {
        return;
      }

      toast(
        'match',
        '요청 후 공개 사이트',
        'URL과 미리보기는 창업자 승인 또는 연결 요청 이후 공유하는 흐름으로 보호합니다.',
      );
      setMatchingProject(project);
      return;
    }

    setPreviewProject(project);
    setIframeKey((current) => current + 1);
    setIframeLoading(true);
    setIsMobileProjectTimelineOpen(false);

    const updated = await handleProjectEvent(project, 'preview');
    await loadProjectEvents(project.id);
    if (updated) {
      setPreviewProject(updated);
    }
  }

  async function handleSubmitMatch(event: React.FormEvent) {
    event.preventDefault();
    if (!handleRequireInvestorOnly()) {
      return;
    }

    if (!matchingProject || !activeFundingRange) return;

    if (!matchLegalNoticeAccepted || !matchPrivacyConsentAccepted || !matchRiskNoticeAccepted) {
      toast('error', '필수 확인 필요', '투자 관심 기록 전 법무 고지, 개인정보 연락 동의, 초기 위험 안내를 모두 확인해야 합니다.');
      return;
    }

    setIsSendingMatch(true);
    try {
      const updated = await createMatchProposal(matchingProject.id, {
        fundingRangeId: activeFundingRange.id,
        message: matchMessage,
        legalNoticeAccepted: matchLegalNoticeAccepted,
        privacyConsentAccepted: matchPrivacyConsentAccepted,
        riskNoticeAccepted: matchRiskNoticeAccepted,
      });
      setProjects((current) => upsertProject(current, updated));
      await loadSnapshot();
      toast(
        'match',
        '투자 관심 기록 완료',
        `${matchingProject.title}에 ${activeFundingRange.label} 구간의 의향이 반영되었습니다.`,
      );
      setMatchingProject(null);
      setMatchMessage('');
      setMatchLegalNoticeAccepted(false);
      setMatchPrivacyConsentAccepted(false);
      setMatchRiskNoticeAccepted(false);
    } catch (error) {
      toast('error', '연결 실패', getApiErrorMessage(error, '투자 관심 기록에 실패했습니다.'));
    } finally {
      setIsSendingMatch(false);
    }
  }

  const handleOpenMatchDialog = useCallback((project: Project) => {
    if (!handleRequireInvestorOnly()) {
      return;
    }

    setMatchingProject(project);
    setMatchLegalNoticeAccepted(false);
    setMatchPrivacyConsentAccepted(false);
    setMatchRiskNoticeAccepted(false);
  }, [handleRequireInvestorOnly]);

  const openProjectDetail = useCallback((project: Project) => {
    setProjectReviews([]);
    setDiligenceEvents([]);
    setIsProjectReviewsLoading(true);
    setIsDiligenceEventsLoading(true);
    setDetailProjectId(project.id);
    setView('market');
    if (typeof window !== 'undefined') {
      window.history.pushState({ projectId: project.id }, '', '/projects/' + project.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const closeProjectDetail = useCallback(() => {
    setDetailProjectId(null);
    setProjectReviews([]);
    setDiligenceEvents([]);
    setReplyToReview(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="protolive-shell min-h-screen bg-[oklch(14%_0.018_205)] text-stone-100">
      <ToastContainer />

      <header className="protolive-header sticky top-0 z-40 border-b border-cyan-900/40 bg-[oklch(14%_0.018_205)/0.92] backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="protolive-logo grid h-11 w-11 place-items-center rounded-lg bg-lime-300 text-slate-950 shadow-[0_0_0_1px_oklch(89%_0.18_125/0.25)]">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="protolive-title text-xl font-black tracking-tight text-stone-50">ProtoLive</h1>
                <span className="protolive-badge rounded-full border border-lime-400/30 bg-lime-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
                  평가·리뷰·투자
                </span>
              </div>
                <p className="protolive-subtitle truncate text-xs font-medium text-stone-400">
                {isAdminView
                  ? '프로토타입 투자 연결 플랫폼의 수익·운영 지표를 관리하는 관리자 대시보드'
                  : '만든 사이트를 올리면 평가와 리뷰를 거쳐 투자 관심까지 이어집니다'}
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-1 sm:justify-end lg:flex-nowrap">
            <div className="protolive-pill-group order-last flex w-full min-w-0 shrink-0 items-center gap-2 overflow-x-auto rounded-lg border border-stone-700/80 bg-stone-900/70 px-2 py-2 text-xs font-bold sm:order-none sm:w-auto sm:rounded-full sm:px-3">
                <button
                  type="button"
                  onClick={() => switchView('market')}
                  className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                    isAdminView ? 'text-stone-400 hover:text-stone-100' : 'bg-cyan-300 text-slate-950'
                  }`}
                >
                  프로토타입 둘러보기
                </button>
                <button
                  type="button"
                  onClick={() => switchView('admin')}
                  className={`protolive-pill shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition ${
                    isAdminView ? 'bg-cyan-300 text-slate-950' : 'text-stone-400 hover:text-stone-100'
                  }`}
                >
                  운영 현황
                </button>
            </div>
            <div
              className={`protolive-status hidden shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold xl:flex ${
                apiOnline
                  ? 'border-lime-400/30 bg-lime-300/10 text-lime-200'
                  : 'border-red-400/30 bg-red-500/10 text-red-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${apiOnline ? 'bg-lime-300' : 'bg-red-300'}`} />
              {apiOnline ? '서버 연결됨' : 'API Offline'}
              </div>
              {isAuthenticated ? (
                <div className="protolive-user-chip inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-stone-700/80 bg-stone-900/70 px-3 py-2 text-xs font-black sm:rounded-full">
                  <span className="hidden max-w-28 truncate xl:inline">{session?.name}</span>
                  <span
                    className={`protolive-badge shrink-0 rounded-full border px-2 py-0.5 ${
                      canAccessAdmin
                        ? 'border-lime-300/40 text-lime-200'
                        : 'border-amber-300/40 text-amber-100'
                    }`}
                  >
                    {session ? resolveRoleLabel(session.role) : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLogout()}
                    className="protolive-pill shrink-0 whitespace-nowrap rounded-full border border-stone-600/70 px-2 py-0.5 text-stone-300 transition hover:border-red-300/60 hover:text-red-100"
                    aria-label="로그아웃"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="protolive-btn-grid grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 px-3 text-xs font-black text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                  aria-label="로그인"
                >
                  <Users className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">로그인</span>
                  <span className="sr-only">로그인</span>
                </button>
              )}
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
              disabled={isRefreshing || !apiOnline || projects.length === 0}
              className="protolive-btn-grid grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="전체 사이트 상태 새로고침"
              title="전체 사이트 상태 새로고침 (⌘/Ctrl + R)"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={openSubmitDialog}
              disabled={!apiOnline || config.categories.length === 0}
              aria-label="프로토타입 등록"
              title="프로토타입 등록 (⌘/Ctrl + N)"
              className="protolive-btn protolive-btn-primary inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-lime-300 px-3 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">프로토타입 등록</span>
            </button>
            <span className="hidden shrink-0 text-[10px] text-stone-500 2xl:block">
              단축키: / 검색 · ⌘/Ctrl + N 등록 · ⌘/Ctrl + R 갱신
            </span>
          </div>
        </div>
      </header>

      <main className="protolive-main mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        {isAdminView ? (
          <section className="col-span-full space-y-6">
            <div className="protolive-hero rounded-xl border border-cyan-900/50 bg-[oklch(18%_0.018_205)] p-5 shadow-[0_24px_80px_oklch(8%_0.02_205/0.45)]">
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
                    투자자 유입, 연결 전환, 투자 관심 단계를 기준으로 월/연 매출과
                    딜 파이프라인 성과를 즉시 계산해 의사결정에 쓰는 내부 운영 현황입니다.
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
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100">Trust operations</p>
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
                        className="rounded-xl border border-stone-700/80 bg-[oklch(15%_0.016_205)] p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-black text-stone-100">{entry.project.title}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              {entry.project.category} · {entry.project.accessMode} · 답글 {entry.replyCount}개
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                              entry.review.status === 'hidden'
                                ? 'border-red-300/45 bg-red-300/10 text-red-100'
                                : 'border-amber-300/45 bg-amber-300/10 text-amber-100'
                            }`}
                          >
                            {entry.review.status === 'hidden' ? '숨김 처리됨' : `신고 ${entry.review.reportCount}회`}
                          </span>
                        </div>
                        <p className="mt-3 overflow-wrap-anywhere rounded-lg border border-stone-800 bg-stone-950/45 p-3 leading-6 text-stone-200">
                          {entry.review.body}
                        </p>
                        <div className="mt-2 grid gap-2 text-xs text-stone-400 sm:grid-cols-2">
                          <p>작성자: {maskEmail(entry.review.authorEmail)}</p>
                          <p>최근 신고: {entry.review.lastReportedAt ? formatRelativeTime(entry.review.lastReportedAt) : '기록 없음'}</p>
                        </div>
                        {(entry.review.reportReasons ?? []).length > 0 ? (
                          <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/10 p-2 text-xs text-amber-50">
                            <p className="font-black">최근 신고 사유</p>
                            <p className="mt-1 overflow-wrap-anywhere">
                              {(entry.review.reportReasons ?? [])[(entry.review.reportReasons ?? []).length - 1]?.reason ?? '사유 없음'}
                            </p>
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={moderatingReviewId === entry.review.id}
                            onClick={() => void handleModerateReview(entry, 'keep')}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-lime-300/45 px-3 text-xs font-black text-lime-100 disabled:opacity-50"
                          >
                            공개 유지
                          </button>
                          <button
                            type="button"
                            disabled={moderatingReviewId === entry.review.id}
                            onClick={() => void handleModerateReview(entry, 'hide')}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-300/45 px-3 text-xs font-black text-red-100 disabled:opacity-50"
                          >
                            숨김 처리
                          </button>
                          {entry.review.status === 'hidden' ? (
                            <button
                              type="button"
                              disabled={moderatingReviewId === entry.review.id}
                              onClick={() => void handleModerateReview(entry, 'restore')}
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
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Audit trail</p>
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
                      <div key={entry.id} className="rounded-lg border border-stone-800 bg-stone-950/45 p-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-black text-stone-100">{getAuditActionLabel(entry.action)}</span>
                          <span className="text-stone-500">{formatRelativeTime(entry.createdAt)}</span>
                        </div>
                        <p className="mt-1 overflow-wrap-anywhere text-stone-300">{entry.message}</p>
                        <p className="mt-1 text-stone-500">{maskEmail(entry.actorEmail)} · {entry.targetType} #{entry.targetId}</p>
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
                    <span className="text-stone-100">{formatHealthScore(adminDashboard.health.healthScore)}</span>
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
                      <span className="text-stone-100">{formatRate(adminDashboard.health.verifiedHealth)}</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-800 pb-1 text-stone-400">
                      <span>퍼널 효율</span>
                      <span className="text-stone-100">{formatRate(adminDashboard.health.conversionHealth)}</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-800 pb-1 text-stone-400">
                      <span>활동성</span>
                      <span className="text-stone-100">{formatRate(adminDashboard.health.engagementHealth)}</span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                      <span>응답성</span>
                      <span className="text-stone-100">{formatRate(adminDashboard.health.responseHealth)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-stone-700 bg-[oklch(15%_0.016_205)] p-2 text-xs text-stone-400">
                    경고 {adminDashboard.health.warningCount}건 / 리스크 {adminDashboard.health.riskCount}건
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
                          <p className="truncate font-black text-stone-100">
                            {entry.title}
                          </p>
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
                      {recommendationSummary.high}/{recommendationSummary.medium}/{recommendationSummary.low} (고/중/저)
                    </span>
                    <span className="protolive-badge rounded-full border border-cyan-300/35 bg-cyan-950/40 px-2 py-0.5 text-xs font-black text-cyan-100">
                      {orderedAdminRecommendations.length}건
                    </span>
                    {orderedAdminRecommendations[0] ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${
                          getRecommendationPriorityTone(orderedAdminRecommendations[0].priority)
                        }`}
                      >
                        최상위: {getRecommendationPriorityLabel(orderedAdminRecommendations[0].priority)} 우선순위
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void applyAllAdminRecommendations()}
                    className={`protolive-btn inline-flex min-h-8 min-w-32 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black text-cyan-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isApplyingAllAdminRecommendations
                        ? 'border-amber-300/45 bg-amber-950/45 animate-pulse hover:bg-amber-900/20'
                        : 'border-cyan-300/45 hover:bg-cyan-300/12'
                    }`}
                    disabled={orderedAdminRecommendations.length === 0 || isApplyingAllAdminRecommendations}
                  >
                    {isApplyingAllAdminRecommendations
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Radar className="h-3.5 w-3.5" />}
                    {isApplyingAllAdminRecommendations ? '일괄 적용 중...' : '우선순위 일괄 실행'}
                  </button>
                </div>
                {isApplyingAllAdminRecommendations ? (
                  <p className="mb-3 rounded-lg border border-amber-300/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
                    우선순위 큐 전체 {orderedAdminRecommendations.length}건을 즉시 순차 실행합니다. 적용 완료 토스트를 확인하세요.
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
                      const areaMeta = getRecommendationAreaMeta(entry.area);
                      const AreaIcon = areaMeta.icon;

                      return (
                        <div
                          key={`${entry.area}-${index}`}
                          className={`protolive-reco-item animate-panel-slide-in rounded-lg border p-3 text-xs ${getRecommendationTone(
                            entry.priority,
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
                                entry.priority,
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
                            onClick={() => applyAdminRecommendation(entry)}
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
                      );
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
                      onClick={() => void copyAdminRevenueSnapshot()}
                      className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100"
                    >
                      스냅샷 복사
                    </button>
                    <button
                      type="button"
                      onClick={() => exportAdminRevenueReport('json')}
                      className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-100"
                    >
                      JSON 내보내기
                    </button>
                    <button
                      type="button"
                      onClick={() => exportAdminRevenueReport('csv')}
                      className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-100"
                    >
                      CSV 내보내기
                    </button>
                  </div>
                </div>
                <div className="mb-3 rounded-lg border border-stone-700 bg-stone-950/55 p-3 text-xs">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">운영 데이터 반영</p>
                  <p className="mt-1 text-sm font-black text-stone-100">관측된 전환율로 수익 가정을 빠르게 덮어씌워 시나리오를 조정하세요.</p>
                  <button
                    type="button"
                    onClick={() => void applyObservedConversionRates()}
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
                      onClick={() => applyRevenueModelPreset(preset.config)}
                      className={`rounded-lg border p-3 text-left transition ${
                        isEqualPreset(preset.config, adminRevenueConfig)
                          ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                          : 'border-stone-700 hover:border-cyan-300/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-stone-100">{preset.label}</p>
                        <span className="rounded-full border border-stone-700 px-2 py-1 text-[10px] font-black text-stone-400">{preset.name}</span>
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
                      onClick={resetAdminScenarioMultipliers}
                      className="rounded-lg border border-stone-700 px-2 py-1 text-[10px] font-black text-stone-300"
                    >
                      기본값
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {adminScenarioMultipliers.map((multiplier, index) => (
                      <label key={index} className="block rounded-lg border border-stone-600 bg-stone-900/40 p-2">
                        <span className="mb-1 block text-stone-300">x{index + 1}</span>
                        <input
                          type="number"
                          min={MIN_SCENARIO_MULTIPLIER}
                          max={MAX_SCENARIO_MULTIPLIER}
                          step={0.05}
                          value={multiplier}
                          onChange={(event) => updateScenarioMultiplier(index, event.target.value)}
                          className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-xs font-black text-stone-100"
                        />
                        <p className="mt-1 truncate text-[10px] text-stone-500">
                          월매출 x {multiplier}
                        </p>
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
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3 md:col-span-2 xl:col-span-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">목표 월매출</p>
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
                              updateRevenueTargetInput(event.target.value);
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
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">달성 제안 (상위 3)</p>
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
                                  획득비용 {formatCurrency(driver.acquisitionCostPerUnit)} / 회수 {formatPaybackValue(driver.estimatedPaybackMonths)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`min-w-0 rounded-lg border p-3 text-xs ${adminRevenueHealthTone}`}>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">수익 건강도</p>
                    <p className="mt-1 break-words text-lg font-black text-stone-50">{adminRevenueHealthScore} / 100</p>
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
                  <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">월 누적 추정</p>
                    <p className="mt-1 break-words text-lg font-black text-stone-50">{formatCurrency(revenueProjection.totalMonthlyRevenue)}</p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">연환산 추정</p>
                    <p className="mt-1 break-words text-lg font-black text-stone-50">{formatCurrency(revenueProjection.annualRevenue)}</p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">확인된 사이트 비중</p>
                    <p className="mt-1 break-words text-lg font-black text-stone-50">
                      {formatRate(revenueProjection.verifiedProjectShare * 100)}
                    </p>
                    <p className="mt-1 text-[11px] text-stone-500">목표 68%</p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">ARPU / ARPPU</p>
                    <p className="mt-1 break-words text-sm font-black leading-5 text-stone-50">{formatCurrency(revenueProjection.arpu)} / {formatCurrency(revenueProjection.arppu)}</p>
                    <p className="mt-1 text-[11px] text-stone-500">목표 50,000원 / 500,000원</p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">투자자 LTV & Payback</p>
                    <p className="mt-1 break-words text-lg font-black leading-6 text-stone-50">
                      {formatCurrency(revenueProjection.investorLtvEstimate)} · {revenueProjection.investorPaybackMonths}개월
                    </p>
                    <p className="mt-1 text-[11px] text-stone-500">창업자 {revenueProjection.makerPaybackMonths}개월</p>
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
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">미리보기→연결</p>
                    <p className="mt-1 text-2xl font-black text-stone-50">
                      {formatRate(adminDashboard.conversionFunnel.previewToMatchRate)}
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      연결 수치 {adminDashboard.conversionFunnel.matchCount}건 / 미리보기 {adminDashboard.conversionFunnel.previewCount}건
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">아웃바운드→연결</p>
                    <p className="mt-1 text-2xl font-black text-stone-50">
                      {formatRate(adminDashboard.conversionFunnel.outboundToMatchRate)}
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      연결 수치 {adminDashboard.conversionFunnel.matchCount}건 / 외부열람 {adminDashboard.conversionFunnel.outboundCount}건
                    </p>
                  </div>
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">사이트당 연결율</p>
                    <p className="mt-1 text-2xl font-black text-stone-50">
                      {formatRate(adminDashboard.conversionFunnel.matchPerProjectRate)}
                    </p>
                    <p className="mt-2 text-xs text-stone-500">총 이벤트 {adminDashboard.conversionFunnel.totalEvents}건</p>
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
                      최근 {Math.min(adminTrendMetrics.trend.length, ADMIN_DASHBOARD_TREND_KEY_DAYS)}일 추이 ·
                      최근 7일 {adminTrendMetrics.recentTotal}건 | 이전 7일 {adminTrendMetrics.previousTotal}건
                      <span
                        className={`ml-2 rounded-full border px-2 py-1 text-[10px] font-black ${
                          adminTrendMetrics.trendDelta >= 0
                            ? 'border-lime-400/40 text-lime-200'
                            : 'border-red-400/40 text-red-200'
                        }`}
                      >
                        {adminTrendMetrics.trendDelta >= 0 ? '+' : ''}{adminTrendMetrics.trendDelta}%
                      </span>
                    </div>
                    {adminTrendMetrics.trend.map((point) => {
                      const width = (point.total / adminTrendMetrics.maxDaily) * 100;
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
                      );
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
                  {[['create', '등록', adminDashboard.eventTotals.create], ['preview', '미리보기', adminDashboard.eventTotals.preview],
                    ['outbound', '외부열람', adminDashboard.eventTotals.outbound], ['match', '연결', adminDashboard.eventTotals.match],
                    ['refresh', '갱신', adminDashboard.eventTotals.refresh]].map(([type, label, count]) => (
                    <div key={type} className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-2">
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
                    <label key={field.key} className="block rounded-lg border border-stone-700 bg-stone-950/55 p-3 text-xs">
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
                          updateRevenueInput(field.key, event.target.value);
                        }}
                        className="mt-2 w-full rounded bg-stone-900 border border-stone-700 px-3 py-2 text-xs font-black text-stone-100"
                      />
                      <p className="mt-2 break-words text-[11px] leading-5 text-stone-500">{field.helper}</p>
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
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">창업자 플랜 수익</p>
                    <p className="mt-1 text-sm font-black text-stone-50">{formatCurrency(revenueProjection.monthlyMakerPlanRevenue)}</p>
                  </div>
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">투자자 플랜 수익</p>
                    <p className="mt-1 text-sm font-black text-stone-50">{formatCurrency(revenueProjection.monthlyInvestorPlanRevenue)}</p>
                  </div>
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">리드 기반 수익</p>
                    <p className="mt-1 text-sm font-black text-stone-50">{formatCurrency(revenueProjection.monthlyLeadRevenue)}</p>
                  </div>
                  <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">성공 수수료 수익</p>
                    <p className="mt-1 text-sm font-black text-stone-50">{formatCurrency(revenueProjection.monthlyTransactionRevenue)}</p>
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
                      <p className="mt-1">목표: {entry.unit === 'percent' ? formatRate(entry.target) : formatCurrency(entry.target)}</p>
                      <p className="mt-1">실적: {entry.unit === 'percent' ? formatRate(entry.actual) : formatCurrency(entry.actual)}</p>
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
                      className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-2 text-xs"
                    >
                      <p className="font-black text-stone-100">
                        {entry.label} ({entry.multiplier}x)
                      </p>
                      <p className="mt-1 text-stone-300">월 {formatCurrency(entry.monthlyRevenue)} / 연 {formatCurrency(entry.annualRevenue)}</p>
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
                        className="grid rounded-lg border border-stone-700 bg-[oklch(15%_0.015_205)] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4"
                      >
                        <p className="text-sm font-black text-stone-100">#{index + 1}</p>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-stone-100">{entry.title}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            연결/투자가입 {entry.matchCount}/{entry.investorCount} · 투자 신호 {entry.signalScore} · {entry.accessMode}
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
                        className="grid rounded-lg border border-stone-700 bg-[oklch(15%_0.015_205)] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4"
                      >
                        <p className="text-sm font-black text-stone-100">#{index + 1}</p>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-stone-100">{entry.title}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            투자 신호 {entry.signalScore} · 연결/투자가입 {entry.matchCount}/{entry.investorCount}
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
                      const denominator = Math.max(1, adminDashboard.categoryPerformance.reduce((sum, target) => sum + target.projects, 0));
                      const ratio = (item.projects / denominator) * 100;
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
                          <p className="text-xs text-stone-500">연결 {item.matchCount}건 · 총 커밋 {formatWon(item.committedAmountMax)}</p>
                        </div>
                      );
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
                          0,
                        ),
                      );
                      const ratio = (item.proposalCount / denominator) * 100;
                      return (
                        <div key={item.rangeId} className="space-y-2 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-2">
                          <div className="flex items-center justify-between text-xs font-black text-stone-200">
                            <span>{item.label}</span>
                            <span className="text-stone-100">{item.proposalCount}건</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
                            <div className="h-full rounded-full bg-lime-300" style={{ width: `${ratio}%` }} />
                          </div>
                          <p className="text-[11px] text-stone-500">
                            평균 예상액 {formatWon(item.averageAmount)} / 총 {formatWon(item.totalMinAmount + item.totalMaxAmount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
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
                    창업자는 만든 사이트를 올리고, 투자자는 실제 화면을 보고 리뷰한 뒤 투자 관심을 남길 수 있습니다.
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="protolive-flow-step min-w-0 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-cyan-100">01</span>
                        <Globe2 className="h-4 w-4 text-cyan-100" />
                      </div>
                      <p className="text-sm font-black text-stone-50">사이트 확인</p>
                      <p className="mt-1 text-xs leading-5 text-stone-400">입력한 주소가 열리는지 먼저 확인합니다.</p>
                    </div>
                    <div className="protolive-flow-step min-w-0 rounded-lg border border-lime-300/35 bg-lime-300/10 px-3 py-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-lime-100">02</span>
                        <Activity className="h-4 w-4 text-lime-100" />
                      </div>
                      <p className="text-sm font-black text-stone-50">화면 리뷰</p>
                      <p className="mt-1 text-xs leading-5 text-stone-400">투자자가 직접 보고 의견과 관심을 남깁니다.</p>
                    </div>
                    <div className="protolive-flow-step min-w-0 rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-100">03</span>
                        <Briefcase className="h-4 w-4 text-amber-100" />
                      </div>
                      <p className="text-sm font-black text-stone-50">투자 관심</p>
                      <p className="mt-1 text-xs leading-5 text-stone-400">관심 금액과 메시지를 남겨 다음 대화로 이어집니다.</p>
                    </div>
                  </div>
                </div>
                <div className="protolive-market-status rounded-lg border border-stone-700/70 bg-stone-950/60 p-4 text-xs text-stone-400">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-stone-100">
                      <Gauge className="h-4 w-4 text-lime-200" />
                      현재 진행 상황
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${apiOnline ? 'bg-lime-300' : 'bg-red-300'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-3">
                      <p className="text-stone-500">확인 완료율</p>
                      <p className="mt-1 text-lg font-black text-stone-50">{stats.verificationRate}%</p>
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

          {detailProjectId && (
            detailProject ? (
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
                onBack={closeProjectDetail}
                onPreview={() => void handleOpenPreview(detailProject)}
                onMatch={() => void handleOpenMatchDialog(detailProject)}
                onRefresh={() => void handleRefreshProject(detailProject)}
                onOutbound={() => void handleProjectEvent(detailProject, 'outbound')}
                onSubmitReview={handleSubmitReview}
                onReviewTypeChange={setReviewType}
                onReviewRatingChange={setReviewRating}
                onReviewBodyChange={setReviewBody}
                onReplyTo={setReplyToReview}
                onCancelReply={() => setReplyToReview(null)}
                onReportReview={(review) => void handleReportReview(review)}
                reportingReviewId={reportingReviewId}
                onLogin={() => {
                  closeReviewDialog();
                  setIsLoginOpen(true);
                }}
              />
            ) : (
              <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-6 text-sm text-stone-300">
                사이트 상세 정보를 불러오는 중입니다. 잠시만 기다려주세요.
              </div>
            )
          )}

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
          <div className="rounded-xl border border-stone-800 bg-[oklch(17%_0.018_205)] p-4">
            <div className="space-y-3">
              <div className="protolive-chip-row flex flex-wrap items-center gap-2">
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
                    {item === 'All' ? '전체' : item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((value: boolean) => !value)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/55 px-3 text-xs font-black text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                      onClick={() => {
                        setSelectedTag(item);
                        setPage(1);
                      }}
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
                    onChange={(event) => {
                      setPage(1);
                      setSearchQuery(event.target.value);
                    }}
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
                      onClick={() => setProjectListView(option.id)}
                      className={`min-h-10 shrink-0 rounded-md px-3 text-left text-xs font-black transition ${
                        projectListView === option.id
                          ? 'bg-lime-300 text-slate-950'
                          : 'text-stone-400 hover:text-stone-100'
                      }`}
                    >
                      <span className="block">{option.label}</span>
                      <span className={`block text-[10px] font-bold ${projectListView === option.id ? 'text-slate-700' : 'text-stone-500'}`}>
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
                    onClick={() => {
                      setSortMode('signal');
                      setPage(1);
                    }}
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
                    onClick={() => {
                      setSortMode('recent');
                      setOnlyVerified(false);
                      setMinSignal(0);
                      setPage(1);
                    }}
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
                    onClick={() => {
                      setSortMode('funding');
                      setPage(1);
                    }}
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
                    onClick={() => {
                      setOnlyVerified((current) => !current);
                      setPage(1);
                    }}
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
                  onClick={() => {
                    if (favoriteProjectCount > 0) {
                      setShowFavoritesOnly((value) => !value);
                      setPage(1);
                    }
                  }}
                  className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                    showFavoritesOnly
                      ? 'border-amber-300/70 bg-amber-300/20 text-amber-100'
                      : favoriteProjectCount === 0
                        ? 'cursor-not-allowed border-stone-700/80 bg-stone-950/30 text-stone-600'
                        : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-amber-300/50 hover:text-amber-100'
                  }`}
                  disabled={favoriteProjectCount === 0}
                >
                  <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-amber-100 text-amber-100' : 'text-stone-300'}`} />
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
                      onClick={() => {
                        setShowFavoritesOnly((value) => !value);
                        setPage(1);
                      }}
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
                        onClick={() => void copyFilterLink()}
                        className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/20"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        링크 복사
                      </button>
                      <button
                        type="button"
                        onClick={resetFilters}
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
              <EmptyState
                apiOnline={apiOnline}
                onCreate={openSubmitDialog}
                onResetFilters={resetFilters}
                hasActiveFilters={activeFilterCount > 0}
              />
            ) : (
            <div
              className={
                projectListView === 'cards'
                  ? 'grid gap-4 md:grid-cols-2'
                  : 'grid gap-3'
              }
            >
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={projectListView}
                  signalRank={signalRankByProjectId.get(project.id) ?? null}
                  onOpenDetail={() => openProjectDetail(project)}
                  isFavorite={favoriteProjectIds.has(project.id)}
                  onToggleFavorite={() => toggleFavorite(project.id)}
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
              <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.015_205)] p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">확인 완료율</p>
                <p className="mt-1 text-lg font-black text-stone-50">{stats.verificationRate}%</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime-300 to-cyan-300 transition-[width] duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, stats.verificationRate))}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.015_205)] p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">사이트당 관심 활동</p>
                <p className="mt-1 text-lg font-black text-stone-50">{averageSignalDensity}</p>
                <p className="mt-2 text-xs text-stone-500">투자자가 실제로 살펴본 정도를 보여줍니다.</p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-[oklch(15%_0.015_205)] p-3 sm:col-span-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">최근 활동</p>
                <p className="mt-2 text-sm leading-6 text-stone-200">
                  누적 활동: <span className="text-cyan-200">{stats.totalSignals}</span> ·
                  등록된 사이트: <span className="inline-flex items-center gap-1 text-lime-200"><Users className="h-3.5 w-3.5" />{stats.totalProjects}</span> ·
                  투자 후보: <span className="text-amber-200">{stats.totalInvestors}</span>
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
                    className="rounded-lg border border-stone-800 bg-[oklch(16%_0.016_205)] p-3 transition hover:border-cyan-300/45"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-lime-200">
                          #{index + 1} · {item.category}
                        </p>
                        <p className="mt-1 truncate text-sm font-black text-stone-100">{item.title}</p>
                        <p className="mt-1 text-xs text-stone-500">{formatRelativeTime(item.latestEventAt ?? undefined)}</p>
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
              <h3 className="font-black text-stone-100">분야별 등록</h3>
            </div>
            {stats.categoryBreakdown.length === 0 ? (
              <p className="text-sm leading-6 text-stone-400">
                아직 집계할 사이트가 없습니다. 첫 확인 등록 후 카테고리 분포가 실시간 계산됩니다.
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
        </>
        )}
      </main>

      {diligenceProject && (
        <ProjectDiligencePanel
          project={diligenceProject}
          events={diligenceEvents}
          isLoadingEvents={isDiligenceEventsLoading}
          dialogRef={diligenceDialogRef}
          signalRank={signalRankByProjectId.get(diligenceProject.id) ?? null}
          onClose={closeDiligence}
          onMatch={() => {
            const project = diligenceProject;
            closeDiligence();
            handleOpenMatchDialog(project);
          }}
          onPreview={() => {
            const project = diligenceProject;
            closeDiligence();
            void handleOpenPreview(project);
          }}
          onRefresh={() => {
            const project = diligenceProject;
            void handleRefreshProject(project).then(() => loadDiligenceEvents(project.id));
          }}
        />
      )}

      {previewProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closePreview}
            aria-label="사이트 보기 닫기"
          />
          <section
            ref={previewDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="라이브 사이트 보기"
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-stone-700 bg-[oklch(13%_0.016_205)] shadow-2xl lg:w-[72vw] xl:w-[62vw] motion-safe:animate-panel-slide-in"
          >
            <div className="flex min-h-16 items-start justify-between gap-3 border-b border-stone-800 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-stone-100">{previewProject.title}</p>
                <p className="truncate text-xs text-stone-500">{previewProject.liveUrl}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-lime-300/35 bg-lime-950/50 px-2 py-1 text-[11px] font-black text-lime-100">
                    연결 관심 {previewProject.signalScore ?? 0}
                  </span>
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-stone-700 px-2 py-1 text-[11px] font-black text-stone-300">
                    {previewProject.validation.success ? '확인 통과' : '확인 실패'}
                  </span>
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-stone-700 px-2 py-1 text-[11px] font-black text-stone-300">
                    최근 활동 {previewProject.eventSummary?.total ?? 0}건
                  </span>
                </div>
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
                  aria-label="사이트 보기 새로고침"
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
                      연결 제안
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileProjectTimelineOpen((value) => !value)}
                className="mb-4 rounded-lg border border-stone-700 bg-stone-950/60 p-3 text-xs font-black text-stone-200 xl:hidden"
                aria-expanded={isMobileProjectTimelineOpen}
                aria-controls="preview-timeline-mobile"
              >
                {isMobileProjectTimelineOpen ? '활동 내역 닫기' : '활동 내역 열기'}
              </button>
              <div className="min-h-0 xl:block">
                <SignalTimeline
                  events={previewEvents}
                  isLoading={isPreviewEventsLoading}
                  className={`xl:block ${
                    isMobileProjectTimelineOpen ? 'block' : 'hidden'
                  }`}
                  title="사이트 활동"
                  titleId="preview-timeline-mobile"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {reviewProject && (
        <Modal
          title="회원 리뷰와 성장 의견"
          subtitle={reviewProject.title}
          onClose={closeReviewDialog}
          dialogRef={reviewModalRef}
        >
          <ProjectReviewWorkspace
            project={reviewProject}
            reviews={projectReviews}
            isLoading={isProjectReviewsLoading}
            session={session}
            reviewType={reviewType}
            reviewRating={reviewRating}
            reviewBody={reviewBody}
            replyToReview={replyToReview}
            isSubmitting={isSendingReview}
            onTypeChange={setReviewType}
            onRatingChange={setReviewRating}
            onBodyChange={setReviewBody}
            onReplyTo={setReplyToReview}
            onCancelReply={() => setReplyToReview(null)}
            onReportReview={(review) => void handleReportReview(review)}
            reportingReviewId={reportingReviewId}
            onLogin={() => {
              closeReviewDialog();
              setIsLoginOpen(true);
            }}
            onSubmit={handleSubmitReview}
          />
        </Modal>
      )}

      {matchingProject && (
        <Modal
          title="투자 관심 기록"
          subtitle={matchingProject.title}
          onClose={() => {
            setMatchingProject(null);
            setMatchLegalNoticeAccepted(false);
            setMatchPrivacyConsentAccepted(false);
            setMatchRiskNoticeAccepted(false);
          }}
          dialogRef={matchModalRef}
        >
          <form onSubmit={handleSubmitMatch} className="space-y-4">
            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">투자자 확인 포인트</p>
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
              <span className="mb-2 block text-xs font-black text-stone-300">창업자를 설득할 메시지</span>
              <textarea
                required
                maxLength={700}
                rows={4}
                value={matchMessage}
                onChange={(event) => setMatchMessage(event.target.value)}
                placeholder="리뷰 요청, 미팅 가능 일정, 관심 있는 지표를 남겨주세요."
                className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
              />
            </label>
            <div className="protolive-compliance-box space-y-2 rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50">
              <p className="font-black text-amber-100">기록 전 필수 확인</p>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={matchLegalNoticeAccepted}
                  onChange={(event) => setMatchLegalNoticeAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-600"
                />
                <span>이 기록은 투자 권유나 계약이 아니라 창업자에게 전달되는 관심 의향입니다.</span>
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={matchPrivacyConsentAccepted}
                  onChange={(event) => setMatchPrivacyConsentAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-600"
                />
                <span>연락을 위해 내 이메일과 메시지가 해당 창업자 및 운영자에게 전달되는 데 동의합니다.</span>
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={matchRiskNoticeAccepted}
                  onChange={(event) => setMatchRiskNoticeAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-600"
                />
                <span>초기 프로토타입 검토에는 실패, 지연, 정보 부족 위험이 있음을 확인했습니다.</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMatchingProject(null);
                  setMatchLegalNoticeAccepted(false);
                  setMatchPrivacyConsentAccepted(false);
                  setMatchRiskNoticeAccepted(false);
                }}
                className="min-h-11 flex-1 rounded-lg border border-stone-700 text-sm font-black text-stone-300 hover:text-stone-100"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSendingMatch || !matchLegalNoticeAccepted || !matchPrivacyConsentAccepted || !matchRiskNoticeAccepted}
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
        <Modal
          title="라이브 프로토타입 등록"
          subtitle="공인 사이트 확인 후 마켓에 반영됩니다."
          onClose={() => setIsSubmitOpen(false)}
          dialogRef={submitModalRef}
        >
          <form onSubmit={handleSubmitProject} className="space-y-4">
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs">
              <p className="mb-1 block font-black text-cyan-100">등록 계정</p>
              <p className="font-black text-stone-100">{session?.email ?? '비로그인'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-stone-300">사이트 이름</span>
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
                        label: '요청 후 공개',
                        description: 'URL과 미리보기를 연결 요청 뒤 공유합니다.',
                      },
                      {
                        id: 'open' as ProjectAccessMode,
                        label: '바로 보기 가능',
                        description: '목록에서 바로 사이트 주소을 열람할 수 있습니다.',
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
                  제출 권한이 있는 서비스이며, 공개 사이트 확인 및 선택한 공개 범위에 따라 외부 투자자에게
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
                <span>태그</span>
                <span className="text-stone-500">쉼표로 구분, 최대 8개</span>
              </span>
              <input
                type="text"
                maxLength={180}
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="예: 학부모, 식단, MVP, 생활편의"
                className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
              />
              {parseTagInput(tagInput).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parseTagInput(tagInput).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
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
                  사이트 확인
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
                확인 등록
              </button>
            </div>
          </form>
        </Modal>
      )}

      {shouldShowLogin && (
        <Modal title="로그인" subtitle="테스트 계정으로 계정 역할을 전환해 실시간 플로우를 확인합니다." onClose={() => setIsLoginOpen(false)} dialogRef={loginModalRef}>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-stone-300">이메일</span>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="maker-a@protolive.local"
                autoComplete="username"
                className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-stone-300">비밀번호</span>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="pass-mock-01"
                autoComplete="current-password"
                className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
              />
            </label>
            <div className="rounded-lg border border-stone-700 bg-stone-950/55 p-3 text-xs text-stone-300">
              <p className="font-black text-stone-100">테스트 계정</p>
              <div className="mt-2 space-y-3">
                <p className="text-[11px] font-black text-stone-400">창업자</p>
                <div className="grid gap-2">
                  {testAccountsByRole.maker.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setLoginEmail(account.email);
                        setLoginPassword(account.password);
                      }}
                      className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-stone-700 px-3 py-2 text-left text-stone-100 transition hover:border-cyan-300/50 hover:text-cyan-100"
                    >
                      <span>{account.name}</span>
                      <span className="truncate text-stone-400">{account.email}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-black text-stone-400">투자자</p>
                <div className="grid gap-2">
                  {testAccountsByRole.investor.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setLoginEmail(account.email);
                        setLoginPassword(account.password);
                      }}
                      className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-stone-700 px-3 py-2 text-left text-stone-100 transition hover:border-cyan-300/50 hover:text-cyan-100"
                    >
                      <span>{account.name}</span>
                      <span className="truncate text-stone-400">{account.email}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-black text-stone-400">일반 회원</p>
                <div className="grid gap-2">
                  {testAccountsByRole.member.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setLoginEmail(account.email);
                        setLoginPassword(account.password);
                      }}
                      className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-stone-700 px-3 py-2 text-left text-stone-100 transition hover:border-cyan-300/50 hover:text-cyan-100"
                    >
                      <span>{account.name}</span>
                      <span className="truncate text-stone-400">{account.email}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-black text-stone-400">운영자</p>
                <div className="grid gap-2">
                  {testAccountsByRole.admin.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setLoginEmail(account.email);
                        setLoginPassword(account.password);
                      }}
                      className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-amber-300/40 px-3 py-2 text-left text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
                    >
                      <span>{account.name}</span>
                      <span className="truncate text-amber-100/70">{account.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsLoginOpen(false)}
                className="min-h-11 flex-1 rounded-lg border border-stone-700 text-sm font-black text-stone-300 hover:text-stone-100"
              >
                나중에
              </button>
              <button
                type="submit"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-lime-300 text-sm font-black text-slate-950"
              >
                <Users className="h-4 w-4" />
                로그인
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
    <div className="protolive-mini-tile rounded-lg border border-stone-800 bg-[oklch(16%_0.016_205)] p-3">
      <Icon className="mb-2 h-4 w-4 text-lime-200" />
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 break-words text-base font-black text-stone-50 sm:text-lg">{value}</p>
    </div>
  );
}

function DifferentiationPanel() {
  return (
    <section className="protolive-panel rounded-xl border border-stone-800 bg-stone-950/65 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-amber-200" />
        <h3 className="font-black text-stone-100">왜 다른가요?</h3>
      </div>
      <div className="space-y-2">
        {differentiationRows.map((row) => (
          <div key={row.label} className="protolive-reco-item rounded-lg border border-stone-800 bg-[oklch(15%_0.015_205)] p-3">
            <p className="text-xs font-black text-cyan-100">{row.label}</p>
            <p className="mt-2 text-xs leading-5 text-stone-500">일반: {row.usual}</p>
            <p className="mt-1 text-xs leading-5 text-stone-200">ProtoLive: {row.protolive}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProofKpiRail({
  stats,
  protectedProjectCount,
  publicProjectCount,
  fastestResponseProject,
}: {
  stats: MarketStats;
  protectedProjectCount: number;
  publicProjectCount: number;
  fastestResponseProject: Project | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Metric icon={ShieldCheck} label="확인된 사이트" value={`${stats.verifiedProjects}/${stats.totalProjects}`} />
      <Metric icon={Gauge} label="확인 완료율" value={`${stats.verificationRate}%`} />
      <Metric
        icon={TimerReset}
        label="평균 열림 속도"
        value={stats.averageResponseMs === null ? 'N/A' : `${stats.averageResponseMs}ms`}
      />
      <Metric icon={ShieldCheck} label="요청 후 공개" value={`${protectedProjectCount}`} />
      <Metric icon={Globe2} label="바로 보기 가능" value={`${publicProjectCount}`} />
      <Metric
        icon={Zap}
        label="가장 빠른 응답"
        value={fastestResponseProject?.validation.responseTimeMs ? `${fastestResponseProject.validation.responseTimeMs}ms` : 'N/A'}
      />
    </div>
  );
}

function SignalTimeline({
  events,
  isLoading,
  className = 'xl:flex xl:flex-col',
  title = 'Activity Timeline',
  titleId,
}: {
  events: ProjectEvent[];
  isLoading: boolean;
  className?: string;
  title?: string;
  titleId?: string;
}) {
  const totals = events.reduce<Record<ProjectEventType, number>>(
    (counts, event) => {
      counts[event.type] += 1;
      return counts;
    },
    { create: 0, preview: 0, outbound: 0, match: 0, refresh: 0 },
  );
  const totalEvents = events.length;

  return (
    <aside id={titleId} className={`${className} min-h-0 border-l border-stone-800 bg-[oklch(15%_0.016_205)]`}>
      <div className="border-b border-stone-800 p-4">
        <div className="flex items-center gap-2">
          <Signal className="h-4 w-4 text-lime-200" />
          <h3 className="font-black text-stone-100">{title}</h3>
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
            아직 이 사이트에 기록된 활동이 없습니다.
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
            {events.length > 20 && (
              <p className="pt-1 text-center text-xs text-stone-500">
                최근 20건만 표시됩니다 · 총 {totalEvents}건
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function ProjectReviewWorkspace({
  project,
  reviews,
  isLoading,
  session,
  reviewType,
  reviewRating,
  reviewBody,
  replyToReview,
  isSubmitting,
  onTypeChange,
  onRatingChange,
  onBodyChange,
  onReplyTo,
  onCancelReply,
  onReportReview,
  reportingReviewId,
  onLogin,
  onSubmit,
}: {
  project: Project;
  reviews: ProjectReview[];
  isLoading: boolean;
  session: AuthSession | null;
  reviewType: ProjectReviewType;
  reviewRating: number;
  reviewBody: string;
  replyToReview: ProjectReview | null;
  isSubmitting: boolean;
  onTypeChange: (type: ProjectReviewType) => void;
  onRatingChange: (rating: number) => void;
  onBodyChange: (body: string) => void;
  onReplyTo: (review: ProjectReview) => void;
  onCancelReply: () => void;
  onReportReview: (review: ProjectReview) => void;
  reportingReviewId: number | null;
  onLogin: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const roots = getRootReviews(reviews);
  const repliesByParent = getRepliesByParent(reviews);
  const summary = project.reviewSummary;

  return (
    <div className="protolive-community-panel space-y-4 rounded-2xl border border-stone-800 bg-stone-950/45 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Community signal</p>
        <h3 className="mt-1 text-xl font-black tracking-tight text-stone-50">회원 리뷰와 성장 의견</h3>
        <p className="mt-1 text-sm leading-6 text-stone-400">
          투자자뿐 아니라 일반 회원도 평가, 아이디어, 도움 제안을 남길 수 있습니다.
        </p>
        </div>
        <div className="protolive-safety-note flex flex-wrap gap-2 text-[11px] font-black">
          <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-cyan-100">
            1단계 대댓글
          </span>
          <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-amber-100">
            3회 신고 자동 숨김
          </span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">전체 의견</p>
          <p className="mt-1 text-lg font-black text-stone-50">{summary?.rootCount ?? roots.length}</p>
        </div>
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">평균 별점</p>
          <p className="mt-1 text-lg font-black text-stone-50">
            {summary?.averageRating ? `${summary.averageRating.toFixed(1)}점` : '아직 없음'}
          </p>
        </div>
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">성장 도움</p>
          <p className="mt-1 text-lg font-black text-lime-100">{summary?.supportCount ?? 0}</p>
        </div>
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">대댓글</p>
          <p className="mt-1 text-lg font-black text-cyan-100">{summary?.replyCount ?? 0}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="protolive-review-composer rounded-xl border border-stone-800 bg-stone-950/45 p-4">
        {session ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-400">
            <span className="rounded-full border border-lime-300/35 bg-lime-300/10 px-2.5 py-1 font-black text-lime-100">
              {getRoleLabel(session.role)}
            </span>
            <span>{maskEmail(session.email)} 님의 의견으로 저장됩니다.</span>
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            로그인한 회원만 평가와 답글을 남길 수 있습니다.
            <button type="button" onClick={onLogin} className="ml-2 font-black underline underline-offset-4">
              로그인하기
            </button>
          </div>
        )}

        {replyToReview ? (
          <div className="mb-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-3 text-xs text-cyan-100">
            <div className="flex items-start justify-between gap-3">
              <p>
                <span className="font-black">대댓글 작성 중</span>
                <span className="ml-2 text-cyan-100/75">{maskEmail(replyToReview.authorEmail)} 의견에 답합니다.</span>
              </p>
              <button type="button" onClick={onCancelReply} className="font-black text-cyan-50">
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            {(Object.keys(reviewTypeCopy) as ProjectReviewType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                className={`rounded-lg border p-3 text-left transition ${
                  reviewType === type
                    ? reviewTypeCopy[type].tone
                    : 'border-stone-800 bg-stone-950/50 text-stone-300 hover:border-stone-600'
                }`}
              >
                <span className="block text-sm font-black">{reviewTypeCopy[type].label}</span>
                <span className="mt-1 block text-xs leading-5 opacity-80">{reviewTypeCopy[type].helper}</span>
              </button>
            ))}
          </div>
        )}

        {!replyToReview && reviewType === 'review' && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-stone-400">별점</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onRatingChange(rating)}
                className={`min-h-9 rounded-lg border px-3 text-xs font-black ${
                  reviewRating === rating
                    ? 'border-amber-300 bg-amber-300 text-slate-950'
                    : 'border-stone-700 text-stone-300'
                }`}
              >
                {rating}점
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">
            {replyToReview ? '답글 내용' : `${reviewTypeCopy[reviewType].label} 내용`}
          </span>
          <textarea
            required
            maxLength={700}
            rows={4}
            value={reviewBody}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={
              replyToReview
                ? '상대 의견에 이어 답글을 남겨주세요.'
                : '처음 보는 사람도 이해할 수 있게 좋았던 점, 아쉬운 점, 다음 아이디어를 적어주세요.'
            }
            className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
        </label>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !session}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {replyToReview ? '답글 등록' : '의견 등록'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-stone-100">회원 의견</h3>
          <span className="text-xs text-stone-500">{isLoading ? '불러오는 중' : `${reviews.length}개`}</span>
        </div>
        {isLoading ? (
          <div className="rounded-lg border border-stone-800 bg-stone-950/45 p-4 text-sm text-stone-400">
            리뷰를 불러오는 중입니다.
          </div>
        ) : roots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950/45 p-4 text-sm text-stone-400">
            아직 리뷰가 없습니다. 첫 평가나 성장 아이디어를 남겨주세요.
          </div>
        ) : (
          roots.map((review) => (
            <div key={review.id} className="protolive-thread-card rounded-xl border border-stone-800 bg-stone-950/45 p-4">
              <ReviewItem
                review={review}
                onReplyTo={onReplyTo}
                onReportReview={onReportReview}
                isReporting={reportingReviewId === review.id}
              />
              {(repliesByParent[review.id] ?? []).length > 0 && (
                <div className="mt-3 space-y-2 border-t border-stone-800 pt-3">
                  {(repliesByParent[review.id] ?? []).map((reply) => (
                    <div key={reply.id} className="protolive-thread-reply rounded-lg border border-stone-800 bg-stone-900/45 p-3">
                      <ReviewItem
                        review={reply}
                        isReply
                        onReplyTo={onReplyTo}
                        onReportReview={onReportReview}
                        isReporting={reportingReviewId === reply.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReviewItem({
  review,
  isReply = false,
  onReplyTo,
  onReportReview,
  isReporting,
}: {
  review: ProjectReview;
  isReply?: boolean;
  onReplyTo: (review: ProjectReview) => void;
  onReportReview: (review: ProjectReview) => void;
  isReporting: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${reviewTypeCopy[review.type].tone}`}>
          {isReply ? '답글' : reviewTypeCopy[review.type].label}
        </span>
        {review.status === 'reported' && (
          <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">
            신고 검토중 {review.reportCount > 0 ? review.reportCount : ''}
          </span>
        )}
        <span className="text-xs font-black text-stone-300">{maskEmail(review.authorEmail)}</span>
        <span className="text-xs text-stone-500">{getRoleLabel(review.authorRole)}</span>
        {review.rating ? <span className="text-xs font-black text-amber-100">{review.rating}점</span> : null}
        <span className="text-xs text-stone-500">{formatRelativeTime(review.createdAt)}</span>
      </div>
      <p className="mt-2 overflow-wrap-anywhere text-sm leading-6 text-stone-200">{review.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!isReply && (
          <button
            type="button"
            onClick={() => onReplyTo(review)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100"
          >
            <Send className="h-3.5 w-3.5" />
            답글 달기
          </button>
        )}
        <button
          type="button"
          onClick={() => onReportReview(review)}
          disabled={isReporting}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-400 hover:border-amber-300/50 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isReporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          신고
        </button>
      </div>
    </div>
  );
}

function ProjectDiligencePanel({
  project,
  events,
  isLoadingEvents,
  signalRank,
  dialogRef,
  onClose,
  onPreview,
  onMatch,
  onRefresh,
}: {
  project: Project;
  events: ProjectEvent[];
  isLoadingEvents: boolean;
  signalRank: number | null;
  dialogRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onPreview: () => void;
  onMatch: () => void;
  onRefresh: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const isProtected = project.accessMode === 'screened';
  const responseTone = getResponseTimeTone(project.validation.responseTimeMs);
  const signalQuality = getSignalQuality(project.signalScore);
  const summaryCounts = project.eventSummary?.counts ?? { create: 0, preview: 0, outbound: 0, match: 0, refresh: 0 };
  const eventCounts = events.length > 0
    ? events.reduce<Record<ProjectEventType, number>>(
      (counts, event) => {
        counts[event.type] += 1;
        return counts;
      },
      { create: 0, preview: 0, outbound: 0, match: 0, refresh: 0 },
    )
    : summaryCounts;
  const totalEvents = events.length > 0 ? events.length : project.eventSummary?.total ?? 0;
  const latestEventAt = events[0]?.createdAt ?? project.eventSummary?.latestAt ?? null;
  const highestIntent = formatWon(project.committedAmountMax);
  const committedRange =
    project.committedAmountMax > 0
      ? `${formatWon(project.committedAmountMin)} ~ ${formatWon(project.committedAmountMax)}`
      : '아직 구조화된 의향 없음';
  const exposureLabel = isProtected ? '요청 후 공개, URL 마스킹' : '바로 보기 가능, 새 탭 열람 가능';
  const proofRows = [
    {
      icon: Globe2,
      label: '라이브 링크 확인',
      value: project.validation.success ? `HTTP ${project.validation.status ?? 'OK'}` : '확인 필요',
      detail: isProtected ? '공개 목록에서는 원본 URL을 숨기고 접근 요청으로 전환합니다.' : project.validation.finalUrl ?? project.liveUrl,
    },
    {
      icon: TimerReset,
      label: '응답 속도',
      value: project.validation.responseTimeMs ? `${project.validation.responseTimeMs}ms` : responseTone.label,
      detail: `최근 확인 ${formatRelativeTime(project.validation.checkedAt)}`,
    },
    {
      icon: ShieldCheck,
      label: '공개 방식',
      value: exposureLabel,
      detail: isProtected
        ? '투자자는 의향 메시지를 남긴 뒤 상세 접근을 요청합니다.'
        : '미리보기와 새 탭 행동이 실시간 관심 활동로 기록됩니다.',
    },
    {
      icon: Signal,
      label: '연결 순위',
      value: signalRank === null ? `${project.signalScore ?? 0}점` : `#${signalRank} · ${project.signalScore ?? 0}점`,
      detail: `${signalQuality.label} 상태, 최근 활동 ${formatRelativeTime(latestEventAt ?? undefined)}`,
    },
  ];
  const decisionNotes = [
    project.validation.success
      ? '확인 통과: 투자자가 작동 여부보다 제품 흐름과 시장 반응을 바로 검토할 수 있습니다.'
      : '확인 보류: URL 응답 또는 보안 정책을 먼저 확인해야 합니다.',
    isProtected
      ? '보호 흐름: 원본 URL은 숨기고 연결 요청 메시지로 접근 맥락을 기록해 연결 신뢰도를 높입니다.'
      : '공개 흐름: 미리보기와 새 탭 열람을 바로 허용하고 행동 데이터를 관심 활동로 누적합니다.',
    project.matchCount > 0
      ? `투자 관심: ${project.matchCount}건, 최대 ${highestIntent}까지 구조화된 관심이 잡혔습니다.`
      : '투자 관심: 아직 기록된 연결이 없어 첫 제안 메시지 유도가 우선입니다.',
    totalEvents > 0
      ? `행동 신호: 총 ${totalEvents}건, 미리보기 ${eventCounts.preview}건, 연결 ${eventCounts.match}건입니다.`
      : '행동 신호: 아직 활동이 없어 첫 미리보기와 외부 열람을 만드는 운영 액션이 필요합니다.',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="리뷰 리포트 닫기"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${project.title} 리뷰 리포트`}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-stone-700 bg-[oklch(13%_0.016_205)] shadow-2xl lg:w-[760px] motion-safe:animate-panel-slide-in"
      >
        <div className="border-b border-stone-800 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                <Radar className="h-3.5 w-3.5" />
                투자 연결 리뷰 리포트
              </p>
              <h2 id={titleId} className="truncate text-xl font-black text-stone-50">
                {project.title}
              </h2>
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-stone-400">
                작동 증거, 보호 상태, 행동 신호, 투자 관심을 한 화면에서 검토합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:border-red-300/40 hover:text-red-100"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-stone-700 px-2 py-1 text-[11px] font-black text-stone-300">
              <Layers3 className="h-3.5 w-3.5 text-cyan-200" />
              {project.category}
            </span>
            <span className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black ${getValidationTone(project.validation)}`}>
              {project.validation.success ? '확인 통과' : '확인 확인 필요'}
            </span>
            <span className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black ${signalQuality.tone}`}>
              {signalQuality.label}
            </span>
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] font-black text-amber-100">
              {committedRange}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-4">
              <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-lime-200" />
                  <h3 className="font-black text-stone-100">Proof Ledger</h3>
                </div>
                <div className="grid gap-2">
                  {proofRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="grid gap-3 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                          <Icon className="h-3.5 w-3.5 text-cyan-200" />
                          {row.label}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-stone-100">{row.value}</p>
                          <p className="mt-1 overflow-wrap-anywhere text-xs leading-5 text-stone-400">{row.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-amber-200" />
                  <h3 className="font-black text-stone-100">투자 판단 메모</h3>
                </div>
                <div className="space-y-2">
                  {decisionNotes.map((note) => (
                    <p key={note} className="rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-3 text-sm leading-6 text-stone-300">
                      {note}
                    </p>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Signal className="h-4 w-4 text-cyan-200" />
                  <h3 className="font-black text-stone-100">Event Mix</h3>
                </div>
                {isLoadingEvents ? (
                  <p className="inline-flex items-center gap-2 text-sm text-stone-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    신호 로딩
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(['preview', 'outbound', 'match', 'refresh'] as ProjectEventType[]).map((type) => {
                      const meta = eventCopy[type];
                      const Icon = meta.icon;
                      return (
                        <div key={type} className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-[oklch(15%_0.016_205)] p-2 text-xs">
                          <span className="inline-flex items-center gap-2 font-black text-stone-300">
                            <Icon className="h-3.5 w-3.5 text-cyan-200" />
                            {meta.label}
                          </span>
                          <span className="font-black text-stone-50">{eventCounts[type]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-lime-200" />
                  <h3 className="font-black text-stone-100">Next Action</h3>
                </div>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={onMatch}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-lime-300 px-3 text-xs font-black text-slate-950"
                  >
                    <Briefcase className="h-4 w-4" />
                    투자 관심 기록
                  </button>
                  <button
                    type="button"
                    onClick={onPreview}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-300/35 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/10"
                  >
                    {isProtected ? <ShieldCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {isProtected ? '리뷰 요청' : '사이트 보기'}
                  </button>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    상태 재확인
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}


function ProjectDetailRoute({
  project,
  events,
  reviews,
  session,
  isEventsLoading,
  isReviewsLoading,
  reviewType,
  reviewRating,
  reviewBody,
  replyToReview,
  isSendingReview,
  onBack,
  onPreview,
  onMatch,
  onRefresh,
  onOutbound,
  onSubmitReview,
  onReviewTypeChange,
  onReviewRatingChange,
  onReviewBodyChange,
  onReplyTo,
  onCancelReply,
  onReportReview,
  reportingReviewId,
  onLogin,
}: {
  project: Project;
  events: ProjectEvent[];
  reviews: ProjectReview[];
  session: AuthSession | null;
  isEventsLoading: boolean;
  isReviewsLoading: boolean;
  reviewType: ProjectReviewType;
  reviewRating: number;
  reviewBody: string;
  replyToReview: ProjectReview | null;
  isSendingReview: boolean;
  onBack: () => void;
  onPreview: () => void;
  onMatch: () => void;
  onRefresh: () => void;
  onOutbound: () => void;
  onSubmitReview: (event: React.FormEvent) => void;
  onReviewTypeChange: (type: ProjectReviewType) => void;
  onReviewRatingChange: (rating: number) => void;
  onReviewBodyChange: (body: string) => void;
  onReplyTo: (review: ProjectReview) => void;
  onCancelReply: () => void;
  onReportReview: (review: ProjectReview) => void;
  reportingReviewId: number | null;
  onLogin: () => void;
}) {
  const isProtected = project.accessMode === 'screened';
  const responseTone = getResponseTimeTone(project.validation.responseTimeMs);
  const reviewSummary = project.reviewSummary;
  const latestReview = reviewSummary?.latest;
  const tags = project.tags ?? [];

  return (
    <div className="space-y-5 rounded-2xl border border-lime-300/20 bg-stone-950/55 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 transition hover:border-lime-300/50 hover:text-lime-100"
        >
          목록으로 돌아가기
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1 font-black text-stone-300">
            {project.category}
          </span>
          <span className={'rounded-full border px-3 py-1 font-black ' + getValidationTone(project.validation)}>
            {project.validation.success ? '사이트 확인 완료' : '확인 필요'}
          </span>
          <span className={'rounded-full border px-3 py-1 font-black ' + responseTone.tone}>
            {project.validation.responseTimeMs ? project.validation.responseTimeMs + 'ms' : responseTone.label}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-stone-700 bg-stone-950">
            {project.thumbnail ? (
              <img
                src={project.thumbnail}
                alt={project.title + ' 사이트 스크린샷'}
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[16/10] place-items-center text-sm font-black text-stone-500">
                스크린샷 준비 중
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">사이트 상세</p>
            <h2 className="mt-2 overflow-wrap-anywhere text-3xl font-black tracking-tight text-stone-50">
              {project.title}
            </h2>
            <p className="mt-3 max-w-3xl overflow-wrap-anywhere text-base leading-7 text-stone-300">
              {project.description}
            </p>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">
              <Globe2 className="h-4 w-4 flex-shrink-0 text-stone-500" />
              <span className="truncate font-mono">{project.validation.finalUrl ?? project.liveUrl}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-lime-300/20 bg-lime-300/10 p-3">
              <p className="text-xs text-lime-100/75">회원 리뷰</p>
              <p className="mt-1 text-xl font-black text-lime-100">{reviewSummary?.rootCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
              <p className="text-xs text-amber-100/75">평균 별점</p>
              <p className="mt-1 text-xl font-black text-amber-100">
                {reviewSummary?.averageRating ? reviewSummary.averageRating.toFixed(1) + '점' : '없음'}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3">
              <p className="text-xs text-cyan-100/75">대댓글</p>
              <p className="mt-1 text-xl font-black text-cyan-100">{reviewSummary?.replyCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3">
              <p className="text-xs text-stone-500">투자 관심</p>
              <p className="mt-1 text-xl font-black text-stone-100">{project.matchCount}</p>
            </div>
          </div>
          {latestReview && (
            <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-4">
              <p className="text-xs font-black text-stone-500">최근 회원 의견</p>
              <p className="mt-2 text-sm font-black text-stone-200">
                {reviewTypeCopy[latestReview.type].label}이 새로 등록되었습니다.
              </p>
              <p className="mt-2 text-xs text-stone-500">
                {reviewTypeCopy[latestReview.type].label} · {maskEmail(latestReview.authorEmail)} · {formatRelativeTime(latestReview.createdAt)}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                전체 내용과 대댓글은 아래 커뮤니티 영역에서 확인하세요.
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-stone-800 bg-stone-950/55 p-4">
            <h3 className="text-lg font-black text-stone-50">다음에 할 일</h3>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              사이트를 직접 보고, 회원 의견을 남기고, 필요하면 창업자에게 투자 관심이나 성장 도움을 제안하세요.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                <Sparkles className="h-4 w-4" />
                {isProtected ? '공개 요청' : '사이트 보기'}
              </button>
              <button
                type="button"
                onClick={onMatch}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-3 text-sm font-black text-slate-950 transition hover:bg-lime-200"
              >
                <Briefcase className="h-4 w-4" />
                투자 관심 남기기
              </button>
              {!isProtected && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  onClick={onOutbound}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-sm font-black text-stone-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  새 탭으로 열기
                </a>
              )}
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-sm font-black text-stone-200 transition hover:border-lime-300/50 hover:text-lime-100"
              >
                <RefreshCw className="h-4 w-4" />
                상태 다시 확인
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-950/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-stone-100">사이트 활동</h3>
              <span className="text-xs text-stone-500">{isEventsLoading ? '불러오는 중' : events.length + '개'}</span>
            </div>
            {events.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
                아직 활동 기록이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => {
                  const meta = eventCopy[event.type];
                  const Icon = meta.icon;
                  return (
                    <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-950/45 p-3 text-xs">
                      <span className="inline-flex items-center gap-2 font-black text-stone-200">
                        <Icon className="h-3.5 w-3.5 text-cyan-200" />
                        {meta.label}
                      </span>
                      <span className="text-stone-500">{formatRelativeTime(event.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProjectReviewWorkspace
        project={project}
        reviews={reviews}
        isLoading={isReviewsLoading}
        session={session}
        reviewType={reviewType}
        reviewRating={reviewRating}
        reviewBody={reviewBody}
        replyToReview={replyToReview}
        isSubmitting={isSendingReview}
        onTypeChange={onReviewTypeChange}
        onRatingChange={onReviewRatingChange}
        onBodyChange={onReviewBodyChange}
        onReplyTo={onReplyTo}
        onCancelReply={onCancelReply}
        onReportReview={onReportReview}
        reportingReviewId={reportingReviewId}
        onLogin={onLogin}
        onSubmit={onSubmitReview}
      />
    </div>
  );
}

function ProjectCard({
  project,
  viewMode,
  signalRank,
  onOpenDetail,
  onToggleFavorite,
  isFavorite,
}: {
  project: Project;
  viewMode: ProjectListViewMode;
  signalRank: number | null;
  onOpenDetail: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}) {
  const isProtected = project.accessMode === 'screened';
  const responseTone = getResponseTimeTone(project.validation.responseTimeMs);
  const signalRankText = signalRank === null ? null : '#' + signalRank;
  const tags = project.tags ?? [];
  const latestReview = project.reviewSummary?.latest;
  const isCardView = viewMode === 'cards';
  const isReviewView = viewMode === 'reviews';

  return (
    <article
      className={`protolive-card rounded-xl border border-stone-800 bg-[oklch(18%_0.018_205)] transition duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-lime-300/45 ${
        isCardView ? 'p-4' : 'p-3'
      }`}
    >
      <div
        className={
          isCardView
            ? 'grid gap-3'
            : isReviewView
              ? 'grid gap-3 sm:grid-cols-[124px_minmax(0,1fr)_auto] sm:items-center'
              : 'grid gap-3 sm:grid-cols-[148px_minmax(0,1fr)_auto] sm:items-center'
        }
      >
        <button type="button" onClick={onOpenDetail} className="protolive-shot-card overflow-hidden rounded-xl border border-stone-700 bg-stone-950/60 text-left">
          {project.thumbnail ? (
            <img
              src={project.thumbnail}
              alt={project.title + ' 사이트 스크린샷'}
              className="aspect-[16/10] w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid aspect-[16/10] place-items-center text-xs font-black text-stone-500">스크린샷 준비 중</div>
          )}
        </button>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {signalRankText && (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                {signalRankText} 추천
              </span>
            )}
            <span className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1 text-[11px] font-black text-stone-300">
              {project.category}
            </span>
            <span className={'rounded-full border px-2.5 py-1 text-[11px] font-black ' + getValidationTone(project.validation)}>
              {project.validation.success ? '확인 완료' : '확인 필요'}
            </span>
            <span className={'rounded-full border px-2.5 py-1 text-[11px] font-black ' + responseTone.tone}>
              {project.validation.responseTimeMs ? project.validation.responseTimeMs + 'ms' : responseTone.label}
            </span>
            {isProtected && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">요청 후 공개</span>}
          </div>
          <button type="button" onClick={onOpenDetail} className="block max-w-full text-left">
            <h3 className="overflow-wrap-anywhere text-lg font-black tracking-tight text-stone-50">{project.title}</h3>
          </button>
          <p className="mt-1 max-w-[72ch] overflow-wrap-anywhere text-sm leading-6 text-stone-300">{project.description}</p>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.slice(0, isCardView ? 6 : 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-black text-cyan-100"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {isReviewView && latestReview && (
            <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/55 p-3">
              <p className="text-[11px] font-black text-stone-500">최근 회원 의견</p>
              <p className="mt-1 overflow-wrap-anywhere text-sm leading-6 text-stone-200">{latestReview.body}</p>
              <p className="mt-2 text-xs text-stone-500">
                {reviewTypeCopy[latestReview.type].label} · {maskEmail(latestReview.authorEmail)}
              </p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
            <span>리뷰 {project.reviewSummary?.rootCount ?? 0}</span>
            <span>답글 {project.reviewSummary?.replyCount ?? 0}</span>
            <span>투자 관심 {project.matchCount}</span>
            <span>최근 {formatRelativeTime(project.reviewSummary?.latestAt ?? project.eventSummary?.latestAt ?? undefined)}</span>
          </div>
        </div>
        <div className={isCardView ? 'grid grid-cols-2 gap-2' : 'grid gap-2 sm:min-w-[132px]'}>
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
          >
            상세 보기
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            className={'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black transition ' + (
              isFavorite
                ? 'border-amber-300/70 bg-amber-300/10 text-amber-100'
                : 'border-stone-700 text-stone-300 hover:border-stone-500'
            )}
            aria-label={isFavorite ? project.title + ' 즐겨찾기 해제' : project.title + ' 즐겨찾기 추가'}
          >
            <Star className={'h-4 w-4 ' + (isFavorite ? 'fill-amber-100' : '')} />
            저장
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  apiOnline,
  onCreate,
  onResetFilters,
  hasActiveFilters,
}: {
  apiOnline: boolean;
  onCreate: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-700 bg-stone-950/50 p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-lime-300 text-slate-950">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-xl font-black text-stone-50">아직 확인된 라이브 사이트가 없습니다.</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
        샘플 데이터를 보여주지 않습니다. 백엔드 API에 실제 제출된 사이트만 노출해 투자자가 가짜
        신호와 실제 신호를 혼동하지 않도록 했습니다.
      </p>
              {hasActiveFilters ? (
                <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-stone-500">
                  현재 조건으로 조회 가능한 항목이 없습니다. 조건을 넓히거나 필터를 초기화하면 더 많은 사이트를 확인할 수 있습니다.
                </p>
              ) : (
        <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-stone-500">
          API 연결이 정상인 상태에서 등록된 사이트가 있으면 실시간 확인 대시보드에서 즉시 확인할 수 있습니다.
        </p>
      )}
      <button
        type="button"
        onClick={onCreate}
        disabled={!apiOnline}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
      >
        <Plus className="h-4 w-4" />
        첫 사이트 확인 등록
      </button>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-700 px-4 text-sm font-black text-stone-300 transition hover:border-stone-500"
        >
          <X className="h-4 w-4" />
          필터 초기화
        </button>
      )}
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
  dialogRef,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
  dialogRef?: React.RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className="protolive-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="닫기" />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="protolive-modal relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-stone-700 bg-[oklch(16%_0.018_205)] p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-stone-800 pb-4">
          <div>
            <h2 id={titleId} className="text-xl font-black text-stone-50">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-stone-400">
              {subtitle}
            </p>
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

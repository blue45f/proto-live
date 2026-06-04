import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, Briefcase, Plus, RefreshCw, Sparkles } from 'lucide-react'
import type {
  AdminDashboardSnapshot,
  MarketConfig,
  MarketStats,
  ProjectEventType,
  ProjectListQuery,
  ProjectMaturity,
  ProjectReviewType,
} from '../api'
import { DEFAULT_REVENUE_CONFIG, DEFAULT_REVENUE_TARGET } from './revenue-config'

export type AppView = 'market' | 'admin'

export const LOGIN_MODAL_KEY = 'protolive:login-form:v1'
export const ADMIN_PATH_SEGMENT = 'admin'

export const EMPTY_STATS: MarketStats = {
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
}

export const EMPTY_ADMIN_DASHBOARD: AdminDashboardSnapshot = {
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
}

export const EMPTY_CONFIG: MarketConfig = {
  categories: [],
  accessModes: [],
  fundingRanges: [],
  refreshIntervalMs: 30000,
  benchmarkSignals: [],
}

export const FILTER_PRESET_STORAGE_KEY = 'protolive:filters:v1'
export const FILTER_UI_STORAGE_KEY = 'protolive:filters-ui:v1'
export const LIST_VIEW_STORAGE_KEY = 'protolive:list-view:v1'

export type ProjectListViewMode = 'compact' | 'cards' | 'reviews'

export const PROJECT_LIST_VIEW_OPTIONS: Array<{
  id: ProjectListViewMode
  label: string
  helper: string
}> = [
  { id: 'compact', label: '간단 목록', helper: '빠르게 훑어보기' },
  { id: 'cards', label: '큰 카드', helper: '스크린샷 중심' },
  { id: 'reviews', label: '리뷰 중심', helper: '회원 반응 먼저' },
]

export const FUNDING_SORT_OPTIONS: ProjectListQuery['sort'][] = [
  'signal',
  'upvotes',
  'recent',
  'created',
  'funding',
]

export type RawFilterSnapshot = {
  q?: string
  category?: string
  tag?: string
  accessMode?: string
  sort?: string
  page?: number
  limit?: number
  minSignal?: number
  minFundingAmount?: number
  maxFundingAmount?: number
  onlyVerified?: boolean
  favorites?: boolean
}

export const benchmarkCopy: Record<string, { title: string; body: string }> = {
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
}

export const differentiationRows: Array<{
  label: string
  usual: string
  protolive: string
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
]

export const eventCopy: Record<
  ProjectEventType,
  { icon: LucideIcon; label: string; tone: string }
> = {
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
}

export const maturityCopy: Record<
  ProjectMaturity,
  { label: string; helper: string; tone: string }
> = {
  early: {
    label: '초기',
    helper: '데모·프로토타입·갓 시작한 거친 초기물. 완성도보다 방향과 가능성을 봐주세요.',
    tone: 'border-violet-300/35 bg-violet-300/10 text-violet-100',
  },
  building: {
    label: '만드는 중',
    helper: '핵심 흐름은 동작하지만 아직 다듬는 중입니다.',
    tone: 'border-lime-300/35 bg-lime-300/10 text-lime-100',
  },
  live: {
    label: '운영',
    helper: '실제 사용 가능한 운영 단계입니다.',
    tone: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
  },
}

export const BUILD_TOOLS: Array<{ id: string; label: string }> = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'lovable', label: 'Lovable' },
  { id: 'v0', label: 'v0' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'replit', label: 'Replit' },
  { id: 'windsurf', label: 'Windsurf' },
  { id: 'wrtn', label: '뤼튼' },
  { id: 'copilot', label: 'GitHub Copilot' },
]

export const MAX_BUILD_TOOLS = 5
export const MAX_CUSTOM_TOOLS = 3

export function buildToolLabel(id: string): string {
  return BUILD_TOOLS.find((tool) => tool.id === id)?.label ?? id
}

export const maturityReviewHint: Record<ProjectMaturity, string> = {
  early:
    '아직 초기 단계예요. 완성도보다 방향과 가능성, 다음에 뭘 더 만들면 좋을지 위주로 의견을 남겨주세요.',
  building: '만드는 중이에요. 핵심 흐름이 잘 작동하는지, 더 다듬을 부분 위주로 봐주세요.',
  live: '운영 중인 서비스예요. 완성도와 실사용 경험, 시장성 관점에서 평가해주세요.',
}

export const reviewTypeCopy: Record<
  ProjectReviewType,
  { label: string; helper: string; tone: string }
> = {
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
}

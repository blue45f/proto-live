import type {
  AdminDashboardSnapshot,
  MarketConfig,
  MarketStats,
  Project,
  ProjectEvent,
  ProjectReview,
  ValidationSnapshot,
} from '../api'

// ---------------------------------------------------------------------------
// Deterministic fixtures used by the App.tsx characterization tests. These are
// shaped to match the real /projects/* API responses closely enough that the
// existing rendering/derivation logic in App.tsx exercises its happy paths.
// ---------------------------------------------------------------------------

const okValidation: ValidationSnapshot = {
  success: true,
  status: 200,
  message: '확인 완료',
  responseTimeMs: 180,
  checkedAt: '2026-06-01T00:00:00.000Z',
  finalUrl: 'https://example.com',
}

export const marketConfig: MarketConfig = {
  categories: ['커머스', '교육', '돌봄'],
  accessModes: [
    { id: 'screened', label: '선별 공개', description: '요청 후 공개' },
    { id: 'open', label: '바로 공개', description: '누구나 열람' },
  ],
  fundingRanges: [
    { id: 'seed', label: '시드', stage: 'seed', minAmount: 10_000_000, maxAmount: 50_000_000 },
    { id: 'pre-a', label: '프리A', stage: 'pre-a', minAmount: 50_000_000, maxAmount: 200_000_000 },
    {
      id: 'series-a',
      label: '시리즈A',
      stage: 'series-a',
      minAmount: 200_000_000,
      maxAmount: 1_000_000_000,
    },
    {
      id: 'series-b',
      label: '시리즈B',
      stage: 'series-b',
      minAmount: 1_000_000_000,
      maxAmount: 5_000_000_000,
    },
  ],
  // Large interval so the App's polling effect does not fire mid-test.
  refreshIntervalMs: 10_000_000,
  benchmarkSignals: ['빠른 응답', '높은 전환'],
}

export const marketStats: MarketStats = {
  totalProjects: 2,
  verifiedProjects: 2,
  verificationRate: 100,
  totalCommittedAmount: 300_000_000,
  totalInvestors: 12,
  averageResponseMs: 190,
  categoryBreakdown: [
    { category: '커머스', count: 1 },
    { category: '교육', count: 1 },
  ],
  totalSignals: 2,
  topSignals: [
    {
      id: 1,
      title: '밀맵',
      category: '커머스',
      signalScore: 88,
      latestEventAt: '2026-06-02T00:00:00.000Z',
    },
    {
      id: 2,
      title: '케어루프',
      category: '돌봄',
      signalScore: 72,
      latestEventAt: '2026-06-01T00:00:00.000Z',
    },
  ],
  lastUpdatedAt: '2026-06-03T00:00:00.000Z',
}

export const projectMealmap: Project = {
  id: 1,
  userId: 1,
  title: '밀맵 - 동네 식단 추천',
  description: '집밥 재료를 추천하는 커머스 프로토타입입니다.',
  liveUrl: 'https://mealmap.example.com',
  category: '커머스',
  tags: ['food', 'commerce'],
  accessMode: 'open',
  protectionNoticeAccepted: true,
  thumbnail: null,
  investorCount: 8,
  matchCount: 3,
  committedAmountMin: 50_000_000,
  committedAmountMax: 200_000_000,
  validation: okValidation,
  createdAt: '2026-05-20T00:00:00.000Z',
  signalScore: 88,
  eventSummary: {
    total: 24,
    latestAt: '2026-06-02T00:00:00.000Z',
    counts: { create: 1, preview: 12, outbound: 6, match: 3, refresh: 2 },
  },
  reviewSummary: {
    total: 5,
    rootCount: 3,
    replyCount: 2,
    reviewCount: 3,
    supportCount: 1,
    ideaCount: 1,
    averageRating: 4.3,
    latestAt: '2026-06-02T00:00:00.000Z',
    latest: {
      id: 10,
      type: 'review',
      authorEmail: 'member-parent@protolive.local',
      body: '메뉴 추천이 정확해요.',
      createdAt: '2026-06-02T00:00:00.000Z',
    },
  },
}

export const projectCareloop: Project = {
  id: 2,
  userId: 2,
  title: '케어루프 - 돌봄 매칭',
  description: '선별 공개로 운영되는 돌봄 매칭 프로토타입입니다.',
  liveUrl: 'https://careloop.example.com',
  category: '돌봄',
  tags: ['care'],
  accessMode: 'screened',
  protectionNoticeAccepted: true,
  thumbnail: null,
  investorCount: 4,
  matchCount: 1,
  committedAmountMin: 10_000_000,
  committedAmountMax: 50_000_000,
  validation: okValidation,
  createdAt: '2026-05-25T00:00:00.000Z',
  signalScore: 72,
  eventSummary: {
    total: 9,
    latestAt: '2026-06-01T00:00:00.000Z',
    counts: { create: 1, preview: 5, outbound: 2, match: 1, refresh: 0 },
  },
  reviewSummary: {
    total: 1,
    rootCount: 1,
    replyCount: 0,
    reviewCount: 1,
    supportCount: 0,
    ideaCount: 0,
    averageRating: 5,
    latestAt: '2026-06-01T00:00:00.000Z',
    latest: {
      id: 20,
      type: 'support',
      authorEmail: 'investor-impact@protolive.local',
      body: '응원합니다.',
      createdAt: '2026-06-01T00:00:00.000Z',
    },
  },
}

export const projects: Project[] = [projectMealmap, projectCareloop]

export const projectReviews: ProjectReview[] = [
  {
    id: 10,
    projectId: 1,
    parentId: null,
    authorEmail: 'member-parent@protolive.local',
    authorRole: 'member',
    type: 'review',
    rating: 5,
    body: '메뉴 추천이 정확해요.',
    status: 'visible',
    reportCount: 0,
    createdAt: '2026-06-02T00:00:00.000Z',
  },
]

export const projectEvents: ProjectEvent[] = [
  { id: 100, projectId: 1, type: 'preview', createdAt: '2026-06-02T00:00:00.000Z' },
  { id: 101, projectId: 1, type: 'match', createdAt: '2026-06-02T01:00:00.000Z' },
]

// Minimal-but-complete admin dashboard so the admin view renders without
// throwing. lastUpdatedAt differs from new Date(0) so isAdminDashboardAvailable
// becomes true.
export const adminDashboard: AdminDashboardSnapshot = {
  conversionFunnel: {
    previewToMatchRate: 12,
    outboundToMatchRate: 18,
    matchPerProjectRate: 30,
    matchCount: 4,
    previewCount: 17,
    outboundCount: 8,
    totalEvents: 33,
  },
  eventTrend14d: [],
  eventTotals: { create: 2, preview: 17, outbound: 8, match: 4, refresh: 2 },
  accessModeDistribution: [
    { accessMode: 'open', projects: 1, verified: 1 },
    { accessMode: 'screened', projects: 1, verified: 1 },
  ],
  topMatchProjects: [],
  topSignalProjects: [],
  categoryPerformance: [],
  proposalRangeDistribution: [],
  riskProjects: [],
  health: {
    healthScore: 72,
    verifiedHealth: 100,
    conversionHealth: 60,
    engagementHealth: 55,
    responseHealth: 80,
    riskCount: 0,
    warningCount: 1,
  },
  recommendations: [],
  revenue: {
    assumptions: {
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
    },
    monthlyMakerPlanRevenue: 100000,
    monthlyInvestorPlanRevenue: 80000,
    monthlyLeadRevenue: 20000,
    monthlyTransactionRevenue: 10000,
    totalMonthlyRevenue: 210000,
    annualRevenue: 2520000,
    verifiedProjectShare: 100,
    averageCommittedPerInvestor: 25_000_000,
    arpu: 17500,
    arppu: 35000,
    investorLtvEstimate: 158000,
    makerPaybackMonths: 11,
    investorPaybackMonths: 10,
    benchmarkGaps: [],
    scenarios: [
      { label: '보수', multiplier: 0.75, monthlyRevenue: 157500, annualRevenue: 1890000 },
      { label: '기준', multiplier: 1, monthlyRevenue: 210000, annualRevenue: 2520000 },
      { label: '성장', multiplier: 1.25, monthlyRevenue: 262500, annualRevenue: 3150000 },
      { label: '확장', multiplier: 1.5, monthlyRevenue: 315000, annualRevenue: 3780000 },
    ],
    targetGap: {
      targetMonthlyRevenue: 2_500_000,
      shortfall: 2_290_000,
      achievedRate: 8.4,
      drivers: [],
    },
  },
  lastUpdatedAt: '2026-06-03T00:00:00.000Z',
}

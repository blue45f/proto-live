export const PROJECT_CATEGORIES = [
  'AI & SaaS',
  'Web3 & Community',
  'XR & E-Commerce',
  'FinTech',
  'DevTools',
  'Social',
  'Other',
] as const

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

export const PROJECT_ACCESS_MODES = [
  {
    id: 'screened',
    label: '선별 공개',
    description:
      '목록에는 검증 상태만 노출하고, URL/프리뷰는 매칭 요청 뒤 공유하는 기본 보호 모드입니다.',
  },
  {
    id: 'open',
    label: '공개 프리뷰',
    description: '투자자가 목록에서 바로 라이브 URL과 iframe 프리뷰를 열람할 수 있습니다.',
  },
] as const

export type ProjectAccessMode = (typeof PROJECT_ACCESS_MODES)[number]['id']

export const PROJECT_MATURITIES = [
  {
    id: 'early',
    label: '초기',
    description: '데모·프로토타입·갓 시작한 거친 초기물. 완성도보다 방향과 가능성을 봅니다.',
  },
  {
    id: 'building',
    label: '만드는 중',
    description: '핵심 흐름은 동작하지만 아직 다듬는 중입니다.',
  },
  {
    id: 'live',
    label: '운영',
    description: '실제 사용 가능한 운영 단계입니다.',
  },
] as const

export type ProjectMaturity = (typeof PROJECT_MATURITIES)[number]['id']

export const PROJECT_STACKS = [
  { id: 'web', label: '웹' },
  { id: 'app', label: '앱' },
  { id: 'game', label: '게임' },
  { id: 'tools', label: '도구' },
] as const

export type ProjectStack = (typeof PROJECT_STACKS)[number]['id']

export const BUILD_TOOLS = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'lovable', label: 'Lovable' },
  { id: 'v0', label: 'v0' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'replit', label: 'Replit' },
  { id: 'windsurf', label: 'Windsurf' },
  { id: 'wrtn', label: '뤼튼' },
  { id: 'copilot', label: 'GitHub Copilot' },
] as const

export type BuildToolId = (typeof BUILD_TOOLS)[number]['id']

export const MAX_BUILD_TOOLS = 5
export const MAX_CUSTOM_TOOLS = 3

/**
 * 투자 사다리 자동 임계: 커뮤니티 신호가 이 기준을 넘으면 "투자 검토 근접(eligible)"으로 표시한다.
 * featured는 여전히 운영자가 수동으로 올린다 — eligible은 판단을 돕는 파생 신호일 뿐 자동 승급이 아니다.
 */
export const LADDER_THRESHOLD = {
  minUpvotes: 5,
  minReviewers: 3,
} as const

export const FUNDING_RANGES = [
  {
    id: 'pre-seed-10-30',
    label: '₩1,000만 ~ ₩3,000만',
    stage: 'Pre-Seed',
    minAmount: 10000000,
    maxAmount: 30000000,
  },
  {
    id: 'pre-seed-30-50',
    label: '₩3,000만 ~ ₩5,000만',
    stage: 'Pre-Seed',
    minAmount: 30000000,
    maxAmount: 50000000,
  },
  {
    id: 'seed-50-100',
    label: '₩5,000만 ~ ₩1억',
    stage: 'Seed',
    minAmount: 50000000,
    maxAmount: 100000000,
  },
  {
    id: 'seed-100-300',
    label: '₩1억 ~ ₩3억',
    stage: 'Seed / Pre-A',
    minAmount: 100000000,
    maxAmount: 300000000,
  },
  {
    id: 'series-a-300-plus',
    label: '₩3억 이상',
    stage: 'Pre-A / Series A',
    minAmount: 300000000,
    maxAmount: 300000000,
  },
] as const

export type FundingRangeId = (typeof FUNDING_RANGES)[number]['id']

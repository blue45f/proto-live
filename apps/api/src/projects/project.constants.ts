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

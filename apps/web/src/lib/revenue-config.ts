export type RevenueModelConfig = {
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

export const ADMIN_REVENUE_CONFIG_STORAGE_KEY = 'protolive:admin-revenue:v1';
export const ADMIN_REVENUE_SCENARIO_STORAGE_KEY = 'protolive:admin-revenue-scenarios:v1';
export const ADMIN_REVENUE_TARGET_STORAGE_KEY = 'protolive:admin-revenue-target:v1';

export const DEFAULT_REVENUE_TARGET = 2500000;

export const DEFAULT_REVENUE_CONFIG: RevenueModelConfig = {
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

export const DEFAULT_SCENARIO_MULTIPLIERS: number[] = [0.75, 1, 1.25, 1.5];

export const REVENUE_PRESETS: Array<{ id: string; name: string; label: string; description: string; config: RevenueModelConfig }> =
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

export const MIN_REVENUE_RATE = 0;
export const MAX_REVENUE_RATE = 100;
export const DECIMAL_DIGITS = 1;
export const MIN_SCENARIO_MULTIPLIER = 0.05;
export const MAX_SCENARIO_MULTIPLIER = 5;

export type RevenueModelFieldKind = 'currency' | 'percent';

export const REVENUE_MODEL_FIELDS: Array<{
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

export const ADMIN_DASHBOARD_POLL_INTERVAL_MS = 30000;
export const ADMIN_DASHBOARD_TREND_KEY_DAYS = 14;

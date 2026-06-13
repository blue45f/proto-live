import type { LucideIcon } from 'lucide-react'
import { Activity, DollarSign, Gauge, Layers3, ShieldCheck, Signal, TimerReset } from 'lucide-react'
import type { AdminActionRecommendation, Project, ProjectReview, ValidationSnapshot } from '../api'
import {
  DECIMAL_DIGITS,
  MAX_REVENUE_RATE,
  MAX_SCENARIO_MULTIPLIER,
  MIN_REVENUE_RATE,
  MIN_SCENARIO_MULTIPLIER,
  type RevenueModelConfig,
} from './revenue-config'

export function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  if (!domain) return email
  const safeName = name.length <= 2 ? `${name[0] ?? '*'}*` : `${name.slice(0, 2)}***`
  return `${safeName}@${domain}`
}

export function getRoleLabel(role: string) {
  if (role === 'maker') return '창업자'
  if (role === 'investor') return '투자자'
  if (role === 'admin') return '운영자'
  return '회원'
}

export function getAuditActionLabel(action: string) {
  if (action === 'match_compliance_accepted') return '투자 관심 동의'
  if (action === 'review_reported') return '리뷰 신고'
  if (action === 'review_hidden_auto') return '자동 숨김'
  if (action === 'review_moderated') return '운영 검토'
  if (action === 'member_suspended') return '회원 정지'
  if (action === 'member_restored') return '회원 복구'
  if (action === 'member_withdrawn') return '회원 탈퇴'
  return '운영 기록'
}

export function getRootReviews(reviews: ProjectReview[]) {
  return reviews.filter((review) => !review.parentId)
}

export function getRepliesByParent(reviews: ProjectReview[]) {
  return reviews.reduce<Record<number, ProjectReview[]>>((acc, review) => {
    if (!review.parentId) return acc
    acc[review.parentId] = [...(acc[review.parentId] ?? []), review]
    return acc
  }, {})
}

export function getResponseTimeTone(responseTimeMs?: number) {
  if (typeof responseTimeMs !== 'number') {
    return {
      label: '미측정',
      tone: 'border-stone-700/70 bg-stone-900/55 text-stone-300',
    }
  }

  if (responseTimeMs <= 300) {
    return {
      label: '빠름',
      tone: 'border-lime-300/25 bg-lime-300/10 text-lime-200',
    }
  }

  if (responseTimeMs <= 1000) {
    return {
      label: '보통',
      tone: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
    }
  }

  if (responseTimeMs <= 2000) {
    return {
      label: '느림',
      tone: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    }
  }

  return {
    label: '매우 느림',
    tone: 'border-red-300/25 bg-red-500/10 text-red-200',
  }
}

export function getSignalQuality(score?: number) {
  if (typeof score !== 'number') {
    return {
      label: '초기',
      tone: 'border-stone-700/70 bg-stone-900/55 text-stone-300',
    }
  }

  if (score >= 90) {
    return {
      label: '상위 10%',
      tone: 'border-lime-300/35 bg-lime-300/10 text-lime-100',
    }
  }

  if (score >= 70) {
    return {
      label: '핫',
      tone: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100',
    }
  }

  if (score >= 45) {
    return {
      label: '주목',
      tone: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
    }
  }

  return {
    label: '모니터',
    tone: 'border-stone-700/70 bg-stone-900/55 text-stone-300',
  }
}

export function formatWon(amount: number) {
  if (amount <= 0) return '₩0'
  if (amount >= 100000000) {
    const value = amount / 100000000
    return `₩${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}억`
  }
  return `₩${Math.round(amount / 10000).toLocaleString('ko-KR')}만`
}

export function formatCurrency(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '₩0'
  }

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export function formatRate(value: number) {
  return `${value.toFixed(DECIMAL_DIGITS)}%`
}

export function formatDriverValue(value: number, unit: 'currency' | 'percent') {
  return unit === 'percent' ? formatRate(value) : formatCurrency(value)
}

export function percentChange(previousValue: number, currentValue: number) {
  if (previousValue <= 0) {
    return 0
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1))
}

export function isEqualPreset(a: RevenueModelConfig, b: RevenueModelConfig) {
  const bValues = b as Record<keyof RevenueModelConfig, number>
  return Object.entries(a).every(([key, value]) => {
    return value === bValues[key as keyof RevenueModelConfig]
  })
}

export function formatTrendDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
}

export function normalizeAmountInput(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function normalizeScenarioInputValue(value: number) {
  if (!Number.isFinite(value)) return 1
  const clamped = Math.max(MIN_SCENARIO_MULTIPLIER, Math.min(MAX_SCENARIO_MULTIPLIER, value))
  return Math.round(clamped * 100) / 100
}

export function isPercentValue(value: number) {
  return value >= MIN_REVENUE_RATE && value <= MAX_REVENUE_RATE
}

export function formatRelativeTime(value?: string) {
  if (!value) return '아직 없음'
  const then = new Date(value).getTime()
  if (Number.isNaN(then) || then <= 0) return '아직 없음'

  const diff = Date.now() - then
  const minutes = Math.max(0, Math.round(diff / 60000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(
    new Date(value)
  )
}

/** 시즌 챌린지 마감 D-day 라벨. 로컬 달력일 기준으로 계산하며 유효하지 않은 날짜면 null. */
export function formatChallengeDday(endsAt: string) {
  const ends = new Date(endsAt)
  if (Number.isNaN(ends.getTime())) return null

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfEndDay = new Date(ends)
  startOfEndDay.setHours(0, 0, 0, 0)

  // DST로 하루가 23/25시간이어도 자정 정렬 + 반올림이면 달력일 차이가 안전하다.
  const days = Math.round((startOfEndDay.getTime() - startOfToday.getTime()) / 86_400_000)
  if (days > 0) return `마감 D-${days}`
  if (days === 0) return '오늘 마감'
  return '마감됨'
}

export function getValidationTone(validation?: ValidationSnapshot) {
  if (!validation) return 'text-stone-300 bg-stone-900/60 border-stone-700/60'
  if (validation.success) return 'text-lime-200 bg-lime-950/40 border-lime-500/30'
  return 'text-red-200 bg-red-950/40 border-red-500/30'
}

export function formatHealthScore(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))} / 100`
}

export function formatDaysSince(value: number) {
  if (!Number.isFinite(value)) {
    return '자료 없음'
  }

  if (value >= 9999) {
    return '활동 없음'
  }

  return `${Math.max(0, Math.floor(value))}일 전`
}

export function getRecommendationTone(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'border-red-300/35 bg-red-950/30 text-red-100'
  if (priority === 'medium') return 'border-amber-300/35 bg-amber-950/30 text-amber-100'
  return 'border-cyan-300/35 bg-cyan-950/30 text-cyan-100'
}

export function getRecommendationPriorityTone(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'border-red-300/45 bg-red-500/14 text-red-100'
  if (priority === 'medium') return 'border-amber-300/45 bg-amber-500/14 text-amber-100'
  return 'border-cyan-300/45 bg-cyan-500/14 text-cyan-100'
}

export function getRecommendationPriorityLabel(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return '긴급'
  if (priority === 'medium') return '중간'
  return '완화'
}

export function getRecommendationAreaMeta(area: string): {
  icon: LucideIcon
  tone: string
  label: string
} {
  if (area === '수익 모델') {
    return {
      icon: DollarSign,
      tone: 'border-emerald-300/45 bg-emerald-950/30 text-emerald-100',
      label: '수익 가정',
    }
  }

  if (area === '리스크 관리') {
    return {
      icon: ShieldCheck,
      tone: 'border-red-300/45 bg-red-950/30 text-red-100',
      label: '리스크 점검',
    }
  }

  if (area === '퍼널 개선') {
    return {
      icon: Signal,
      tone: 'border-sky-300/45 bg-sky-950/30 text-sky-100',
      label: '퍼널 개선',
    }
  }

  if (area === '활동성') {
    return {
      icon: Activity,
      tone: 'border-lime-300/45 bg-lime-950/30 text-lime-100',
      label: '활동 모니터링',
    }
  }

  if (area === '인프라') {
    return {
      icon: Layers3,
      tone: 'border-indigo-300/45 bg-indigo-950/30 text-indigo-100',
      label: '인프라 점검',
    }
  }

  if (area === '확인 게이트') {
    return {
      icon: TimerReset,
      tone: 'border-violet-300/45 bg-violet-950/30 text-violet-100',
      label: '확인 게이트',
    }
  }

  return {
    icon: Gauge,
    tone: 'border-cyan-300/45 bg-cyan-950/30 text-cyan-100',
    label: area,
  }
}

export const PRIORITY_COPY: Record<'high' | 'medium' | 'low', string> = {
  high: '긴급 대응',
  medium: '우선 조치',
  low: '세밀 보완',
}

export function getRecommendationSummary(recommendations: AdminActionRecommendation[]) {
  return recommendations.reduce(
    (acc, entry) => {
      acc[entry.priority] += 1
      return acc
    },
    { high: 0, medium: 0, low: 0 }
  )
}

const PRIORITY_WEIGHT: Record<AdminActionRecommendation['priority'], number> = {
  high: 2,
  medium: 1,
  low: 0,
}

export function sortAdminRecommendationsByPriority(recommendations: AdminActionRecommendation[]) {
  return [...recommendations].sort((a, b) => {
    if (PRIORITY_WEIGHT[b.priority] !== PRIORITY_WEIGHT[a.priority]) {
      return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
    }
    return a.area.localeCompare(b.area)
  })
}

const DRIVER_ACTION_HINT: Record<string, string> = {
  makerMonthlyFee:
    '창업자 가격 정책은 A/B로 분기화하세요. 기본형/비즈니스형 플랜 혜택을 분리해 2주 단위로 전환률을 추적합니다.',
  investorMonthlyFee:
    '투자자용 플랜은 업셀링 문구(성과 리포트, 우선 지원권)와 함께 노출해 가격 동의 전환 장벽을 낮춥니다.',
  leadCaptureFee:
    '채널별 리드 단가 대비 실제 전환율이 좋은 채널을 선별하고, 저품질 채널은 즉시 배제해 재배치하세요.',
  makerConversionRate:
    '창업자 온보딩 완료율을 올리세요. 라이브 점검 가이드, 체크리스트 자동 알림, 업로드 품질 규정 준수율로 전환을 2주 내 개선합니다.',
  investorConversionRate:
    '투자자 참여 유입 후 24시간 내 첫 팔로업, 사례 기반 제안 메시지, 담당자 연결 예약을 기본 플로우로 넣어 전환을 단축합니다.',
  closeLeadRate:
    '연결 건 단위로 1차 리마인드·성공 KPI 템플릿을 운영해 리드 닫기 절차를 표준화하고 반송률을 줄입니다.',
  successFeeRate:
    '수수료율 인상은 계약 문구 업데이트와 거래 완료 보상 플로우 안정화 후 단계적으로 적용해 이탈 없이 진행하세요.',
}

export function getDriverActionHint(driverKey: string) {
  return (
    DRIVER_ACTION_HINT[driverKey] ??
    '현재 데이터 기반으로 병목 구간을 실험군 단위로 분해해 개선 포인트를 확인하세요.'
  )
}

export function formatPaybackValue(months: number) {
  if (months <= 0 || !Number.isFinite(months)) {
    return '회수 계산 미제공'
  }
  return `${months}개월`
}

export function upsertProject(projects: Project[], nextProject: Project) {
  const exists = projects.some((project) => project.id === nextProject.id)
  if (!exists) return [nextProject, ...projects]
  return projects.map((project) => (project.id === nextProject.id ? nextProject : project))
}

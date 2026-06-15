import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { ProjectSkeleton } from '../../domains/projects/ProjectSkeleton'
import { EmptyState } from '../EmptyState'
import { Metric } from '../Metric'
import { Modal } from '../Modal'
import { OnboardingTip } from '../OnboardingTip'

/**
 * 살아있는 디자인 시스템 가이드(/design). 별도 라우터 없이 main.tsx 에서
 * pathname === '/design' 일 때 App 대신 마운트된다. 이 프로젝트가 실제로 쓰는
 * "메이커 라운지" 토큰(OKLCH 반전 팔레트)과 실제 컴포넌트만 보여준다 —
 * 새 팔레트를 발명하지 않는다. 토큰 값은 getComputedStyle 로 런타임 해석한다.
 */

const NAV_SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'foundations', label: '기초' },
  { id: 'color', label: '색상' },
  { id: 'typography', label: '타이포그래피' },
  { id: 'spacing', label: '간격·반경' },
  { id: 'elevation', label: '입체·모션' },
  { id: 'components', label: '컴포넌트' },
]

/**
 * --color-* 토큰을 CSSOM 에서 한 번 읽어 스와치 옆에 실제 계산값을 표시한다.
 * 토큰은 마운트 이후 정적이라 lazy useState 초기화로 한 번만 해석한다(이펙트 불필요).
 * 클라이언트 전용 라우트라 첫 렌더 시점에 document.documentElement 가 존재한다.
 */
function resolveTokens(varNames: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof window === 'undefined') {
    return out
  }
  const styles = getComputedStyle(document.documentElement)
  for (const name of varNames) {
    out[name] = styles.getPropertyValue(name).trim()
  }
  return out
}

function useResolvedTokens(varNames: readonly string[]): Record<string, string> {
  const [resolved] = useState<Record<string, string>>(() => resolveTokens(varNames))
  return resolved
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="max-w-[68ch]">
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-7 text-stone-300">{description}</p>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function SwatchCard({
  name,
  value,
  textOnSwatch,
}: {
  name: string
  value: string
  textOnSwatch?: 'light' | 'dark'
}) {
  return (
    <div className="protolive-card rounded-xl border border-stone-800 bg-panel p-0">
      <div
        className="grid h-20 place-items-end rounded-t-xl p-2"
        style={{ background: `var(${name})` }}
      >
        {textOnSwatch ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-black"
            style={{
              color: textOnSwatch === 'light' ? 'oklch(98% 0 0)' : 'oklch(24% 0.02 255)',
            }}
          >
            Aa 텍스트
          </span>
        ) : null}
      </div>
      <div className="px-3 py-2.5">
        <p className="font-mono text-xs font-bold text-stone-100">{name}</p>
        <p className="mt-0.5 break-all font-mono text-[11px] text-stone-400">{value || '—'}</p>
      </div>
    </div>
  )
}

const NEUTRAL_RAMP = [
  '--color-base',
  '--color-raised',
  '--color-sunken',
  '--color-stone-900',
  '--color-stone-700',
  '--color-stone-500',
  '--color-stone-300',
  '--color-ink',
] as const

const ACCENTS: ReadonlyArray<{ name: string; role: string; on: 'light' | 'dark' }> = [
  { name: '--color-proof', role: '주색 (proof · sap green)', on: 'light' },
  { name: '--color-signal', role: '보조 (signal · blue)', on: 'light' },
  { name: '--color-deal', role: '거래 (deal · amber)', on: 'dark' },
  { name: '--color-coral', role: '강조 (coral)', on: 'light' },
  { name: '--color-lavender', role: '보조 강조 (lavender)', on: 'light' },
]

const SEMANTIC: ReadonlyArray<{ name: string; role: string }> = [
  { name: '--color-mint', role: '성공 / 검증됨' },
  { name: '--color-deal', role: '주의 / 거래 진행' },
  { name: '--color-coral', role: '위험 / 오류' },
  { name: '--color-signal', role: '정보 / 라이브' },
]

const TYPE_SCALE: ReadonlyArray<{ cls: string; label: string; sample: string }> = [
  {
    cls: 'text-3xl font-black tracking-tight',
    label: 'Display · 3xl / 760',
    sample: '살아있는 프로토타입',
  },
  {
    cls: 'text-2xl font-black tracking-tight',
    label: 'Heading · 2xl / 760',
    sample: '커뮤니티 피드백',
  },
  { cls: 'text-xl font-black', label: 'Title · xl / 760', sample: '오늘의 라이브 빌드' },
  { cls: 'text-base font-black', label: 'Label · base / 620', sample: '응답 시간 · 검증 상태' },
  {
    cls: 'text-sm text-stone-300',
    label: 'Body · sm / 400',
    sample: '거칠어도 괜찮습니다. 진짜 떠 있는 데모면 시작입니다.',
  },
  {
    cls: 'text-[11px] font-black uppercase tracking-[0.14em] text-stone-500',
    label: 'Eyebrow · 11px / 600',
    sample: 'LIVE · 라운지',
  },
]

const SPACING_STEPS: ReadonlyArray<{ label: string; rem: number }> = [
  { label: 'gap-1 · 0.25rem', rem: 0.25 },
  { label: 'gap-2 · 0.5rem', rem: 0.5 },
  { label: 'gap-3 · 0.75rem', rem: 0.75 },
  { label: 'gap-4 · 1rem', rem: 1 },
  { label: 'gap-6 · 1.5rem', rem: 1.5 },
  { label: 'gap-8 · 2rem', rem: 2 },
]

const RADII: ReadonlyArray<{ label: string; cls: string }> = [
  { label: 'rounded-lg · 칩·버튼', cls: 'rounded-lg' },
  { label: 'rounded-xl · 카드·모달', cls: 'rounded-xl' },
  { label: 'rounded-full · 필·뱃지', cls: 'rounded-full' },
]

function StateBadge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}
    >
      {children}
    </span>
  )
}

export function DesignSystemPage() {
  const neutral = useResolvedTokens(NEUTRAL_RAMP)
  const accentVals = useResolvedTokens(ACCENTS.map((a) => a.name))
  const semanticVals = useResolvedTokens(SEMANTIC.map((s) => s.name))
  const [modalOpen, setModalOpen] = useState(false)
  const [motionOn, setMotionOn] = useState(false)

  useEffect(() => {
    document.title = 'ProtoLive · 디자인 시스템'
  }, [])

  return (
    <div className="protolive-shell min-h-screen bg-base text-stone-100">
      <a
        href="#ds-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cyan-300 focus:px-4 focus:py-2 focus:font-bold focus:text-slate-950"
      >
        본문으로 건너뛰기
      </a>

      <header className="protolive-header sticky top-0 z-40 border-b bg-base/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="protolive-logo grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-lime-300 text-slate-950">
              <Zap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="protolive-title text-xl font-black tracking-tight text-stone-50">
                  ProtoLive
                </h1>
                <span className="protolive-badge whitespace-nowrap rounded-full border border-lime-400/30 bg-lime-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
                  Design System
                </span>
              </div>
              <p className="truncate text-xs font-medium text-stone-400">
                실제 토큰과 컴포넌트로 만든 살아있는 스타일 가이드
              </p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-700 px-3 text-sm font-black text-stone-200 transition hover:border-lime-300/50 hover:text-lime-100"
          >
            앱으로 돌아가기
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <nav
          aria-label="디자인 시스템 섹션"
          className="protolive-chip-row mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8"
        >
          {NAV_SECTIONS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-stone-700/80 px-3 py-1.5 text-xs font-black text-stone-300 transition hover:border-lime-300/50 hover:text-lime-100"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main id="ds-main" className="protolive-main mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Intro */}
        <div className="protolive-hero rounded-2xl border border-stone-800 bg-raised p-6 sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">
            메이커 라운지 · OKLCH
          </p>
          <h2 className="mt-2 max-w-[20ch] text-3xl font-black tracking-tight text-stone-50 sm:text-4xl">
            신뢰가 가는 자연광 톤의 라이브 프로덕트 시스템
          </h2>
          <p className="mt-3 max-w-[65ch] text-sm leading-7 text-stone-300">
            리넨 배경 · sap green 주색 · ink-blue 텍스트. Tailwind 의 stone/slate 중립 ramp 를
            반전해 라이트 테마로 통일했고, 모든 표면·강조·시맨틱 색은 OKLCH 토큰 한 벌에서 나옵니다.
            이 페이지의 모든 예시는 실제 프로덕션 컴포넌트와 토큰을 그대로 씁니다.
          </p>
        </div>

        <div className="mt-12 grid gap-16">
          <Section
            id="foundations"
            eyebrow="Foundations"
            title="표면 레이어"
            description="배경은 단일 평면이 아니라 base → raised → sunken 으로 깊이가 나뉩니다. 카드와 패널은 raised, 내부 입력·통계 타일은 sunken 위에 올라갑니다."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {NEUTRAL_RAMP.slice(0, 4).map((name, idx) => (
                <SwatchCard
                  key={name}
                  name={name}
                  value={neutral[name] ?? ''}
                  textOnSwatch={idx >= 3 ? undefined : 'dark'}
                />
              ))}
            </div>
          </Section>

          <Section
            id="color"
            eyebrow="Color"
            title="색상 토큰"
            description="중립 ramp 는 텍스트·테두리·표면을 한 축으로 잇고, 강조색은 주요 액션·선택·라이브 상태에만 쓰입니다. 시맨틱 색은 성공/주의/위험/정보 네 가지로 표준화돼 있습니다."
          >
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              중립 ramp (반전)
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {NEUTRAL_RAMP.map((name, idx) => (
                <SwatchCard
                  key={name}
                  name={name}
                  value={neutral[name] ?? ''}
                  textOnSwatch={idx < 3 ? 'dark' : 'light'}
                />
              ))}
            </div>

            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              강조색
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ACCENTS.map((accent) => (
                <div
                  key={accent.name}
                  className="protolive-card overflow-hidden rounded-xl border border-stone-800 bg-panel"
                >
                  <div
                    className="grid h-16 place-items-center"
                    style={{ background: `var(${accent.name})` }}
                  >
                    <span
                      className="text-xs font-black"
                      style={{
                        color: accent.on === 'light' ? 'oklch(98% 0 0)' : 'oklch(24% 0.02 255)',
                      }}
                    >
                      {accent.role}
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    <p className="font-mono text-xs font-bold text-stone-100">{accent.name}</p>
                    <p className="font-mono text-[11px] text-stone-400">
                      {accentVals[accent.name] ?? '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              시맨틱 상태
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {SEMANTIC.map((item) => (
                <div
                  key={item.name + item.role}
                  className="flex items-center gap-3 rounded-lg border border-stone-800 bg-sunken px-3 py-2"
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full"
                    style={{ background: `var(${item.name})` }}
                  />
                  <div>
                    <p className="text-xs font-black text-stone-100">{item.role}</p>
                    <p className="font-mono text-[11px] text-stone-400">
                      {item.name} · {semanticVals[item.name] ?? '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              상태 칩 (실제 토큰 조합)
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <StateBadge tone="border-lime-300/35 bg-lime-300/10 text-lime-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                검증됨
              </StateBadge>
              <StateBadge tone="border-amber-300/35 bg-amber-300/10 text-amber-100">
                <Briefcase className="h-3.5 w-3.5" />
                연결 진행
              </StateBadge>
              <StateBadge tone="border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                미리보기
              </StateBadge>
              <StateBadge tone="border-violet-300/35 bg-violet-300/10 text-violet-100">
                초기 단계
              </StateBadge>
              <StateBadge tone="border-red-300/30 bg-red-300/10 text-red-100">위험</StateBadge>
            </div>
          </Section>

          <Section
            id="typography"
            eyebrow="Type"
            title="타이포그래피"
            description="단일 가변 폰트(Pretendard Variable)가 본문·라벨·디스플레이를 모두 책임집니다. 통제된 무게 ramp — 본문 400 · 라벨 620 · 디스플레이 760 — 로 위계를 만듭니다."
          >
            <div className="grid gap-3">
              {TYPE_SCALE.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col gap-1.5 rounded-xl border border-stone-800 bg-panel px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className={`min-w-0 truncate text-stone-50 ${row.cls}`}>{row.sample}</span>
                  <span className="shrink-0 font-mono text-[11px] text-stone-400">{row.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-stone-800 bg-panel p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
                본문 측정폭 · 65–75ch
              </p>
              <p className="mt-2 max-w-[68ch] text-sm leading-7 text-stone-300">
                ProtoLive 는 바이브코딩으로 만든 웹앱을 살아있는 채로 공유하는 커뮤니티입니다. 긴
                안내문은 한 줄을 65–75자 안에 묶어 시선이 줄 끝에서 다음 줄 머리로 매끄럽게
                돌아오도록 합니다. 너무 넓은 단은 읽는 속도를 떨어뜨리고, 너무 좁은 단은 리듬을
                끊습니다. 이 문단은 그 사이를 지키는 기준 샘플입니다.
              </p>
            </div>
          </Section>

          <Section
            id="spacing"
            eyebrow="Spacing & Radius"
            title="간격과 반경"
            description="간격은 0.25rem 배수의 Tailwind 스케일을 따릅니다. 반경은 칩·버튼(lg), 카드·모달(xl), 필·뱃지(full) 세 단으로 고정해 형태 어휘를 일관되게 유지합니다."
          >
            <div className="grid gap-3">
              {SPACING_STEPS.map((step) => (
                <div key={step.label} className="flex items-center gap-4">
                  <span className="w-32 shrink-0 font-mono text-[11px] text-stone-400">
                    {step.label}
                  </span>
                  <span
                    className="h-3 rounded-full bg-lime-300"
                    style={{ width: `${step.rem * 4}rem` }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              {RADII.map((radius) => (
                <div key={radius.label} className="flex flex-col items-center gap-2">
                  <span
                    className={`grid h-20 w-20 place-items-center border border-stone-700 bg-sunken ${radius.cls}`}
                  >
                    <span className="font-mono text-[10px] text-stone-400">{radius.cls}</span>
                  </span>
                  <span className="text-[11px] font-black text-stone-300">{radius.label}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="elevation"
            eyebrow="Elevation & Motion"
            title="입체감과 모션"
            description="그림자는 색이 아니라 ink 의 투명도 혼합으로 만들어 라이트 톤을 더럽히지 않습니다. 모션은 ease-out-expo 곡선에 150–250ms, 항상 prefers-reduced-motion 으로 중화됩니다."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-800 bg-panel p-5 shadow-[0_1px_2px_color-mix(in_oklch,var(--color-ink)_6%,transparent)]">
                <p className="text-sm font-black text-stone-50">기본 카드</p>
                <p className="mt-1 text-xs text-stone-400">정적 표면 · 1px 그림자</p>
              </div>
              <div className="protolive-card rounded-xl border border-stone-800 bg-panel p-5">
                <p className="text-sm font-black text-stone-50">호버 카드</p>
                <p className="mt-1 text-xs text-stone-400">마우스를 올리면 떠오릅니다</p>
              </div>
              <div className="protolive-modal rounded-xl p-5">
                <p className="text-sm font-black text-stone-50">모달 입체</p>
                <p className="mt-1 text-xs text-stone-400">최상위 레이어 · 깊은 그림자</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-stone-800 bg-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-stone-50">전환 데모</p>
                  <p className="mt-1 text-xs text-stone-400">
                    ease-out-expo · 220ms — 시스템에서 모션을 줄이면 즉시 멈춥니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMotionOn((on) => !on)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  {motionOn ? '되돌리기' : '이동'}
                </button>
              </div>
              <div className="mt-4 h-12 rounded-lg bg-sunken p-1.5">
                <span
                  className="grid h-9 w-9 place-items-center rounded-md bg-cyan-300 text-slate-950 motion-safe:transition-transform motion-safe:duration-[400ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ transform: motionOn ? 'translateX(calc(100% * 8))' : 'translateX(0)' }}
                >
                  <Zap className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Section>

          <Section
            id="components"
            eyebrow="Components"
            title="컴포넌트 갤러리"
            description="아래는 데모용 복제가 아니라 apps/web/src 의 실제 컴포넌트입니다. 상태 캡션과 함께 기본·포커스·오류·비활성·로딩·빈 상태를 보여줍니다."
          >
            {/* Buttons */}
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-stone-400">버튼</h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
              >
                <Plus className="h-4 w-4" />
                주요 액션
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                보조 액션
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-700 px-4 text-sm font-black text-stone-200 transition hover:border-stone-500"
              >
                외곽선
              </button>
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-stone-700 px-4 text-sm font-black text-stone-400"
              >
                비활성
              </button>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Tab 으로 포커스하면 sap green 포커스 링이 나타납니다 (focus-visible).
            </p>

            {/* Fields */}
            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              입력 필드
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black text-stone-200">기본</span>
                <input
                  type="text"
                  placeholder="예: 내 라이브 데모 URL"
                  className="mt-1.5 w-full rounded-lg border border-stone-700 bg-sunken px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <span className="mt-1 block text-[11px] text-stone-400">기본 / 포커스 상태</span>
              </label>
              <label className="block">
                <span className="text-xs font-black text-stone-200">오류</span>
                <input
                  type="text"
                  defaultValue="잘못된 입력"
                  aria-invalid="true"
                  className="mt-1.5 w-full rounded-lg border border-red-300/60 bg-red-300/10 px-3 py-2.5 text-sm text-stone-100"
                />
                <span className="mt-1 block text-[11px] text-red-100">
                  필수 항목을 확인해주세요.
                </span>
              </label>
              <label className="block">
                <span className="text-xs font-black text-stone-200">비활성</span>
                <input
                  type="text"
                  disabled
                  placeholder="편집할 수 없습니다"
                  className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-500"
                />
                <span className="mt-1 block text-[11px] text-stone-400">disabled</span>
              </label>
              <label className="block">
                <span className="text-xs font-black text-stone-200">긴 텍스트</span>
                <textarea
                  rows={2}
                  placeholder="피드백을 남겨주세요…"
                  className="mt-1.5 w-full resize-none rounded-lg border border-stone-700 bg-sunken px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <span className="mt-1 block text-[11px] text-stone-400">textarea</span>
              </label>
            </div>

            {/* Metric (real component) */}
            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              지표 타일 · <span className="font-mono normal-case">Metric</span>
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric icon={ShieldCheck} label="검증된 빌드" value="42개" />
              <Metric icon={Users} label="활성 메이커" value="318명" />
              <Metric icon={Mail} label="평균 응답" value="2.4시간" />
            </div>

            {/* OnboardingTip (real component) */}
            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              온보딩 안내 · <span className="font-mono normal-case">OnboardingTip</span>
            </h3>
            <div className="mt-3">
              <OnboardingTip onOpenAbout={() => undefined} onCreate={() => undefined} />
              <p className="mt-2 text-xs text-stone-400">
                닫으면 localStorage 에 기억돼 다시 보이지 않습니다(1회성 보조 안내).
              </p>
            </div>

            {/* Modal (real component) */}
            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              모달 · <span className="font-mono normal-case">Modal</span> (Radix Dialog)
            </h3>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                모달 열기
              </button>
              <p className="mt-2 text-xs text-stone-400">
                포털로 렌더 · 백드롭 클릭/Esc 로 닫힘 · 포커스 트랩 내장.
              </p>
              {modalOpen ? (
                <Modal
                  title="살아있는 모달"
                  subtitle="실제 Modal 컴포넌트입니다 — 포커스 트랩과 스크롤 잠금이 그대로 동작합니다."
                  onClose={() => setModalOpen(false)}
                >
                  <p className="text-sm leading-7 text-stone-300">
                    이 다이얼로그는 등록·리뷰·미리보기 모달이 공유하는 골격입니다. 제목·부제·닫기
                    버튼·백드롭 흐림이 한 곳에서 표준화돼 있습니다.
                  </p>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="inline-flex min-h-10 items-center rounded-lg border border-stone-700 px-4 text-sm font-black text-stone-200 transition hover:border-stone-500"
                    >
                      닫기
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="inline-flex min-h-10 items-center rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
                    >
                      확인
                    </button>
                  </div>
                </Modal>
              ) : null}
            </div>

            {/* Skeleton (real component) */}
            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              로딩 스켈레톤 · <span className="font-mono normal-case">ProjectSkeleton</span>
            </h3>
            <div className="mt-3">
              <ProjectSkeleton />
            </div>

            {/* EmptyState (real component) */}
            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-stone-400">
              빈 상태 · <span className="font-mono normal-case">EmptyState</span>
            </h3>
            <div className="mt-3">
              <EmptyState
                apiOnline
                onCreate={() => undefined}
                onResetFilters={() => undefined}
                hasActiveFilters={false}
              />
              <p className="mt-2 text-xs text-stone-400">
                빈 상태는 막다른 길이 아니라 다음 행동(첫 빌드 공유)을 가르칩니다.
              </p>
            </div>
          </Section>
        </div>
      </main>

      <footer className="protolive-footer border-t border-stone-800/70 bg-stone-950 px-4 py-5 text-xs text-stone-300 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 text-center sm:justify-between">
          <span>ProtoLive 디자인 시스템 · 실제 토큰·컴포넌트 기준</span>
          <a href="/" className="font-black text-lime-100 hover:text-lime-200">
            앱으로 돌아가기 →
          </a>
        </div>
      </footer>
    </div>
  )
}

export default DesignSystemPage

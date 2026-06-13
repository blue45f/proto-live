import { ArrowRight, MessageSquare, ShieldCheck, Sparkles, TrendingUp, Zap } from 'lucide-react'

import { BUILD_TOOLS, maturityCopy } from '../../lib/constants'

import type { ProjectMaturity } from '../../api'

const LADDER_STEPS = [
  {
    icon: ShieldCheck,
    title: '공유',
    lead: '라이브 검증을 통과한 빌드만',
    body: '제출하면 서버가 실제로 열리는 사이트인지 확인합니다. 거칠어도 좋습니다. 진짜 떠 있기만 하면 됩니다.',
  },
  {
    icon: MessageSquare,
    title: '피드백',
    lead: '단계에 맞는 솔직한 리뷰',
    body: '리뷰·아이디어·응원과 업보트가 쌓입니다. 초기 빌드에는 완성도가 아니라 방향과 가능성을 봐줍니다.',
  },
  {
    icon: TrendingUp,
    title: '투자 연결',
    lead: '검증된 상위 빌드는 사다리 위로',
    body: '커뮤니티에서 신호가 쌓인 빌드는 투자자에게 연결됩니다. 자금 권유가 아니라 관심 의향을 먼저 확인합니다.',
  },
]

const MATURITY_ORDER: ProjectMaturity[] = ['early', 'building', 'live']

export function AboutView({ onCreate, onBrowse }: { onCreate: () => void; onBrowse: () => void }) {
  return (
    <div className="space-y-14 pb-6">
      {/* 히어로 */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-800 bg-stone-950/55 px-6 py-12 sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-lime-300/15 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-lime-200">
            <Sparkles className="h-3.5 w-3.5" />
            메이커 라운지 · 바이브코딩 커뮤니티
          </p>
          <h2 className="mt-5 text-4xl font-black leading-[1.12] tracking-tight text-stone-50 sm:text-5xl">
            바이브코딩으로 만든 웹앱,
            <br />
            <span className="text-lime-300">살아있는 채로</span> 공유하세요
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-300 sm:text-lg">
            AI로 만든 데모·프로토타입·갓 시작한 초기 빌드를 그대로 올리고, 커뮤니티 피드백을 받는
            곳입니다. 완성을 기다릴 필요 없이, 진짜 떠 있는 순간부터 함께 다듬습니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCreate}
              className="protolive-btn protolive-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px"
            >
              내 사이트 등록하기
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onBrowse}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-700 px-5 text-sm font-black text-stone-200 transition hover:border-lime-300/50 hover:text-lime-100"
            >
              피드 둘러보기
            </button>
          </div>
        </div>
      </section>

      {/* 사다리: 공유 → 피드백 → 투자 연결 */}
      <section>
        <div className="max-w-2xl">
          <h3 className="text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
            커뮤니티가 먼저, 투자는 사다리 위에
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-400 sm:text-base">
            세 단계는 별도 모드가 아니라 하나의 흐름입니다. 무료로 공유하고 피드백을 쌓다 보면,
            검증된 빌드가 자연스럽게 위로 올라갑니다.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {LADDER_STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="relative flex flex-col gap-3 rounded-2xl border border-stone-800 bg-stone-950/45 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-lime-300/30 bg-lime-300/10 text-lime-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-3xl font-black tabular-nums text-stone-700">
                    0{index + 1}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-black text-stone-50">{step.title}</p>
                  <p className="mt-0.5 text-xs font-bold text-lime-200">{step.lead}</p>
                </div>
                <p className="text-sm leading-relaxed text-stone-400">{step.body}</p>
              </li>
            )
          })}
        </ol>
      </section>

      {/* 어느 단계든 환영 */}
      <section>
        <div className="max-w-2xl">
          <h3 className="text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
            어느 단계든 환영합니다
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-400 sm:text-base">
            성숙도를 솔직하게 밝히면, 거기에 맞는 기대치로 리뷰를 받습니다. 초기 빌드의 별점은
            가립니다. 방향이 먼저니까요.
          </p>
        </div>
        <div className="mt-8 space-y-3">
          {MATURITY_ORDER.map((maturity) => {
            const copy = maturityCopy[maturity]
            return (
              <div
                key={maturity}
                className="flex flex-col gap-2 rounded-2xl border border-stone-800 bg-stone-950/45 p-5 sm:flex-row sm:items-center sm:gap-5"
              >
                <span
                  className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1 text-xs font-black ${copy.tone}`}
                >
                  {copy.label}
                </span>
                <p className="text-sm leading-relaxed text-stone-300">{copy.helper}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 바이브코딩 네이티브 */}
      <section className="rounded-3xl border border-stone-800 bg-stone-950/55 px-6 py-10 sm:px-10">
        <div className="max-w-2xl">
          <h3 className="text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
            바이브코딩 네이티브
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-400 sm:text-base">
            어떤 도구로 만들었는지 직접 밝혀 보세요. 메이커가 신고하는 self-declared 라벨로, 같은
            도구를 쓰는 동료를 만나고 필터링할 수 있습니다.
          </p>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2">
          {BUILD_TOOLS.map((tool) => (
            <li
              key={tool.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950/45 px-3 py-1.5 text-sm font-bold text-stone-300"
            >
              <Zap className="h-3.5 w-3.5 text-lime-200" />
              {tool.label}
            </li>
          ))}
        </ul>
      </section>

      {/* 마무리 CTA */}
      <section className="flex flex-col items-start gap-4 rounded-3xl border border-lime-300/25 bg-lime-300/[0.06] px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <p className="text-xl font-black tracking-tight text-stone-50 sm:text-2xl">
            지금 만든 그 사이트, 여기 올려 보세요
          </p>
          <p className="mt-2 text-sm text-stone-400">거칠어도 괜찮습니다. 진짜 떠 있기만 하면.</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="protolive-btn protolive-btn-primary inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px"
        >
          내 사이트 등록하기
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  )
}

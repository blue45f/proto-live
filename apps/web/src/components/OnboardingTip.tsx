import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

const DISMISS_KEY = 'protolive:onboarding-tip:v1'

function readDismissed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * 첫 방문 온보딩 팁. 거칠어도 환영한다는 톤으로 작동 방식(소개)·등록으로 안내하고,
 * 닫으면 localStorage에 기억해 다시 보이지 않는다. 히어로와 달리 1회성·해제형 보조 안내.
 */
export function OnboardingTip({
  onOpenAbout,
  onCreate,
}: {
  onOpenAbout: () => void
  onCreate: () => void
}) {
  const [dismissed, setDismissed] = useState(readDismissed)

  if (dismissed) {
    return null
  }

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* localStorage 비가용 환경은 무시 */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-lime-300/25 bg-lime-300/[0.06] px-4 py-3 text-sm">
      <span className="inline-flex items-center gap-1.5 font-black text-stone-100">
        <Sparkles className="h-4 w-4 text-lime-200" />
        처음이세요?
      </span>
      <span className="min-w-0 flex-1 text-stone-300">
        거칠어도 괜찮아요. 진짜 떠 있는 빌드면 공유 → 피드백 → 투자 연결로 이어집니다.
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenAbout}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-700 px-3 py-1.5 text-xs font-black text-stone-200 transition hover:border-lime-300/50 hover:text-lime-100"
        >
          작동 방식
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-lg bg-lime-300 px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-lime-200"
        >
          내 사이트 등록
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="온보딩 안내 닫기"
          className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-800/60 hover:text-stone-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

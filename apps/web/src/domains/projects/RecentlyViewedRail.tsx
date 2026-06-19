import { Clock3, X } from 'lucide-react'

import { useRecentlyViewedStore } from './recentlyViewedStore'

/**
 * "최근 본 사이트" 사이드바 레일. 상세를 열어본 프로젝트를 최신순으로 보여줘
 * 투자자가 직전에 살펴본 항목으로 빠르게 되돌아갈 수 있게 한다. 이력이 없으면
 * 아무것도 렌더하지 않아 사이드바를 깔끔하게 유지한다(빈 상태 카드 없음).
 */
export function RecentlyViewedRail({
  onOpenProject,
}: {
  onOpenProject: (projectId: number) => void
}) {
  const recentlyViewed = useRecentlyViewedStore((state) => state.recentlyViewed)
  const removeView = useRecentlyViewedStore((state) => state.removeView)
  const clearRecentlyViewed = useRecentlyViewedStore((state) => state.clearRecentlyViewed)

  if (recentlyViewed.length === 0) {
    return null
  }

  return (
    <section
      aria-label="최근 본 사이트"
      className="rounded-xl border border-stone-800 bg-stone-950/65 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-cyan-200" />
          <h3 className="font-black text-stone-100">최근 본 사이트</h3>
        </div>
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="rounded-lg border border-stone-700 px-2 py-1 text-[11px] font-black text-stone-400 transition hover:border-stone-500 hover:text-stone-200"
        >
          전체 지우기
        </button>
      </div>
      <ul className="space-y-1.5">
        {recentlyViewed.map((entry) => (
          <li key={entry.id} className="group flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenProject(entry.id)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-stone-700 hover:bg-stone-900/70"
            >
              <span className="truncate text-sm font-bold text-stone-200">{entry.title}</span>
              <span className="ml-auto shrink-0 rounded-full border border-stone-700 bg-stone-900/70 px-2 py-0.5 text-[10px] font-black text-stone-400">
                {entry.category}
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeView(entry.id)}
              aria-label={entry.title + ' 최근 본 목록에서 제거'}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-transparent text-stone-500 transition hover:border-stone-700 hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

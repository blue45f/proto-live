/**
 * 라우트 청크를 불러오는 동안 본문 자리에 띄우는 Suspense 폴백.
 * 메인 2열 그리드(lg) 전체 폭을 차지해 어떤 화면이 오든 레이아웃이 흔들리지 않는다.
 */
export function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="화면 불러오는 중"
      className="animate-pulse grid content-start gap-4 lg:col-span-2"
    >
      <div className="h-8 w-48 rounded bg-stone-800" />
      <div className="rounded-xl border border-stone-800 bg-raised p-4">
        <div className="h-5 w-2/3 rounded bg-stone-800" />
        <div className="mt-3 h-4 w-full rounded bg-stone-800" />
        <div className="mt-2 h-4 w-5/6 rounded bg-stone-800" />
        <div className="mt-2 h-4 w-1/2 rounded bg-stone-800" />
      </div>
      <span className="sr-only">화면을 불러오는 중입니다</span>
    </div>
  )
}

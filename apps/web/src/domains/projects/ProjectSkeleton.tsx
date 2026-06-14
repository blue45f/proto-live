export function ProjectSkeleton() {
  return (
    <div role="status" aria-label="사이트 목록 불러오는 중" className="animate-pulse grid gap-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-stone-800 bg-raised p-3">
          <div className="grid gap-3 sm:grid-cols-[148px_minmax(0,1fr)_auto] sm:items-center">
            <div className="aspect-[16/10] w-full rounded-xl bg-stone-800" />
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="h-6 w-14 rounded-full bg-stone-800" />
                <div className="h-6 w-20 rounded-full bg-stone-800" />
                <div className="h-6 w-16 rounded-full bg-stone-800" />
              </div>
              <div className="h-6 w-64 max-w-full rounded bg-stone-800" />
              <div className="mt-2 h-4 w-full rounded bg-stone-800" />
              <div className="mt-2 h-4 w-2/3 rounded bg-stone-800" />
            </div>
            <div className="grid gap-2 sm:min-w-[132px]">
              <div className="h-11 rounded-lg bg-stone-800" />
              <div className="h-10 rounded-lg bg-stone-800" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">사이트 목록을 불러오는 중입니다</span>
    </div>
  )
}

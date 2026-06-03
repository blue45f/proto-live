export function ProjectSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-stone-800 bg-[oklch(18%_0.018_205)] p-4"
        >
          <div className="h-4 w-32 rounded bg-stone-800" />
          <div className="mt-4 h-6 w-64 max-w-full rounded bg-stone-800" />
          <div className="mt-3 h-4 w-full rounded bg-stone-800" />
          <div className="mt-2 h-4 w-2/3 rounded bg-stone-800" />
        </div>
      ))}
    </div>
  )
}

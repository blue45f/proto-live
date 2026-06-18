import { Plus, ShieldCheck, X } from 'lucide-react'

type ActiveFilter = { id: string; label: string; onClear: () => void }

export function EmptyState({
  apiOnline,
  onCreate,
  onResetFilters,
  hasActiveFilters,
  activeFilters = [],
}: {
  apiOnline: boolean
  onCreate: () => void
  onResetFilters: () => void
  hasActiveFilters: boolean
  activeFilters?: ActiveFilter[]
}) {
  return (
    <div className="protolive-empty rounded-xl border border-dashed border-stone-700 p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-lime-300 text-slate-950">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-xl font-black text-stone-50">
        {hasActiveFilters ? '조건에 맞는 빌드가 없어요.' : '아직 공유된 빌드가 없어요.'}
      </h3>
      {hasActiveFilters ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
          현재 필터로는 보여줄 빌드가 없습니다. 아래 조건을 하나씩 풀거나 필터를 초기화하면 더 많은
          빌드를 만날 수 있습니다.
        </p>
      ) : (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
          바이브코딩으로 만든 첫 빌드를 공유해 보세요. 거칠어도 괜찮습니다. 진짜 떠 있는 데모면
          커뮤니티 피드백부터 시작됩니다. 라이브 검증을 통과한 빌드만 노출됩니다.
        </p>
      )}
      {hasActiveFilters && activeFilters.length > 0 && (
        <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={filter.onClear}
              className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/20"
            >
              <span>{filter.label}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onCreate}
        disabled={!apiOnline}
        className="protolive-btn protolive-btn-primary mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
      >
        <Plus className="h-4 w-4" />첫 빌드 공유하기
      </button>
      {!apiOnline && (
        <p className="mx-auto mt-3 max-w-xs text-xs leading-5 text-amber-100">
          서버에 연결되지 않아 지금은 등록할 수 없어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-700 px-4 text-sm font-black text-stone-300 transition hover:border-stone-500"
        >
          <X className="h-4 w-4" />
          필터 초기화
        </button>
      )}
    </div>
  )
}

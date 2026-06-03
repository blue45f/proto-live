import { Plus, ShieldCheck, X } from 'lucide-react'

export function EmptyState({
  apiOnline,
  onCreate,
  onResetFilters,
  hasActiveFilters,
}: {
  apiOnline: boolean
  onCreate: () => void
  onResetFilters: () => void
  hasActiveFilters: boolean
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-700 bg-stone-950/50 p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-lime-300 text-slate-950">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-xl font-black text-stone-50">
        아직 확인된 라이브 사이트가 없습니다.
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
        샘플 데이터를 보여주지 않습니다. 백엔드 API에 실제 제출된 사이트만 노출해 투자자가 가짜
        신호와 실제 신호를 혼동하지 않도록 했습니다.
      </p>
      {hasActiveFilters ? (
        <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-stone-500">
          현재 조건으로 조회 가능한 항목이 없습니다. 조건을 넓히거나 필터를 초기화하면 더 많은
          사이트를 확인할 수 있습니다.
        </p>
      ) : (
        <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-stone-500">
          API 연결이 정상인 상태에서 등록된 사이트가 있으면 실시간 확인 대시보드에서 즉시 확인할 수
          있습니다.
        </p>
      )}
      <button
        type="button"
        onClick={onCreate}
        disabled={!apiOnline}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
      >
        <Plus className="h-4 w-4" />첫 사이트 확인 등록
      </button>
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

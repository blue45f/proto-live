import type { LucideIcon } from 'lucide-react'

export function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="protolive-mini-tile rounded-lg border border-stone-800 bg-raised p-3">
      <Icon className="mb-2 h-4 w-4 text-lime-200" />
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-1 break-words text-base font-black text-stone-50 sm:text-lg">{value}</p>
    </div>
  )
}

import { Layers3 } from 'lucide-react'
import { differentiationRows } from '../lib/constants'

export function DifferentiationPanel() {
  return (
    <section className="protolive-panel rounded-xl border border-stone-800 bg-stone-950/65 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-amber-200" />
        <h3 className="font-black text-stone-100">왜 다른가요?</h3>
      </div>
      <div className="space-y-2">
        {differentiationRows.map((row) => (
          <div
            key={row.label}
            className="protolive-reco-item rounded-lg border border-stone-800 bg-sunken p-3"
          >
            <p className="text-xs font-black text-cyan-100">{row.label}</p>
            <p className="mt-2 text-xs leading-5 text-stone-500">일반: {row.usual}</p>
            <p className="mt-1 text-xs leading-5 text-stone-200">ProtoLive: {row.protolive}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

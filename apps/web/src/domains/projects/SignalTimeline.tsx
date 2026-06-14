import { Loader2, Signal } from 'lucide-react'

import { eventCopy } from '../../lib/constants'
import { formatRelativeTime } from '../../lib/format'

import type { ProjectEvent, ProjectEventType } from '../../infrastructure/api'

export function SignalTimeline({
  events,
  isLoading,
  className = 'xl:flex xl:flex-col',
  title = 'Activity Timeline',
  titleId,
}: {
  events: ProjectEvent[]
  isLoading: boolean
  className?: string
  title?: string
  titleId?: string
}) {
  const totals = events.reduce<Record<ProjectEventType, number>>(
    (counts, event) => {
      counts[event.type] += 1
      return counts
    },
    { create: 0, preview: 0, outbound: 0, match: 0, refresh: 0 }
  )
  const totalEvents = events.length

  return (
    <aside id={titleId} className={`${className} min-h-0 border-l border-stone-800 bg-sunken`}>
      <div className="border-b border-stone-800 p-4">
        <div className="flex items-center gap-2">
          <span className="protolive-signal-live" aria-hidden="true">
            <Signal className="h-4 w-4 text-lime-200" />
          </span>
          <h3 className="font-black text-stone-100">{title}</h3>
          {totalEvents > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-lime-200">
              <span
                className="protolive-signal-pulse inline-block h-1.5 w-1.5 rounded-full bg-lime-300"
                aria-hidden="true"
              />
              live
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['preview', 'outbound', 'match'] as ProjectEventType[]).map((type) => {
            const meta = eventCopy[type]
            return (
              <div key={type} className={`rounded-lg border p-2 ${meta.tone}`}>
                <p className="protolive-signal-total text-base font-black tabular-nums">
                  {totals[type]}
                </p>
                <p className="mt-0.5 text-[11px] font-bold opacity-75">{meta.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center text-sm text-stone-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            신호 로딩
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 p-4 text-sm leading-6 text-stone-400">
            아직 이 사이트에 기록된 활동이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 20).map((event, index) => {
              const meta = eventCopy[event.type]
              const Icon = meta.icon
              const isNewest = index === 0
              return (
                <div
                  key={event.id}
                  className={`protolive-signal-row rounded-lg border border-stone-800 bg-stone-950/55 p-3${
                    isNewest ? ' protolive-signal-row--fresh' : ''
                  }`}
                  style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-black ${meta.tone}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                    <span className="text-xs text-stone-500">
                      {formatRelativeTime(event.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
            {events.length > 20 && (
              <p className="pt-1 text-center text-xs text-stone-500">
                최근 20건만 표시됩니다 · 총 {totalEvents}건
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

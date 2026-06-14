import * as Dialog from '@radix-ui/react-dialog'
import {
  Briefcase,
  Gauge,
  Globe2,
  Layers3,
  Loader2,
  Radar,
  RefreshCw,
  ShieldCheck,
  Signal,
  Sparkles,
  TimerReset,
  X,
} from 'lucide-react'

import { eventCopy } from '../../lib/constants'
import {
  formatRelativeTime,
  formatWon,
  getResponseTimeTone,
  getSignalQuality,
  getValidationTone,
} from '../../lib/format'

import type { Project, ProjectEvent, ProjectEventType } from '../../infrastructure/api'

export function ProjectDiligencePanel({
  project,
  events,
  isLoadingEvents,
  signalRank,
  onClose,
  onPreview,
  onMatch,
  onRefresh,
  canRefresh,
}: {
  project: Project
  events: ProjectEvent[]
  isLoadingEvents: boolean
  signalRank: number | null
  onClose: () => void
  onPreview: () => void
  onMatch: () => void
  onRefresh: () => void
  canRefresh: boolean
}) {
  const isProtected = project.accessMode === 'screened'
  const responseTone = getResponseTimeTone(project.validation.responseTimeMs)
  const signalQuality = getSignalQuality(project.signalScore)
  const summaryCounts = project.eventSummary?.counts ?? {
    create: 0,
    preview: 0,
    outbound: 0,
    match: 0,
    refresh: 0,
  }
  const eventCounts =
    events.length > 0
      ? events.reduce<Record<ProjectEventType, number>>(
          (counts, event) => {
            counts[event.type] += 1
            return counts
          },
          { create: 0, preview: 0, outbound: 0, match: 0, refresh: 0 }
        )
      : summaryCounts
  const totalEvents = events.length > 0 ? events.length : (project.eventSummary?.total ?? 0)
  const latestEventAt = events[0]?.createdAt ?? project.eventSummary?.latestAt ?? null
  const highestIntent = formatWon(project.committedAmountMax)
  const committedRange =
    project.committedAmountMax > 0
      ? `${formatWon(project.committedAmountMin)} ~ ${formatWon(project.committedAmountMax)}`
      : '아직 구조화된 의향 없음'
  const exposureLabel = isProtected ? '요청 후 공개, URL 마스킹' : '바로 보기 가능, 새 탭 열람 가능'
  const proofRows = [
    {
      icon: Globe2,
      label: '라이브 링크 확인',
      value: project.validation.success ? `HTTP ${project.validation.status ?? 'OK'}` : '확인 필요',
      detail: isProtected
        ? '공개 목록에서는 원본 URL을 숨기고 접근 요청으로 전환합니다.'
        : (project.validation.finalUrl ?? project.liveUrl),
    },
    {
      icon: TimerReset,
      label: '응답 속도',
      value: project.validation.responseTimeMs
        ? `${project.validation.responseTimeMs}ms`
        : responseTone.label,
      detail: `최근 확인 ${formatRelativeTime(project.validation.checkedAt)}`,
    },
    {
      icon: ShieldCheck,
      label: '공개 방식',
      value: exposureLabel,
      detail: isProtected
        ? '투자자는 의향 메시지를 남긴 뒤 상세 접근을 요청합니다.'
        : '미리보기와 새 탭 행동이 실시간 관심 활동로 기록됩니다.',
    },
    {
      icon: Signal,
      label: '연결 순위',
      value:
        signalRank === null
          ? `${project.signalScore ?? 0}점`
          : `#${signalRank} · ${project.signalScore ?? 0}점`,
      detail: `${signalQuality.label} 상태, 최근 활동 ${formatRelativeTime(latestEventAt ?? undefined)}`,
    },
  ]
  const decisionNotes = [
    project.validation.success
      ? '확인 통과: 투자자가 작동 여부보다 제품 흐름과 시장 반응을 바로 검토할 수 있습니다.'
      : '확인 보류: URL 응답 또는 보안 정책을 먼저 확인해야 합니다.',
    isProtected
      ? '보호 흐름: 원본 URL은 숨기고 연결 요청 메시지로 접근 맥락을 기록해 연결 신뢰도를 높입니다.'
      : '공개 흐름: 미리보기와 새 탭 열람을 바로 허용하고 행동 데이터를 관심 활동로 누적합니다.',
    project.matchCount > 0
      ? `투자 관심: ${project.matchCount}건, 최대 ${highestIntent}까지 구조화된 관심이 잡혔습니다.`
      : '투자 관심: 아직 기록된 연결이 없어 첫 제안 메시지 유도가 우선입니다.',
    totalEvents > 0
      ? `행동 신호: 총 ${totalEvents}건, 미리보기 ${eventCounts.preview}건, 연결 ${eventCounts.match}건입니다.`
      : '행동 신호: 아직 활동이 없어 첫 미리보기와 외부 열람을 만드는 운영 액션이 필요합니다.',
  ]

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
          <Dialog.Content className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-stone-700 bg-sunken shadow-2xl lg:w-[760px] motion-safe:animate-panel-slide-in">
            <div className="border-b border-stone-800 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                    <Radar className="h-3.5 w-3.5" />
                    투자 연결 리뷰 리포트
                  </p>
                  <Dialog.Title className="truncate text-xl font-black text-stone-50">
                    {project.title}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm leading-6 text-stone-400">
                    작동 증거, 보호 상태, 행동 신호, 투자 관심을 한 화면에서 검토합니다.
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:border-red-300/40 hover:text-red-100"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-stone-700 px-2 py-1 text-[11px] font-black text-stone-300">
                  <Layers3 className="h-3.5 w-3.5 text-cyan-200" />
                  {project.category}
                </span>
                <span
                  className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black ${getValidationTone(project.validation)}`}
                >
                  {project.validation.success ? '확인 통과' : '확인 확인 필요'}
                </span>
                <span
                  className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black ${signalQuality.tone}`}
                >
                  {signalQuality.label}
                </span>
                <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] font-black text-amber-100">
                  {committedRange}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-4">
                  <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-lime-200" />
                      <h3 className="font-black text-stone-100">Proof Ledger</h3>
                    </div>
                    <div className="grid gap-2">
                      {proofRows.map((row) => {
                        const Icon = row.icon
                        return (
                          <div
                            key={row.label}
                            className="grid gap-3 rounded-lg border border-stone-800 bg-sunken p-3 sm:grid-cols-[150px_minmax(0,1fr)]"
                          >
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                              <Icon className="h-3.5 w-3.5 text-cyan-200" />
                              {row.label}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-stone-100">{row.value}</p>
                              <p className="mt-1 overflow-wrap-anywhere text-xs leading-5 text-stone-400">
                                {row.detail}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-amber-200" />
                      <h3 className="font-black text-stone-100">투자 판단 메모</h3>
                    </div>
                    <div className="space-y-2">
                      {decisionNotes.map((note) => (
                        <p
                          key={note}
                          className="rounded-lg border border-stone-800 bg-sunken p-3 text-sm leading-6 text-stone-300"
                        >
                          {note}
                        </p>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Signal className="h-4 w-4 text-cyan-200" />
                      <h3 className="font-black text-stone-100">Event Mix</h3>
                    </div>
                    {isLoadingEvents ? (
                      <p className="inline-flex items-center gap-2 text-sm text-stone-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        신호 로딩
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(['preview', 'outbound', 'match', 'refresh'] as ProjectEventType[]).map(
                          (type) => {
                            const meta = eventCopy[type]
                            const Icon = meta.icon
                            return (
                              <div
                                key={type}
                                className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-sunken p-2 text-xs"
                              >
                                <span className="inline-flex items-center gap-2 font-black text-stone-300">
                                  <Icon className="h-3.5 w-3.5 text-cyan-200" />
                                  {meta.label}
                                </span>
                                <span className="font-black text-stone-50">
                                  {eventCounts[type]}
                                </span>
                              </div>
                            )
                          }
                        )}
                      </div>
                    )}
                  </section>

                  <section className="rounded-xl border border-stone-800 bg-stone-950/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-lime-200" />
                      <h3 className="font-black text-stone-100">Next Action</h3>
                    </div>
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={onMatch}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-lime-300 px-3 text-xs font-black text-slate-950"
                      >
                        <Briefcase className="h-4 w-4" />
                        투자 관심 기록
                      </button>
                      <button
                        type="button"
                        onClick={onPreview}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-300/35 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/10"
                      >
                        {isProtected ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {isProtected ? '리뷰 요청' : '사이트 보기'}
                      </button>
                      <button
                        type="button"
                        onClick={onRefresh}
                        disabled={!canRefresh}
                        title={
                          canRefresh ? '상태 재확인' : '운영자 또는 등록한 창업자만 재확인 가능'
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        상태 재확인
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

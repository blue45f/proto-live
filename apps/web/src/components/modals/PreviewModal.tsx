import React from 'react'
import { Activity, ArrowUpRight, Loader2, RefreshCw, X } from 'lucide-react'
import type { Project, ProjectEvent } from '../../api'
import { SignalTimeline } from '../SignalTimeline'

export function PreviewModal({
  project,
  iframeKey,
  iframeLoading,
  isMobileTimelineOpen,
  previewEvents,
  isPreviewEventsLoading,
  dialogRef,
  onClose,
  onRefresh,
  onOutbound,
  onMatch,
  onToggleTimeline,
  onIframeLoad,
}: {
  project: Project
  iframeKey: number
  iframeLoading: boolean
  isMobileTimelineOpen: boolean
  previewEvents: ProjectEvent[]
  isPreviewEventsLoading: boolean
  dialogRef?: React.RefObject<HTMLElement | null>
  onClose: () => void
  onRefresh: () => void
  onOutbound: () => void
  onMatch: () => void
  onToggleTimeline: () => void
  onIframeLoad: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="사이트 보기 닫기"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="라이브 사이트 보기"
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-stone-700 bg-sunken shadow-2xl lg:w-[72vw] xl:w-[62vw] motion-safe:animate-panel-slide-in"
      >
        <div className="flex min-h-16 items-start justify-between gap-3 border-b border-stone-800 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-stone-100">{project.title}</p>
            <p className="truncate text-xs text-stone-500">{project.liveUrl}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-lime-300/35 bg-lime-950/50 px-2 py-1 text-[11px] font-black text-lime-100">
                연결 관심 {project.signalScore ?? 0}
              </span>
              <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-stone-700 px-2 py-1 text-[11px] font-black text-stone-300">
                {project.validation.success ? '확인 통과' : '확인 실패'}
              </span>
              <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-stone-700 px-2 py-1 text-[11px] font-black text-stone-300">
                최근 활동 {project.eventSummary?.total ?? 0}건
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {iframeLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />}
            <button
              type="button"
              onClick={onRefresh}
              className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100"
              aria-label="사이트 보기 새로고침"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              onClick={onOutbound}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-200 hover:border-lime-300/50 hover:text-lime-100"
            >
              새 탭
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:border-red-300/40 hover:text-red-100"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 bg-stone-950 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative min-h-0">
            <iframe
              key={iframeKey}
              src={project.liveUrl}
              title={`ProtoLive demo preview: ${project.title}`}
              className="h-full w-full border-0 bg-stone-950"
              sandbox="allow-scripts allow-popups allow-forms"
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={onIframeLoad}
            />
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-stone-700 bg-stone-950/90 p-3 text-xs text-stone-300 shadow-xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-200" />
                  iframe 차단 정책이 있는 사이트는 새 탭에서 계속 검토할 수 있습니다.
                </span>
                <button
                  type="button"
                  onClick={onMatch}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-lime-300 px-3 font-black text-slate-950"
                >
                  연결 제안
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleTimeline}
            className="mb-4 rounded-lg border border-stone-700 bg-stone-950/60 p-3 text-xs font-black text-stone-200 xl:hidden"
            aria-expanded={isMobileTimelineOpen}
            aria-controls="preview-timeline-mobile"
          >
            {isMobileTimelineOpen ? '활동 내역 닫기' : '활동 내역 열기'}
          </button>
          <div className="min-h-0 xl:block">
            <SignalTimeline
              events={previewEvents}
              isLoading={isPreviewEventsLoading}
              className={`xl:block ${isMobileTimelineOpen ? 'block' : 'hidden'}`}
              title="사이트 활동"
              titleId="preview-timeline-mobile"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

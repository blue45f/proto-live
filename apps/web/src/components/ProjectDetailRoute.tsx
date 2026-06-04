import React from 'react'
import { Briefcase, ExternalLink, Globe2, Loader2, RefreshCw, Send, Sparkles } from 'lucide-react'
import type { AuthSession } from '../local-auth'
import type {
  Project,
  ProjectEvent,
  ProjectLogEntry,
  ProjectReview,
  ProjectReviewType,
} from '../api'
import { eventCopy, reviewTypeCopy } from '../lib/constants'
import {
  formatRelativeTime,
  getResponseTimeTone,
  getValidationTone,
  maskEmail,
} from '../lib/format'
import { ProjectReviewWorkspace } from './ProjectReviewWorkspace'
import { ShareButton } from './ShareButton'

export function ProjectDetailRoute({
  project,
  events,
  reviews,
  session,
  isEventsLoading,
  isReviewsLoading,
  reviewType,
  reviewRating,
  reviewBody,
  replyToReview,
  isSendingReview,
  canRefresh,
  onBack,
  onPreview,
  onMatch,
  onRefresh,
  onOutbound,
  onSubmitReview,
  onReviewTypeChange,
  onReviewRatingChange,
  onReviewBodyChange,
  onReplyTo,
  onCancelReply,
  onReportReview,
  reportingReviewId,
  onLogin,
  projectLog,
  isProjectLogLoading,
  logBody,
  onLogBodyChange,
  onSubmitLog,
  isSubmittingLog,
  onOpenMaker,
}: {
  project: Project
  events: ProjectEvent[]
  reviews: ProjectReview[]
  session: AuthSession | null
  isEventsLoading: boolean
  isReviewsLoading: boolean
  reviewType: ProjectReviewType
  reviewRating: number
  reviewBody: string
  replyToReview: ProjectReview | null
  isSendingReview: boolean
  canRefresh: boolean
  onBack: () => void
  onPreview: () => void
  onMatch: () => void
  onRefresh: () => void
  onOutbound: () => void
  onSubmitReview: (event: React.FormEvent) => void
  onReviewTypeChange: (type: ProjectReviewType) => void
  onReviewRatingChange: (rating: number) => void
  onReviewBodyChange: (body: string) => void
  onReplyTo: (review: ProjectReview) => void
  onCancelReply: () => void
  onReportReview: (review: ProjectReview) => void
  reportingReviewId: number | null
  onLogin: () => void
  projectLog: ProjectLogEntry[]
  isProjectLogLoading: boolean
  logBody: string
  onLogBodyChange: (body: string) => void
  onSubmitLog: (event: React.FormEvent) => void
  isSubmittingLog: boolean
  onOpenMaker: (makerId: number) => void
}) {
  const canPostLog = !!session && session.id === project.userId
  const isProtected = project.accessMode === 'screened'
  const responseTone = getResponseTimeTone(project.validation.responseTimeMs)
  const reviewSummary = project.reviewSummary
  const latestReview = reviewSummary?.latest
  const tags = project.tags ?? []
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/projects/${project.id}`
      : `/projects/${project.id}`

  // 프로젝트 상세에 JSON-LD 구조화 데이터를 주입한다(검색 리치 결과 + 공유 미리보기 보강).
  // 크롤러가 JS를 실행하는 경우(Google)에 인식된다. 언마운트/프로젝트 변경 시 정리.
  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    const rating = reviewSummary?.averageRating ?? null
    const ratingCount = reviewSummary?.reviewCount ?? 0
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: project.title,
      description: project.description,
      url: shareUrl,
      applicationCategory: project.category,
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      ...(rating !== null && ratingCount > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: rating,
              reviewCount: ratingCount,
              bestRating: 5,
            },
          }
        : {}),
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'protolive-project-jsonld'
    script.textContent = JSON.stringify(jsonLd)
    document.getElementById('protolive-project-jsonld')?.remove()
    document.head.appendChild(script)
    return () => script.remove()
  }, [project.id, project.title, project.description, project.category, shareUrl, reviewSummary])

  return (
    <div className="space-y-5 rounded-2xl border border-lime-300/20 bg-stone-950/55 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 transition hover:border-lime-300/50 hover:text-lime-100"
          >
            목록으로 돌아가기
          </button>
          <ShareButton url={shareUrl} title={`${project.title} · ProtoLive`} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1 font-black text-stone-300">
            {project.category}
          </span>
          <span
            className={
              'rounded-full border px-3 py-1 font-black ' + getValidationTone(project.validation)
            }
          >
            {project.validation.success ? '사이트 확인 완료' : '확인 필요'}
          </span>
          <span className={'rounded-full border px-3 py-1 font-black ' + responseTone.tone}>
            {project.validation.responseTimeMs
              ? project.validation.responseTimeMs + 'ms'
              : responseTone.label}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-stone-700 bg-stone-950">
            {project.thumbnail ? (
              <img
                src={project.thumbnail}
                alt={project.title + ' 사이트 스크린샷'}
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[16/10] place-items-center text-sm font-black text-stone-500">
                스크린샷 준비 중
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">
              사이트 상세
            </p>
            <h2 className="mt-2 overflow-wrap-anywhere text-3xl font-black tracking-tight text-stone-50">
              {project.title}
            </h2>
            <p className="mt-3 max-w-3xl overflow-wrap-anywhere text-base leading-7 text-stone-300">
              {project.description}
            </p>
            <button
              type="button"
              onClick={() => onOpenMaker(project.userId)}
              className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 transition hover:border-lime-300/50 hover:text-lime-100"
            >
              이 메이커의 다른 프로젝트
            </button>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">
              <Globe2 className="h-4 w-4 flex-shrink-0 text-stone-500" />
              <span className="truncate font-mono">
                {project.validation.finalUrl ?? project.liveUrl}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-lime-300/20 bg-lime-300/10 p-3">
              <p className="text-xs text-lime-100/75">회원 리뷰</p>
              <p className="mt-1 text-xl font-black text-lime-100">
                {reviewSummary?.rootCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
              <p className="text-xs text-amber-100/75">평균 별점</p>
              <p className="mt-1 text-xl font-black text-amber-100">
                {reviewSummary?.averageRating
                  ? reviewSummary.averageRating.toFixed(1) + '점'
                  : '없음'}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3">
              <p className="text-xs text-cyan-100/75">대댓글</p>
              <p className="mt-1 text-xl font-black text-cyan-100">
                {reviewSummary?.replyCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3">
              <p className="text-xs text-stone-500">투자 관심</p>
              <p className="mt-1 text-xl font-black text-stone-100">{project.matchCount}</p>
            </div>
          </div>
          {latestReview && (
            <div className="rounded-xl border border-stone-800 bg-stone-950/45 p-4">
              <p className="text-xs font-black text-stone-500">최근 회원 의견</p>
              <p className="mt-2 text-sm font-black text-stone-200">
                {reviewTypeCopy[latestReview.type].label}이 새로 등록되었습니다.
              </p>
              <p className="mt-2 text-xs text-stone-500">
                {reviewTypeCopy[latestReview.type].label} · {maskEmail(latestReview.authorEmail)} ·{' '}
                {formatRelativeTime(latestReview.createdAt)}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                전체 내용과 대댓글은 아래 커뮤니티 영역에서 확인하세요.
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-stone-800 bg-stone-950/55 p-4">
            <h3 className="text-lg font-black text-stone-50">다음에 할 일</h3>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              사이트를 직접 보고, 회원 의견을 남기고, 필요하면 창업자에게 투자 관심이나 성장 도움을
              제안하세요.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                <Sparkles className="h-4 w-4" />
                {isProtected ? '공개 요청' : '사이트 보기'}
              </button>
              <button
                type="button"
                onClick={onMatch}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-3 text-sm font-black text-slate-950 transition hover:bg-lime-200"
              >
                <Briefcase className="h-4 w-4" />
                투자 관심 남기기
              </button>
              {!isProtected && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  onClick={onOutbound}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-sm font-black text-stone-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  <ExternalLink className="h-4 w-4" />새 탭으로 열기
                </a>
              )}
              <button
                type="button"
                onClick={onRefresh}
                disabled={!canRefresh}
                title={canRefresh ? '상태 다시 확인' : '운영자 또는 등록한 창업자만 재확인 가능'}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-sm font-black text-stone-200 transition hover:border-lime-300/50 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                상태 다시 확인
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-950/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-stone-100">사이트 활동</h3>
              <span className="text-xs text-stone-500">
                {isEventsLoading ? '불러오는 중' : events.length + '개'}
              </span>
            </div>
            {events.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-700 p-3 text-sm text-stone-500">
                아직 활동 기록이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => {
                  const meta = eventCopy[event.type]
                  const Icon = meta.icon
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-950/45 p-3 text-xs"
                    >
                      <span className="inline-flex items-center gap-2 font-black text-stone-200">
                        <Icon className="h-3.5 w-3.5 text-cyan-200" />
                        {meta.label}
                      </span>
                      <span className="text-stone-500">{formatRelativeTime(event.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-800 bg-stone-950/45 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-200">
              Maker log
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-stone-50">메이커로그</h3>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              메이커가 바이브코딩으로 어떻게 만들었는지 기록을 시간순으로 남깁니다.
            </p>
          </div>
        </div>

        {canPostLog && (
          <form onSubmit={onSubmitLog} className="mt-4">
            <textarea
              required
              maxLength={700}
              rows={3}
              value={logBody}
              onChange={(event) => onLogBodyChange(event.target.value)}
              placeholder="예: Cursor로 초안을 만들고, v0로 랜딩을 다듬고, Claude Code로 API를 붙였어요."
              className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingLog || !logBody.trim()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
              >
                {isSubmittingLog ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                기록 추가
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {isProjectLogLoading ? (
            <p className="rounded-lg border border-stone-800 bg-stone-950/45 p-3 text-sm text-stone-400">
              메이커로그를 불러오는 중입니다.
            </p>
          ) : projectLog.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-700 bg-stone-950/45 p-3 text-sm text-stone-400">
              아직 기록이 없습니다. {canPostLog ? '첫 제작 기록을 남겨보세요.' : ''}
            </p>
          ) : (
            projectLog.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-stone-800 bg-stone-950/55 p-3"
              >
                <p className="overflow-wrap-anywhere text-sm leading-6 text-stone-200">
                  {entry.body}
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  {maskEmail(entry.authorEmail)} · {formatRelativeTime(entry.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <ProjectReviewWorkspace
        project={project}
        reviews={reviews}
        isLoading={isReviewsLoading}
        session={session}
        reviewType={reviewType}
        reviewRating={reviewRating}
        reviewBody={reviewBody}
        replyToReview={replyToReview}
        isSubmitting={isSendingReview}
        onTypeChange={onReviewTypeChange}
        onRatingChange={onReviewRatingChange}
        onBodyChange={onReviewBodyChange}
        onReplyTo={onReplyTo}
        onCancelReply={onCancelReply}
        onReportReview={onReportReview}
        reportingReviewId={reportingReviewId}
        onLogin={onLogin}
        onSubmit={onSubmitReview}
      />
    </div>
  )
}

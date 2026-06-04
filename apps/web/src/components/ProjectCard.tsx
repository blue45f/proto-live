import { ArrowUpRight, ChevronUp, Star } from 'lucide-react'
import type { Project } from '../api'
import {
  type ProjectListViewMode,
  buildToolLabel,
  maturityCopy,
  reviewTypeCopy,
} from '../lib/constants'
import {
  formatRelativeTime,
  getResponseTimeTone,
  getValidationTone,
  maskEmail,
} from '../lib/format'

export function ProjectCard({
  project,
  viewMode,
  signalRank,
  onOpenDetail,
  onToggleFavorite,
  isFavorite,
  onToggleUpvote,
  isUpvoted,
}: {
  project: Project
  viewMode: ProjectListViewMode
  signalRank: number | null
  onOpenDetail: () => void
  onToggleFavorite: () => void
  isFavorite: boolean
  onToggleUpvote: () => void
  isUpvoted: boolean
}) {
  const isProtected = project.accessMode === 'screened'
  const responseTone = getResponseTimeTone(project.validation.responseTimeMs)
  const signalRankText = signalRank === null ? null : '#' + signalRank
  const tags = project.tags ?? []
  const maturity = maturityCopy[project.maturity]
  const tools = [
    ...(project.builtWith ?? []).map((id) => buildToolLabel(id)),
    ...(project.customTools ?? []),
  ]
  const latestReview = project.reviewSummary?.latest
  const isCardView = viewMode === 'cards'
  const isReviewView = viewMode === 'reviews'

  return (
    <article
      className={`protolive-card rounded-xl border border-stone-800 bg-panel ${
        isCardView ? 'p-4' : 'p-3'
      }`}
    >
      <div
        className={
          isCardView
            ? 'grid gap-3'
            : isReviewView
              ? 'grid gap-3 sm:grid-cols-[124px_minmax(0,1fr)_auto] sm:items-center'
              : 'grid gap-3 sm:grid-cols-[148px_minmax(0,1fr)_auto] sm:items-center'
        }
      >
        <button
          type="button"
          onClick={onOpenDetail}
          className="protolive-shot-card overflow-hidden rounded-xl border border-stone-700 bg-stone-950/60 text-left"
        >
          {project.thumbnail ? (
            <img
              src={project.thumbnail}
              alt={project.title + ' 사이트 스크린샷'}
              className="aspect-[16/10] w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid aspect-[16/10] place-items-center text-xs font-black text-stone-500">
              스크린샷 준비 중
            </div>
          )}
        </button>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleUpvote}
              aria-pressed={isUpvoted}
              aria-label={project.title + ' 추천'}
              className={
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black transition ' +
                (isUpvoted
                  ? 'border-amber-300/60 bg-amber-300/15 text-amber-100'
                  : 'border-stone-700 text-stone-300 hover:border-amber-300/50 hover:text-amber-100')
              }
            >
              <ChevronUp className="h-3.5 w-3.5" />
              {project.upvoteCount ?? 0}
            </button>
            {signalRankText && (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                {signalRankText} 추천
              </span>
            )}
            <span className="rounded-full border border-stone-700 bg-stone-950/60 px-2.5 py-1 text-[11px] font-black text-stone-300">
              {project.category}
            </span>
            <span
              className={'rounded-full border px-2.5 py-1 text-[11px] font-black ' + maturity.tone}
            >
              {maturity.label}
            </span>
            <span
              className={
                'rounded-full border px-2.5 py-1 text-[11px] font-black ' +
                getValidationTone(project.validation)
              }
            >
              {project.validation.success ? '확인 완료' : '확인 필요'}
            </span>
            <span
              className={
                'rounded-full border px-2.5 py-1 text-[11px] font-black ' + responseTone.tone
              }
            >
              {project.validation.responseTimeMs
                ? project.validation.responseTimeMs + 'ms'
                : responseTone.label}
            </span>
            {isProtected && (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">
                요청 후 공개
              </span>
            )}
          </div>
          <button type="button" onClick={onOpenDetail} className="block max-w-full text-left">
            <h3 className="overflow-wrap-anywhere text-lg font-black tracking-tight text-stone-50">
              {project.title}
            </h3>
          </button>
          <p className="mt-1 max-w-[72ch] overflow-wrap-anywhere text-sm leading-6 text-stone-300">
            {project.description}
          </p>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.slice(0, isCardView ? 6 : 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-black text-cyan-100"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {(tools.length > 0 || project.vibeCoded) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {project.vibeCoded && (
                <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[11px] font-black text-violet-100">
                  AI 제작
                </span>
              )}
              {tools.slice(0, 2).map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-stone-700 bg-stone-950/60 px-2 py-0.5 text-[11px] font-black text-stone-300"
                >
                  {tool}
                </span>
              ))}
              {tools.length > 2 && (
                <span className="text-[11px] font-black text-stone-500">+{tools.length - 2}</span>
              )}
            </div>
          )}
          {isReviewView && latestReview && (
            <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/55 p-3">
              <p className="text-[11px] font-black text-stone-500">최근 회원 의견</p>
              <p className="mt-1 overflow-wrap-anywhere text-sm leading-6 text-stone-200">
                {latestReview.body}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                {reviewTypeCopy[latestReview.type].label} · {maskEmail(latestReview.authorEmail)}
              </p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
            <span>리뷰 {project.reviewSummary?.rootCount ?? 0}</span>
            <span>답글 {project.reviewSummary?.replyCount ?? 0}</span>
            <span>투자 관심 {project.matchCount}</span>
            <span>
              최근{' '}
              {formatRelativeTime(
                project.reviewSummary?.latestAt ?? project.eventSummary?.latestAt ?? undefined
              )}
            </span>
          </div>
        </div>
        <div className={isCardView ? 'grid grid-cols-2 gap-2' : 'grid gap-2 sm:min-w-[132px]'}>
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
          >
            상세 보기
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            className={
              'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black transition ' +
              (isFavorite
                ? 'border-amber-300/70 bg-amber-300/10 text-amber-100'
                : 'border-stone-700 text-stone-300 hover:border-stone-500')
            }
            aria-label={
              isFavorite ? project.title + ' 즐겨찾기 해제' : project.title + ' 즐겨찾기 추가'
            }
          >
            <Star className={'h-4 w-4 ' + (isFavorite ? 'fill-amber-100' : '')} />
            저장
          </button>
        </div>
      </div>
    </article>
  )
}

/**
 * ReviewDesk 네이티브 후기 섹션 — 외부 떠 있는 "후기 월" 위젯 임베드 대체.
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 공개(`pk_`) ReviewClient.getWall()/getAggregate() 로 승인된
 * 후기와 평점 집계를 읽어와, 소개 페이지(AboutView) 안에 이 앱의 디자인 토큰으로
 * 렌더한다. 외부 위젯의 별색·다른 폰트가 아니라 메이커 라운지 톤으로 1차 콘텐츠처럼
 * 보인다.
 *
 * 게이팅: VITE_REVIEWDESK_URL 미설정이면 섹션 자체가 마운트되지 않는다(가역적).
 */
import { useQuery } from '@tanstack/react-query'
import { Quote, Star } from 'lucide-react'

import { REVIEW_SUBJECT_ID, getReviewClient } from '../../lib/deskcloud'

import type { PublicReview, ReviewAggregate, ReviewWall } from '@heejun/deskcloud'

interface TestimonialsData {
  items: PublicReview[]
  aggregate: ReviewAggregate | null
}

export function TestimonialsSection() {
  const enabled = Boolean(getReviewClient())
  const query = useQuery<TestimonialsData>({
    queryKey: ['deskcloud', 'reviews', 'wall', REVIEW_SUBJECT_ID],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const client = getReviewClient()
      if (!client) return { items: [], aggregate: null }
      // 후기 월(승인+추천)과 평점 집계를 함께 읽는다. 집계 실패는 치명적이지 않게 흡수.
      const [wall, aggregate] = await Promise.all([
        client.getWall({ limit: 6, signal }),
        client.getAggregate({ subjectId: REVIEW_SUBJECT_ID, signal }).catch(() => null),
      ])
      return { items: (wall as ReviewWall).items, aggregate }
    },
  })

  if (!enabled) return null
  const data = query.data
  if (query.isError || (query.isSuccess && (!data || data.items.length === 0))) return null

  return (
    <section aria-labelledby="protolive-testimonials-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h3
            id="protolive-testimonials-heading"
            className="text-2xl font-black tracking-tight text-stone-50 sm:text-3xl"
          >
            메이커들의 한마디
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-400 sm:text-base">
            여기서 빌드를 공유하고 피드백을 받은 사람들이 직접 남긴 후기입니다.
          </p>
        </div>
        {data?.aggregate && data.aggregate.avgRating != null ? (
          <AggregateBadge aggregate={data.aggregate} />
        ) : null}
      </div>

      {query.isPending ? (
        <TestimonialSkeleton />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {(data?.items ?? []).map((review) => (
            <TestimonialCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AggregateBadge({ aggregate }: { aggregate: ReviewAggregate }) {
  const rating = aggregate.avgRating ?? 0
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-sm font-bold text-amber-100">
      <Star className="h-4 w-4" fill="currentColor" aria-hidden />
      <span>
        평균 {rating.toFixed(1)}점
        <span className="ml-1 font-normal text-amber-200/80">· 후기 {aggregate.count}개</span>
      </span>
    </p>
  )
}

function TestimonialCard({ review }: { review: PublicReview }) {
  return (
    <li className="flex flex-col rounded-2xl border border-stone-800 bg-stone-950/45 p-5">
      <Quote className="h-5 w-5 text-lime-300" aria-hidden />
      <Stars rating={review.rating} />
      {review.title ? <p className="mt-2 font-bold text-stone-100">{review.title}</p> : null}
      <p className="protolive-measure mt-1.5 flex-1 text-sm leading-6 text-stone-300">
        {review.body}
      </p>
      <footer className="mt-4 flex items-center gap-2 text-xs text-stone-400">
        <span className="font-bold text-stone-200">{review.authorName}</span>
        {review.subjectLabel ? (
          <>
            <span aria-hidden>·</span>
            <span>{review.subjectLabel}</span>
          </>
        ) : null}
      </footer>
      {review.reply ? (
        <p className="mt-3 rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2 text-xs leading-5 text-stone-300">
          <span className="font-bold text-lime-200">운영팀</span> {review.reply}
        </p>
      ) : null}
    </li>
  )
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating)
  return (
    <div className="mt-2 inline-flex gap-0.5" aria-label={`${rating}점`}>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rounded ? 'text-amber-300' : 'text-stone-700'}`}
          fill={n <= rounded ? 'currentColor' : 'none'}
          aria-hidden
        />
      ))}
    </div>
  )
}

function TestimonialSkeleton() {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2" aria-hidden>
      {[0, 1].map((index) => (
        <li key={index} className="rounded-2xl border border-stone-800 bg-stone-950/45 p-5">
          <div className="h-4 w-20 rounded bg-stone-800" />
          <div className="mt-3 h-4 w-3/4 rounded bg-stone-800" />
          <div className="mt-2 h-3 w-full rounded bg-stone-800/70" />
          <div className="mt-2 h-3 w-5/6 rounded bg-stone-800/70" />
        </li>
      ))}
    </ul>
  )
}

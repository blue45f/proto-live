import React from 'react';
import { AlertTriangle, Loader2, Send } from 'lucide-react';
import type { AuthSession } from '../local-auth';
import type { Project, ProjectReview, ProjectReviewType } from '../api';
import { reviewTypeCopy } from '../lib/constants';
import { formatRelativeTime, getRepliesByParent, getRoleLabel, getRootReviews, maskEmail } from '../lib/format';

export function ProjectReviewWorkspace({
  project,
  reviews,
  isLoading,
  session,
  reviewType,
  reviewRating,
  reviewBody,
  replyToReview,
  isSubmitting,
  onTypeChange,
  onRatingChange,
  onBodyChange,
  onReplyTo,
  onCancelReply,
  onReportReview,
  reportingReviewId,
  onLogin,
  onSubmit,
}: {
  project: Project;
  reviews: ProjectReview[];
  isLoading: boolean;
  session: AuthSession | null;
  reviewType: ProjectReviewType;
  reviewRating: number;
  reviewBody: string;
  replyToReview: ProjectReview | null;
  isSubmitting: boolean;
  onTypeChange: (type: ProjectReviewType) => void;
  onRatingChange: (rating: number) => void;
  onBodyChange: (body: string) => void;
  onReplyTo: (review: ProjectReview) => void;
  onCancelReply: () => void;
  onReportReview: (review: ProjectReview) => void;
  reportingReviewId: number | null;
  onLogin: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const roots = getRootReviews(reviews);
  const repliesByParent = getRepliesByParent(reviews);
  const summary = project.reviewSummary;

  return (
    <div className="protolive-community-panel space-y-4 rounded-2xl border border-stone-800 bg-stone-950/45 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Community signal</p>
        <h3 className="mt-1 text-xl font-black tracking-tight text-stone-50">회원 리뷰와 성장 의견</h3>
        <p className="mt-1 text-sm leading-6 text-stone-400">
          투자자뿐 아니라 일반 회원도 평가, 아이디어, 도움 제안을 남길 수 있습니다.
        </p>
        </div>
        <div className="protolive-safety-note flex flex-wrap gap-2 text-[11px] font-black">
          <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-cyan-100">
            1단계 대댓글
          </span>
          <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-amber-100">
            3회 신고 자동 숨김
          </span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">전체 의견</p>
          <p className="mt-1 text-lg font-black text-stone-50">{summary?.rootCount ?? roots.length}</p>
        </div>
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">평균 별점</p>
          <p className="mt-1 text-lg font-black text-stone-50">
            {summary?.averageRating ? `${summary.averageRating.toFixed(1)}점` : '아직 없음'}
          </p>
        </div>
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">성장 도움</p>
          <p className="mt-1 text-lg font-black text-lime-100">{summary?.supportCount ?? 0}</p>
        </div>
        <div className="protolive-community-stat rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs text-stone-500">대댓글</p>
          <p className="mt-1 text-lg font-black text-cyan-100">{summary?.replyCount ?? 0}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="protolive-review-composer rounded-xl border border-stone-800 bg-stone-950/45 p-4">
        {session ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-400">
            <span className="rounded-full border border-lime-300/35 bg-lime-300/10 px-2.5 py-1 font-black text-lime-100">
              {getRoleLabel(session.role)}
            </span>
            <span>{maskEmail(session.email)} 님의 의견으로 저장됩니다.</span>
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            로그인한 회원만 평가와 답글을 남길 수 있습니다.
            <button type="button" onClick={onLogin} className="ml-2 font-black underline underline-offset-4">
              로그인하기
            </button>
          </div>
        )}

        {replyToReview ? (
          <div className="mb-3 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-3 text-xs text-cyan-100">
            <div className="flex items-start justify-between gap-3">
              <p>
                <span className="font-black">대댓글 작성 중</span>
                <span className="ml-2 text-cyan-100/75">{maskEmail(replyToReview.authorEmail)} 의견에 답합니다.</span>
              </p>
              <button type="button" onClick={onCancelReply} className="font-black text-cyan-50">
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            {(Object.keys(reviewTypeCopy) as ProjectReviewType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onTypeChange(type)}
                className={`rounded-lg border p-3 text-left transition ${
                  reviewType === type
                    ? reviewTypeCopy[type].tone
                    : 'border-stone-800 bg-stone-950/50 text-stone-300 hover:border-stone-600'
                }`}
              >
                <span className="block text-sm font-black">{reviewTypeCopy[type].label}</span>
                <span className="mt-1 block text-xs leading-5 opacity-80">{reviewTypeCopy[type].helper}</span>
              </button>
            ))}
          </div>
        )}

        {!replyToReview && reviewType === 'review' && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-stone-400">별점</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onRatingChange(rating)}
                className={`min-h-9 rounded-lg border px-3 text-xs font-black ${
                  reviewRating === rating
                    ? 'border-amber-300 bg-amber-300 text-slate-950'
                    : 'border-stone-700 text-stone-300'
                }`}
              >
                {rating}점
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">
            {replyToReview ? '답글 내용' : `${reviewTypeCopy[reviewType].label} 내용`}
          </span>
          <textarea
            required
            maxLength={700}
            rows={4}
            value={reviewBody}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={
              replyToReview
                ? '상대 의견에 이어 답글을 남겨주세요.'
                : '처음 보는 사람도 이해할 수 있게 좋았던 점, 아쉬운 점, 다음 아이디어를 적어주세요.'
            }
            className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
        </label>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !session}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {replyToReview ? '답글 등록' : '의견 등록'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-stone-100">회원 의견</h3>
          <span className="text-xs text-stone-500">{isLoading ? '불러오는 중' : `${reviews.length}개`}</span>
        </div>
        {isLoading ? (
          <div className="rounded-lg border border-stone-800 bg-stone-950/45 p-4 text-sm text-stone-400">
            리뷰를 불러오는 중입니다.
          </div>
        ) : roots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950/45 p-4 text-sm text-stone-400">
            아직 리뷰가 없습니다. 첫 평가나 성장 아이디어를 남겨주세요.
          </div>
        ) : (
          roots.map((review) => (
            <div key={review.id} className="protolive-thread-card rounded-xl border border-stone-800 bg-stone-950/45 p-4">
              <ReviewItem
                review={review}
                onReplyTo={onReplyTo}
                onReportReview={onReportReview}
                isReporting={reportingReviewId === review.id}
              />
              {(repliesByParent[review.id] ?? []).length > 0 && (
                <div className="mt-3 space-y-2 border-t border-stone-800 pt-3">
                  {(repliesByParent[review.id] ?? []).map((reply) => (
                    <div key={reply.id} className="protolive-thread-reply rounded-lg border border-stone-800 bg-stone-900/45 p-3">
                      <ReviewItem
                        review={reply}
                        isReply
                        onReplyTo={onReplyTo}
                        onReportReview={onReportReview}
                        isReporting={reportingReviewId === reply.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ReviewItem({
  review,
  isReply = false,
  onReplyTo,
  onReportReview,
  isReporting,
}: {
  review: ProjectReview;
  isReply?: boolean;
  onReplyTo: (review: ProjectReview) => void;
  onReportReview: (review: ProjectReview) => void;
  isReporting: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${reviewTypeCopy[review.type].tone}`}>
          {isReply ? '답글' : reviewTypeCopy[review.type].label}
        </span>
        {review.status === 'reported' && (
          <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">
            신고 검토중 {review.reportCount > 0 ? review.reportCount : ''}
          </span>
        )}
        <span className="text-xs font-black text-stone-300">{maskEmail(review.authorEmail)}</span>
        <span className="text-xs text-stone-500">{getRoleLabel(review.authorRole)}</span>
        {review.rating ? <span className="text-xs font-black text-amber-100">{review.rating}점</span> : null}
        <span className="text-xs text-stone-500">{formatRelativeTime(review.createdAt)}</span>
      </div>
      <p className="mt-2 overflow-wrap-anywhere text-sm leading-6 text-stone-200">{review.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!isReply && (
          <button
            type="button"
            onClick={() => onReplyTo(review)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100"
          >
            <Send className="h-3.5 w-3.5" />
            답글 달기
          </button>
        )}
        <button
          type="button"
          onClick={() => onReportReview(review)}
          disabled={isReporting}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-400 hover:border-amber-300/50 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isReporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          신고
        </button>
      </div>
    </div>
  );
}

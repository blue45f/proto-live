import { useShallow } from 'zustand/react/shallow'

import { useReviewComposerStore } from './reviewComposerStore'

/**
 * 리뷰 컴포저 도메인 훅. 상태는 zustand 스토어(reviewComposerStore)로 이전됐고, 이 훅은
 * 종전 호출 계약(평가 타입/별점/본문/대댓글 대상 + 리셋)을 그대로 보존하는 얇은 어댑터다.
 * 동작은 기존과 동일(특성화 테스트로 고정).
 */
export function useReviewComposer() {
  return useReviewComposerStore(
    useShallow((state) => ({
      reviewType: state.reviewType,
      setReviewType: state.setReviewType,
      reviewRating: state.reviewRating,
      setReviewRating: state.setReviewRating,
      reviewBody: state.reviewBody,
      setReviewBody: state.setReviewBody,
      replyToReview: state.replyToReview,
      setReplyToReview: state.setReplyToReview,
      resetReviewComposer: state.resetReviewComposer,
    }))
  )
}

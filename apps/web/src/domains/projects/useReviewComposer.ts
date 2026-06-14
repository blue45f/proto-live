import { useCallback, useState } from 'react'

import type { ProjectReview, ProjectReviewType } from '../../infrastructure/api'

/**
 * 리뷰 컴포저 도메인 훅. 거대 useProtoLiveApp에서 분리한 두 번째 슬라이스로,
 * 평가 타입/별점/본문/대댓글 대상 상태와 전체 리셋을 한곳에 모은다.
 * 동작은 기존과 동일(특성화 테스트로 고정).
 */
export function useReviewComposer() {
  const [reviewType, setReviewType] = useState<ProjectReviewType>('review')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [replyToReview, setReplyToReview] = useState<ProjectReview | null>(null)

  const resetReviewComposer = useCallback(() => {
    setReviewType('review')
    setReviewRating(5)
    setReviewBody('')
    setReplyToReview(null)
  }, [])

  return {
    reviewType,
    setReviewType,
    reviewRating,
    setReviewRating,
    reviewBody,
    setReviewBody,
    replyToReview,
    setReplyToReview,
    resetReviewComposer,
  }
}

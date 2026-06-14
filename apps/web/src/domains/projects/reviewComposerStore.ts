import { create } from 'zustand'

import type { ProjectReview, ProjectReviewType } from '../../infrastructure/api'

export interface ReviewComposerState {
  reviewType: ProjectReviewType
  reviewRating: number
  reviewBody: string
  replyToReview: ProjectReview | null
  setReviewType: (value: ProjectReviewType) => void
  setReviewRating: (value: number) => void
  setReviewBody: (value: string) => void
  setReplyToReview: (value: ProjectReview | null) => void
  resetReviewComposer: () => void
}

/**
 * 리뷰 컴포저 클라이언트 UI 스토어(zustand). 평가 타입/별점/본문/대댓글 대상 상태와
 * 전체 리셋을 한곳에 모은다. 영속하지 않는다(세션 한정).
 * 동작은 기존 useReviewComposer 훅과 동일(특성화 테스트로 고정).
 */
export const useReviewComposerStore = create<ReviewComposerState>()((set) => ({
  reviewType: 'review',
  reviewRating: 5,
  reviewBody: '',
  replyToReview: null,
  setReviewType: (value) => set({ reviewType: value }),
  setReviewRating: (value) => set({ reviewRating: value }),
  setReviewBody: (value) => set({ reviewBody: value }),
  setReplyToReview: (value) => set({ replyToReview: value }),
  resetReviewComposer: () =>
    set({ reviewType: 'review', reviewRating: 5, reviewBody: '', replyToReview: null }),
}))

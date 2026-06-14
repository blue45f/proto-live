import React from 'react'

import { ProjectReviewWorkspace } from '../../domains/projects/ProjectReviewWorkspace'
import { Modal } from '../Modal'

import type { Project, ProjectReview, ProjectReviewType } from '../../infrastructure/api'
import type { AuthSession } from '../../infrastructure/local-auth'

export function ReviewModal({
  project,
  reviews,
  isLoading,
  session,
  reviewType,
  reviewRating,
  reviewBody,
  replyToReview,
  isSubmitting,
  reportingReviewId,
  onClose,
  onTypeChange,
  onRatingChange,
  onBodyChange,
  onReplyTo,
  onCancelReply,
  onReportReview,
  onLogin,
  onSubmit,
}: {
  project: Project
  reviews: ProjectReview[]
  isLoading: boolean
  session: AuthSession | null
  reviewType: ProjectReviewType
  reviewRating: number
  reviewBody: string
  replyToReview: ProjectReview | null
  isSubmitting: boolean
  reportingReviewId: number | null
  onClose: () => void
  onTypeChange: (type: ProjectReviewType) => void
  onRatingChange: (rating: number) => void
  onBodyChange: (body: string) => void
  onReplyTo: (review: ProjectReview) => void
  onCancelReply: () => void
  onReportReview: (review: ProjectReview) => void
  onLogin: () => void
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <Modal title="회원 리뷰와 성장 의견" subtitle={project.title} onClose={onClose}>
      <ProjectReviewWorkspace
        project={project}
        reviews={reviews}
        isLoading={isLoading}
        session={session}
        reviewType={reviewType}
        reviewRating={reviewRating}
        reviewBody={reviewBody}
        replyToReview={replyToReview}
        isSubmitting={isSubmitting}
        onTypeChange={onTypeChange}
        onRatingChange={onRatingChange}
        onBodyChange={onBodyChange}
        onReplyTo={onReplyTo}
        onCancelReply={onCancelReply}
        onReportReview={onReportReview}
        reportingReviewId={reportingReviewId}
        onLogin={onLogin}
        onSubmit={onSubmit}
      />
    </Modal>
  )
}

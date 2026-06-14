import { useShallow } from 'zustand/react/shallow'

import { useUpvotedProjectsStore } from './upvotedProjectsStore'

/**
 * 뷰어가 이번 세션에서 추천(업보트)한 프로젝트 id 집합을 노출하는 도메인 훅.
 * 상태는 zustand 스토어(upvotedProjectsStore)로 이전됐고, 이 훅은 종전 호출 계약
 * ({ upvotedProjectIds, applyUpvoteResult })을 그대로 보존하는 얇은 어댑터다.
 * 동작은 기존과 동일(특성화 테스트로 고정).
 */
export function useUpvotedProjects() {
  return useUpvotedProjectsStore(
    useShallow((state) => ({
      upvotedProjectIds: state.upvotedProjectIds,
      applyUpvoteResult: state.applyUpvoteResult,
    }))
  )
}

import { create } from 'zustand'

export interface UpvotedProjectsState {
  upvotedProjectIds: Set<number>
  applyUpvoteResult: (projectId: number, viewerUpvoted: boolean) => void
}

/**
 * 뷰어가 이번 세션에서 추천(업보트)한 프로젝트 id 집합을 관리하는 클라이언트 UI 스토어(zustand).
 * 서버 응답(viewerUpvoted)을 그대로 반영하는 단일 책임만 가지며, 영속하지 않는다(세션 한정).
 * 동작은 기존 useUpvotedProjects 훅과 동일(특성화 테스트로 고정).
 */
export const useUpvotedProjectsStore = create<UpvotedProjectsState>()((set, get) => ({
  upvotedProjectIds: new Set<number>(),
  applyUpvoteResult: (projectId, viewerUpvoted) => {
    const next = new Set(get().upvotedProjectIds)
    if (viewerUpvoted) {
      next.add(projectId)
    } else {
      next.delete(projectId)
    }
    set({ upvotedProjectIds: next })
  },
}))

import { useCallback, useState } from 'react'

/**
 * 뷰어가 이번 세션에서 추천(업보트)한 프로젝트 id 집합을 관리하는 도메인 훅.
 * 거대 useProtoLiveApp에서 분리한 세 번째 슬라이스로, 서버 응답(viewerUpvoted)을
 * 그대로 반영하는 단일 책임만 가진다. 동작은 기존과 동일(특성화 테스트로 고정).
 */
export function useUpvotedProjects() {
  const [upvotedProjectIds, setUpvotedProjectIds] = useState<Set<number>>(new Set())

  const applyUpvoteResult = useCallback((projectId: number, viewerUpvoted: boolean) => {
    setUpvotedProjectIds((current) => {
      const next = new Set(current)
      if (viewerUpvoted) {
        next.add(projectId)
      } else {
        next.delete(projectId)
      }
      return next
    })
  }, [])

  return { upvotedProjectIds, applyUpvoteResult }
}

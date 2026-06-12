import { lazy, type ComponentType } from 'react'

/**
 * 청크 리트라이 가드 키. 재배포로 에셋 해시가 바뀌면 이미 떠 있는 탭이 옛 해시의
 * 라우트 청크를 요청하다 404 로 실패할 수 있다. 그때 한 번만 전체 새로고침으로 새
 * 매니페스트를 받아 복구한다. 가드는 reload 너머로 살아남아야 하므로 sessionStorage
 * 에 두고, "청크가 성공적으로 로드된 뒤"에만 해제한다 — reload 직전에 해제하면
 * 서버가 계속 실패하는 동안 무한 새로고침에 빠진다.
 */
const RETRY_KEY = 'protolive-chunk-retry'

/**
 * `React.lazy` 교정판. 라우트 청크 로드 실패 시 세션당 1회 전체 새로고침으로
 * 복구하고, 두 번째 실패는 그대로 throw 해서 ErrorBoundary 가 처리하게 한다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.lazy 와 동일한 제약으로 컴포넌트 타입을 보존한다.
export function lazyRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory()
      // 성공 로드 시에만 가드 해제(즉시 해제하면 무한 reload 가능).
      sessionStorage.removeItem(RETRY_KEY)
      return mod
    } catch (error) {
      if (!sessionStorage.getItem(RETRY_KEY)) {
        sessionStorage.setItem(RETRY_KEY, '1')
        window.location.reload()
        // reload 가 끝날 때까지 Suspense fallback 을 유지한다(영원히 pending).
        return new Promise<{ default: T }>(() => {})
      }
      throw error
    }
  })
}

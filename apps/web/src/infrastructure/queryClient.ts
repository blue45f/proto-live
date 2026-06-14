import { QueryClient } from '@tanstack/react-query'

/**
 * 공유 QueryClient — 기존 손수 작성한 fetch 동작을 그대로 보존하도록 기본값을 맞춘다.
 *
 * 마이그레이션 이전 컴포넌트들은 모두 "마운트 시 1회 fetch(또는 고정 간격 폴링)"였고,
 * 자동 재시도·창 포커스 재요청·재연결 재요청이 없었다. react-query 기본값(retry 3회,
 * refetchOnWindowFocus 등)은 이와 다르므로, 사용자에게 보이는 로딩/에러/깜빡임 동작이
 * 바뀌지 않도록 아래에서 비활성화한다. 폴링이 필요한 쿼리는 각 훅에서 refetchInterval 을
 * 명시한다.
 */
export function createAppQueryClient(): QueryClient {
  return appQueryClient
}

function buildAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 기존 컴포넌트는 실패 시 즉시 에러 카드를 띄웠다(자동 재시도 없음).
        retry: false,
        // 기존 동작과 동일하게 창 포커스/재연결만으로 재요청하지 않는다.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // 데이터는 즉시 stale 로 두되(명시적 invalidate/refetch 로만 갱신),
        // 폴링 쿼리는 각자 refetchInterval 을 지정한다.
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * 앱 전역 단일 QueryClient. 모듈 싱글턴으로 두어 매 렌더마다 재생성되지 않게 한다.
 * 테스트 setup 은 매 테스트 후 이 인스턴스의 캐시를 비워, useState 기반이던 시절의
 * 마운트 단위 격리(테스트 간 상태 누수 없음)를 그대로 유지한다.
 */
export const appQueryClient = buildAppQueryClient()

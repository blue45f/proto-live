import { ADMIN_PATH_SEGMENT, type AppView } from '../lib/constants'

/**
 * 핸드롤 라우터. 의존성 추가 없이(boilerplate 의존성은 react/axios/lucide만) 현재
 * URL을 앱 라우트로 해석하고 history 내비게이션을 한 곳에 모은다. 라우트가 늘어나면
 * (피드/투자자/메이커 프로필) 이 매처만 확장한다. 자세한 결정 배경은
 * docs/adr/0001-handrolled-router.md 참고.
 */
export interface AppRoute {
  view: AppView
  projectId: number | null
  makerId: number | null
}

/**
 * 현재 URL → 앱 라우트. 별칭 보존: `/projects/:id`, `/admin`, `?view=admin`.
 * SSR/비브라우저 환경에서는 기본 마켓 라우트를 돌려준다.
 */
export function matchRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return { view: 'market', projectId: null, makerId: null }
  }

  const { pathname, search } = window.location
  const detailMatch = pathname.match(/\/projects\/(\d+)\/?$/)
  const projectId = detailMatch ? toFiniteId(detailMatch[1]) : null

  const makerMatch = pathname.match(/\/makers\/(\d+)\/?$/)
  const makerId = makerMatch ? toFiniteId(makerMatch[1]) : null

  const lastSegment = pathname.replace(/\/+$/, '').split('/').filter(Boolean).slice(-1)[0]
  const isAdminPath = lastSegment === ADMIN_PATH_SEGMENT
  const view: AppView =
    new URLSearchParams(search).get('view') === 'admin' || isAdminPath ? 'admin' : 'market'

  return { view, projectId, makerId }
}

function toFiniteId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) ? id : null
}

export const routePath = {
  market: (): string => '/',
  detail: (id: number): string => `/projects/${id}`,
  maker: (id: number): string => `/makers/${id}`,
}

/** history.pushState 래퍼. 한 곳에서만 URL을 바꿔 popstate 재해석과 일관성을 유지한다. */
export function navigate(path: string, state: unknown = {}): void {
  if (typeof window === 'undefined') {
    return
  }
  window.history.pushState(state, '', path)
}

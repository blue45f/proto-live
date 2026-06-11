import {
  ABOUT_PATH_SEGMENT,
  ADMIN_PATH_SEGMENT,
  DISCUSSIONS_PATH_SEGMENT,
  MESSAGES_PATH_SEGMENT,
  PRIVACY_PATH_SEGMENT,
  SUBMIT_PATH_SEGMENT,
  SUPPORT_PATH_SEGMENT,
  TERMS_PATH_SEGMENT,
  type AppView,
  type PolicyView,
} from '../lib/constants'

/**
 * 핸드롤 라우터. 의존성 추가 없이(boilerplate 의존성은 react/axios/lucide만) 현재
 * URL을 앱 라우트로 해석하고 history 내비게이션을 한 곳에 모은다. 라우트가 늘어나면
 * 아래 MATCHERS 테이블만 확장하면 된다. 자세한 결정 배경은
 * docs/adr/0001-handrolled-router.md 참고.
 */

/** 라우트가 화면 위에 띄우는 부가 의도. 피드 위에 모달로 겹쳐지는 딥링크에 쓴다. */
export type RouteIntent = 'submit' | null

/** 프로젝트 토론 서브라우트(분할 라우트): 목록 / 새 토론 작성 / 스레드 상세. */
export type DiscussionRoute =
  | { mode: 'list' }
  | { mode: 'new' }
  | { mode: 'detail'; discussionId: number }

export interface AppRoute {
  view: AppView
  projectId: number | null
  makerId: number | null
  /** `/submit` 딥링크 같은, 화면 전환이 아닌 모달 오버레이 의도. */
  intent: RouteIntent
  /** `/projects/:id/discussions[...]` — 프로젝트 커뮤니티 허브 서브라우트. */
  discussion: DiscussionRoute | null
  /** `/messages/:id` — 열려 있는 쪽지 대화. */
  conversationId: number | null
}

const MARKET_ROUTE: AppRoute = {
  view: 'market',
  projectId: null,
  makerId: null,
  intent: null,
  discussion: null,
  conversationId: null,
}

/**
 * 경로 매처 테이블. 위에서부터 먼저 매칭되는 항목이 이긴다(별칭 보존).
 * 각 매처는 정규화된 경로(후행 슬래시 제거)와 쿼리스트링을 받아 AppRoute 또는 null 반환.
 */
const MATCHERS: ReadonlyArray<(path: string, query: URLSearchParams) => AppRoute | null> = [
  // 프로젝트 토론 허브: /projects/:id/discussions · /new · /:discussionId
  (path) => {
    const match = path.match(new RegExp(`^/projects/(\\d+)/${DISCUSSIONS_PATH_SEGMENT}$`))
    return match
      ? { ...MARKET_ROUTE, projectId: toFiniteId(match[1]), discussion: { mode: 'list' } }
      : null
  },
  (path) => {
    const match = path.match(new RegExp(`^/projects/(\\d+)/${DISCUSSIONS_PATH_SEGMENT}/new$`))
    return match
      ? { ...MARKET_ROUTE, projectId: toFiniteId(match[1]), discussion: { mode: 'new' } }
      : null
  },
  (path) => {
    const match = path.match(new RegExp(`^/projects/(\\d+)/${DISCUSSIONS_PATH_SEGMENT}/(\\d+)$`))
    if (!match) {
      return null
    }
    const discussionId = toFiniteId(match[2])
    return {
      ...MARKET_ROUTE,
      projectId: toFiniteId(match[1]),
      discussion: discussionId !== null ? { mode: 'detail', discussionId } : { mode: 'list' },
    }
  },
  // 프로젝트 상세: /projects/:id
  (path) => {
    const match = path.match(/^\/projects\/(\d+)$/)
    return match ? { ...MARKET_ROUTE, projectId: toFiniteId(match[1]) } : null
  },
  // 메이커 프로필: /makers/:id
  (path) => {
    const match = path.match(/^\/makers\/(\d+)$/)
    return match ? { ...MARKET_ROUTE, makerId: toFiniteId(match[1]) } : null
  },
  // 쪽지함: /messages · /messages/:conversationId
  (path) => (path === `/${MESSAGES_PATH_SEGMENT}` ? { ...MARKET_ROUTE, view: 'messages' } : null),
  (path) => {
    const match = path.match(new RegExp(`^/${MESSAGES_PATH_SEGMENT}/(\\d+)$`))
    return match
      ? { ...MARKET_ROUTE, view: 'messages', conversationId: toFiniteId(match[1]) }
      : null
  },
  // 인앱 문의: /support (TermsDesk 중앙 문의 접수 폼)
  (path) =>
    lastSegment(path) === SUPPORT_PATH_SEGMENT ? { ...MARKET_ROUTE, view: 'support' } : null,
  // 등록 딥링크: /submit (피드 위에 등록 모달을 연다)
  (path) =>
    lastSegment(path) === SUBMIT_PATH_SEGMENT ? { ...MARKET_ROUTE, intent: 'submit' } : null,
  // 소개: /about (공개 페이지)
  (path) => (lastSegment(path) === ABOUT_PATH_SEGMENT ? { ...MARKET_ROUTE, view: 'about' } : null),
  // 법적 고지: /terms · /privacy (TermsDesk 게시 정본을 내부 페이지로 렌더)
  (path) => (lastSegment(path) === TERMS_PATH_SEGMENT ? { ...MARKET_ROUTE, view: 'terms' } : null),
  (path) =>
    lastSegment(path) === PRIVACY_PATH_SEGMENT ? { ...MARKET_ROUTE, view: 'privacy' } : null,
  // 운영 콘솔 분할 라우트: /admin/community · /admin/members (admin 매처보다 먼저).
  (path) =>
    path === `/${ADMIN_PATH_SEGMENT}/community`
      ? { ...MARKET_ROUTE, view: 'adminCommunity' }
      : null,
  (path) =>
    path === `/${ADMIN_PATH_SEGMENT}/members` ? { ...MARKET_ROUTE, view: 'adminMembers' } : null,
  // 운영 콘솔: /admin 또는 ?view=admin (별칭 보존)
  (path, query) =>
    lastSegment(path) === ADMIN_PATH_SEGMENT || query.get('view') === 'admin'
      ? { ...MARKET_ROUTE, view: 'admin' }
      : null,
]

/**
 * 현재 URL → 앱 라우트. 별칭 보존: `/projects/:id`, `/makers/:id`, `/submit`, `/admin`, `?view=admin`.
 * SSR/비브라우저 환경에서는 기본 마켓 라우트를 돌려준다.
 */
export function matchRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return MARKET_ROUTE
  }

  const { pathname, search } = window.location
  const path = pathname.replace(/\/+$/, '') || '/'
  const query = new URLSearchParams(search)

  for (const matcher of MATCHERS) {
    const route = matcher(path, query)
    if (route) {
      return route
    }
  }

  return MARKET_ROUTE
}

function lastSegment(path: string): string {
  return path.split('/').filter(Boolean).slice(-1)[0] ?? ''
}

function toFiniteId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) ? id : null
}

export const routePath = {
  market: (): string => '/',
  detail: (id: number): string => `/projects/${id}`,
  maker: (id: number): string => `/makers/${id}`,
  submit: (): string => `/${SUBMIT_PATH_SEGMENT}`,
  about: (): string => `/${ABOUT_PATH_SEGMENT}`,
  policy: (view: PolicyView): string =>
    view === 'terms' ? `/${TERMS_PATH_SEGMENT}` : `/${PRIVACY_PATH_SEGMENT}`,
  support: (): string => `/${SUPPORT_PATH_SEGMENT}`,
  discussions: (projectId: number): string => `/projects/${projectId}/${DISCUSSIONS_PATH_SEGMENT}`,
  discussionNew: (projectId: number): string =>
    `/projects/${projectId}/${DISCUSSIONS_PATH_SEGMENT}/new`,
  discussion: (projectId: number, discussionId: number): string =>
    `/projects/${projectId}/${DISCUSSIONS_PATH_SEGMENT}/${discussionId}`,
  messages: (): string => `/${MESSAGES_PATH_SEGMENT}`,
  conversation: (conversationId: number): string => `/${MESSAGES_PATH_SEGMENT}/${conversationId}`,
  adminCommunity: (): string => `/${ADMIN_PATH_SEGMENT}/community`,
  adminMembers: (): string => `/${ADMIN_PATH_SEGMENT}/members`,
}

/** history.pushState 래퍼. 한 곳에서만 URL을 바꿔 popstate 재해석과 일관성을 유지한다. */
export function navigate(path: string, state: unknown = {}): void {
  if (typeof window === 'undefined') {
    return
  }
  window.history.pushState(state, '', path)
}

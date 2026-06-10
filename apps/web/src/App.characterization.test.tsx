import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeApiMock, adminSession, makerSession } from './test/api-mock'
import {
  projectCareloop,
  projectMealmap,
  publicPrivacyPolicy,
  publicTermsPolicy,
} from './test/fixtures'
import type { PublicPolicy } from './lib/termsdesk'

// Pure helpers (extractProjects/hasPagination/etc.) stay real via importActual
// so App's derivation logic is still exercised; only the network functions are
// swapped for the (singleton) mock. The factory imports the mock lazily so there
// is no hoisting/initialization ordering problem.
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api')
  const { makeApiMock: make } = await import('./test/api-mock')
  return { ...actual, ...make() }
})

// Same singleton instance the factory installed -> usable for clear/override.
const mockApi = makeApiMock()

import App from './App'
import * as api from './api'

function setPath(path: string) {
  window.history.pushState({}, '', path)
}

beforeEach(() => {
  // Reset to a clean market route + logged-out session before every test.
  setPath('/')
  localStorage.clear()
  Object.values(mockApi).forEach((fn) => fn.mockClear())
  // Re-apply default resolved values cleared by mockClear (mockClear keeps the
  // implementation, so defaults from makeApiMock persist; nothing to redo).
})

afterEach(() => {
  window.history.pushState({}, '', '/')
})

async function renderAppLoaded() {
  const result = render(<App />)
  // Wait until the initial snapshot load resolves and the first project renders.
  await screen.findByText(projectMealmap.title)
  return result
}

describe('App characterization: initial market render', () => {
  it('renders the ProtoLive shell header and brand', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'ProtoLive', level: 1 })).toBeInTheDocument()
  })

  it('hides the operator navigation for logged-out visitors', async () => {
    await renderAppLoaded()
    // 권한별 메뉴 숨김: 비운영자에게는 운영 콘솔 토글과 전체 갱신 버튼이 보이지 않는다.
    expect(screen.queryByRole('button', { name: '운영 현황' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '프로토타입 둘러보기' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '전체 사이트 상태 새로고침' })
    ).not.toBeInTheDocument()
  })

  it('shows the project list fetched from the API once loading resolves', async () => {
    await renderAppLoaded()
    expect(screen.getByText(projectMealmap.title)).toBeInTheDocument()
    expect(screen.getByText(projectCareloop.title)).toBeInTheDocument()
    expect(api.fetchProjects).toHaveBeenCalled()
  })

  it('marks the API status as connected after a successful load', async () => {
    await renderAppLoaded()
    expect(screen.getByText('서버 연결됨')).toBeInTheDocument()
  })

  it('shows a login affordance and no user chip when logged out', async () => {
    await renderAppLoaded()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()
  })
})

describe('App characterization: project detail routing', () => {
  it('renders project detail when starting on a /projects/:id route', async () => {
    setPath(`/projects/${projectMealmap.id}`)
    render(<App />)

    // Detail route header + back button appear (and not the list filter chips).
    expect(await screen.findByRole('button', { name: '목록으로 돌아가기' })).toBeInTheDocument()
    expect(screen.getByText(projectMealmap.title)).toBeInTheDocument()
    expect(api.fetchProjectReviews).toHaveBeenCalledWith(projectMealmap.id)
    expect(api.fetchProjectEvents).toHaveBeenCalledWith(projectMealmap.id)
  })

  it('navigates into a project detail when a card is opened and updates history', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    // Each card exposes a "상세 보기" button. Open the first project's detail.
    const detailButtons = screen.getAllByRole('button', { name: /상세 보기/ })
    await user.click(detailButtons[0])

    expect(await screen.findByRole('button', { name: '목록으로 돌아가기' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/projects/${projectMealmap.id}`)
  })

  it('returns to the list (root path) when the back button is pressed', async () => {
    const user = userEvent.setup()
    setPath(`/projects/${projectMealmap.id}`)
    render(<App />)

    const back = await screen.findByRole('button', { name: '목록으로 돌아가기' })
    await user.click(back)

    await waitFor(() => expect(window.location.pathname).toBe('/'))
    // List filter UI (search box) is back.
    expect(
      await screen.findByPlaceholderText('이름, 설명, URL, 카테고리, 태그 검색')
    ).toBeInTheDocument()
  })

  it('responds to browser back/forward (popstate) by re-deriving the route', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    const detailButtons = screen.getAllByRole('button', { name: /상세 보기/ })
    await user.click(detailButtons[0])
    expect(await screen.findByRole('button', { name: '목록으로 돌아가기' })).toBeInTheDocument()

    // Simulate the browser Back button: revert URL then fire popstate.
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '목록으로 돌아가기' })).not.toBeInTheDocument()
    )
  })
})

describe('App characterization: filters', () => {
  it('narrows the visible set to favorites when "저장한 사이트만" is toggled', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    // Star/save the first project from its card so a favorite exists.
    const saveButtons = screen.getAllByRole('button', {
      name: new RegExp(`${projectMealmap.title} 즐겨찾기 추가`),
    })
    await user.click(saveButtons[0])

    // Both projects visible before filtering.
    expect(screen.getByText(projectCareloop.title)).toBeInTheDocument()

    // Toggle the favorites-only filter.
    const favToggle = screen.getByRole('button', { name: '즐겨찾기만 보기 적용' })
    await user.click(favToggle)

    // Only the favorited project remains; the other is filtered out client-side.
    await waitFor(() => expect(screen.queryByText(projectCareloop.title)).not.toBeInTheDocument())
    expect(screen.getByText(projectMealmap.title)).toBeInTheDocument()
  })

  it('disables the primary favorites toggle until at least one project is saved', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    // With no favorites yet, the header favorites toggle is disabled and clicking
    // it is a no-op (current guard: it only toggles when favoriteCount > 0).
    const favToggle = screen.getByRole('button', { name: '즐겨찾기만 보기 적용' })
    expect(favToggle).toBeDisabled()
    await user.click(favToggle)
    expect(screen.getByText(projectCareloop.title)).toBeInTheDocument()

    // After saving a project the toggle becomes enabled.
    const saveButtons = screen.getAllByRole('button', {
      name: new RegExp(`${projectMealmap.title} 즐겨찾기 추가`),
    })
    await user.click(saveButtons[0])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '즐겨찾기만 보기 적용' })).toBeEnabled()
    )
  })

  it('exposes pressed state on category, visibility, and funding preset chips', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    // Category chips mirror the tag-chip toggle semantics: the active one is pressed.
    const allCategories = screen.getByRole('button', { name: '전체' })
    const commerceChip = screen.getByRole('button', { name: '커머스' })
    expect(allCategories).toHaveAttribute('aria-pressed', 'true')
    expect(commerceChip).toHaveAttribute('aria-pressed', 'false')
    await user.click(commerceChip)
    await waitFor(() => expect(commerceChip).toHaveAttribute('aria-pressed', 'true'))
    expect(allCategories).toHaveAttribute('aria-pressed', 'false')

    // Advanced filters: access-mode chips and funding presets announce selection too.
    await user.click(screen.getByRole('button', { name: '필터 더보기' }))
    expect(await screen.findByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    const seedPreset = screen.getByRole('button', { name: '시드' })
    expect(seedPreset).toHaveAttribute('aria-pressed', 'false')
    await user.click(seedPreset)
    await waitFor(() => expect(seedPreset).toHaveAttribute('aria-pressed', 'true'))
  })

  it('gives the project search input an accessible name beyond its placeholder', async () => {
    await renderAppLoaded()
    expect(screen.getByRole('textbox', { name: '프로토타입 검색' })).toBeInTheDocument()
  })
})

describe('App characterization: login modal', () => {
  it('opens and closes the login modal from the header', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    await user.click(screen.getByRole('button', { name: '로그인' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('테스트 계정')).toBeInTheDocument()
    // Test-account quick-fill buttons are rendered from the fixtures JSON.
    expect(within(dialog).getByText('프로토라이브 운영자')).toBeInTheDocument()

    // "나중에" closes the modal.
    await user.click(within(dialog).getByRole('button', { name: '나중에' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('App characterization: admin route guard', () => {
  it('falls back to the market view for an unauthenticated admin URL', async () => {
    setPath('/admin')
    render(<App />)

    // effectiveView downgrades admin -> market once session hydration resolves
    // to "no session", so the project list (not the admin dashboard) renders.
    expect(await screen.findByText(projectMealmap.title)).toBeInTheDocument()
    expect(
      screen.queryByText('투자 딜 성사율을 높이는 운영 정책을 수익 가정 기반으로 설계하세요.')
    ).not.toBeInTheDocument()
  })

  it('renders the admin dashboard when an admin session is present on /admin', async () => {
    vi.mocked(api.fetchAuthSession).mockResolvedValueOnce(adminSession)
    setPath('/admin')
    render(<App />)

    expect(
      await screen.findByText('투자 딜 성사율을 높이는 운영 정책을 수익 가정 기반으로 설계하세요.')
    ).toBeInTheDocument()
    expect(api.fetchAdminDashboard).toHaveBeenCalled()
    // The admin role chip is shown for the operator.
    expect(screen.getByText('운영자')).toBeInTheDocument()
    // 운영자에게는 운영 콘솔 토글과 전체 갱신 버튼이 노출된다.
    expect(screen.getByRole('button', { name: '운영 현황' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '프로토타입 둘러보기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전체 사이트 상태 새로고침' })).toBeInTheDocument()
  })
})

describe('App characterization: submit deep link', () => {
  it('opens the submit composer when a maker lands on /submit', async () => {
    vi.mocked(api.fetchAuthSession).mockResolvedValueOnce(makerSession)
    setPath('/submit')
    render(<App />)

    // 딥링크 진입 시 세션·설정이 준비된 뒤 등록 모달이 자동으로 열린다.
    expect(await screen.findByText('라이브 프로토타입 등록')).toBeInTheDocument()
  })
})

describe('App characterization: about page', () => {
  it('renders the public about page on /about for logged-out visitors', async () => {
    setPath('/about')
    render(<App />)

    // 공개 페이지라 비로그인도 접근 가능(시장으로 튕기지 않음).
    expect(await screen.findByText('커뮤니티가 먼저, 투자는 사다리 위에')).toBeInTheDocument()
    expect(screen.getByText('바이브코딩 네이티브')).toBeInTheDocument()
  })

  it('navigates to /about when the 소개 link is clicked', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    await user.click(screen.getByRole('button', { name: '소개' }))

    await waitFor(() => expect(window.location.pathname).toBe('/about'))
    expect(await screen.findByText('어느 단계든 환영합니다')).toBeInTheDocument()
  })
})

describe('App characterization: market hero CTA', () => {
  it('routes the hero 내 사이트 등록하기 CTA into the login gate when logged out', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    // 히어로 1차 CTA는 헤더 버튼과 같은 openSubmitDialog 가드를 타므로
    // 비로그인 클릭은 로그인 모달로 안내된다.
    await user.click(screen.getByRole('button', { name: '내 사이트 등록하기' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('테스트 계정')).toBeInTheDocument()
  })

  it('navigates to /about when the hero 작동 방식 보기 CTA is clicked', async () => {
    const user = userEvent.setup()
    await renderAppLoaded()

    await user.click(screen.getByRole('button', { name: '작동 방식 보기' }))

    await waitFor(() => expect(window.location.pathname).toBe('/about'))
    expect(await screen.findByText('커뮤니티가 먼저, 투자는 사다리 위에')).toBeInTheDocument()
  })
})

describe('App characterization: legal policy pages', () => {
  // PolicyView 는 ./api 가 아니라 TermsDesk 공개 API를 전역 fetch 로 직접 호출하므로
  // 이 블록에서만 fetch 를 스텁한다(시장 데이터 경로와 분리된 외부 표면).
  function stubPolicyFetch(policy: PublicPolicy) {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => policy }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('serves 이용약관 from the footer as an internal page instead of an external redirect', async () => {
    const fetchMock = stubPolicyFetch(publicTermsPolicy)
    const user = userEvent.setup()
    await renderAppLoaded()

    const termsLink = screen.getByRole('link', { name: '이용약관' })
    // 내부 라우트 href — 새 탭 외부 이동이 아니다.
    expect(termsLink).toHaveAttribute('href', '/terms')
    expect(termsLink).not.toHaveAttribute('target')

    await user.click(termsLink)

    await waitFor(() => expect(window.location.pathname).toBe('/terms'))
    expect(await screen.findByRole('heading', { name: '이용약관', level: 2 })).toBeInTheDocument()
    // 신뢰 표면: 버전·해시 축약이 페이지 하단에 그대로 노출된다.
    expect(await screen.findByText('12b390fde0d4')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://termsdesk.vercel.app/api/public/proto-live/policies/terms-of-service',
      expect.anything()
    )
  })

  it('renders the privacy policy internally on a /privacy deep link', async () => {
    stubPolicyFetch(publicPrivacyPolicy)
    setPath('/privacy')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: '개인정보처리방침', level: 2 })
    ).toBeInTheDocument()
    expect(await screen.findByText('da889f525586')).toBeInTheDocument()
  })

  it('keeps the support board link external to TermsDesk', async () => {
    await renderAppLoaded()

    const supportLink = screen.getByRole('link', { name: '지원' })
    expect(supportLink).toHaveAttribute('href', 'https://termsdesk.vercel.app/support/proto-live')
    expect(supportLink).toHaveAttribute('target', '_blank')
  })
})

describe('App characterization: header/footer mid-breakpoint contract', () => {
  // jsdom은 레이아웃을 계산하지 않으므로, 600~1023px 중간 폭 깨짐을 고친
  // 반응형 클래스 계약을 가드한다(클래스가 빠지면 같은 회귀가 재발한다).

  it('caps the brand subtitle through tablet widths and releases it on desktop', async () => {
    await renderAppLoaded()

    // nowrap(truncate) 부제가 max-content로 브랜드 존을 키우면 768~1023px에서
    // 우측 액션 존이 좁은 세로 기둥으로 무너진다 — 중간 구간 16rem 캡이 방지선.
    const subtitle = screen.getByText(
      '바이브코딩으로 만든 사이트를 올리고 커뮤니티 피드백과 투자 관심을 받으세요'
    )
    expect(subtitle).toHaveClass('truncate', 'max-w-64', 'lg:max-w-none')

    // 브랜드 배지는 폭 압박에서 두 줄 알약으로 꺾이지 않는다(CJK 중간 개행 방지).
    expect(screen.getByText('공유·피드백·투자')).toHaveClass('whitespace-nowrap')

    // 헤더 줄바꿈 정의: 중간 폭은 graceful wrap, 데스크톱(lg+)만 한 줄 고정.
    const header = screen
      .getByRole('heading', { name: 'ProtoLive', level: 1 })
      .closest('header') as HTMLElement
    expect(header.firstElementChild).toHaveClass('flex-wrap', 'lg:flex-nowrap')
  })

  it('lets the operator pill group scroll instead of overflowing a narrow action zone', async () => {
    vi.mocked(api.fetchAuthSession).mockResolvedValueOnce(adminSession)
    await renderAppLoaded()

    // shrink-0이 붙으면 min-w-0 + overflow-x-auto 탈출구가 무력화되어
    // 768px 부근에서 필 그룹이 액션 존 밖으로 밀려난다.
    const pillGroup = (await screen.findByRole('button', { name: '운영 현황' }))
      .parentElement as HTMLElement
    expect(pillGroup).toHaveClass('min-w-0', 'overflow-x-auto')
    expect(pillGroup).not.toHaveClass('shrink-0')
  })

  it('keeps the notification popover inside the viewport below the sm breakpoint', async () => {
    vi.mocked(api.fetchAuthSession).mockResolvedValueOnce(makerSession)
    await renderAppLoaded()

    // <sm에서 벨은 justify-between 줄 중간에 오므로 right-0 팝오버(w-80)가
    // 좌측 화면 밖으로 잘렸다. details를 static으로 두면 팝오버가 가장 가까운
    // 포지션 조상인 sticky 헤더 우측에 정렬되어 항상 화면 안에 머문다.
    const bellSummary = await screen.findByLabelText('알림')
    expect(bellSummary.closest('details')).toHaveClass('static', 'sm:relative')
    expect(bellSummary.nextElementSibling).toHaveClass(
      'right-2',
      'max-w-[calc(100vw-1rem)]',
      'sm:right-0'
    )
  })

  it('keeps the footer row and legal nav wrap-safe at mid widths', async () => {
    await renderAppLoaded()

    const legalNav = screen.getByRole('navigation', { name: '법적 고지 링크' })
    expect(legalNav).toHaveClass('flex-wrap')
    expect(legalNav.parentElement).toHaveClass('flex-wrap')
  })
})

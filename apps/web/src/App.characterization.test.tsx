import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeApiMock, adminSession, makerSession } from './test/api-mock'
import { projectCareloop, projectMealmap } from './test/fixtures'

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

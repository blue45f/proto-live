import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import * as api from './infrastructure/api'
import { makerSession } from './test/api-mock'
import { resetAppHarness, restoreAppHarness, setPath } from './test/app-harness'
import { projectMealmap } from './test/fixtures'

vi.mock('./infrastructure/api', async () => {
  const actual =
    await vi.importActual<typeof import('./infrastructure/api')>('./infrastructure/api')
  const { makeApiMock: make } = await import('./test/api-mock')
  return { ...actual, ...make() }
})

beforeEach(resetAppHarness)

afterEach(() => {
  vi.unstubAllGlobals()
  restoreAppHarness()
})

describe('community: project discussion split routes', () => {
  it('renders the discussion hub list on a /projects/:id/discussions deep link', async () => {
    vi.mocked(api.fetchProjectDiscussions).mockResolvedValueOnce([
      {
        id: 5,
        projectId: projectMealmap.id,
        projectTitle: projectMealmap.title,
        category: 'question',
        title: '결제 연동 질문',
        excerpt: '어떤 도구로 결제를 붙이셨나요?',
        authorEmail: 'curious@example.com',
        authorName: '궁금이',
        status: 'visible',
        commentCount: 2,
        attachmentCount: 0,
        createdAt: '2026-06-10T00:00:00.000Z',
        lastActivityAt: '2026-06-11T00:00:00.000Z',
      },
    ])
    setPath(`/projects/${projectMealmap.id}/discussions`)
    render(<App />)

    expect(await screen.findByText('결제 연동 질문')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '토론' })).toBeInTheDocument()
  })

  it('shows the composer on the /discussions/new route and gates submit on length', async () => {
    setPath(`/projects/${projectMealmap.id}/discussions/new`)
    render(<App />)

    const submit = await screen.findByRole('button', { name: '토론 등록' })
    // 제목 2자·본문 10자 미만이면 제출은 비활성(서버 계약과 같은 경계).
    expect(submit).toBeDisabled()
  })

  it('renders an empty state when a project has no discussions', async () => {
    vi.mocked(api.fetchProjectDiscussions).mockResolvedValueOnce([])
    setPath(`/projects/${projectMealmap.id}/discussions`)
    render(<App />)

    expect(await screen.findByText('아직 토론이 없어요.')).toBeInTheDocument()
  })
})

describe('community: in-app inquiry (support) view', () => {
  // desk-platform 공개 게시판: 마운트 시 목록(GET), 제출 시 등록(POST).
  // 메서드로 분기해 GET 은 빈 목록, POST 는 생성된 Inquiry 를 돌려준다.
  function stubInquiryFetch(onPost?: (init: RequestInit) => Response) {
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'POST') {
        return (
          onPost?.(init ?? {}) ??
          new Response(
            JSON.stringify({
              id: 'inq_TEST',
              appId: 'proto-live',
              category: 'bug',
              status: 'new',
              title: '오류 화면 제보',
              body: '상세 페이지에서 빈 화면이 뜹니다.',
              authorName: null,
              createdAt: '2026-06-12T00:00:00.000Z',
              updatedAt: '2026-06-12T00:00:00.000Z',
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        )
      }
      return new Response(
        JSON.stringify({ appId: 'proto-live', items: [], limit: 20, offset: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    vi.stubGlobal('fetch', fetchSpy)
    return fetchSpy
  }

  it('submits an inquiry to the desk-platform board and confirms receipt', async () => {
    const user = userEvent.setup()
    const fetchSpy = stubInquiryFetch()

    setPath('/support')
    render(<App />)

    expect(await screen.findByRole('heading', { name: '문의하기', level: 2 })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /버그 신고/ }))
    await user.type(screen.getByPlaceholderText('문의 제목을 입력해주세요'), '오류 화면 제보')
    await user.type(
      screen.getByPlaceholderText('문의 내용을 구체적으로 적어주세요. (최소 10자)'),
      '상세 페이지에서 빈 화면이 뜹니다. 재현 경로를 첨부합니다.'
    )
    await user.click(screen.getByRole('button', { name: '문의 보내기' }))

    expect(await screen.findByText('문의가 접수되었어요')).toBeInTheDocument()

    // POST 호출: 허니팟(website)은 빈 값으로, originUrl 은 location.href 로 전송된다.
    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST'
    ) as [string, RequestInit] | undefined
    expect(postCall?.[0]).toContain('/api/v1/apps/proto-live/inquiries')
    const payload = JSON.parse(String(postCall?.[1].body))
    expect(payload.website).toBe('')
    expect(payload.category).toBe('bug')
    expect(typeof payload.originUrl).toBe('string')
  })

  it('surfaces a server error message when submission fails', async () => {
    const user = userEvent.setup()
    stubInquiryFetch(
      () =>
        new Response(JSON.stringify({ message: ['title: Too long'] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    )

    setPath('/support')
    render(<App />)

    await screen.findByRole('heading', { name: '문의하기', level: 2 })
    await user.type(screen.getByPlaceholderText('문의 제목을 입력해주세요'), '정상 제목')
    await user.type(
      screen.getByPlaceholderText('문의 내용을 구체적으로 적어주세요. (최소 10자)'),
      '열 자가 넘는 정상 본문입니다.'
    )
    await user.click(screen.getByRole('button', { name: '문의 보내기' }))

    expect(await screen.findByText(/title: Too long/)).toBeInTheDocument()
  })
})

describe('community: messages inbox', () => {
  it('asks logged-out visitors to sign in', async () => {
    setPath('/messages')
    render(<App />)
    expect(await screen.findByText('쪽지함은 로그인 후 이용할 수 있어요')).toBeInTheDocument()
  })

  it('shows the empty inbox state for a signed-in maker with no conversations', async () => {
    vi.mocked(api.fetchAuthSession).mockResolvedValue(makerSession)
    vi.mocked(api.fetchConversations).mockResolvedValue([])

    setPath('/messages')
    render(<App />)

    await waitFor(() => expect(screen.getByText('아직 주고받은 쪽지가 없어요')).toBeInTheDocument())
  })
})

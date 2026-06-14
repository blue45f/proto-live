import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from '../../infrastructure/api'
import { createAppQueryClient } from '../../infrastructure/queryClient'
import { makeApiMock } from '../../test/api-mock'

import { AdminMembersView } from './AdminMembersView'

import type { AdminMember } from '../../infrastructure/api'

vi.mock('../../infrastructure/api', async () => {
  const actual = await vi.importActual<typeof import('../../infrastructure/api')>(
    '../../infrastructure/api'
  )
  const { makeApiMock: make } = await import('../../test/api-mock')
  return { ...actual, ...make() }
})

const mockApi = makeApiMock()

const sampleMember: AdminMember = {
  id: 1,
  email: 'maker@example.com',
  name: '메이커',
  role: 'maker',
  status: 'active',
  notes: null,
  suspensionReason: null,
  suspendedAt: null,
  suspendedBy: null,
  withdrawalReason: null,
  withdrawnAt: null,
  projectCount: 2,
  reviewCount: 3,
  upvoteCount: 4,
  proposalCount: 1,
  lastActivityAt: null,
}

function renderView() {
  // 컴포넌트는 App 의 QueryClientProvider 안에서 동작하므로, 단독 렌더에선 동일 옵션의
  // 클라이언트를 직접 감싼다(전역 기본값: 재시도/포커스 재요청 없음).
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <AdminMembersView />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockClear())
  // 기본 구현을 매 테스트마다 되돌려, 앞선 테스트의 mockResolvedValue 가 새지 않게 한다.
  vi.mocked(api.fetchAdminMembers).mockResolvedValue([])
})

describe('AdminMembersView (react-query)', () => {
  it('shows a spinner while loading, then renders the fetched members', async () => {
    vi.mocked(api.fetchAdminMembers).mockResolvedValue([sampleMember])

    renderView()

    // 로딩 상태(기존 members === null 계약 보존).
    expect(screen.getByText('회원을 불러오는 중…')).toBeInTheDocument()

    expect(await screen.findByText('메이커')).toBeInTheDocument()
    expect(api.fetchAdminMembers).toHaveBeenCalledTimes(1)
  })

  it('surfaces the error copy when the fetch fails', async () => {
    vi.mocked(api.fetchAdminMembers).mockRejectedValueOnce(new Error('boom'))

    renderView()

    expect(await screen.findByText('회원 목록을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('refetches the member list after a notes save', async () => {
    vi.mocked(api.fetchAdminMembers).mockResolvedValue([sampleMember])
    vi.mocked(api.updateAdminMemberNotes).mockResolvedValueOnce({ id: 1, notes: 'hello' })

    const user = userEvent.setup()
    renderView()

    await screen.findByText('메이커')
    expect(api.fetchAdminMembers).toHaveBeenCalledTimes(1)

    await user.type(screen.getByPlaceholderText('이 회원에 대한 운영 메모 (선택)'), 'hello')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(api.updateAdminMemberNotes).toHaveBeenCalledWith(1, 'hello'))
    // 저장 후 목록을 다시 불러오는 기존 동작(onSaved → load → refetch)을 보존한다.
    await waitFor(() => expect(api.fetchAdminMembers).toHaveBeenCalledTimes(2))
  })
})

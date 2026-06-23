import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import * as api from './infrastructure/api'
import { adminSession } from './test/api-mock'
import { resetAppHarness, restoreAppHarness, setPath } from './test/app-harness'
import { projectMealmap } from './test/fixtures'

// Same hermetic api mock the other characterization suites use: only the network
// functions are swapped, pure helpers stay real via importActual. (vi.mock must be
// hoisted per-file, so it stays here; the rest of the scaffolding is shared.)
vi.mock('./infrastructure/api', async () => {
  const actual =
    await vi.importActual<typeof import('./infrastructure/api')>('./infrastructure/api')
  const { makeApiMock: make } = await import('./test/api-mock')
  return { ...actual, ...make() }
})

beforeEach(resetAppHarness)
afterEach(restoreAppHarness)

// 서버 상태 react-query 마이그레이션 가드. loadSnapshot 의 분기(뷰 게이팅)와
// apiOnline/loadError 파생, 그리고 폴링·재요청 의미가 그대로 유지되는지 고정한다.
describe('App snapshot react-query migration', () => {
  it('market view fetches projects but not the admin dashboard (enabled gating)', async () => {
    render(<App />)
    await screen.findByText(projectMealmap.title)

    // 시장 뷰: projects/config/stats 는 가져오고, 운영 콘솔 번들은 게이트로 막힌다.
    expect(api.fetchProjects).toHaveBeenCalled()
    expect(api.fetchMarketConfig).toHaveBeenCalled()
    expect(api.fetchMarketStats).toHaveBeenCalled()
    expect(api.fetchAdminDashboard).not.toHaveBeenCalled()
    expect(api.fetchAdminReportedReviews).not.toHaveBeenCalled()
  })

  it('admin view fetches the admin bundle but not the market project list', async () => {
    vi.mocked(api.fetchAuthSession).mockResolvedValueOnce(adminSession)
    setPath('/admin')
    render(<App />)

    await screen.findByRole('heading', { name: /운영 정책을 수익 가정 기반으로 설계하세요/i })

    // 운영 뷰: admin 번들(대시보드/수익/신고/감사) 은 가져오되, 시장 목록은 게이트로 막힌다.
    expect(api.fetchAdminDashboard).toHaveBeenCalled()
    expect(api.fetchAdminRevenueProjection).toHaveBeenCalled()
    expect(api.fetchAdminReportedReviews).toHaveBeenCalled()
    expect(api.fetchAdminAuditLogs).toHaveBeenCalled()
    expect(api.fetchMarketConfig).toHaveBeenCalled()
    expect(api.fetchMarketStats).toHaveBeenCalled()
    expect(api.fetchProjects).not.toHaveBeenCalled()
  })

  it('surfaces an offline status when the initial market load fails at the network layer', async () => {
    // 네트워크 단절(HTTP 응답 없음) → apiOnline=false → 'API Offline' 표시(기존 분기 보존).
    // config/stats/projects 의 첫 패치를 모두 끊어 활성 쿼리 전체가 실패하는 상황을 재현한다.
    // mockRejectedValueOnce 만 써서 다음 패치/다른 테스트로 구현이 새지 않게 한다.
    vi.mocked(api.fetchProjects).mockRejectedValueOnce(new Error('network down'))
    vi.mocked(api.fetchMarketConfig).mockRejectedValueOnce(new Error('network down'))
    vi.mocked(api.fetchMarketStats).mockRejectedValueOnce(new Error('network down'))
    render(<App />)

    await waitFor(() => expect(screen.getByText('API Offline')).toBeInTheDocument())
  })
})

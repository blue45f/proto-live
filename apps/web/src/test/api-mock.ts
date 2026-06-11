import { vi } from 'vitest'
import type { AuthSession } from '../api'
import {
  adminDashboard,
  marketConfig,
  marketStats,
  projectEvents,
  projectReviews,
  projects,
} from './fixtures'

// ---------------------------------------------------------------------------
// Hermetic mock of ./api. App.tsx talks to the NestJS backend exclusively
// through the functions exported by ./api, so mocking that module gives a fully
// offline test surface with no axios/network involvement. The pure, non-network
// helpers (extractProjects / hasPagination / getApiErrorMessage / API_BASE and
// the type re-exports) are preserved via importActual so the real derivation
// logic still runs.
//
// Usage in a test file (must be at top level, hoisted by Vitest):
//
//   vi.mock('../api', async () => {
//     const actual = await vi.importActual<typeof import('../api')>('../api');
//     return { ...actual, ...makeApiMock() };
//   });
//
// Individual tests can then override behavior, e.g.:
//   vi.mocked(loginUser).mockResolvedValueOnce(adminSession);
// ---------------------------------------------------------------------------

export function makeApiMock() {
  return apiMock
}

const apiMock = buildApiMock()

function buildApiMock() {
  return {
    fetchAuthSession: vi.fn(async (): Promise<AuthSession | null> => null),
    loginUser: vi.fn(async (): Promise<AuthSession> => {
      throw new Error('loginUser not stubbed for this test')
    }),
    logoutUser: vi.fn(async () => ({ success: true })),
    fetchMarketConfig: vi.fn(async () => marketConfig),
    fetchMarketStats: vi.fn(async () => marketStats),
    fetchProjects: vi.fn(async () => projects),
    fetchProjectById: vi.fn(async (id: number) => {
      const project = projects.find((item) => item.id === id)
      if (!project) throw new Error(`fetchProjectById: no fixture project ${id}`)
      return project
    }),
    fetchProjectReviews: vi.fn(async () => projectReviews),
    fetchProjectEvents: vi.fn(async () => projectEvents),
    fetchAdminDashboard: vi.fn(async () => adminDashboard),
    fetchAdminRevenueProjection: vi.fn(async () => adminDashboard.revenue),
    fetchAdminReportedReviews: vi.fn(async () => []),
    fetchAdminAuditLogs: vi.fn(async () => []),
    refreshAllProjects: vi.fn(async () => projects),
    refreshProject: vi.fn(async () => projects[0]),
    createProject: vi.fn(async () => projects[0]),
    createMatchProposal: vi.fn(async () => projects[0]),
    createProjectReview: vi.fn(async () => ({ review: projectReviews[0], project: projects[0] })),
    reportProjectReview: vi.fn(async () => ({ review: projectReviews[0], project: projects[0] })),
    moderateProjectReview: vi.fn(async () => ({ review: projectReviews[0], project: projects[0] })),
    recordProjectEvent: vi.fn(async () => projects[0]),
    toggleProjectUpvote: vi.fn(async () => ({ project: projects[0], viewerUpvoted: true })),
    setProjectFeatured: vi.fn(async () => projects[0]),
    setSeasonChallenge: vi.fn(async () => null),
    fetchProjectLog: vi.fn(async () => []),
    addProjectLogEntry: vi.fn(async () => []),
    fetchMakerProfile: vi.fn(async () => ({
      id: projects[0].userId,
      name: '밀맵 팀',
      projects,
    })),
    fetchNotifications: vi.fn(async () => []),
    markNotificationsRead: vi.fn(async () => ({ read: 0 })),
    validateLiveUrl: vi.fn(async () => projects[0].validation),
    // 커뮤니티(토론/첨부/쪽지) — 기본은 빈 상태. 개별 테스트에서 mockResolvedValueOnce 로 덮는다.
    fetchProjectDiscussions: vi.fn(async () => []),
    createDiscussion: vi.fn(async () => {
      throw new Error('createDiscussion not stubbed for this test')
    }),
    fetchDiscussion: vi.fn(async () => {
      throw new Error('fetchDiscussion not stubbed for this test')
    }),
    deleteOwnDiscussion: vi.fn(async () => ({ hidden: true as const })),
    addDiscussionComment: vi.fn(async () => {
      throw new Error('addDiscussionComment not stubbed for this test')
    }),
    deleteDiscussionComment: vi.fn(async () => {
      throw new Error('deleteDiscussionComment not stubbed for this test')
    }),
    fetchAdminDiscussions: vi.fn(async () => []),
    moderateDiscussion: vi.fn(async () => ({ threadId: 0, action: 'hide' })),
    fetchAdminAttachments: vi.fn(async () => []),
    removeAdminAttachment: vi.fn(async () => {
      throw new Error('removeAdminAttachment not stubbed for this test')
    }),
    fetchConversations: vi.fn(async () => []),
    fetchConversationMessages: vi.fn(async () => {
      throw new Error('fetchConversationMessages not stubbed for this test')
    }),
    sendDirectMessage: vi.fn(async () => {
      throw new Error('sendDirectMessage not stubbed for this test')
    }),
    fetchAdminMembers: vi.fn(async () => []),
    updateAdminMemberNotes: vi.fn(async () => ({ id: 0, notes: null })),
  }
}

export const adminSession: AuthSession = {
  id: 10,
  email: 'admin-ops@protolive.local',
  role: 'admin',
  name: '프로토라이브 운영자',
  expiresAt: '2099-01-01T00:00:00.000Z',
}

export const makerSession: AuthSession = {
  id: 1,
  email: 'maker-mealmap@protolive.local',
  role: 'maker',
  name: '밀맵 팀',
  expiresAt: '2099-01-01T00:00:00.000Z',
}

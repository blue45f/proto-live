import { strict as assert } from 'node:assert'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createEmptyProjectsState } from '../src/projects/project.models'
import { ProjectsService } from '../src/projects/projects.service'
import { JsonProjectsStore } from '../src/projects/projects.store'

async function withService(run: (service: ProjectsService) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-notif-'))
  const previous = process.env.PROJECT_STORE_PATH
  const filePath = join(dir, 'store.json')
  try {
    process.env.PROJECT_STORE_PATH = filePath
    const state = createEmptyProjectsState()
    state.users.push({ id: 1, email: 'maker@example.com', role: 'maker' })
    state.users.push({ id: 2, email: 'member@example.com', role: 'member' })
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Notify Demo',
      description: 'A demo for notifications.',
      liveUrl: 'https://example.com/notify',
      category: 'AI & SaaS',
      accessMode: 'open',
      protectionNoticeAccepted: true,
      thumbnail: null,
      maturity: 'live',
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: {
        success: true,
        status: 200,
        message: 'ok',
        checkedAt: '2026-06-01T00:00:00.000Z',
        finalUrl: 'https://example.com/notify',
        responseTimeMs: 120,
      },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    state.nextUserId = 3
    state.nextProjectId = 2
    new JsonProjectsStore(filePath).write(state)
    const service = new ProjectsService()
    await service.onModuleInit()
    await run(service)
  } finally {
    if (previous === undefined) delete process.env.PROJECT_STORE_PATH
    else process.env.PROJECT_STORE_PATH = previous
    rmSync(dir, { recursive: true, force: true })
  }
}

test('타인의 리뷰는 메이커에게 알림을 생성한다', async () => {
  await withService(async (service) => {
    service.createProjectReview(1, {
      email: 'member@example.com',
      role: 'member',
      type: 'review',
      rating: 5,
      body: '데모 잘 봤습니다. 방향이 좋네요!',
    })
    const notifications = service.getNotifications('maker@example.com')
    assert.equal(notifications.length, 1)
    assert.equal(notifications[0].type, 'review')
    assert.equal(notifications[0].read, false)
    assert.equal(notifications[0].projectId, 1)
  })
})

test('본인(메이커) 활동은 자기 알림을 만들지 않는다', async () => {
  await withService(async (service) => {
    service.createProjectReview(1, {
      email: 'maker@example.com',
      role: 'maker',
      type: 'idea',
      body: '제가 직접 남기는 메모입니다.',
    })
    assert.equal(service.getNotifications('maker@example.com').length, 0)
  })
})

test('업보트는 메이커에게 알림을 생성하고 읽음 처리된다', async () => {
  await withService(async (service) => {
    service.toggleUpvote(1, 'member@example.com')
    const before = service.getNotifications('maker@example.com')
    assert.equal(before.length, 1)
    assert.equal(before[0].type, 'upvote')

    const changed = service.markNotificationsRead('maker@example.com')
    assert.equal(changed, 1)
    assert.equal(service.getNotifications('maker@example.com')[0].read, true)
  })
})

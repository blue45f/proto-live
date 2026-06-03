import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { ProjectsService } from '../src/projects/projects.service'
import { createEmptyProjectsState } from '../src/projects/project.models'
import { JsonProjectsStore } from '../src/projects/projects.store'

async function withProjectsService(run: (service: ProjectsService) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-protection-'))
  const previousStorePath = process.env.PROJECT_STORE_PATH
  const filePath = join(dir, 'store.json')

  try {
    process.env.PROJECT_STORE_PATH = filePath
    const state = createEmptyProjectsState()
    state.users.push({
      id: 1,
      email: 'maker@example.com',
      role: 'maker',
    })
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Protected MVP',
      description: 'A pre-launch service that needs screened access.',
      liveUrl: 'https://secret.example.com/demo?token=internal',
      category: 'AI & SaaS',
      accessMode: 'screened',
      protectionNoticeAccepted: true,
      thumbnail: null,
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: {
        success: true,
        status: 200,
        message: 'ok',
        checkedAt: '2026-06-01T00:00:00.000Z',
        finalUrl: 'https://secret.example.com/demo?token=internal',
        responseTimeMs: 140,
      },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    state.nextUserId = 2
    state.nextProjectId = 2

    new JsonProjectsStore(filePath).write(state)
    await run(new ProjectsService())
  } finally {
    if (previousStorePath === undefined) {
      delete process.env.PROJECT_STORE_PATH
    } else {
      process.env.PROJECT_STORE_PATH = previousStorePath
    }
    rmSync(dir, { recursive: true, force: true })
  }
}

test('screened projects redact URL details in public project responses', async () => {
  await withProjectsService(async (service) => {
    const project = await service.getProjectById(1)

    assert.equal(project.accessMode, 'screened')
    assert.equal(project.liveUrl, 'protected-review')
    assert.equal(project.validation.finalUrl, 'protected-review')
    assert.ok(!project.liveUrl.includes('secret.example.com'))
    assert.ok(!String(project.validation.finalUrl).includes('secret.example.com'))
    assert.ok(!project.liveUrl.includes('internal'))
    assert.ok(!String(project.validation.finalUrl).includes('internal'))
  })
})

test('screened project raw URL details are not searchable from public queries', async () => {
  await withProjectsService(async (service) => {
    const tokenHits = await service.getAllProjects({ q: 'internal' })
    assert.equal(tokenHits.length, 0)

    const hostHits = await service.getAllProjects({ q: 'secret.example.com' })
    assert.equal(hostHits.length, 0)

    const safeTitleHits = await service.getAllProjects({ q: 'Protected MVP' })
    assert.equal(safeTitleHits.length, 1)
    assert.equal(safeTitleHits[0].liveUrl, 'protected-review')
  })
})

test('screened projects reject direct preview and outbound telemetry', async () => {
  await withProjectsService((service) => {
    assert.throws(
      () => service.recordProjectEvent(1, 'preview'),
      /선별 공개 프로젝트는 매칭 요청 뒤 URL을 공유할 수 있습니다/
    )
    assert.throws(
      () => service.recordProjectEvent(1, 'outbound'),
      /선별 공개 프로젝트는 매칭 요청 뒤 URL을 공유할 수 있습니다/
    )

    const project = service.recordProjectEvent(1, 'refresh')
    assert.equal(project.eventSummary?.counts.refresh, 1)
  })
})

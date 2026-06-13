import { strict as assert } from 'node:assert'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createEmptyProjectsState } from '../src/projects/project.models'
import { ProjectsService } from '../src/projects/projects.service'
import { JsonProjectsStore } from '../src/projects/projects.store'

async function withService(run: (service: ProjectsService, storePath: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-challenge-'))
  const previous = process.env.PROJECT_STORE_PATH
  const filePath = join(dir, 'store.json')
  try {
    process.env.PROJECT_STORE_PATH = filePath
    new JsonProjectsStore(filePath).write(createEmptyProjectsState())
    const service = new ProjectsService()
    await service.onModuleInit()
    await run(service, filePath)
  } finally {
    if (previous === undefined) delete process.env.PROJECT_STORE_PATH
    else process.env.PROJECT_STORE_PATH = previous
    rmSync(dir, { recursive: true, force: true })
  }
}

test('setChallenge는 마감일을 ISO로 정규화해 저장하고 재기동 후에도 보존한다', async () => {
  await withService(async (service, storePath) => {
    const challenge = service.setChallenge(
      'AI 생산성 도구',
      '이번 주 테마로 제출해보세요.',
      '2026-06-30T23:59:59+09:00'
    )

    assert.ok(challenge)
    assert.equal(challenge.endsAt, new Date('2026-06-30T23:59:59+09:00').toISOString())

    const stored = JSON.parse(readFileSync(storePath, 'utf8'))
    assert.equal(stored.challenge.endsAt, challenge.endsAt)

    // 재기동 하이드레이션(JSON 폴백 경로)에서도 마감일이 보존된다.
    const restarted = new ProjectsService()
    await restarted.onModuleInit()
    assert.equal(restarted.getMarketConfig().challenge?.endsAt, challenge.endsAt)
  })
})

test('마감일 없이 게시하면 기존 챌린지와 동일하게 endsAt 없이 저장된다(하위호환)', async () => {
  await withService(async (service, storePath) => {
    const challenge = service.setChallenge('AI 생산성 도구', '이번 주 테마로 제출해보세요.')

    assert.ok(challenge)
    assert.equal(challenge.endsAt, undefined)

    const stored = JSON.parse(readFileSync(storePath, 'utf8'))
    assert.equal('endsAt' in stored.challenge, false)
  })
})

test('유효하지 않은 마감일은 버리고 챌린지 본문만 저장한다', async () => {
  await withService(async (service) => {
    const challenge = service.setChallenge('AI 생산성 도구', '이번 주 테마', 'not-a-date')

    assert.ok(challenge)
    assert.equal(challenge.endsAt, undefined)
  })
})

test('제목·설명을 모두 비우면 마감일과 무관하게 챌린지를 해제한다', async () => {
  await withService(async (service, storePath) => {
    service.setChallenge('AI 생산성 도구', '이번 주 테마', '2026-06-30T23:59:59+09:00')
    const cleared = service.setChallenge('', '', '2026-07-15T23:59:59+09:00')

    assert.equal(cleared, null)

    const stored = JSON.parse(readFileSync(storePath, 'utf8'))
    assert.equal(stored.challenge, null)
  })
})

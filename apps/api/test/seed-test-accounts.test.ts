import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

function runSeedScript(options: { fixturePath: string; storePath: string; dryRun?: boolean }) {
  const args = ['scripts/seed-test-accounts.mjs']
  if (options.dryRun) {
    args.push('--dry-run')
  }

  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PROJECT_STORE_PATH: options.storePath,
      TEST_ACCOUNTS_FIXTURE_PATH: options.fixturePath,
    },
  })
}

function createFixture(directory: string, filename: string, content: string) {
  const path = join(directory, filename)
  writeFileSync(path, content, 'utf8')
  return path
}

function readStore(storePath: string) {
  return JSON.parse(readFileSync(storePath, 'utf8'))
}

test('seed script errors when fixture JSON is malformed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-seed-malformed-'))
  const fixturePath = createFixture(
    dir,
    'malformed.json',
    '{ "version": "1.0", "accounts": [ { "email": "broken@protolive.local", "role": "maker", '
  )
  const storePath = join(dir, 'store.json')

  try {
    const result = runSeedScript({ fixturePath, storePath })

    assert.equal(result.status, 1)
    assert.match(result.stderr + result.stdout, /올바르지/)
    assert.equal(existsSync(storePath), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('seed script preserves existing user id and updates role when email already exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-seed-update-'))
  const fixturePath = createFixture(
    dir,
    'fixture.json',
    JSON.stringify({
      accounts: [
        {
          email: 'maker-update@protolive.local',
          role: 'investor',
        },
      ],
    })
  )
  const storePath = join(dir, 'store.json')

  writeFileSync(
    storePath,
    JSON.stringify(
      {
        users: [
          {
            id: 10,
            email: 'maker-update@protolive.local',
            role: 'maker',
          },
        ],
        projects: [],
        proposals: [],
        events: [],
        nextUserId: 11,
        nextProjectId: 1,
        nextProposalId: 1,
        nextEventId: 1,
      },
      null,
      2
    ),
    'utf8'
  )

  try {
    const result = runSeedScript({ fixturePath, storePath })

    assert.equal(result.status, 0)

    const state = readStore(storePath)
    assert.equal(state.users.length, 1)
    assert.equal(state.users[0].id, 10)
    assert.equal(state.users[0].role, 'investor')
    assert.equal(state.nextUserId, 11)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('seed script dry-run reports expected changes without writing store file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-seed-dry-run-'))
  const fixturePath = createFixture(
    dir,
    'fixture.json',
    JSON.stringify({
      accounts: [
        {
          email: 'seed-a@protolive.local',
          role: 'maker',
        },
        {
          email: 'seed-b@protolive.local',
          role: 'investor',
        },
      ],
    })
  )
  const storePath = join(dir, 'store.json')

  try {
    const result = runSeedScript({ fixturePath, storePath, dryRun: true })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /드라이 런 실행:/)
    assert.match(result.stdout, /예상 변경 사용자 수: 2/)
    assert.equal(existsSync(storePath), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

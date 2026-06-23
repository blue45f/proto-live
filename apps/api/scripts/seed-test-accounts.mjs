#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const args = new Set(process.argv.slice(2))
const isDryRun = args.has('--dry-run')

const ROOT = process.cwd()
const ROOT_BACKEND_DIR = join(ROOT, 'apps', 'api')
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR =
  existsSync(join(ROOT, 'package.json')) && existsSync(ROOT_BACKEND_DIR)
    ? ROOT_BACKEND_DIR
    : dirname(SCRIPT_DIR)

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    let val = match[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}
if (process.env.NODE_ENV !== 'test' && process.env.PROTOLIVE_TEST !== 'true') {
  loadEnvFile(join(BACKEND_DIR, '.env'))
}

const FIXTURE_PATH =
  process.env.TEST_ACCOUNTS_FIXTURE_PATH ?? join(BACKEND_DIR, 'fixtures', 'test-accounts.json')
const DEFAULT_STORE_PATH = join(BACKEND_DIR, 'data', 'protolive-store.json')
const STORE_PATH = process.env.PROJECT_STORE_PATH ?? DEFAULT_STORE_PATH

const DEFAULT_STATE = {
  users: [],
  projects: [],
  proposals: [],
  events: [],
  nextUserId: 1,
  nextProjectId: 1,
  nextProposalId: 1,
  nextEventId: 1,
}

const ALLOWED_ROLES = new Set(['maker', 'investor'])

function safeParseInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeRole(value) {
  return ALLOWED_ROLES.has(value) ? value : 'maker'
}

function safeReadJson(filePath) {
  try {
    if (!existsSync(filePath)) {
      return null
    }

    const raw = readFileSync(filePath, 'utf8')
    if (!raw.trim()) {
      return null
    }

    return JSON.parse(raw)
  } catch {
    return null
  }
}

function loadStoreState() {
  const parsed = safeReadJson(STORE_PATH)
  if (!parsed || typeof parsed !== 'object' || parsed === null) {
    return { ...DEFAULT_STATE }
  }

  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
    nextUserId: safeParseInt(parsed.nextUserId, DEFAULT_STATE.nextUserId),
    nextProjectId: safeParseInt(parsed.nextProjectId, DEFAULT_STATE.nextProjectId),
    nextProposalId: safeParseInt(parsed.nextProposalId, DEFAULT_STATE.nextProposalId),
    nextEventId: safeParseInt(parsed.nextEventId, DEFAULT_STATE.nextEventId),
  }
}

function writeStoreState(state) {
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  renameSync(tmp, STORE_PATH)
}

function loadFixtureAccounts() {
  const parsed = safeReadJson(FIXTURE_PATH)
  if (!parsed || typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.accounts)) {
    throw new Error(`fixture 파일 형식이 올바르지 않습니다: ${FIXTURE_PATH}`)
  }

  const accounts = parsed.accounts
    .map((entry) => ({
      email: normalizeEmail(entry.email),
      role: normalizeRole(entry.role),
    }))
    .filter((entry) => entry.email !== null)

  if (accounts.length === 0) {
    throw new Error(`fixture에서 유효한 계정 항목을 찾지 못했습니다: ${FIXTURE_PATH}`)
  }

  return accounts
}

function seedAccounts(state, fixtureAccounts) {
  const existingUsersByEmail = new Map(
    state.users
      .map((user) => {
        const email = normalizeEmail(user.email)
        return email ? [email, user] : null
      })
      .filter((item) => Boolean(item))
  )

  let nextUserId = state.nextUserId
  const seeded = []

  for (const fixture of fixtureAccounts) {
    const found = existingUsersByEmail.get(fixture.email)
    if (!found) {
      const newUser = {
        id: nextUserId,
        email: fixture.email,
        role: fixture.role,
      }
      nextUserId += 1
      state.users.push(newUser)
      existingUsersByEmail.set(fixture.email, newUser)
      seeded.push(fixture.email)
      continue
    }

    if (found.role !== fixture.role) {
      found.role = fixture.role
      seeded.push(fixture.email)
    }
  }

  const maxExistingId = state.users.reduce(
    (acc, user) => Math.max(acc, safeParseInt(user.id, 0)),
    0
  )
  state.nextUserId = Math.max(nextUserId, maxExistingId + 1, DEFAULT_STATE.nextUserId)

  return {
    state,
    seeded,
  }
}

async function main() {
  const fixtureAccounts = loadFixtureAccounts()

  let beforeState
  const isPostgres = !!process.env.DATABASE_URL
  let pgStore = null
  let deserializeState = null

  if (isPostgres) {
    const distStore = join(
      BACKEND_DIR,
      'dist',
      'src',
      'projects',
      'store',
      'postgres-projects-store.js'
    )
    const distSerialize = join(BACKEND_DIR, 'dist', 'src', 'projects', 'projects.store.js')
    if (!existsSync(distStore) || !existsSync(distSerialize)) {
      throw new Error(
        'dist 빌드가 없습니다. 먼저 `pnpm --filter protolive-backend build` 후 다시 시도하세요.'
      )
    }
    const { PostgresProjectsStore } = await import(pathToFileURL(distStore).href)
    const { deserializeState: ds } = await import(pathToFileURL(distSerialize).href)
    deserializeState = ds
    pgStore = new PostgresProjectsStore(process.env.DATABASE_URL)
    beforeState = await pgStore.load()
  } else {
    beforeState = loadStoreState()
  }

  // Capture the count before seedAccounts mutates beforeState in place.
  const beforeCount = beforeState.users.length
  const { state: nextState, seeded } = seedAccounts(beforeState, fixtureAccounts)

  const afterCount = nextState.users.length

  if (seeded.length === 0) {
    console.log(`테스트 계정 중 추가/변경 항목이 없습니다. (${beforeCount}명 유지)`)
    return
  }

  if (isDryRun) {
    console.log(`드라이 런 실행: 파일/DB가 변경되지 않습니다.`)
    console.log(`예상 변경 사용자 수: ${seeded.length}`)
    return
  }

  const target = isPostgres ? 'Postgres' : '파일 스토어'
  if (isPostgres) {
    pgStore.save(nextState)
    await pgStore.flush()
  } else {
    writeStoreState(nextState)
  }

  const uniqueSeeded = [...new Set(seeded)]
  console.log(
    `테스트 계정 시드 완료(${target}): ${uniqueSeeded.length}개 계정 동기화, 사용자 수 ${beforeCount} → ${afterCount}`
  )
  uniqueSeeded.forEach((email) => {
    console.log(`- ${email}`)
  })
}

main().catch((error) => {
  console.error(`시드 실패: ${error.message}`)
  process.exit(1)
})

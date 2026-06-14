import * as assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { JwtService } from '@nestjs/jwt'

import { createEmptyProjectsState, type ProjectsState } from '../src/projects/project.models'
import { JsonProjectsStore } from '../src/projects/projects.store'

import type { ProjectsService as ProjectsServiceType } from '../src/projects/projects.service'

// 세션 토큰이 HMAC 자체 포맷 → @nestjs/jwt(HS256) 로 전환된 동작을 검증한다.
// node --test 는 파일당 별도 프로세스로 격리되므로, projects.service 가 모듈 평가
// 시점에 1회 해석하는 PROTOLIVE_SESSION_SECRET 을 여기서 미리 고정한 뒤
// 동적 import 한다(동일 시크릿으로 만료/위조 토큰을 직접 만들어 검증 경로를 정밀 테스트).
const TEST_SESSION_SECRET = 'jwt-migration-test-secret-deterministic'
process.env.PROTOLIVE_SESSION_SECRET = TEST_SESSION_SECRET

type SeedFn = (state: ProjectsState) => void

async function loadService() {
  // 환경변수 고정 이후에 import 해야 SESSION_SECRET 이 테스트 시크릿으로 해석된다.
  const { ProjectsService } = await import('../src/projects/projects.service')
  return ProjectsService
}

async function withSeededService(
  seed: SeedFn,
  run: (service: ProjectsServiceType) => Promise<void> | void
) {
  const ProjectsService = await loadService()
  const dir = mkdtempSync(join(tmpdir(), 'protolive-jwt-'))
  const previousStorePath = process.env.PROJECT_STORE_PATH
  const filePath = join(dir, 'store.json')

  try {
    process.env.PROJECT_STORE_PATH = filePath

    const state = createEmptyProjectsState()
    seed(state)
    new JsonProjectsStore(filePath).write(state)

    const service = new ProjectsService()
    await service.onModuleInit()
    await run(service)
  } finally {
    if (previousStorePath === undefined) {
      delete process.env.PROJECT_STORE_PATH
    } else {
      process.env.PROJECT_STORE_PATH = previousStorePath
    }
    rmSync(dir, { recursive: true, force: true })
  }
}

function seedAdmin(state: ProjectsState) {
  state.users.push({
    id: 1,
    email: 'admin@protolive.local',
    role: 'admin',
    password: 'pass-admin',
    name: '운영자',
  })
  state.nextUserId = 2
}

function seedAdminAndMember(state: ProjectsState) {
  state.users.push(
    {
      id: 1,
      email: 'admin@protolive.local',
      role: 'admin',
      password: 'pass-admin',
      name: '운영자',
    },
    {
      id: 2,
      email: 'member@protolive.local',
      role: 'investor',
      password: 'pass-member',
      name: '투자자',
    }
  )
  state.nextUserId = 3
}

/** 로그인 쿠키 문자열에서 protolive_session 토큰만 추출한다. */
function tokenFromCookie(cookie: string): string {
  const match = /protolive_session=([^;]*)/.exec(cookie)
  assert.ok(match, '세션 쿠키에 protolive_session 토큰이 있어야 한다')
  return match[1]
}

test('login issues a real JWT (HS256, three segments) carrying session claims', async () => {
  await withSeededService(seedAdmin, (service) => {
    const { cookie } = service.login({
      email: 'admin@protolive.local',
      password: 'pass-admin',
    })

    const token = tokenFromCookie(cookie)
    const segments = token.split('.')
    assert.equal(segments.length, 3, 'JWT 는 header.payload.signature 3 세그먼트여야 한다')

    const header = JSON.parse(Buffer.from(segments[0], 'base64url').toString('utf8'))
    assert.equal(header.alg, 'HS256')
    assert.equal(header.typ, 'JWT')

    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'))
    assert.equal(payload.id, 1)
    assert.equal(payload.email, 'admin@protolive.local')
    assert.equal(payload.role, 'admin')
    assert.equal(payload.name, '운영자')
    // 표준 클레임은 초 단위로 라이브러리가 부여한다.
    assert.equal(typeof payload.iat, 'number')
    assert.equal(typeof payload.exp, 'number')
    assert.ok(payload.exp > payload.iat, 'exp 는 iat 이후여야 한다')

    // 발급된 세션은 그대로 복원되어야 한다(왕복).
    const restored = service.getSessionFromCookie(cookie)
    assert.equal(restored?.email, 'admin@protolive.local')
    assert.equal(restored?.role, 'admin')
    // AuthSession.expiresAt 은 JWT exp(초) 를 ms 로 환산한 ISO 여야 한다.
    assert.equal(new Date(restored!.expiresAt).getTime(), payload.exp * 1000)
  })
})

test('tampered JWT payload fails signature verification and yields null (no throw)', async () => {
  await withSeededService(seedAdmin, (service) => {
    const { cookie } = service.login({ email: 'admin@protolive.local', password: 'pass-admin' })
    const token = tokenFromCookie(cookie)
    const [header, payload, signature] = token.split('.')

    // 권한 상승을 노려 payload 의 role 을 변조한다. 서명은 그대로 두므로 불일치해야 한다.
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    decoded.role = 'admin'
    decoded.id = 999
    const forgedPayload = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url')
    const forgedToken = `${header}.${forgedPayload}.${signature}`

    const forgedCookie = `protolive_session=${forgedToken}`
    // throw 하지 않고 null 이어야 한다(락아웃 금지 — 비로그인으로 안전하게 처리).
    assert.equal(service.getSessionFromCookie(forgedCookie), null)
  })
})

test('JWT signed with a different secret is rejected (null, no throw)', async () => {
  await withSeededService(seedAdmin, (service) => {
    const attacker = new JwtService({ secret: 'totally-different-secret' })
    const forged = attacker.sign(
      { id: 1, email: 'admin@protolive.local', role: 'admin', name: '운영자' },
      { algorithm: 'HS256', expiresIn: 3600 }
    )
    assert.equal(service.getSessionFromCookie(`protolive_session=${forged}`), null)
  })
})

test('expired JWT is rejected (null, no throw)', async () => {
  await withSeededService(seedAdmin, (service) => {
    // 같은 시크릿으로 이미 만료된 토큰을 만든다(expiresIn 음수).
    const issuer = new JwtService({ secret: TEST_SESSION_SECRET })
    const expired = issuer.sign(
      { id: 1, email: 'admin@protolive.local', role: 'admin', name: '운영자' },
      { algorithm: 'HS256', expiresIn: -10 }
    )
    assert.equal(service.getSessionFromCookie(`protolive_session=${expired}`), null)
  })
})

test('legacy HMAC-format token does not lock out — resolves to null safely', async () => {
  await withSeededService(seedAdmin, (service) => {
    // 구(舊) 스킴 토큰(body.signature, 2 세그먼트) 모사. JWT 로는 파싱 불가 → null 이어야 하고
    // 절대 throw 해서는 안 된다(기존 세션 보유 사용자가 재로그인으로 자연 복구되도록).
    const legacyBody = Buffer.from(
      JSON.stringify({
        id: 1,
        email: 'admin@protolive.local',
        role: 'admin',
        name: '운영자',
        exp: Date.now() + 100000,
      }),
      'utf8'
    ).toString('base64url')
    const legacyToken = `${legacyBody}.deadbeefsignature`
    assert.equal(service.getSessionFromCookie(`protolive_session=${legacyToken}`), null)
    // 빈/깨진 쿠키도 안전.
    assert.equal(service.getSessionFromCookie('protolive_session='), null)
    assert.equal(service.getSessionFromCookie('protolive_session=not.a.jwt'), null)
    assert.equal(service.getSessionFromCookie(undefined), null)
  })
})

test('verifySessionToken re-validates the live user — stale claims after suspension are rejected', async () => {
  await withSeededService(seedAdminAndMember, (service) => {
    const adminLogin = service.login({ email: 'admin@protolive.local', password: 'pass-admin' })
    const admin = service.getSessionFromCookie(adminLogin.cookie)
    assert.equal(admin?.role, 'admin')

    const memberLogin = service.login({ email: 'member@protolive.local', password: 'pass-member' })
    assert.equal(service.getSessionFromCookie(memberLogin.cookie)?.email, 'member@protolive.local')

    // 토큰 발급 후 운영자가 회원을 정지하면, 서명이 유효해도 세션은 거부되어야 한다.
    service.updateMemberLifecycle(2, { action: 'suspend', reason: '테스트 정지' }, admin!)
    assert.equal(service.getSessionFromCookie(memberLogin.cookie), null)
  })
})

test('logout cookie clears the session token', async () => {
  await withSeededService(seedAdmin, (service) => {
    const logout = service.createLogoutCookie()
    assert.match(logout, /protolive_session=;/)
    assert.match(logout, /Max-Age=0/)
    assert.equal(service.getSessionFromCookie(logout), null)
  })
})

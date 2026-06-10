import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import type { Response } from 'express'
import { ProjectsService } from '../src/projects/projects.service'
import { SeoController } from '../src/projects/seo.controller'
import { createEmptyProjectsState } from '../src/projects/project.models'
import { JsonProjectsStore } from '../src/projects/projects.store'
import { buildProjectOgHtml, resolveOgImage, summarizeForOg } from '../src/projects/seo-og'

const ORIGIN = 'https://proto-live.vercel.app'

/** SeoController 응답을 기록하는 최소 Response 스텁(상태·헤더·본문·removeHeader 추적). */
class FakeResponse {
  statusCode = 200
  body = ''
  headers = new Map<string, string>()
  removedHeaders: string[] = []

  status(code: number): this {
    this.statusCode = code
    return this
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value)
    return this
  }

  removeHeader(name: string): this {
    this.removedHeaders.push(name.toLowerCase())
    this.headers.delete(name.toLowerCase())
    return this
  }

  send(payload: string): this {
    this.body = payload
    return this
  }

  asResponse(): Response {
    return this as unknown as Response
  }
}

async function withSeoController(run: (controller: SeoController) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-seo-og-'))
  const previousStorePath = process.env.PROJECT_STORE_PATH
  const previousSiteOrigin = process.env.SITE_ORIGIN
  const filePath = join(dir, 'store.json')

  try {
    process.env.PROJECT_STORE_PATH = filePath
    process.env.SITE_ORIGIN = ORIGIN

    const state = createEmptyProjectsState()
    state.users.push({ id: 1, email: 'maker@example.com', role: 'maker' })
    state.projects.push(
      {
        id: 1,
        userId: 1,
        title: 'Toon "Spectrum" <Live>',
        description: `웹툰 데이터 인덱스. ${'아주 긴 설명 '.repeat(40)}끝.`,
        liveUrl: 'https://toonspectrum.example.com',
        category: 'AI & SaaS',
        accessMode: 'open',
        protectionNoticeAccepted: true,
        thumbnail: '/thumbnails/toonspectrum.jpg',
        investorCount: 0,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: {
          success: true,
          status: 200,
          message: 'ok',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://toonspectrum.example.com',
          responseTimeMs: 120,
        },
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      },
      {
        id: 2,
        userId: 1,
        title: 'Protected MVP',
        description: 'A pre-launch service that needs screened access.',
        liveUrl: 'https://secret.example.com/demo?token=internal',
        category: 'AI & SaaS',
        accessMode: 'screened',
        protectionNoticeAccepted: true,
        thumbnail: '/thumbnails/secret-build.jpg',
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
        createdAt: new Date('2026-06-02T00:00:00.000Z'),
      }
    )
    state.nextUserId = 2
    state.nextProjectId = 3

    new JsonProjectsStore(filePath).write(state)
    const service = new ProjectsService()
    await service.onModuleInit()
    await run(new SeoController(service))
  } finally {
    if (previousStorePath === undefined) {
      delete process.env.PROJECT_STORE_PATH
    } else {
      process.env.PROJECT_STORE_PATH = previousStorePath
    }
    if (previousSiteOrigin === undefined) {
      delete process.env.SITE_ORIGIN
    } else {
      process.env.SITE_ORIGIN = previousSiteOrigin
    }
    rmSync(dir, { recursive: true, force: true })
  }
}

test('open project OG page renders crawler-grade tags with escaped content', async () => {
  await withSeoController(async (controller) => {
    const response = new FakeResponse()
    await controller.getProjectOgPage('1', response.asResponse())

    assert.equal(response.statusCode, 200)
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8')
    assert.equal(response.headers.get('cache-control'), 'public, max-age=60, s-maxage=300')
    // 전역 noindex X-Robots-Tag 는 공개 프로젝트 응답에서 해제되어야 한다.
    assert.ok(response.removedHeaders.includes('x-robots-tag'))

    const html = response.body
    assert.ok(html.startsWith('<!doctype html>'))
    // 타이틀의 따옴표/꺾쇠는 이스케이프되어 속성 밖으로 새지 않는다.
    assert.ok(html.includes('Toon &quot;Spectrum&quot; &lt;Live&gt; · ProtoLive'))
    assert.ok(!html.includes('Toon "Spectrum" <Live>'))
    assert.ok(html.includes('<meta property="og:type" content="website" />'))
    assert.ok(html.includes(`<meta property="og:url" content="${ORIGIN}/projects/1" />`))
    assert.ok(
      html.includes(`<meta property="og:image" content="${ORIGIN}/thumbnails/toonspectrum.jpg" />`)
    )
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image" />'))
    assert.ok(html.includes('<meta name="twitter:title"'))
    assert.ok(html.includes('<meta name="twitter:description"'))
    assert.ok(html.includes('<meta name="twitter:image"'))
    assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}/projects/1" />`))
    assert.ok(html.includes('<meta name="robots" content="index, follow" />'))
    // 사람 방문은 SPA 상세로 즉시 이동한다(meta refresh + location.replace).
    assert.ok(html.includes(`<meta http-equiv="refresh" content="0;url=${ORIGIN}/projects/1" />`))
    assert.ok(html.includes(`location.replace("${ORIGIN}/projects/1")`))
    // JSON-LD SoftwareApplication 포함.
    assert.ok(html.includes('"@type":"SoftwareApplication"'))
  })
})

test('screened project OG page exposes title/summary only (no live URL, no thumbnail)', async () => {
  await withSeoController(async (controller) => {
    const response = new FakeResponse()
    await controller.getProjectOgPage('2', response.asResponse())

    assert.equal(response.statusCode, 200)
    const html = response.body
    assert.ok(html.includes('Protected MVP · ProtoLive'))
    assert.ok(html.includes('A pre-launch service that needs screened access.'))
    // 보호 필드 비누설: 라이브 URL 호스트/토큰·썸네일이 어디에도 없다.
    assert.ok(!html.includes('secret.example.com'))
    assert.ok(!html.includes('token=internal'))
    assert.ok(!html.includes('secret-build.jpg'))
    assert.ok(html.includes(`<meta property="og:image" content="${ORIGIN}/og.png" />`))
    // 사이트맵 제외 정책과 일관되게 비색인 + 전역 noindex 헤더 유지.
    assert.ok(html.includes('<meta name="robots" content="noindex" />'))
    assert.ok(!response.removedHeaders.includes('x-robots-tag'))
    // JSON-LD 는 보호 프로젝트에서 생략된다.
    assert.ok(!html.includes('application/ld+json'))
  })
})

test('missing or invalid project ids render the default OG fallback HTML with 404', async () => {
  await withSeoController(async (controller) => {
    for (const rawId of ['999', 'abc', '-1']) {
      const response = new FakeResponse()
      await controller.getProjectOgPage(rawId, response.asResponse())

      assert.equal(response.statusCode, 404)
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8')
      const html = response.body
      // JSON 에러가 아니라 사이트 기본 OG 카드를 내려준다.
      assert.ok(html.startsWith('<!doctype html>'))
      assert.ok(html.includes('ProtoLive · 바이브코딩 웹앱 공유 + 커뮤니티 피드백'))
      assert.ok(html.includes(`<meta property="og:image" content="${ORIGIN}/og.png" />`))
      assert.ok(html.includes('<meta name="robots" content="noindex" />'))
      assert.ok(!html.includes('"statusCode"'))
    }
  })
})

test('summarizeForOg collapses whitespace and trims to ~200 chars with ellipsis', () => {
  assert.equal(summarizeForOg('  짧은   설명\n이에요  '), '짧은 설명 이에요')

  const long = '가'.repeat(300)
  const summary = summarizeForOg(long)
  assert.equal(summary.length, 200)
  assert.ok(summary.endsWith('…'))
})

test('resolveOgImage maps thumbnails to absolute web-origin URLs', () => {
  assert.equal(
    resolveOgImage({ accessMode: 'open', thumbnail: '/thumbnails/a.jpg' }, ORIGIN),
    `${ORIGIN}/thumbnails/a.jpg`
  )
  assert.equal(
    resolveOgImage({ accessMode: 'open', thumbnail: 'https://cdn.example.com/a.jpg' }, ORIGIN),
    'https://cdn.example.com/a.jpg'
  )
  assert.equal(resolveOgImage({ accessMode: 'open', thumbnail: null }, ORIGIN), `${ORIGIN}/og.png`)
  // 보호 프로젝트는 썸네일이 있어도 기본 OG 이미지로 강등된다.
  assert.equal(
    resolveOgImage({ accessMode: 'screened', thumbnail: '/thumbnails/a.jpg' }, ORIGIN),
    `${ORIGIN}/og.png`
  )
})

test('buildProjectOgHtml escapes script-breaking description content', () => {
  const html = buildProjectOgHtml(
    {
      id: 7,
      userId: 1,
      title: 'XSS</title><script>alert(1)</script>',
      description: '"quoted" & <tagged> description',
      liveUrl: 'https://example.com',
      category: 'AI & SaaS',
      accessMode: 'open',
      protectionNoticeAccepted: true,
      thumbnail: null,
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: { success: true, message: 'ok', checkedAt: '2026-06-01T00:00:00.000Z' },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    },
    ORIGIN
  )

  assert.ok(!html.includes('<script>alert(1)</script>'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(html.includes('&quot;quoted&quot; &amp; &lt;tagged&gt; description'))
  // JSON-LD 내부의 '<' 는 유니코드 이스케이프로 직렬화되어 스크립트 조기 종료가 불가능하다.
  assert.ok(!html.includes('</script><script>'))
})

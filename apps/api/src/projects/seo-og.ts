import { Project } from './project.models'

/**
 * 크롤러용 프로젝트 OG 페이지 빌더(#34).
 *
 * JS를 실행하지 않는 SNS 스크래퍼(카카오·페이스북·트위터·슬랙 등)는 SPA의 정적 index.html
 * OG만 보게 되므로, vercel.json 이 크롤러 UA의 `/projects/:id` 요청만 이 HTML로 라우팅한다.
 * 사람이 직접 열면 meta-refresh + location.replace 로 SPA 상세로 즉시 이동한다.
 *
 * 보호(screened) 프로젝트 정책: 공개 목록과 같은 마스킹을 재사용하되(hydrate 단계에서
 * 라이브 URL이 이미 'protected-review'로 치환됨) OG에는 라이브 URL을 아예 싣지 않고
 * 썸네일도 노출하지 않는다 — 제목/요약 + 기본 OG 이미지가 전부다. JSON-LD도 생략한다.
 */

export const DEFAULT_SITE_ORIGIN = 'https://proto-live.vercel.app'

const SITE_NAME = 'ProtoLive'
const DEFAULT_OG_IMAGE_PATH = '/og.png'
const DEFAULT_TITLE = `${SITE_NAME} · 바이브코딩 웹앱 공유 + 커뮤니티 피드백`
const DEFAULT_DESCRIPTION =
  'AI로 만든 데모·프로토타입·초기 빌드를 그대로 올리고 커뮤니티 피드백을 받으세요. 검증된 상위 빌드는 투자자에게 연결됩니다.'

/** 사이트맵·OG가 공유하는 공개 사이트 오리진(후행 슬래시 제거). */
export function resolveSiteOrigin(): string {
  return (process.env.SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN).replace(/\/+$/, '')
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** OG description 용 공백 정규화 + 말줄임(기본 ~200자). */
export function summarizeForOg(text: string, maxLength = 200): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLength) {
    return collapsed
  }
  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`
}

/**
 * og:image 절대 URL. 썸네일은 웹 오리진의 `/thumbnails/*.jpg` 상대 경로라 오리진을 붙여야
 * 크롤러가 가져갈 수 있다. 보호 프로젝트는 썸네일 대신 기본 OG 이미지를 쓴다(제목/요약만 노출).
 */
export function resolveOgImage(
  project: Pick<Project, 'accessMode' | 'thumbnail'>,
  origin: string
): string {
  const fallback = `${origin}${DEFAULT_OG_IMAGE_PATH}`
  if (project.accessMode === 'screened') {
    return fallback
  }

  const thumbnail = (project.thumbnail ?? '').trim()
  if (/^https?:\/\//i.test(thumbnail)) {
    return thumbnail
  }
  if (thumbnail.startsWith('/')) {
    return `${origin}${thumbnail}`
  }
  return fallback
}

export function buildProjectOgHtml(project: Project, origin: string): string {
  const canonicalUrl = `${origin}/projects/${project.id}`
  const isScreened = project.accessMode === 'screened'
  const description = summarizeForOg(project.description) || DEFAULT_DESCRIPTION

  return renderOgDocument({
    title: `${project.title} · ${SITE_NAME}`,
    description,
    canonicalUrl,
    image: resolveOgImage(project, origin),
    // 보호 프로젝트는 사이트맵에서도 제외되는 비색인 대상 — OG 카드만 허용하고 색인은 막는다.
    robots: isScreened ? 'noindex' : 'index, follow',
    jsonLd: isScreened
      ? null
      : {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: project.title,
          description,
          url: canonicalUrl,
          applicationCategory: project.category,
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
        },
  })
}

/** 존재하지 않는 프로젝트(404)용 기본 OG 폴백 — JSON 에러 대신 사이트 기본 카드를 내려준다. */
export function buildFallbackOgHtml(origin: string): string {
  return renderOgDocument({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: `${origin}/`,
    image: `${origin}${DEFAULT_OG_IMAGE_PATH}`,
    robots: 'noindex',
    jsonLd: null,
  })
}

function renderOgDocument(input: {
  title: string
  description: string
  canonicalUrl: string
  image: string
  robots: string
  jsonLd: Record<string, unknown> | null
}): string {
  const title = escapeHtml(input.title)
  const description = escapeHtml(input.description)
  const url = escapeHtml(input.canonicalUrl)
  const image = escapeHtml(input.image)
  // </script> 류 조기 종료를 막기 위해 JSON 내 '<' 는 유니코드 이스케이프로 직렬화한다.
  const redirectTarget = JSON.stringify(input.canonicalUrl).replace(/</g, '\\u003c')
  const jsonLdScript = input.jsonLd
    ? `\n    <script type="application/ld+json">${JSON.stringify(input.jsonLd).replace(/</g, '\\u003c')}</script>`
    : ''

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${input.robots}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:locale" content="ko_KR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0;url=${url}" />${jsonLdScript}
    <script>location.replace(${redirectTarget})</script>
  </head>
  <body>
    <p><a href="${url}">${title}</a> 페이지로 이동 중입니다…</p>
  </body>
</html>
`
}

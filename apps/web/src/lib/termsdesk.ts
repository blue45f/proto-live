import type { PolicyView } from './constants'

/**
 * TermsDesk 공개 게시 API 연동. 이용약관/개인정보처리방침의 정본은 TermsDesk
 * (버전·content-hash 불변 관리)에 게시되어 있고, 무인증 공개 JSON API로 읽어와
 * 내부 페이지에서 렌더한다. 외부 리다이렉트를 없애되 정본 출처(버전·해시·시행일)는
 * 페이지 하단 신뢰 표면에 그대로 드러낸다.
 */

export const TERMSDESK_BASE_URL = 'https://termsdesk.vercel.app'
export const TERMSDESK_ORG_SLUG = 'proto-live'
/** 지원 보드는 접수 양식이 TermsDesk 쪽에 있으므로 외부 링크를 유지한다. */
export const TERMSDESK_SUPPORT_URL = `${TERMSDESK_BASE_URL}/support/${TERMSDESK_ORG_SLUG}`

export const POLICY_PAGES: Record<PolicyView, { slug: string; label: string }> = {
  terms: { slug: 'terms-of-service', label: '이용약관' },
  privacy: { slug: 'privacy-policy', label: '개인정보처리방침' },
}

/** TermsDesk 원문 페이지(외부). 로드 실패 시 폴백 링크로 쓴다. */
export function policyExternalUrl(slug: string): string {
  return `${TERMSDESK_BASE_URL}/p/${TERMSDESK_ORG_SLUG}/${slug}`
}

/** GET /api/public/:org/policies/:slug 의 JSON 응답에서 렌더에 쓰는 필드들. */
export interface PublicPolicy {
  orgName: string
  policySlug: string
  name: string
  type: string
  locale: string
  versionLabel: string
  contentHash: string
  body: string
  effectiveAt: string
  publishedAt: string
  changeSummary: string | null
}

export async function fetchPublicPolicy(slug: string, signal?: AbortSignal): Promise<PublicPolicy> {
  const response = await fetch(
    `${TERMSDESK_BASE_URL}/api/public/${TERMSDESK_ORG_SLUG}/policies/${slug}`,
    { signal, headers: { Accept: 'application/json' } }
  )
  if (!response.ok) {
    throw new Error(`TermsDesk policy request failed: ${response.status}`)
  }
  return (await response.json()) as PublicPolicy
}

/** 신뢰 표면용 content-hash 축약(앞 12자). */
export function shortContentHash(hash: string): string {
  return hash.slice(0, 12)
}

/** 시행일 등 정책 메타 날짜를 한국어 전체 날짜로. 파싱 불가하면 원문 유지. */
export function formatPolicyDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/** 게시 본문 블록. 텍스트로만 렌더하므로 HTML 주입 표면이 없다. */
export type PolicyBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }

const MARKDOWN_HEADING = /^#{1,6}\s+(.+)$/
// 한국 약관 관용 헤딩: "제1조 (목적)" / 전각 괄호 변형 포함.
const ARTICLE_HEADING = /^제\d+조\s*[(（]/
const LIST_ITEM = /^[-*]\s+(.+)$/

/**
 * TermsDesk body(마크다운/플레인 혼용)를 최소 구조로 해석한다.
 * 의존성 없이 줄 단위로 헤딩(제N조·마크다운 #)·리스트(-·*)·문단만 구분하고,
 * 그 외 서식은 평문 그대로 둔다(렌더는 전부 텍스트 노드).
 */
export function parsePolicyBlocks(body: string): PolicyBlock[] {
  const blocks: PolicyBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ kind: 'list', items: list })
      list = []
    }
  }

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const markdownHeading = line.match(MARKDOWN_HEADING)
    if (markdownHeading || ARTICLE_HEADING.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ kind: 'heading', text: markdownHeading ? markdownHeading[1] : line })
      continue
    }

    const listItem = line.match(LIST_ITEM)
    if (listItem) {
      flushParagraph()
      list.push(listItem[1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

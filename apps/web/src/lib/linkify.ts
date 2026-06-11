/**
 * 사용자 본문(토론/댓글/쪽지)을 안전하게 렌더하기 위한 토큰화 — innerHTML 을 절대 쓰지 않고,
 * 일반 텍스트와 http(s) 링크를 토큰 배열로 분리한다. 렌더 컴포넌트는 text 토큰은 텍스트 노드로,
 * link 토큰은 <a rel="noopener noreferrer nofollow"> 로만 렌더한다(스크립트/마크업 주입 표면 0).
 *
 * 허용 스킴은 http/https 뿐이다. javascript:, data:, mailto: 등은 링크로 만들지 않고
 * 평문으로 남긴다(클릭 가능한 표면을 만들지 않는다).
 */

export type BodyToken =
  | { kind: 'text'; value: string }
  | { kind: 'link'; href: string; label: string }

// 공백·제어문자 전까지를 URL 후보로 본다. 끝의 문장부호는 트리밍(아래)에서 떼어낸다.
const URL_CANDIDATE = /https?:\/\/[^\s<>]+/gi

// URL 끝에 흔히 따라붙는 문장부호(괄호 균형은 따로 처리).
const TRAILING_PUNCTUATION = /[.,!?;:'"]+$/

/** http(s) URL 만 안전한 href 로 인정한다. 그 외 스킴은 null(링크화하지 않음). */
export function safeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return null
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

/** URL 후보 끝에 매달린 문장부호/짝 안 맞는 닫는 괄호를 떼어내 표시 라벨/링크 본체를 정리한다. */
function trimUrlTail(candidate: string): { url: string; trailing: string } {
  let url = candidate
  let trailing = ''

  // 닫는 괄호가 URL 안의 여는 괄호보다 많으면(예: "(https://a.com)") 마지막 ')' 를 떼어낸다.
  while (url.endsWith(')') && countChar(url, ')') > countChar(url, '(')) {
    trailing = `)${trailing}`
    url = url.slice(0, -1)
  }

  const punctuation = url.match(TRAILING_PUNCTUATION)
  if (punctuation) {
    trailing = `${punctuation[0]}${trailing}`
    url = url.slice(0, url.length - punctuation[0].length)
  }
  return { url, trailing }
}

function countChar(value: string, char: string): number {
  let total = 0
  for (const item of value) {
    if (item === char) total += 1
  }
  return total
}

/**
 * 본문을 텍스트/링크 토큰으로 쪼갠다. 인접한 텍스트는 하나의 text 토큰으로 합친다.
 * 어떤 경우에도 원문 문자는 보존되며(손실 없음), HTML 로 해석되지 않는다.
 */
export function tokenizeBody(body: string): BodyToken[] {
  if (!body) {
    return []
  }
  const tokens: BodyToken[] = []
  let lastIndex = 0

  for (const match of body.matchAll(URL_CANDIDATE)) {
    const matchIndex = match.index ?? 0
    const candidate = match[0]
    const { url, trailing } = trimUrlTail(candidate)
    const href = safeHttpUrl(url)

    if (matchIndex > lastIndex) {
      pushText(tokens, body.slice(lastIndex, matchIndex))
    }

    if (href) {
      tokens.push({ kind: 'link', href, label: url })
      if (trailing) {
        pushText(tokens, trailing)
      }
    } else {
      // 안전하지 않은 스킴이거나 파싱 실패 → 후보 전체를 평문으로 남긴다.
      pushText(tokens, candidate)
    }
    lastIndex = matchIndex + candidate.length
  }

  if (lastIndex < body.length) {
    pushText(tokens, body.slice(lastIndex))
  }
  return tokens
}

function pushText(tokens: BodyToken[], value: string): void {
  if (!value) {
    return
  }
  const previous = tokens[tokens.length - 1]
  if (previous && previous.kind === 'text') {
    previous.value += value
    return
  }
  tokens.push({ kind: 'text', value })
}

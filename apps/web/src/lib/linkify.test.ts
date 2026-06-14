import { describe, expect, it } from 'vitest'

import { safeHttpUrl, tokenizeBody, type BodyToken } from './linkify'

describe('safeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(safeHttpUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/')
  })

  it('rejects non-http schemes used for XSS', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeHttpUrl('mailto:a@b.com')).toBeNull()
    expect(safeHttpUrl('  JavaScript:alert(1)')).toBeNull()
    expect(safeHttpUrl('ftp://example.com')).toBeNull()
  })
})

function linkTokens(tokens: BodyToken[]) {
  return tokens.filter(
    (token): token is Extract<BodyToken, { kind: 'link' }> => token.kind === 'link'
  )
}

describe('tokenizeBody', () => {
  it('returns a single text token for plain text', () => {
    const tokens = tokenizeBody('그냥 평범한 본문입니다.')
    expect(tokens).toEqual([{ kind: 'text', value: '그냥 평범한 본문입니다.' }])
  })

  it('splits http(s) links out of surrounding text', () => {
    const tokens = tokenizeBody('데모는 https://proto.live/demo 에서 보세요')
    expect(tokens).toEqual([
      { kind: 'text', value: '데모는 ' },
      { kind: 'link', href: 'https://proto.live/demo', label: 'https://proto.live/demo' },
      { kind: 'text', value: ' 에서 보세요' },
    ])
  })

  it('never produces a link token for javascript: or data: payloads', () => {
    const tokens = tokenizeBody('javascript:alert(1) 그리고 data:text/html,<b>x</b>')
    expect(linkTokens(tokens)).toHaveLength(0)
    // 원문은 평문으로 보존된다(손실 없음, 마크업 해석 없음).
    expect(tokens.map((token) => (token.kind === 'text' ? token.value : '')).join('')).toContain(
      'javascript:alert(1)'
    )
  })

  it('keeps raw angle brackets as text (no HTML interpretation)', () => {
    const tokens = tokenizeBody('<img src=x onerror=alert(1)>')
    expect(tokens).toEqual([{ kind: 'text', value: '<img src=x onerror=alert(1)>' }])
  })

  it('trims trailing punctuation and balanced parentheses off the link', () => {
    const period = tokenizeBody('여기 https://a.com/p.')
    expect(linkTokens(period)[0]).toEqual({
      kind: 'link',
      href: 'https://a.com/p',
      label: 'https://a.com/p',
    })

    const wrapped = tokenizeBody('(https://a.com/x)')
    expect(linkTokens(wrapped)[0].href).toBe('https://a.com/x')
    expect(wrapped[wrapped.length - 1]).toEqual({ kind: 'text', value: ')' })
  })

  it('preserves the full original text across tokens', () => {
    const body = '링크1 https://a.com 사이 https://b.com/y?z=1 끝'
    const tokens = tokenizeBody(body)
    const reconstructed = tokens
      .map((token) => (token.kind === 'text' ? token.value : token.label))
      .join('')
    expect(reconstructed).toBe(body)
    expect(linkTokens(tokens)).toHaveLength(2)
  })

  it('returns an empty array for empty input', () => {
    expect(tokenizeBody('')).toEqual([])
  })
})

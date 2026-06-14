import { Fragment } from 'react'

import { tokenizeBody } from '../../lib/linkify'

/**
 * 사용자 본문(토론/댓글/쪽지) 안전 렌더 — innerHTML 을 절대 쓰지 않는다.
 * tokenizeBody 가 텍스트/링크로 쪼갠 토큰만 렌더하며, 링크는 http(s) + rel 가드가 붙는다.
 * 줄바꿈은 CSS(whitespace-pre-wrap)로 보존하므로 본문 문자는 어떤 경우에도 텍스트 노드로만 나온다.
 */
export function BodyText({ body, className }: { body: string; className?: string }) {
  const tokens = tokenizeBody(body)
  return (
    <p className={`whitespace-pre-wrap break-words ${className ?? ''}`}>
      {tokens.map((token, index) =>
        token.kind === 'link' ? (
          <a
            key={index}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-bold text-cyan-200 underline decoration-cyan-300/40 underline-offset-2 hover:decoration-cyan-300"
          >
            {token.label}
          </a>
        ) : (
          <Fragment key={index}>{token.value}</Fragment>
        )
      )}
    </p>
  )
}

import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ShareButton } from './ShareButton'

// useDismissableDetails 의 닫힘 규약을 공유 팝오버로 검증한다.
// (jsdom 은 summary 클릭 토글을 구현하지 않으므로 open 속성은 직접 제어한다.)
function renderOpenShare() {
  const view = render(
    <div>
      <ShareButton url="https://proto-live.vercel.app/projects/1" title="빌드 · ProtoLive" />
      <button type="button">바깥 버튼</button>
    </div>
  )
  const details = view.container.querySelector('details')
  if (!details) throw new Error('details popover not rendered')
  details.open = true
  return { details }
}

describe('ShareButton popover dismissal', () => {
  it('stays open for pointer input inside, closes on outside pointerdown', () => {
    const { details } = renderOpenShare()

    fireEvent.pointerDown(screen.getByText('링크 복사'))
    expect(details.open).toBe(true)

    fireEvent.pointerDown(screen.getByRole('button', { name: '바깥 버튼' }))
    expect(details.open).toBe(false)
  })

  it('closes on Escape and returns focus to the summary toggle', () => {
    const { details } = renderOpenShare()
    const summary = details.querySelector('summary')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(summary)
  })

  it('ignores Escape while the popover is already closed', () => {
    const { details } = renderOpenShare()
    details.open = false

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(details.open).toBe(false)
  })
})

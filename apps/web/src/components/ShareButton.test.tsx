import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareButton } from './ShareButton'

// Radix Popover 의 닫힘 규약을 공유 팝오버로 검증한다 — 트리거 클릭으로 열고,
// 바깥 클릭·Esc 로 닫히며 포커스가 트리거로 복귀한다.
function renderShare() {
  render(
    <div>
      <ShareButton url="https://proto-live.vercel.app/projects/1" title="빌드 · ProtoLive" />
      <button type="button">바깥 버튼</button>
    </div>
  )
  return screen.getByRole('button', { name: '공유' })
}

describe('ShareButton popover', () => {
  it('opens on trigger click and shows the share menu', async () => {
    const user = userEvent.setup()
    const trigger = renderShare()

    expect(screen.queryByText('링크 복사')).not.toBeInTheDocument()

    await user.click(trigger)

    expect(await screen.findByText('링크 복사')).toBeInTheDocument()
    expect(screen.getByText('X에 공유')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn에 공유')).toBeInTheDocument()
  })

  it('closes on outside pointer and keeps the menu content out of the DOM', async () => {
    const user = userEvent.setup()
    const trigger = renderShare()

    await user.click(trigger)
    expect(await screen.findByText('링크 복사')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '바깥 버튼' }))

    await waitFor(() => expect(screen.queryByText('링크 복사')).not.toBeInTheDocument())
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const trigger = renderShare()

    await user.click(trigger)
    expect(await screen.findByText('링크 복사')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByText('링크 복사')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})

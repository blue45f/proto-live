import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Modal } from './Modal'

// 센터 모달의 입장 모션 계약을 고정한다 — 사이드 패널(motion-safe:animate-panel-slide-in)과
// 같은 모션 언어로, 다이얼로그는 pop(페이드+스케일), backdrop 은 페이드만 받는다.
// motion-safe 게이트라 reduced-motion 사용자에게는 기존의 즉시 출현이 유지된다.
// (Radix Dialog 는 Portal 로 렌더되므로 backdrop 은 document 에서 조회한다.)
describe('Modal entrance motion', () => {
  it('applies the motion-safe pop to the dialog and fade to the backdrop', () => {
    render(
      <Modal title="로그인" subtitle="데모 계정으로 시작합니다" onClose={() => {}}>
        <p>내용</p>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toHaveClass('motion-safe:animate-modal-pop')
    expect(document.querySelector('.protolive-modal-backdrop')).toHaveClass(
      'motion-safe:animate-modal-fade'
    )
  })
})

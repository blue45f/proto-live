import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectSkeleton } from './ProjectSkeleton'

// 로딩 스켈레톤의 라이브 리전 규약(role/label)과 펄스 적용을 검증한다.
// (펄스 자체는 전역 prefers-reduced-motion 킬스위치가 무력화한다.)
describe('ProjectSkeleton', () => {
  it('announces loading via a labelled status region with pulse', () => {
    render(<ProjectSkeleton />)

    const status = screen.getByRole('status', { name: '사이트 목록 불러오는 중' })
    expect(status).toHaveClass('animate-pulse')
    expect(status).toHaveTextContent('사이트 목록을 불러오는 중입니다')
  })
})

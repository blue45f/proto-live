import { useEffect, useRef } from 'react'

/**
 * 네이티브 <details> 팝오버(공유 버튼·알림 벨)의 닫힘 동작 보강.
 * 기본 <details> 는 바깥을 클릭해도 열린 채 남아 콘텐츠를 가린다. 표준 드롭다운 관례대로
 * 바깥 포인터 입력·Esc 키로 닫고, Esc 닫힘 시에는 토글(summary)로 포커스를 되돌려
 * 키보드 사용자가 흐름을 잃지 않게 한다. 의존성 없이 <details> 패턴은 그대로 유지한다.
 */
export function useDismissableDetails() {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const details = detailsRef.current
    if (!details) {
      return
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!details.open) return
      if (event.target instanceof Node && details.contains(event.target)) return
      details.open = false
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return
      details.open = false
      details.querySelector<HTMLElement>('summary')?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const close = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  return [detailsRef, close] as const
}

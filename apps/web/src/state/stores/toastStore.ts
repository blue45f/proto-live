import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'match'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
}

export interface ToastState {
  toasts: ToastItem[]
  addToast: (type: ToastType, title: string, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const DEFAULT_TOAST_DURATION = 4500

/**
 * 토스트 알림 글로벌 UI 스토어(zustand). 종전의 모듈 전역 mutable 싱글턴(globalAddToast)을
 * 대체한다. 컴포넌트 외부(toast() 헬퍼)에서도 직접 디스패치할 수 있도록 클라이언트 UI 상태를
 * 한곳에 모은다. 동작/표시는 기존과 동일(id 생성 규칙·기본 지속시간 유지).
 */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (type, title, message, duration = DEFAULT_TOAST_DURATION) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((state) => ({ toasts: [...state.toasts, { id, type, title, message, duration }] }))
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/**
 * 컴포넌트 트리 밖(이벤트 핸들러·비동기 콜백)에서도 호출 가능한 토스트 헬퍼.
 * 기존 ToastContainer 의 globalAddToast 싱글턴과 동일한 호출 시그니처를 유지한다.
 */
export function toast(type: ToastType, title: string, message: string, duration?: number) {
  useToastStore.getState().addToast(type, title, message, duration)
}

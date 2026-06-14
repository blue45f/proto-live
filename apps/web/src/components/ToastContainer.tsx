import * as Toast from '@radix-ui/react-toast'
import { CheckCircle2, AlertTriangle, Info, X, Award } from 'lucide-react'
import { type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { type ToastType, toast, useToastStore } from '../state/stores/toastStore'

// 토스트 상태/디스패치는 zustand 스토어(state/stores/toastStore)로 이전됐다. 기존 임포트
// 경로 호환을 위해 toast 헬퍼와 ToastType 타입을 그대로 재노출한다(동작 동일).
// eslint-disable-next-line react-refresh/only-export-components
export { toast, type ToastType }

const toastConfig: Record<
  ToastType,
  {
    icon: ReactNode
    shellClass: string
    titleClass: string
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-lime-200" />,
    shellClass: 'border-lime-400/30 bg-lime-950/90',
    titleClass: 'text-lime-100',
  },
  error: {
    icon: <AlertTriangle className="h-5 w-5 text-red-200" />,
    shellClass: 'border-red-400/30 bg-red-950/90',
    titleClass: 'text-red-100',
  },
  info: {
    icon: <Info className="h-5 w-5 text-cyan-200" />,
    shellClass: 'border-cyan-400/30 bg-cyan-950/90',
    titleClass: 'text-cyan-100',
  },
  match: {
    icon: <Award className="h-5 w-5 text-amber-200" />,
    shellClass: 'border-amber-400/30 bg-amber-950/90',
    titleClass: 'text-amber-100',
  },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore(
    useShallow((state) => ({ toasts: state.toasts, removeToast: state.removeToast }))
  )

  return (
    <Toast.Provider duration={4500} swipeDirection="right">
      {toasts.map((t) => {
        const config = toastConfig[t.type]
        return (
          <Toast.Root
            key={t.id}
            duration={t.duration && t.duration > 0 ? t.duration : Infinity}
            onOpenChange={(open) => {
              if (!open) {
                removeToast(t.id)
              }
            }}
            className={`
              flex w-full items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl
              ${config.shellClass}
              data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out
            `}
          >
            <div className="mt-0.5 flex-shrink-0 rounded-lg bg-stone-950/45 p-2">{config.icon}</div>
            <div className="flex-grow min-w-0">
              <Toast.Title className={`text-sm font-black ${config.titleClass}`}>
                {t.title}
              </Toast.Title>
              <Toast.Description className="mt-1 overflow-wrap-anywhere text-xs leading-5 text-stone-300">
                {t.message}
              </Toast.Description>
            </div>
            <Toast.Close
              className="min-h-11 min-w-11 flex-shrink-0 rounded-lg text-stone-400 transition-colors hover:bg-stone-950/40 hover:text-stone-100"
              aria-label="알림 닫기"
            >
              <X className="mx-auto h-4 w-4" />
            </Toast.Close>
          </Toast.Root>
        )
      })}
      <Toast.Viewport className="toast-container" />
    </Toast.Provider>
  )
}

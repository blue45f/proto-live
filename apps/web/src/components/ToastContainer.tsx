import * as Toast from '@radix-ui/react-toast'
import { CheckCircle2, AlertTriangle, Info, X, Award } from 'lucide-react'
import { ReactNode, useCallback, useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'match'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message: string, duration?: number) => void
}

let globalAddToast: ToastContextType['addToast'] | null = null

// eslint-disable-next-line react-refresh/only-export-components
export function toast(type: ToastType, title: string, message: string, duration?: number) {
  if (globalAddToast) {
    globalAddToast(type, title, message, duration)
  }
}

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
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, title: string, message: string, duration = 4500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts((prev) => [...prev, { id, type, title, message, duration }])
    },
    []
  )

  useEffect(() => {
    globalAddToast = addToast
    return () => {
      globalAddToast = null
    }
  }, [addToast])

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

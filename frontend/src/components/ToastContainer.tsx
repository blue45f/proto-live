import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Award } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'match';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message: string, duration?: number) => void;
}

let globalAddToast: ToastContextType['addToast'] | null = null;

export function toast(type: ToastType, title: string, message: string, duration?: number) {
  if (globalAddToast) {
    globalAddToast(type, title, message, duration);
  }
}

const toastConfig: Record<ToastType, {
  icon: ReactNode;
  shellClass: string;
  titleClass: string;
}> = {
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
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const removalTimers = useRef<number[]>([]);

  const removeToast = useCallback((id: string) => {
    setExiting((prev) => new Set(prev).add(id));
    const timerId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
    removalTimers.current.push(timerId);
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message: string, duration = 4500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    if (duration > 0) {
      const timerId = window.setTimeout(() => removeToast(id), duration);
      removalTimers.current.push(timerId);
    }
  }, [removeToast]);

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
      removalTimers.current.forEach(clearTimeout);
      removalTimers.current = [];
    };
  }, [addToast]);

  return (
    <div className="toast-container" role="status" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => {
        const config = toastConfig[t.type];
        const isExiting = exiting.has(t.id);
        return (
          <div
            key={t.id}
            className={`
              flex w-full items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl
              ${config.shellClass}
              ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}
            `}
          >
            <div className="mt-0.5 flex-shrink-0 rounded-lg bg-stone-950/45 p-2">
              {config.icon}
            </div>
            <div className="flex-grow min-w-0">
              <h4 className={`text-sm font-black ${config.titleClass}`}>{t.title}</h4>
              <p className="mt-1 overflow-wrap-anywhere text-xs leading-5 text-stone-300">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="min-h-8 min-w-8 flex-shrink-0 rounded-lg text-stone-400 transition-colors hover:bg-stone-950/40 hover:text-stone-100"
              aria-label="알림 닫기"
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

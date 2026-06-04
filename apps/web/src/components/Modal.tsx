import React, { useId } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  dialogRef,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  onClose: () => void
  dialogRef?: React.RefObject<HTMLElement | null>
}) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <div className="protolive-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="닫기"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="protolive-modal relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-stone-700 bg-[oklch(99.2%_0.004_95)] p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-stone-800 pb-4">
          <div>
            <h2 id={titleId} className="text-xl font-black text-stone-50">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-stone-400">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:text-stone-50"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

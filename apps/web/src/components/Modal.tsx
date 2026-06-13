import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import React from 'react'

export function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="protolive-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm motion-safe:animate-modal-fade">
          <Dialog.Content className="protolive-modal relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-stone-700 bg-raised p-5 shadow-2xl motion-safe:animate-modal-pop">
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-stone-800 pb-4">
              <div>
                <Dialog.Title className="text-xl font-black text-stone-50">{title}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-stone-400">
                  {subtitle}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-700 text-stone-300 hover:text-stone-50"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

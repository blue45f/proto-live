import * as Popover from '@radix-ui/react-popover'
import { Check, Link2, Share2 } from 'lucide-react'
import { useState } from 'react'

/**
 * 프로젝트 공유 버튼. Radix Popover 드롭다운.
 * - Web Share API(모바일/지원 브라우저)가 있으면 시스템 공유
 * - 링크 복사(clipboard) + X·LinkedIn 공유 인텐트(외부 키 불필요)
 * - 바깥 클릭·Esc 로 닫히고 포커스가 트리거로 복귀한다(Radix Popover)
 */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  const canSystemShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(title)
  const xHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      globalThis.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleSystemShare = () => {
    void navigator.share({ title, url }).catch(() => {})
  }

  return (
    <Popover.Root>
      <Popover.Trigger className="protolive-share inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-stone-700 px-3 text-xs font-black text-stone-300 transition hover:border-lime-300/50 hover:text-lime-100">
        <Share2 className="h-3.5 w-3.5" />
        공유
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-30 w-44 overflow-hidden rounded-xl border border-stone-700 bg-stone-950/95 p-1 shadow-[0_12px_32px_oklch(20%_0.02_250/0.18)] backdrop-blur"
        >
          {canSystemShare ? (
            <button
              type="button"
              onClick={handleSystemShare}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-stone-200 transition hover:bg-lime-300/10 hover:text-lime-100"
            >
              <Share2 className="h-3.5 w-3.5" />
              시스템 공유
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-stone-200 transition hover:bg-lime-300/10 hover:text-lime-100"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-lime-300" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {copied ? '복사됨!' : '링크 복사'}
          </button>
          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-stone-200 transition hover:bg-lime-300/10 hover:text-lime-100"
          >
            X에 공유
          </a>
          <a
            href={linkedInHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-stone-200 transition hover:bg-lime-300/10 hover:text-lime-100"
          >
            LinkedIn에 공유
          </a>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

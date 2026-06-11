import { useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { ATTACHMENT_ACCEPT, prepareImageAttachment, type PreparedAttachment } from '../../lib/image'

const MAX_ATTACHMENTS = 3

/**
 * 토론/댓글 작성용 이미지 첨부 선택기 — 의존성 없이 캔버스(1600px/2MB)로 전처리한 data URL 을
 * 부모에 올린다. svg 등 비래스터는 image.ts 가 거부하므로 여기서는 미리보기/제거만 책임진다.
 */
export function ImageAttachmentPicker({
  attachments,
  onChange,
  disabled,
}: {
  attachments: PreparedAttachment[]
  onChange: (next: PreparedAttachment[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = MAX_ATTACHMENTS - attachments.length

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }
    setError(null)
    setIsProcessing(true)
    const accepted: PreparedAttachment[] = []
    try {
      for (const file of Array.from(fileList).slice(0, remaining)) {
        try {
          accepted.push(await prepareImageAttachment(file))
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : '이미지를 처리하지 못했습니다.')
        }
      }
      if (accepted.length > 0) {
        onChange([...attachments, ...accepted].slice(0, MAX_ATTACHMENTS))
      }
    } finally {
      setIsProcessing(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.dataUrl.slice(0, 64) + index}
            className="relative overflow-hidden rounded-lg border border-stone-700/70"
          >
            <img
              src={attachment.dataUrl}
              alt={`첨부 미리보기 ${index + 1}`}
              className="h-16 w-16 object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(attachments.filter((_, position) => position !== index))}
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-stone-950/80 text-stone-200 transition hover:bg-red-500/80 hover:text-white"
              aria-label={`첨부 ${index + 1} 제거`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {remaining > 0 ? (
          <label
            htmlFor={inputId}
            className={`inline-flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-700 text-[10px] font-bold text-stone-400 transition hover:border-cyan-300/50 hover:text-cyan-200 ${
              disabled || isProcessing ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            <span>이미지</span>
          </label>
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled || isProcessing}
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>
      <p className="text-[11px] text-stone-500">
        PNG·JPEG·WebP, 자동으로 1600px·2MB 이하로 줄여 최대 {MAX_ATTACHMENTS}장까지 첨부됩니다.
      </p>
      {error ? <p className="text-[11px] font-semibold text-red-200">{error}</p> : null}
    </div>
  )
}

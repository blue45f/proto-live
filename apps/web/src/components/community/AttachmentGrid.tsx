import { ImageOff } from 'lucide-react'

import type { CommunityAttachment } from '../../api'

/**
 * 토론/댓글 이미지 첨부 표시 — 래스터 data URL(image/*)만 <img> 로 렌더한다.
 * 운영자/작성자가 제거한 첨부(dataUrl='')는 "제거됨" 플레이스홀더로 남긴다(레코드 보존 정책).
 * data URL 은 서버·클라이언트 양쪽에서 image/png|jpeg|webp 만 통과하므로 svg 주입 표면이 없다.
 */
export function AttachmentGrid({ attachments }: { attachments: CommunityAttachment[] }) {
  if (attachments.length === 0) {
    return null
  }
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          {attachment.dataUrl && attachment.dataUrl.startsWith('data:image/') ? (
            <a
              href={attachment.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-stone-700/70 bg-stone-900/60 transition hover:border-cyan-300/50"
            >
              <img
                src={attachment.dataUrl}
                alt="토론 첨부 이미지"
                loading="lazy"
                decoding="async"
                className="h-28 w-28 object-cover sm:h-32 sm:w-32"
              />
            </a>
          ) : (
            <div className="grid h-28 w-28 place-items-center rounded-lg border border-dashed border-stone-700 bg-stone-900/40 text-stone-500 sm:h-32 sm:w-32">
              <ImageOff className="h-5 w-5" aria-hidden />
              <span className="mt-1 text-[10px] font-bold">제거된 첨부</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

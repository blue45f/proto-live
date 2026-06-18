/**
 * ChangelogDesk 네이티브 "새 소식" 섹션 — 외부 떠 있는 위젯 임베드 대체.
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 공개(`pk_`) ChangelogClient.getWall() 로 게시된 변경이력을
 * 읽어와, 소개 페이지(AboutView) 안에 이 앱의 디자인 토큰으로 타임라인을 렌더한다.
 * 외부 위젯의 흰 카드/파란 액센트가 아니라, 메이커 라운지 톤(stone/lime/cyan)으로
 * 1차 콘텐츠처럼 보인다.
 *
 * 게이팅: VITE_CHANGELOGDESK_URL 미설정이면 섹션 자체가 마운트되지 않는다(가역적).
 * 안전: 본문은 bodyMarkdown 을 평문 텍스트로만 렌더한다(HTML 주입 표면 없음).
 */
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'

import { getChangelogClient } from '../../lib/deskcloud'
import { formatRelativeTime } from '../../lib/format'

import type { ChangelogEntry, ChangelogEntryTag } from '@heejun/deskcloud'

const TAG_COPY: Record<ChangelogEntryTag, { label: string; tone: string }> = {
  new: { label: '신규', tone: 'border-lime-300/40 bg-lime-300/10 text-lime-200' },
  improved: { label: '개선', tone: 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' },
  fixed: { label: '수정', tone: 'border-violet-300/40 bg-violet-300/10 text-violet-200' },
  announcement: { label: '공지', tone: 'border-amber-300/40 bg-amber-300/10 text-amber-100' },
}

/** 마크다운 본문에서 첫 문단만 평문으로 추려 미리보기로 보여준다(서식 제거). */
function previewText(markdown: string): string {
  const firstBlock = markdown.split(/\n\s*\n/)[0] ?? ''
  return firstBlock
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function WhatsNewSection() {
  const enabled = Boolean(getChangelogClient())
  const query = useQuery({
    queryKey: ['deskcloud', 'changelog', 'wall'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const client = getChangelogClient()
      if (!client) return []
      const wall = await client.getWall({ limit: 6, signal })
      return wall.items
    },
  })

  if (!enabled) return null
  const entries = query.data ?? []
  // 로드 실패/빈 결과면 섹션을 비우지 않고 통째로 숨긴다(소개 페이지 흐름 유지).
  if (query.isError || (query.isSuccess && entries.length === 0)) return null

  return (
    <section aria-labelledby="protolive-whatsnew-heading">
      <div className="max-w-2xl">
        <h3
          id="protolive-whatsnew-heading"
          className="flex items-center gap-2 text-2xl font-black tracking-tight text-stone-50 sm:text-3xl"
        >
          <Sparkles className="h-6 w-6 text-lime-300" aria-hidden />
          최근 업데이트
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-400 sm:text-base">
          제품이 어떻게 달라지고 있는지 가장 최근 소식부터 모았습니다.
        </p>
      </div>

      {query.isPending ? (
        <ChangelogSkeleton />
      ) : (
        <ol className="mt-8 space-y-4">
          {entries.map((entry) => (
            <ChangelogRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </section>
  )
}

function ChangelogRow({ entry }: { entry: ChangelogEntry }) {
  const tag = TAG_COPY[entry.tag]
  const preview = previewText(entry.bodyMarkdown)
  return (
    <li className="rounded-2xl border border-stone-800 bg-stone-950/45 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-black ${tag.tone}`}
        >
          {tag.label}
        </span>
        {entry.version ? (
          <span className="font-mono text-xs text-stone-400">{entry.version}</span>
        ) : null}
        <span className="text-xs text-stone-500">
          {formatRelativeTime(entry.publishedAt ?? entry.createdAt)}
        </span>
      </div>
      <h4 className="mt-2.5 text-base font-bold text-stone-100">{entry.title}</h4>
      {preview ? (
        <p className="protolive-measure mt-1.5 text-sm leading-6 text-stone-300">{preview}</p>
      ) : null}
    </li>
  )
}

function ChangelogSkeleton() {
  return (
    <ol className="mt-8 space-y-4" aria-hidden>
      {[0, 1, 2].map((index) => (
        <li key={index} className="rounded-2xl border border-stone-800 bg-stone-950/45 p-5">
          <div className="h-4 w-24 rounded bg-stone-800" />
          <div className="mt-3 h-4 w-2/3 rounded bg-stone-800" />
          <div className="mt-2 h-3 w-full rounded bg-stone-800/70" />
        </li>
      ))}
    </ol>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { EyeOff, ImageOff, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import type { CommunityAttachment, DiscussionSummary } from '../../api'
import {
  fetchAdminAttachments,
  fetchAdminDiscussions,
  moderateDiscussion,
  removeAdminAttachment,
} from '../../api'
import { discussionCategoryCopy } from '../../lib/constants'
import { formatRelativeTime, maskEmail } from '../../lib/format'

/**
 * 운영 콘솔 — 토론/첨부 모더레이션. 토론 숨김·복구·하드 삭제, 첨부 이미지 제거(레코드 보존).
 * 권한 게이트는 상위(App)에서 admin 뷰로만 진입하도록 막는다.
 */
export function AdminCommunityView() {
  const [threads, setThreads] = useState<DiscussionSummary[] | null>(null)
  const [attachments, setAttachments] = useState<CommunityAttachment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    Promise.all([fetchAdminDiscussions(), fetchAdminAttachments()])
      .then(([threadList, attachmentList]) => {
        setThreads(threadList)
        setAttachments(attachmentList)
      })
      .catch(() => setError('커뮤니티 모더레이션 데이터를 불러오지 못했습니다.'))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load])

  async function runModeration(
    threadId: number,
    action: 'hide' | 'restore' | 'delete'
  ): Promise<void> {
    if (
      action === 'delete' &&
      !window.confirm('이 토론과 댓글·첨부를 완전히 삭제할까요? 복구할 수 없습니다.')
    ) {
      return
    }
    setBusyId(`thread-${threadId}`)
    try {
      await moderateDiscussion(threadId, { action })
      load()
    } catch {
      setError('처리에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeAttachment(attachmentId: number): Promise<void> {
    setBusyId(`attachment-${attachmentId}`)
    try {
      await removeAdminAttachment(attachmentId)
      load()
    } catch {
      setError('첨부 제거에 실패했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="lg:col-span-2 space-y-8">
      <header>
        <h2 className="text-2xl font-black text-stone-50">커뮤니티 모더레이션</h2>
        <p className="mt-1 text-sm text-stone-400">
          토론을 숨기거나 복구·삭제하고, 부적절한 이미지 첨부를 제거합니다.
        </p>
      </header>

      {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}

      <section>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-stone-400">토론</h3>
        {threads === null ? (
          <LoadingRow />
        ) : threads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-700 bg-stone-900/40 px-4 py-8 text-center text-sm text-stone-400">
            모더레이션할 토론이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {threads.map((thread) => {
              const hidden = thread.status === 'hidden'
              const busy = busyId === `thread-${thread.id}`
              return (
                <li
                  key={thread.id}
                  className={`rounded-xl border p-4 ${
                    hidden
                      ? 'border-amber-300/30 bg-amber-300/5'
                      : 'border-stone-800 bg-stone-900/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${discussionCategoryCopy[thread.category].tone}`}
                    >
                      {discussionCategoryCopy[thread.category].label}
                    </span>
                    {hidden ? (
                      <span className="inline-flex items-center rounded-full border border-amber-300/40 px-2 py-0.5 text-[11px] font-bold text-amber-100">
                        숨김
                      </span>
                    ) : null}
                    <span className="text-[11px] text-stone-500">
                      {formatRelativeTime(thread.lastActivityAt)}
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-stone-50">{thread.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-stone-400">{thread.excerpt}</p>
                  <p className="mt-1 text-[11px] text-stone-500">
                    {maskEmail(thread.authorEmail)} · 댓글 {thread.commentCount} · 사진{' '}
                    {thread.attachmentCount}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hidden ? (
                      <ModButton
                        busy={busy}
                        onClick={() => void runModeration(thread.id, 'restore')}
                        icon={<RotateCcw className="h-3.5 w-3.5" />}
                        label="복구"
                      />
                    ) : (
                      <ModButton
                        busy={busy}
                        onClick={() => void runModeration(thread.id, 'hide')}
                        icon={<EyeOff className="h-3.5 w-3.5" />}
                        label="숨김"
                      />
                    )}
                    <ModButton
                      busy={busy}
                      danger
                      onClick={() => void runModeration(thread.id, 'delete')}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      label="삭제"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-stone-400">
          이미지 첨부
        </h3>
        {attachments === null ? (
          <LoadingRow />
        ) : attachments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-700 bg-stone-900/40 px-4 py-8 text-center text-sm text-stone-400">
            제거할 첨부가 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/50"
              >
                {attachment.dataUrl ? (
                  <img
                    src={attachment.dataUrl}
                    alt="첨부 미리보기"
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-square w-full place-items-center text-stone-600">
                    <ImageOff className="h-6 w-6" aria-hidden />
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-[11px] text-stone-500">
                    {maskEmail(attachment.authorEmail)}
                  </p>
                  <button
                    type="button"
                    disabled={busyId === `attachment-${attachment.id}`}
                    onClick={() => void removeAttachment(attachment.id)}
                    className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-stone-700 px-2 py-1 text-[11px] font-bold text-stone-300 transition hover:border-red-300/60 hover:text-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    제거
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ModButton({
  busy,
  danger,
  icon,
  label,
  onClick,
}: {
  busy: boolean
  danger?: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
        danger
          ? 'border-stone-700 text-stone-300 hover:border-red-300/60 hover:text-red-100'
          : 'border-stone-700 text-stone-300 hover:border-cyan-300/50 hover:text-cyan-100'
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : icon}
      {label}
    </button>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-stone-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      불러오는 중…
    </div>
  )
}

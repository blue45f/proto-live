import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CornerDownRight,
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  Send,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
  addDiscussionComment,
  createDiscussion,
  deleteDiscussionComment,
  deleteOwnDiscussion,
  fetchDiscussion,
  fetchProjectDiscussions,
} from '../../infrastructure/api'
import {
  DISCUSSION_CATEGORY_IDS,
  discussionCategoryCopy,
  type DiscussionCategoryId,
} from '../../lib/constants'
import { formatRelativeTime, maskEmail } from '../../lib/format'

import { AttachmentGrid } from './AttachmentGrid'
import { BodyText } from './BodyText'
import { ImageAttachmentPicker } from './ImageAttachmentPicker'

import type { AuthSession, DiscussionDetail, DiscussionSummary } from '../../infrastructure/api'
import type { PreparedAttachment } from '../../lib/image'
import type { DiscussionRoute } from '../../router/route'

interface DiscussionHubProps {
  projectId: number
  route: DiscussionRoute
  session: AuthSession | null
  onRequireLogin: () => void
  onNavigateList: () => void
  onNavigateNew: () => void
  onNavigateDetail: (discussionId: number) => void
  onBackToProject: () => void
}

function CategoryBadge({ category }: { category: DiscussionCategoryId }) {
  const copy = discussionCategoryCopy[category]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${copy.tone}`}
    >
      {copy.label}
    </span>
  )
}

export function DiscussionHub(props: DiscussionHubProps) {
  return (
    <section
      aria-label="프로젝트 토론"
      className="rounded-2xl border border-stone-800 bg-stone-950/45 p-5 sm:p-6"
    >
      <header className="mb-4 flex items-center gap-2">
        <MessagesSquare className="h-5 w-5 text-lime-300" aria-hidden />
        <h3 className="text-lg font-black text-stone-50">토론</h3>
      </header>
      {props.route.mode === 'new' ? (
        <DiscussionComposer {...props} />
      ) : props.route.mode === 'detail' ? (
        <DiscussionDetailView {...props} discussionId={props.route.discussionId} />
      ) : (
        <DiscussionList {...props} />
      )}
    </section>
  )
}

function DiscussionList({
  projectId,
  session,
  onRequireLogin,
  onNavigateNew,
  onNavigateDetail,
}: DiscussionHubProps) {
  // 기존: projectId 변경 시 1회 fetch(전환마다 로딩=null 로 리셋). react-query 가
  // queryKey 별 캐시/로딩 상태를 관리하므로 동일한 마운트/전환 동작을 그대로 얻는다.
  const { data, isError } = useQuery({
    queryKey: ['discussions', 'project', projectId],
    queryFn: () => fetchProjectDiscussions(projectId),
  })

  const threads: DiscussionSummary[] | null = data ?? null
  const error = isError ? '토론을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-400">
          이 프로토타입을 두고 나눈 질문·피드백·도움 요청·활용 사례입니다.
        </p>
        <button
          type="button"
          onClick={() => (session ? onNavigateNew() : onRequireLogin())}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-lime-300 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-lime-200"
        >
          <MessageSquarePlus className="h-4 w-4" />새 토론
        </button>
      </div>

      {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}

      {threads === null && !error ? (
        <div className="flex items-center gap-2 py-8 text-sm text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          토론을 불러오는 중…
        </div>
      ) : threads && threads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/40 px-6 py-10 text-center">
          <p className="text-base font-black text-stone-100">아직 토론이 없어요.</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-stone-400">
            만든 방법이 궁금하거나, 써보고 느낀 점을 남기고 싶다면 첫 토론을 시작해 보세요.
          </p>
          <button
            type="button"
            onClick={() => (session ? onNavigateNew() : onRequireLogin())}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-lime-300/40 bg-lime-300/10 px-3 py-2 text-sm font-black text-lime-100 transition hover:border-lime-300/70"
          >
            <MessageSquarePlus className="h-4 w-4" />첫 토론 시작하기
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {threads?.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => onNavigateDetail(thread.id)}
                className="block w-full rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-left transition hover:border-cyan-300/40 hover:bg-stone-900/80"
              >
                <div className="flex items-center gap-2">
                  <CategoryBadge category={thread.category} />
                  <span className="text-[11px] text-stone-500">
                    {formatRelativeTime(thread.lastActivityAt)}
                  </span>
                </div>
                <p className="mt-2 font-bold text-stone-50">{thread.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-400">
                  {thread.excerpt}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-stone-500">
                  <span>{maskEmail(thread.authorEmail)}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessagesSquare className="h-3 w-3" aria-hidden />
                    댓글 {thread.commentCount}
                  </span>
                  {thread.attachmentCount > 0 ? <span>사진 {thread.attachmentCount}</span> : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DiscussionComposer({
  projectId,
  session,
  onRequireLogin,
  onNavigateList,
  onNavigateDetail,
}: DiscussionHubProps) {
  const [category, setCategory] = useState<DiscussionCategoryId>('question')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<PreparedAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = title.trim().length >= 2 && body.trim().length >= 10 && !isSubmitting

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!session) {
      onRequireLogin()
      return
    }
    if (!canSubmit) {
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const detail = await createDiscussion(projectId, {
        category,
        title: title.trim(),
        body: body.trim(),
        attachments: attachments.map((item) => item.dataUrl),
      })
      onNavigateDetail(detail.thread.id)
    } catch {
      setError('토론을 등록하지 못했습니다. 입력 내용을 확인하고 다시 시도해주세요.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onNavigateList}
        className="inline-flex items-center gap-1 text-sm font-bold text-stone-400 transition hover:text-stone-100"
      >
        <ArrowLeft className="h-4 w-4" />
        토론 목록
      </button>

      <fieldset>
        <legend className="text-sm font-bold text-stone-200">주제 분류</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DISCUSSION_CATEGORY_IDS.map((id) => {
            const copy = discussionCategoryCopy[id]
            const active = id === category
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                  active
                    ? copy.tone
                    : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                }`}
              >
                {copy.label}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-xs text-stone-500">{discussionCategoryCopy[category].helper}</p>
      </fieldset>

      <label className="block">
        <span className="text-sm font-bold text-stone-200">제목</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="예: 결제 연동은 어떤 도구로 붙이셨나요?"
          className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-stone-200">내용</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={6}
          placeholder="궁금한 점이나 피드백을 구체적으로 적어주세요. 링크(http/https)도 붙일 수 있어요."
          className="mt-1.5 w-full resize-y rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm leading-6 text-stone-100 outline-none transition focus:border-cyan-300/60"
        />
        <span className="mt-1 block text-right text-[11px] text-stone-500">{body.length}/4000</span>
      </label>

      <ImageAttachmentPicker
        attachments={attachments}
        onChange={setAttachments}
        disabled={isSubmitting}
      />

      {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onNavigateList}
          className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-bold text-stone-300 transition hover:border-stone-500"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          토론 등록
        </button>
      </div>
    </form>
  )
}

function DiscussionDetailView({
  projectId,
  discussionId,
  session,
  onRequireLogin,
  onNavigateList,
}: DiscussionHubProps & { discussionId: number }) {
  const [replyTo, setReplyTo] = useState<number | null>(null)

  // 기존: projectId/discussionId 변경 시 1회 fetch + 댓글 추가/삭제 후 수동 재로드(load).
  // react-query 의 queryKey + refetch 로 동일하게 동작한다.
  const {
    data: detail,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['discussions', 'detail', projectId, discussionId],
    queryFn: () => fetchDiscussion(projectId, discussionId),
  })

  const error = isError ? '토론을 찾을 수 없거나 불러오지 못했습니다.' : null
  const load = useCallback(() => {
    void refetch()
  }, [refetch])

  const rootComments = useMemo(
    () => detail?.comments.filter((comment) => comment.parentId === null) ?? [],
    [detail]
  )
  const repliesByParent = useMemo(() => {
    const map = new Map<number, DiscussionDetail['comments']>()
    for (const comment of detail?.comments ?? []) {
      if (comment.parentId !== null) {
        const list = map.get(comment.parentId) ?? []
        list.push(comment)
        map.set(comment.parentId, list)
      }
    }
    return map
  }, [detail])

  const isOwner = Boolean(session && detail && session.email === detail.thread.authorEmail)

  async function handleDeleteThread() {
    if (!detail) return
    await deleteOwnDiscussion(detail.thread.id)
    onNavigateList()
  }

  if (error) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={onNavigateList}
          className="inline-flex items-center gap-1 text-sm font-bold text-stone-400 transition hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          토론 목록
        </button>
        <p className="text-sm font-semibold text-red-200">{error}</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-stone-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        토론을 불러오는 중…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onNavigateList}
        className="inline-flex items-center gap-1 text-sm font-bold text-stone-400 transition hover:text-stone-100"
      >
        <ArrowLeft className="h-4 w-4" />
        토론 목록
      </button>

      <article className="rounded-xl border border-stone-800 bg-stone-900/50 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <CategoryBadge category={detail.thread.category} />
          <span className="text-[11px] text-stone-500">
            {formatRelativeTime(detail.thread.createdAt)}
          </span>
        </div>
        <h4 className="mt-2 text-xl font-black text-stone-50">{detail.thread.title}</h4>
        <p className="mt-1 text-[11px] font-semibold text-stone-500">
          {maskEmail(detail.thread.authorEmail)}
        </p>
        <BodyText body={detail.thread.body} className="mt-3 text-sm leading-7 text-stone-200" />
        <AttachmentGrid attachments={detail.thread.attachments} />
        {isOwner ? (
          <button
            type="button"
            onClick={() => void handleDeleteThread()}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-500 transition hover:text-red-200"
          >
            <Trash2 className="h-3.5 w-3.5" />내 토론 삭제
          </button>
        ) : null}
      </article>

      <div>
        <h5 className="mb-2 text-sm font-black text-stone-200">댓글 {rootComments.length}</h5>
        <CommentComposer
          discussionId={discussionId}
          session={session}
          onRequireLogin={onRequireLogin}
          onPosted={load}
        />
        <ul className="mt-4 space-y-3">
          {rootComments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
              <CommentRow
                comment={comment}
                session={session}
                discussionId={discussionId}
                onChanged={load}
                onReply={() =>
                  setReplyTo((current) => (current === comment.id ? null : comment.id))
                }
              />
              <ul className="mt-2 space-y-2 border-l border-stone-800 pl-3">
                {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                  <li key={reply.id} className="flex gap-2">
                    <CornerDownRight
                      className="mt-1 h-3.5 w-3.5 shrink-0 text-stone-600"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <CommentRow
                        comment={reply}
                        session={session}
                        discussionId={discussionId}
                        onChanged={load}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {replyTo === comment.id ? (
                <div className="mt-2 border-l border-stone-800 pl-3">
                  <CommentComposer
                    discussionId={discussionId}
                    session={session}
                    parentId={comment.id}
                    onRequireLogin={onRequireLogin}
                    onPosted={() => {
                      setReplyTo(null)
                      load()
                    }}
                    compact
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CommentRow({
  comment,
  session,
  discussionId,
  onChanged,
  onReply,
}: {
  comment: DiscussionDetail['comments'][number]
  session: AuthSession | null
  discussionId: number
  onChanged: () => void
  onReply?: () => void
}) {
  const isDeleted = comment.status === 'deleted'
  const canDelete = Boolean(
    session && (session.email === comment.authorEmail || session.role === 'admin')
  )

  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500">
        <span>{isDeleted ? '삭제된 댓글' : maskEmail(comment.authorEmail)}</span>
        {!isDeleted ? <span>{formatRelativeTime(comment.createdAt)}</span> : null}
      </div>
      {isDeleted ? (
        <p className="mt-1 text-sm italic text-stone-500">삭제된 댓글입니다.</p>
      ) : (
        <>
          <BodyText body={comment.body} className="mt-1 text-sm leading-6 text-stone-200" />
          <AttachmentGrid attachments={comment.attachments} />
          <div className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-stone-500">
            {onReply ? (
              <button type="button" onClick={onReply} className="transition hover:text-cyan-200">
                답글
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() =>
                  void deleteDiscussionComment(discussionId, comment.id).then(onChanged)
                }
                className="transition hover:text-red-200"
              >
                삭제
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

function CommentComposer({
  discussionId,
  session,
  parentId,
  onRequireLogin,
  onPosted,
  compact,
}: {
  discussionId: number
  session: AuthSession | null
  parentId?: number
  onRequireLogin: () => void
  onPosted: () => void
  compact?: boolean
}) {
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<PreparedAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session) {
    return (
      <button
        type="button"
        onClick={onRequireLogin}
        className="w-full rounded-lg border border-dashed border-stone-700 bg-stone-900/40 px-3 py-2.5 text-left text-sm font-semibold text-stone-400 transition hover:border-cyan-300/40 hover:text-cyan-100"
      >
        로그인하고 {parentId ? '답글' : '댓글'}을 남겨보세요.
      </button>
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (body.trim().length < 2 || isSending) {
      return
    }
    setIsSending(true)
    setError(null)
    try {
      await addDiscussionComment(discussionId, {
        body: body.trim(),
        parentId,
        attachments: attachments.map((item) => item.dataUrl),
      })
      setBody('')
      setAttachments([])
      onPosted()
    } catch {
      setError('댓글을 등록하지 못했습니다. 다시 시도해주세요.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={compact ? 2 : 3}
        maxLength={1000}
        placeholder={parentId ? '답글을 입력하세요' : '댓글을 입력하세요'}
        className="w-full resize-y rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2 text-sm leading-6 text-stone-100 outline-none transition focus:border-cyan-300/60"
      />
      {!compact ? (
        <ImageAttachmentPicker
          attachments={attachments}
          onChange={setAttachments}
          disabled={isSending}
        />
      ) : null}
      {error ? <p className="text-[11px] font-semibold text-red-200">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={body.trim().length < 2 || isSending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-300 px-3 py-1.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
          {parentId ? '답글' : '댓글'} 등록
        </button>
      </div>
    </form>
  )
}

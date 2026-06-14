import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Inbox, Loader2, Mail, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BodyText } from '../../domains/community/BodyText'
import {
  fetchConversationMessages,
  fetchConversations,
  sendDirectMessage,
} from '../../infrastructure/api'
import { formatRelativeTime, maskEmail } from '../../lib/format'

import type { AuthSession, DmConversation, DmMessage } from '../../infrastructure/api'

const CONVERSATION_POLL_MS = 20000

/**
 * 메이커↔관심 회원 1:1 쪽지함 — 비실시간 폴링(20초)으로 목록/대화를 새로고침한다.
 * 새 대화는 프로젝트 상세에서 시작하고, 여기서는 받은/보낸 대화 답장에 집중한다.
 */
export function MessagesView({
  session,
  activeConversationId,
  onOpenConversation,
  onCloseConversation,
  onUnreadChange,
}: {
  session: AuthSession | null
  activeConversationId: number | null
  onOpenConversation: (conversationId: number) => void
  onCloseConversation: () => void
  onUnreadChange?: (total: number) => void
}) {
  // 기존: 로그인 시 마운트 1회 + 20초 폴링으로 대화 목록 fetch, 비로그인 시 null.
  // react-query 로 옮기되 enabled(세션 게이트) + refetchInterval(폴링)로 동작을 보존한다.
  const { data, isError, refetch } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: fetchConversations,
    enabled: Boolean(session),
    refetchInterval: CONVERSATION_POLL_MS,
  })

  const conversations: DmConversation[] | null = session ? (data ?? null) : null
  const error = isError ? '쪽지를 불러오지 못했습니다.' : null

  const loadConversations = useCallback(() => {
    void refetch()
  }, [refetch])

  // 성공 fetch 마다 미읽음 합계를 상위로 올리던 부수효과를 보존한다(데이터 변화 시 실행).
  useEffect(() => {
    if (!session || !data) {
      return
    }
    onUnreadChange?.(data.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0))
  }, [session, data, onUnreadChange])

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyMessagesNotice
          title="쪽지함은 로그인 후 이용할 수 있어요"
          body="메이커와 관심 회원은 프로젝트 상세에서 1:1 쪽지로 대화를 시작할 수 있습니다."
        />
      </div>
    )
  }

  if (activeConversationId !== null) {
    return (
      // key 로 대화 전환 시 스레드를 리마운트해 로컬 입력/전송 에러를 리셋한다
      // (기존엔 conversationId effect 가 error 를 비웠음).
      <ConversationThread
        key={activeConversationId}
        conversationId={activeConversationId}
        session={session}
        onBack={onCloseConversation}
        onAfterSend={loadConversations}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 flex items-center gap-2">
        <Mail className="h-6 w-6 text-lime-300" aria-hidden />
        <h2 className="text-2xl font-black text-stone-50">쪽지함</h2>
      </header>

      {error ? <p className="mb-3 text-sm font-semibold text-red-200">{error}</p> : null}

      {conversations === null && !error ? (
        <div className="flex items-center gap-2 py-10 text-sm text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          쪽지를 불러오는 중…
        </div>
      ) : conversations && conversations.length === 0 ? (
        <EmptyMessagesNotice
          title="아직 주고받은 쪽지가 없어요"
          body="마음에 드는 프로토타입 상세에서 메이커에게 첫 쪽지를 보내보세요. 받은 쪽지에는 여기서 답장할 수 있습니다."
        />
      ) : (
        <ul className="space-y-2.5">
          {conversations?.map((conversation) => {
            const counterpart =
              conversation.makerEmail === session.email
                ? { name: conversation.investorName, email: conversation.investorEmail }
                : { name: conversation.makerName, email: conversation.makerEmail }
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onOpenConversation(conversation.id)}
                  className="block w-full rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-left transition hover:border-cyan-300/40 hover:bg-stone-900/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-bold text-stone-50">
                      {counterpart.name || maskEmail(counterpart.email)}
                    </span>
                    <span className="shrink-0 text-[11px] text-stone-500">
                      {formatRelativeTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    {conversation.projectTitle}
                  </p>
                  {conversation.lastMessagePreview ? (
                    <p className="mt-1.5 line-clamp-1 text-sm text-stone-400">
                      {conversation.lastMessagePreview}
                    </p>
                  ) : null}
                  {conversation.unreadCount ? (
                    <span className="mt-2 inline-flex items-center rounded-full bg-cyan-300 px-2 py-0.5 text-[11px] font-black text-slate-950">
                      새 쪽지 {conversation.unreadCount}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ConversationThread({
  conversationId,
  session,
  onBack,
  onAfterSend,
}: {
  conversationId: number
  session: AuthSession
  onBack: () => void
  onAfterSend: () => void
}) {
  const [body, setBody] = useState('')
  // 전송 실패 에러는 fetch 에러와 동일한 영역에 표시되므로 로컬로 따로 둔다.
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 기존: 마운트 1회 + 20초 폴링으로 대화 상세 fetch(conversationId 변경 시 재로드).
  const { data, isError, refetch } = useQuery({
    queryKey: ['messages', 'conversation', conversationId],
    queryFn: () => fetchConversationMessages(conversationId),
    refetchInterval: CONVERSATION_POLL_MS,
  })

  const conversation: DmConversation | null = data?.conversation ?? null
  const messages: DmMessage[] = data?.messages ?? []
  // 로드 에러와 전송 에러를 같은 영역에서 보여주던 동작을 보존한다.
  const error = sendError ?? (isError ? '대화를 불러오지 못했습니다.' : null)

  const load = useCallback(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const counterpart =
    conversation && conversation.makerEmail === session.email
      ? { name: conversation.investorName, email: conversation.investorEmail }
      : { name: conversation?.makerName, email: conversation?.makerEmail }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault()
    if (body.trim().length < 2 || isSending) {
      return
    }
    setIsSending(true)
    setSendError(null)
    try {
      await sendDirectMessage({ conversationId, body: body.trim() })
      setBody('')
      load()
      onAfterSend()
    } catch {
      setSendError('쪽지를 보내지 못했습니다. 다시 시도해주세요.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <header className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-bold text-stone-400 transition hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          쪽지함
        </button>
      </header>

      {conversation ? (
        <div className="mb-3 rounded-xl border border-stone-800 bg-stone-900/40 px-4 py-3">
          <p className="font-bold text-stone-50">
            {counterpart.name || (counterpart.email ? maskEmail(counterpart.email) : '상대방')}
          </p>
          <p className="text-xs text-stone-500">{conversation.projectTitle}</p>
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {messages.map((message) => {
          const mine = message.senderEmail === session.email
          return (
            <li key={message.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  mine
                    ? 'rounded-br-sm bg-lime-300 text-slate-950'
                    : 'rounded-bl-sm border border-stone-800 bg-stone-900/60 text-stone-100'
                }`}
              >
                <BodyText body={message.body} className="text-sm leading-6" />
                <span
                  className={`mt-1 block text-[10px] ${mine ? 'text-slate-900/70' : 'text-stone-500'}`}
                >
                  {formatRelativeTime(message.createdAt)}
                  {mine && message.readAt ? ' · 읽음' : ''}
                </span>
              </div>
            </li>
          )
        })}
        <div ref={bottomRef} />
      </ul>

      {error ? <p className="mt-3 text-sm font-semibold text-red-200">{error}</p> : null}

      <form onSubmit={handleSend} className="mt-4 flex items-end gap-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="쪽지를 입력하세요"
          className="flex-1 resize-y rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2 text-sm leading-6 text-stone-100 outline-none transition focus:border-cyan-300/60"
        />
        <button
          type="submit"
          disabled={body.trim().length < 2 || isSending}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          보내기
        </button>
      </form>
    </div>
  )
}

function EmptyMessagesNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 px-6 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-stone-800 text-stone-400">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-4 text-base font-black text-stone-100">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-stone-400">{body}</p>
    </div>
  )
}

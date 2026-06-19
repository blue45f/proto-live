import { CheckCircle2, Inbox, LifeBuoy, Loader2, RotateCcw, Send } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import {
  INQUIRY_BODY_MAX,
  INQUIRY_CATEGORIES,
  INQUIRY_CATEGORY_HINTS,
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_NAME_MAX,
  INQUIRY_STATUS_LABELS,
  INQUIRY_TITLE_MAX,
  listInquiries,
  submitInquiry,
  type Inquiry,
  type InquiryCategory,
  type InquiryStatus,
} from '../../lib/inquiryApi'
import { FeedbackPanel } from '../deskcloud/FeedbackPanel'

/** 상태 뱃지 톤 — 진행도에 따라 앱 토큰 색을 매핑한다(stone/lime/cyan/amber). */
const statusTone: Record<InquiryStatus, string> = {
  new: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
  in_progress: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
  resolved: 'border-lime-300/30 bg-lime-300/10 text-lime-100',
  closed: 'border-stone-700 bg-stone-900/60 text-stone-400',
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const label = INQUIRY_STATUS_LABELS[status] ?? status
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-black ${statusTone[status] ?? statusTone.closed}`}
    >
      {label}
    </span>
  )
}

/** ISO 날짜를 간단한 상대 표기로. 1주 이상은 YYYY.MM.DD 절대 표기로 폴백. */
function shortRelativeDate(iso: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const diffMs = Date.now() - then.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return then.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  return (
    <article className="rounded-xl border border-stone-700 bg-stone-900/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-md border border-stone-700 bg-stone-800/60 px-2 py-0.5 text-[11px] font-black text-stone-200">
          {INQUIRY_CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
        </span>
        <StatusBadge status={inquiry.status} />
        <span className="ml-auto text-[11px] text-stone-500">
          {shortRelativeDate(inquiry.createdAt)}
        </span>
      </div>
      <h4 className="mt-2.5 text-sm font-black text-stone-100">{inquiry.title}</h4>
      <p className="mt-1 line-clamp-3 text-sm leading-6 text-stone-400">{inquiry.body}</p>
      <p className="mt-2.5 text-[11px] text-stone-500">{inquiry.authorName?.trim() || '익명'}</p>
    </article>
  )
}

type BoardState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; items: Inquiry[] }

function InquiryBoard() {
  const [state, setState] = useState<BoardState>({ phase: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  // 목록 조회. 상태 변경은 모두 비동기 콜백에서만 한다(effect 안에서 동기 setState
  // 금지 — set-state-in-effect). 로딩 표시는 reloadKey 가 바뀔 때 reload 핸들러가
  // 먼저 처리하고, 마운트 해제·재조회 시 AbortController 로 stale 응답을 무시한다.
  useEffect(() => {
    const controller = new AbortController()
    listInquiries(20, 0)
      .then((list) => {
        if (controller.signal.aborted) return
        setState({ phase: 'ready', items: list.items })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setState({
          phase: 'error',
          message: cause instanceof Error ? cause.message : '문의 목록을 불러오지 못했습니다.',
        })
      })
    return () => controller.abort()
  }, [reloadKey])

  const loading = state.phase === 'loading'
  const reload = () => {
    setState({ phase: 'loading' })
    setReloadKey((value) => value + 1)
  }

  return (
    <section className="space-y-4" aria-labelledby="support-board-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-cyan-300" aria-hidden />
          <h3 id="support-board-heading" className="text-lg font-black text-stone-50">
            공개 문의 게시판
          </h3>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs font-black text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          새로고침
        </button>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {state.phase === 'loading' ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((key) => (
              <li
                key={key}
                className="h-32 animate-pulse rounded-xl border border-stone-700 bg-stone-900/40"
              />
            ))}
          </ul>
        ) : state.phase === 'error' ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-5">
            <p className="text-sm font-bold text-red-200">{state.message}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-black text-red-100 transition hover:bg-red-500/10"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              다시 시도
            </button>
          </div>
        ) : state.items.length === 0 ? (
          <div className="rounded-xl border border-stone-700 bg-stone-900/40 p-8 text-center">
            <p className="text-sm font-black text-stone-200">아직 등록된 문의가 없어요</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-stone-500">
              첫 문의를 남겨주세요. 등록된 문의는 이 게시판에 공개로 표시됩니다.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {state.items.map((inquiry) => (
              <li key={inquiry.id}>
                <InquiryCard inquiry={inquiry} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/**
 * 인앱 문의 게시판 — desk-platform 공개 REST(POST/GET /api/v1/apps/proto-live/inquiries)로
 * 통합. 카테고리(제휴·버그·의견·이용) 선택 → 제목/내용(+선택 이름·이메일) → 허니팟 hidden
 * website → 제출 시 등록하고, 하단에 공개 게시판 목록을 상태 뱃지와 함께 노출한다.
 * 전화·이메일로 문의 남기는 수단은 제거하고 모든 문의를 이 게시판으로 모은다.
 */
export function SupportView({ contactEmail }: { contactEmail?: string }) {
  const fieldId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [category, setCategory] = useState<InquiryCategory>('usage')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [email, setEmail] = useState(contactEmail ?? '')
  const [website, setWebsite] = useState('') // 허니팟 — 사람은 채우지 않는다.
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // 새 문의를 등록하면 게시판을 다시 불러오기 위한 키.
  const [boardKey, setBoardKey] = useState(0)

  // 라우트 진입 시 페이지 제목으로 포커스를 옮긴다(스크린리더 컨텍스트 + 키보드 시작점).
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  function validate(): string | null {
    if (!title.trim()) return '제목을 입력해주세요.'
    if (title.trim().length > INQUIRY_TITLE_MAX) {
      return `제목은 ${INQUIRY_TITLE_MAX}자 이하로 입력해주세요.`
    }
    if (!body.trim()) return '내용을 입력해주세요.'
    if (body.trim().length > INQUIRY_BODY_MAX) {
      return `내용은 ${INQUIRY_BODY_MAX}자 이하로 입력해주세요.`
    }
    if (authorName.trim().length > INQUIRY_NAME_MAX) {
      return `이름은 ${INQUIRY_NAME_MAX}자 이하로 입력해주세요.`
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return '회신 이메일 형식이 올바르지 않습니다.'
    }
    return null
  }

  function resetForm() {
    setTitle('')
    setBody('')
    setAuthorName('')
    setEmail(contactEmail ?? '')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    // 허니팟이 채워졌으면 봇으로 간주하고 조용히 성공 처리한다(네트워크 호출 없음).
    if (website.trim()) {
      setSubmitted(true)
      resetForm()
      return
    }

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      await submitInquiry({
        category,
        title: title.trim(),
        body: body.trim(),
        authorName: authorName.trim() || undefined,
        contactEmail: email.trim() || undefined,
      })
      setSubmitted(true)
      resetForm()
      setBoardKey((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문의 등록에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-lime-300" aria-hidden />
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-black text-stone-50 outline-none"
          >
            문의하기
          </h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          제휴·버그·의견·이용 문의를 남겨주세요. 접수된 문의는 아래 공개 게시판에 표시되며, 운영자가
          확인 후 상태를 업데이트합니다. 전화·이메일 대신 이 게시판으로 문의를 통합했습니다.
        </p>
      </header>

      {submitted ? (
        <div
          role="status"
          className="rounded-2xl border border-lime-300/30 bg-lime-300/5 p-8 text-center"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-lime-300 text-slate-950">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="mt-5 text-2xl font-black text-stone-50">문의가 접수되었어요</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-400">
            아래 공개 게시판에서 등록된 문의를 확인할 수 있어요. 운영자가 확인 후 상태를
            업데이트합니다.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-4 py-2 text-sm font-black text-stone-300 transition hover:border-stone-500"
          >
            <Send className="h-3.5 w-3.5" aria-hidden />새 문의 작성
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <fieldset>
            <legend className="text-sm font-bold text-stone-200">문의 유형</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {INQUIRY_CATEGORIES.map((id) => {
                const active = id === category
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    aria-pressed={active}
                    title={INQUIRY_CATEGORY_HINTS[id]}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-lime-300/50 bg-lime-300/10'
                        : 'border-stone-700 hover:border-stone-500'
                    }`}
                  >
                    <span className="block text-sm font-black text-stone-100">
                      {INQUIRY_CATEGORY_LABELS[id]}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-stone-500">
                      {INQUIRY_CATEGORY_HINTS[id]}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label htmlFor={`${fieldId}-title`} className="block">
            <span className="flex items-center justify-between text-sm font-bold text-stone-200">
              제목
              <span className="text-[11px] font-normal text-stone-500">
                {title.length}/{INQUIRY_TITLE_MAX}
              </span>
            </span>
            <input
              id={`${fieldId}-title`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={INQUIRY_TITLE_MAX}
              required
              placeholder="문의 제목을 입력해주세요"
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
            />
          </label>

          <label htmlFor={`${fieldId}-body`} className="block">
            <span className="flex items-center justify-between text-sm font-bold text-stone-200">
              내용
              <span className="text-[11px] font-normal text-stone-500">
                {body.length}/{INQUIRY_BODY_MAX}
              </span>
            </span>
            <textarea
              id={`${fieldId}-body`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={INQUIRY_BODY_MAX}
              required
              rows={7}
              placeholder="문의 내용을 구체적으로 적어주세요. (최소 10자)"
              className="mt-1.5 w-full resize-y rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm leading-6 text-stone-100 outline-none transition focus:border-cyan-300/60"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={`${fieldId}-name`} className="block">
              <span className="text-sm font-bold text-stone-200">
                이름 <span className="font-normal text-stone-500">(선택)</span>
              </span>
              <input
                id={`${fieldId}-name`}
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                maxLength={INQUIRY_NAME_MAX}
                autoComplete="name"
                placeholder="게시판에 표시될 이름"
                className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
              />
            </label>
            <label htmlFor={`${fieldId}-email`} className="block">
              <span className="text-sm font-bold text-stone-200">
                회신 이메일 <span className="font-normal text-stone-500">(선택)</span>
              </span>
              <input
                id={`${fieldId}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="회신받을 이메일 (비공개)"
                className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
              />
            </label>
          </div>

          {/* 허니팟: 사람에겐 숨김. 봇이 채우면 무음 처리한다. */}
          <div
            aria-hidden
            className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
          >
            <label htmlFor={`${fieldId}-website`}>웹사이트(입력하지 마세요)</label>
            <input
              id={`${fieldId}-website`}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          {/* 검증·서버 에러는 aria-live 로 announce. */}
          <p role="alert" aria-live="assertive" className="min-h-0">
            {error ? (
              <span className="block rounded-lg border border-red-400/30 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-200">
                {error}
              </span>
            ) : null}
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {isSubmitting ? '접수 중…' : '문의 보내기'}
          </button>
          <p className="text-center text-[11px] text-stone-500">
            이메일은 비공개로 운영자만 확인합니다.
          </p>
        </form>
      )}

      {/* 새 문의를 등록하면 boardKey 가 바뀌어 게시판이 리마운트되며 최신 목록을 다시 불러온다. */}
      <InquiryBoard key={boardKey} />

      {/* SurveyDesk 네이티브 만족도 설문(DeskCloud). VITE_SURVEYDESK_URL 설정 + 활성
          설문이 있을 때만 폼 아래에 1차 기능으로 붙는다 — 미설정/없음이면 게시판만 남는다. */}
      <FeedbackPanel userEmail={contactEmail} />
    </div>
  )
}

import { useState } from 'react'
import { CheckCircle2, ExternalLink, LifeBuoy, Loader2, Send } from 'lucide-react'
import {
  INQUIRY_BODY_MAX,
  INQUIRY_CATEGORIES,
  INQUIRY_FALLBACK_URL,
  INQUIRY_TITLE_MAX,
  createInquiry,
  inquiryCategoryCopy,
  validateInquiryInput,
  type InquiryCategory,
  type InquiryReceipt,
} from '../../lib/inquiries'

/**
 * 인앱 문의 폼 — TermsDesk 중앙 문의 접수(POST /api/public/proto-live/inquiries)로 보낸다.
 * 성공 시 영수증(접수 번호)을 보여주고, 실패 시 외부 지원 보드 폴백 링크를 안내한다.
 * 허니팟(website)은 화면에 보이지 않는 숨김 필드로, 봇이 채우면 서버가 조용히 폐기한다.
 */
export function SupportView({
  contactEmail,
  originUrl,
}: {
  contactEmail?: string
  originUrl: string
}) {
  const [category, setCategory] = useState<InquiryCategory>('contact')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [email, setEmail] = useState(contactEmail ?? '')
  const [website, setWebsite] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<InquiryReceipt | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const input = { category, title, body, contactEmail: email || undefined, website }
    const validationError = validateInquiryInput(input)
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await createInquiry(input, originUrl)
      setReceipt(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문의 접수에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-lime-300/30 bg-lime-300/5 p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-lime-300 text-slate-950">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-stone-50">문의가 접수되었어요</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-400">
            담당자가 확인한 뒤 회신드립니다. 접수 내역은 아래 번호로 관리됩니다.
          </p>
          <dl className="mx-auto mt-5 max-w-xs space-y-1.5 rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-left text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">접수 번호</dt>
              <dd className="font-mono font-bold text-stone-100">{receipt.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">분류</dt>
              <dd className="font-bold text-stone-100">
                {inquiryCategoryCopy[receipt.category].label}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">상태</dt>
              <dd className="font-bold text-stone-100">접수됨</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => {
              setReceipt(null)
              setTitle('')
              setBody('')
            }}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-4 py-2 text-sm font-black text-stone-300 transition hover:border-stone-500"
          >
            새 문의 작성
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-lime-300" aria-hidden />
          <h2 className="text-2xl font-black text-stone-50">문의하기</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          이용 중 궁금한 점, 제휴 제안, 버그 신고를 남겨주세요. 접수 내용은 외부에 공개되지
          않습니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className="text-sm font-bold text-stone-200">문의 유형</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {INQUIRY_CATEGORIES.map((id) => {
              const copy = inquiryCategoryCopy[id]
              const active = id === category
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  aria-pressed={active}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-lime-300/50 bg-lime-300/10'
                      : 'border-stone-700 hover:border-stone-500'
                  }`}
                >
                  <span className="block text-sm font-black text-stone-100">{copy.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-stone-500">
                    {copy.helper}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-bold text-stone-200">제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={INQUIRY_TITLE_MAX}
            placeholder="문의 제목을 입력해주세요"
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-stone-200">내용</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={INQUIRY_BODY_MAX}
            rows={7}
            placeholder="문의 내용을 구체적으로 적어주세요. (최소 10자)"
            className="mt-1.5 w-full resize-y rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm leading-6 text-stone-100 outline-none transition focus:border-cyan-300/60"
          />
          <span className="mt-1 block text-right text-[11px] text-stone-500">
            {body.length}/{INQUIRY_BODY_MAX}
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-stone-200">
            회신 이메일 <span className="font-normal text-stone-500">(선택)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="회신받을 이메일 주소"
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
          />
        </label>

        {/* 허니팟: 사람에겐 숨김. 봇이 채우면 서버가 폐기한다. */}
        <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
          <label>
            웹사이트
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/5 px-4 py-3 text-sm text-red-200">
            <p className="font-semibold">{error}</p>
            <a
              href={INQUIRY_FALLBACK_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-bold text-red-100 underline underline-offset-2"
            >
              외부 지원 보드로 문의하기
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}

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
          문의 보내기
        </button>
      </form>
    </div>
  )
}

/**
 * SurveyDesk 네이티브 피드백 패널 — 외부 위젯 임베드 대체(네이티브 룩앤필).
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 공개(`pk_`) SurveyClient 로 활성 설문을 읽어와 제출하고,
 * 화면은 전적으로 이 앱의 디자인 토큰(stone/lime/cyan)으로 렌더한다. 떠 있는 런처
 * (다른 색·다른 폰트의 외부 위젯)가 아니라, 문의 페이지(SupportView) 하단에 1차
 * 기능으로 박혀 들어간다.
 *
 * 게이팅: SurveyDesk 가 꺼져 있거나(VITE_SURVEYDESK_URL 미설정) 활성 설문이 없으면
 * 아무것도 렌더하지 않는다 — 그러면 문의 폼(1차 기능)만 남는다(가역적).
 *
 * 접근성: radiogroup(별점/NPS) 키보드 조작 · 라벨드 컨트롤 · role=alert 에러 ·
 * role=status 성공 · focus-visible(앱 전역) · prefers-reduced-motion(앱 전역).
 */
import { CheckCircle2, Loader2, Send, Star } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import { SURVEY_APP_ID, getSurveyClient } from '../../lib/deskcloud'

import type { Survey, SurveyAnswerValue, SurveyQuestion } from '@heejun/deskcloud'

const RATING_MAX = 5
const NPS_MIN = 0
const NPS_MAX = 10
const TEXT_MAX = { short: 280, long: 4000 } as const

type Phase = 'loading' | 'ready' | 'submitting' | 'success' | 'unavailable'
type AnswerMap = Record<string, SurveyAnswerValue | undefined>

function isEmpty(value: SurveyAnswerValue | undefined): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** 제출 전 1차 검증(서버가 2차 재검증). 누락된 필수 항목만 막는다. */
function findFirstMissing(questions: SurveyQuestion[], answers: AnswerMap): string | null {
  for (const q of questions) {
    if (q.required && isEmpty(answers[q.id])) return q.id
  }
  return null
}

/**
 * SurveyDesk 가 꺼져 있으면(VITE_SURVEYDESK_URL 미설정) 아무것도 렌더하지 않는다.
 * 켜져 있을 때만 내부 컴포넌트를 마운트해 활성 설문을 불러온다 — 이펙트 본문에서
 * 동기 setState 를 하지 않도록 게이팅을 바깥으로 끌어올린다.
 */
export function FeedbackPanel({ userEmail }: { userEmail?: string }) {
  if (!getSurveyClient()) return null
  return <FeedbackPanelInner userEmail={userEmail} />
}

function FeedbackPanelInner({ userEmail }: { userEmail?: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [error, setError] = useState<string | null>(null)
  const [missingId, setMissingId] = useState<string | null>(null)
  const headingId = useId()

  useEffect(() => {
    const client = getSurveyClient()
    if (!client) return
    let alive = true
    client
      .getActive(SURVEY_APP_ID)
      .then((next) => {
        if (!alive) return
        setSurvey(next)
        setPhase('ready')
      })
      .catch(() => {
        if (!alive) return
        // 404 = 활성 설문 없음 → 조용히 비활성(문의 폼만 남는다). 그 외 오류도
        // 비파괴적으로 숨긴다(1차 문의 폼이 폴백이므로).
        setPhase('unavailable')
      })
    return () => {
      alive = false
    }
  }, [])

  if (phase === 'unavailable') return null

  function setAnswer(id: string, value: SurveyAnswerValue | undefined) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    if (missingId === id) setMissingId(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!survey) return
    const client = getSurveyClient()
    if (!client) return

    const missing = findFirstMissing(survey.questions, answers)
    if (missing) {
      setMissingId(missing)
      setError('필수 항목을 입력해 주세요.')
      return
    }

    const cleaned: Record<string, SurveyAnswerValue> = {}
    for (const [key, value] of Object.entries(answers)) {
      if (value !== undefined) cleaned[key] = value
    }

    setPhase('submitting')
    setError(null)
    try {
      await client.submit(SURVEY_APP_ID, {
        answers: cleaned,
        respondent: userEmail ? { email: userEmail } : undefined,
        meta: {
          pageUrl: typeof window !== 'undefined' ? globalThis.location.href : undefined,
        },
      })
      setPhase('success')
    } catch (cause) {
      setPhase('ready')
      setError(cause instanceof Error ? cause.message : '제출에 실패했습니다.')
    }
  }

  if (phase === 'loading') {
    return (
      <section aria-busy className="mt-10 border-t border-stone-800 pt-8">
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          빠른 만족도 설문을 불러오는 중…
        </div>
      </section>
    )
  }

  if (phase === 'success') {
    return (
      <section
        aria-labelledby={headingId}
        className="mt-10 rounded-2xl border border-lime-300/30 bg-lime-300/5 p-6 text-center"
        role="status"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-lime-300 text-slate-950">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </div>
        <h3 id={headingId} className="mt-4 text-lg font-black text-stone-50">
          의견 고맙습니다
        </h3>
        <p className="protolive-measure mx-auto mt-1.5 text-sm leading-6 text-stone-300">
          보내주신 평가는 다음 빌드를 다듬는 데 그대로 쓰입니다.
        </p>
      </section>
    )
  }

  if (!survey) return null
  const submitting = phase === 'submitting'

  return (
    <section aria-labelledby={headingId} className="mt-10 border-t border-stone-800 pt-8">
      <header className="mb-5">
        <h3 id={headingId} className="text-lg font-black text-stone-50">
          {survey.title}
        </h3>
        {survey.intro ? (
          <p className="protolive-measure mt-1.5 text-sm leading-6 text-stone-400">
            {survey.intro}
          </p>
        ) : null}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {survey.questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id]}
            invalid={missingId === question.id}
            onChange={(value) => setAnswer(question.id, value)}
          />
        ))}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-400/30 bg-red-500/5 px-3.5 py-2.5 text-sm font-semibold text-red-200"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-300 px-5 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          평가 보내기
        </button>
      </form>
    </section>
  )
}

function QuestionField({
  question,
  value,
  invalid,
  onChange,
}: {
  question: SurveyQuestion
  value: SurveyAnswerValue | undefined
  invalid: boolean
  onChange: (value: SurveyAnswerValue | undefined) => void
}) {
  const labelId = useId()
  return (
    <div role="group" aria-labelledby={labelId}>
      <span id={labelId} className="block text-sm font-bold text-stone-200">
        {question.label}
        {question.required ? (
          <span className="ml-0.5 text-red-200" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      <div className="mt-2">
        <QuestionControl question={question} value={value} labelId={labelId} onChange={onChange} />
      </div>
      {invalid ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-red-200">
          필수 항목입니다.
        </p>
      ) : null}
    </div>
  )
}

function QuestionControl({
  question,
  value,
  labelId,
  onChange,
}: {
  question: SurveyQuestion
  value: SurveyAnswerValue | undefined
  labelId: string
  onChange: (value: SurveyAnswerValue | undefined) => void
}) {
  switch (question.type) {
    case 'rating':
      return <RatingControl value={value} labelId={labelId} onChange={onChange} />
    case 'nps':
      return <NpsControl value={value} labelId={labelId} onChange={onChange} />
    case 'single_choice':
      return <SingleChoiceControl question={question} value={value} onChange={onChange} />
    case 'multi_choice':
      return <MultiChoiceControl question={question} value={value} onChange={onChange} />
    case 'text':
      return <TextControl question={question} value={value} onChange={onChange} />
    default:
      return null
  }
}

function RatingControl({
  value,
  labelId,
  onChange,
}: {
  value: SurveyAnswerValue | undefined
  labelId: string
  onChange: (value: SurveyAnswerValue | undefined) => void
}) {
  const current = typeof value === 'number' ? value : 0
  // 방향키는 포커스를 가진 라디오(별)에서 처리한다 — 컨테이너에 인터랙션 핸들러를
  // 두지 않아 radiogroup 컨테이너 자체는 포커스 대상이 아니다(roving tabindex).
  const move = (delta: number) =>
    onChange(Math.min(RATING_MAX, Math.max(1, (current || 1) + delta)))
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="inline-flex gap-1">
      {Array.from({ length: RATING_MAX }, (_, index) => index + 1).map((n) => {
        const on = n <= current
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            aria-label={`${n}점`}
            tabIndex={current === n || (current === 0 && n === 1) ? 0 : -1}
            onClick={() => onChange(current === n ? undefined : n)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault()
                move(1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault()
                move(-1)
              }
            }}
            className="rounded-md p-1 text-stone-600 transition hover:text-amber-200 aria-checked:text-amber-300"
          >
            <Star className="h-7 w-7" fill={on ? 'currentColor' : 'none'} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

function NpsControl({
  value,
  labelId,
  onChange,
}: {
  value: SurveyAnswerValue | undefined
  labelId: string
  onChange: (value: SurveyAnswerValue | undefined) => void
}) {
  const current = typeof value === 'number' ? value : null
  return (
    <div>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-11 gap-1.5">
        {Array.from({ length: NPS_MAX - NPS_MIN + 1 }, (_, index) => NPS_MIN + index).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={current === n}
            aria-label={`${n}점`}
            onClick={() => onChange(current === n ? undefined : n)}
            className="min-h-9 rounded-md border border-stone-700 text-sm font-bold text-stone-300 transition hover:border-cyan-300/60 aria-pressed:border-cyan-300 aria-pressed:bg-cyan-300/15 aria-pressed:text-cyan-100"
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-stone-500" aria-hidden>
        <span>전혀 아니다</span>
        <span>매우 그렇다</span>
      </div>
    </div>
  )
}

function SingleChoiceControl({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: SurveyAnswerValue | undefined
  onChange: (value: SurveyAnswerValue | undefined) => void
}) {
  const name = useId()
  const current = typeof value === 'string' ? value : null
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {(question.options ?? []).map((option) => {
        const checked = current === option.value
        return (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm transition ${
              checked
                ? 'border-cyan-300/60 bg-cyan-300/10 text-stone-100'
                : 'border-stone-700 text-stone-200 hover:border-stone-500'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-cyan-400"
            />
            <span>{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

function MultiChoiceControl({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: SurveyAnswerValue | undefined
  onChange: (value: SurveyAnswerValue | undefined) => void
}) {
  const selected = Array.isArray(value) ? value : []
  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key]
    onChange(next.length > 0 ? next : undefined)
  }
  return (
    <div role="group" className="flex flex-col gap-2">
      {(question.options ?? []).map((option) => {
        const checked = selected.includes(option.value)
        return (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm transition ${
              checked
                ? 'border-cyan-300/60 bg-cyan-300/10 text-stone-100'
                : 'border-stone-700 text-stone-200 hover:border-stone-500'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(option.value)}
              className="h-4 w-4 accent-cyan-400"
            />
            <span>{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

function TextControl({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: SurveyAnswerValue | undefined
  onChange: (value: SurveyAnswerValue | undefined) => void
}) {
  const variant = question.variant ?? 'short'
  const max = TEXT_MAX[variant]
  const text = typeof value === 'string' ? value : ''
  const set = (next: string) => onChange(next.length > 0 ? next : undefined)
  const inputClass =
    'w-full rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-100 transition placeholder:text-stone-500 focus:border-cyan-300/60'

  if (variant === 'long') {
    return (
      <div>
        <textarea
          value={text}
          maxLength={max}
          rows={4}
          placeholder="자유롭게 적어 주세요"
          onChange={(event) => set(event.target.value)}
          className={`${inputClass} resize-y leading-6`}
        />
        <span className="mt-1 block text-right text-[11px] text-stone-500" aria-hidden>
          {text.length}/{max}
        </span>
      </div>
    )
  }
  return (
    <input
      type="text"
      value={text}
      maxLength={max}
      placeholder="한 줄로 적어 주세요"
      onChange={(event) => set(event.target.value)}
      className={inputClass}
    />
  )
}

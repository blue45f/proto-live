import { Loader2, LogIn, UserPlus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

import { Modal } from '../../components/Modal'

import { useAuth } from './useAuth'

type Mode = 'signin' | 'signup'

const COPY: Record<Mode, { title: string; desc: string; submit: string; toggle: string }> = {
  signin: {
    title: '회원 로그인',
    desc: '이메일과 비밀번호로 로그인하세요. 계정이 없다면 가입하거나 게스트로 시작할 수 있습니다.',
    submit: '로그인',
    toggle: '계정이 없나요? 가입하기',
  },
  signup: {
    title: '회원가입',
    desc: '이메일과 비밀번호로 새 계정을 만드세요. 비밀번호는 6자 이상이어야 합니다.',
    submit: '가입하기',
    toggle: '이미 계정이 있나요? 로그인',
  },
}

/**
 * Firebase 이메일/비밀번호 + 게스트 로그인 다이얼로그 — 접근성 우선.
 * - 로그인 ⇄ 가입 토글, "게스트로 시작하기"(익명 인증)
 * - 로딩/비활성 상태, aria-live 에러
 * - 포커스: Radix Dialog(Modal)가 트랩, 열릴 때 이메일 입력에 초기 포커스
 *
 * 이 앱의 디자인 시스템(공용 Modal + stone/lime Tailwind 토큰)에 맞춰 벤더링했다.
 * useAuth API 와 한국어 에러 매핑은 정본 모듈과 동일하게 유지한다.
 */
export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { signIn, signUp, signInAsGuest, error, clearError, user } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'form' | 'guest' | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()

  // 로그인 성공 시 자동으로 닫힌다(prop 콜백 호출 — setState 아님).
  useEffect(() => {
    if (open && user) onOpenChange(false)
  }, [open, user, onOpenChange])

  // 열릴 때 이메일 입력에 초기 포커스(Modal 은 onOpenAutoFocus 훅을 노출하지 않으므로 effect 로).
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => emailRef.current?.focus(), 0)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [open])

  if (!open) return null

  /**
   * 닫힘 시 폼/에러를 초기화한다 — 다음 열림이 항상 깨끗한 상태로 시작.
   * Modal 의 onClose 는 닫힐 때만 호출되므로 여기서 정리한다.
   */
  function handleClose() {
    setMode('signin')
    setBusy(null)
    setEmail('')
    setPassword('')
    clearError()
    onOpenChange(false)
  }

  function switchMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
    clearError()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy('form')
    try {
      if (mode === 'signup') await signUp(email, password)
      else await signIn(email, password)
    } catch {
      // 에러는 컨텍스트 state(error)로 노출 — 여기선 무시.
    } finally {
      setBusy(null)
    }
  }

  async function onGuest() {
    if (busy) return
    setBusy('guest')
    try {
      await signInAsGuest()
    } catch {
      // 위와 동일.
    } finally {
      setBusy(null)
    }
  }

  const copy = COPY[mode]
  const formBusy = busy === 'form'
  const guestBusy = busy === 'guest'
  const anyBusy = busy !== null

  return (
    <Modal title={copy.title} subtitle={copy.desc} onClose={handleClose}>
      <div className="mx-auto max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block" htmlFor={emailId}>
            <span className="mb-2 block text-xs font-black text-stone-300">이메일</span>
            <input
              ref={emailRef}
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              required
              disabled={anyBusy}
              className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60 disabled:opacity-50"
            />
          </label>

          <label className="block" htmlFor={passwordId}>
            <span className="mb-2 block text-xs font-black text-stone-300">비밀번호</span>
            <input
              id={passwordId}
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              minLength={6}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              required
              disabled={anyBusy}
              className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60 disabled:opacity-50"
            />
          </label>

          {/* 에러는 항상 같은 노드에 두어 aria-live 가 안정적으로 announce 한다. */}
          <div aria-live="assertive">
            {error ? (
              <p
                id={errorId}
                role="alert"
                className="rounded-lg border border-red-300/40 bg-red-950/40 px-3 py-2 text-sm text-red-100"
              >
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={anyBusy || !email || !password}
            aria-busy={formBusy || undefined}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {formBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {mode === 'signup' ? (
              <UserPlus className="h-4 w-4" aria-hidden />
            ) : (
              <LogIn className="h-4 w-4" aria-hidden />
            )}
            {copy.submit}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          disabled={anyBusy}
          className="mt-3 w-full text-center text-sm font-black text-cyan-100 transition hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.toggle}
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] font-bold text-stone-500">
          <span className="h-px flex-1 bg-stone-800" aria-hidden />
          또는
          <span className="h-px flex-1 bg-stone-800" aria-hidden />
        </div>

        <button
          type="button"
          onClick={onGuest}
          disabled={anyBusy}
          aria-busy={guestBusy || undefined}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-700 px-4 text-sm font-black text-stone-100 transition hover:border-cyan-300/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guestBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          게스트로 시작하기
        </button>
      </div>
    </Modal>
  )
}

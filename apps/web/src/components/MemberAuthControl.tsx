import { LogIn, User as UserIcon } from 'lucide-react'
import { useState } from 'react'

import { AuthDialog, useAuth } from '../lib/firebaseAuth'

/**
 * 헤더 회원 로그인 진입점 — Firebase Auth(통합 로그인) 기반.
 *
 * 이 컨트롤은 기존 테스트 계정/Google GIS 로그인(LoginModal → 세션 역할 전환)과 **별개**다.
 * 로그아웃 상태면 "회원" 버튼으로 AuthDialog(이메일 로그인 ⇄ 가입 + 게스트로 시작하기)를
 * 열고, 로그인 상태면 이메일(또는 "게스트")과 로그아웃을 보여준다.
 *
 * 헤더 토큰(stone/cyan 칩)에 맞춰 벤더링했다 — 기존 로그인을 대체하지 않고 추가한다.
 */
export function MemberAuthControl({ className }: { className?: string }) {
  const { user, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (loading) {
    // 초기 onAuthStateChanged 해석 전 — 레이아웃 점프 방지용 플레이스홀더.
    return (
      <div
        className={`h-11 w-11 shrink-0 animate-pulse rounded-lg border border-stone-700/80 bg-stone-900/70 ${className ?? ''}`}
        aria-hidden
      />
    )
  }

  if (!user) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="protolive-btn-grid grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-700/80 bg-stone-900/70 px-3 text-xs font-black text-stone-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
          aria-label="회원 로그인"
        >
          <LogIn className="h-4 w-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">회원</span>
        </button>
        <AuthDialog open={open} onOpenChange={setOpen} />
      </div>
    )
  }

  const label = user.isAnonymous ? '게스트' : (user.email ?? '회원')

  return (
    <div
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-stone-700/80 bg-stone-900/70 px-3 py-2 text-xs font-black sm:rounded-full ${className ?? ''}`}
    >
      <span
        className="hidden max-w-32 items-center gap-1.5 truncate text-stone-200 sm:inline-flex"
        title={label}
      >
        <UserIcon className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="protolive-pill shrink-0 whitespace-nowrap rounded-full border border-stone-600/70 px-2 py-0.5 text-stone-300 transition hover:border-red-300/60 hover:text-red-100"
        aria-label={`${label} 로그아웃`}
        title="회원 로그아웃"
      >
        로그아웃
      </button>
    </div>
  )
}

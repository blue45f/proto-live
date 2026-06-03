import React from 'react'
import { Users } from 'lucide-react'
import type { TestAccount } from '../../local-auth'
import { Modal } from '../Modal'

type TestAccountsByRole = {
  maker: TestAccount[]
  investor: TestAccount[]
  member: TestAccount[]
  admin: TestAccount[]
}

export function LoginModal({
  loginEmail,
  loginPassword,
  testAccountsByRole,
  dialogRef,
  onClose,
  onEmailChange,
  onPasswordChange,
  onQuickFill,
  onSubmit,
}: {
  loginEmail: string
  loginPassword: string
  testAccountsByRole: TestAccountsByRole
  dialogRef?: React.RefObject<HTMLElement | null>
  onClose: () => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onQuickFill: (account: TestAccount) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <Modal
      title="로그인"
      subtitle="테스트 계정으로 계정 역할을 전환해 실시간 플로우를 확인합니다."
      onClose={onClose}
      dialogRef={dialogRef}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">이메일</span>
          <input
            type="email"
            required
            value={loginEmail}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="maker-a@protolive.local"
            autoComplete="username"
            className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">비밀번호</span>
          <input
            type="password"
            required
            value={loginPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="pass-mock-01"
            autoComplete="current-password"
            className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
        </label>
        <div className="rounded-lg border border-stone-700 bg-stone-950/55 p-3 text-xs text-stone-300">
          <p className="font-black text-stone-100">테스트 계정</p>
          <div className="mt-2 space-y-3">
            <p className="text-[11px] font-black text-stone-400">창업자</p>
            <div className="grid gap-2">
              {testAccountsByRole.maker.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => onQuickFill(account)}
                  className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-stone-700 px-3 py-2 text-left text-stone-100 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  <span>{account.name}</span>
                  <span className="truncate text-stone-400">{account.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] font-black text-stone-400">투자자</p>
            <div className="grid gap-2">
              {testAccountsByRole.investor.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => onQuickFill(account)}
                  className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-stone-700 px-3 py-2 text-left text-stone-100 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  <span>{account.name}</span>
                  <span className="truncate text-stone-400">{account.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] font-black text-stone-400">일반 회원</p>
            <div className="grid gap-2">
              {testAccountsByRole.member.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => onQuickFill(account)}
                  className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-stone-700 px-3 py-2 text-left text-stone-100 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  <span>{account.name}</span>
                  <span className="truncate text-stone-400">{account.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] font-black text-stone-400">운영자</p>
            <div className="grid gap-2">
              {testAccountsByRole.admin.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => onQuickFill(account)}
                  className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-amber-300/40 px-3 py-2 text-left text-amber-100 transition hover:border-amber-200 hover:text-amber-50"
                >
                  <span>{account.name}</span>
                  <span className="truncate text-amber-100/70">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-lg border border-stone-700 text-sm font-black text-stone-300 hover:text-stone-100"
          >
            나중에
          </button>
          <button
            type="submit"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-lime-300 text-sm font-black text-slate-950"
          >
            <Users className="h-4 w-4" />
            로그인
          </button>
        </div>
      </form>
    </Modal>
  )
}

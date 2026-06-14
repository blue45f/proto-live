import { useQuery } from '@tanstack/react-query'
import { Ban, Check, Loader2, RotateCcw, UserX, Users } from 'lucide-react'
import { useCallback, useId, useState } from 'react'

import {
  fetchAdminMembers,
  updateAdminMemberLifecycle,
  updateAdminMemberNotes,
} from '../../infrastructure/api'
import { getRoleLabel } from '../../lib/format'

import type { AdminMember } from '../../infrastructure/api'
import type { ReactNode } from 'react'

/**
 * 운영 콘솔 — 회원 디렉터리. 메이커/투자자/일반 회원의 활동 집계를 보고, 운영 메모를 남긴다.
 * 회원 데이터는 projects 도메인의 읽기 전용 뷰이며, 메모만 갱신 가능하다(상태 형태 불변).
 */
export function AdminMembersView() {
  // 기존 useState+useEffect 1회 fetch 를 react-query 로 옮긴다. 마운트 시 1회 로드 +
  // 메모/라이프사이클 변경 후 수동 refetch 라는 동작은 그대로다(자동 재시도/포커스 재요청
  // 없음은 전역 QueryClient 기본값으로 보장).
  const { data, isError, refetch } = useQuery({
    queryKey: ['admin', 'members'],
    queryFn: fetchAdminMembers,
  })

  // 과거 계약 보존: 로딩 중에는 members === null(스피너), 에러도 목록은 null 로 둔다.
  const members: AdminMember[] | null = data ?? null
  const error = isError ? '회원 목록을 불러오지 못했습니다.' : null
  const load = useCallback(() => {
    void refetch()
  }, [refetch])

  return (
    <div className="lg:col-span-2 space-y-6">
      <header className="flex items-center gap-2">
        <Users className="h-6 w-6 text-lime-300" aria-hidden />
        <h2 className="text-2xl font-black text-stone-50">회원 관리</h2>
      </header>
      <p className="-mt-2 text-sm text-stone-400">
        회원의 등록·리뷰·업보트·제안 활동을 한눈에 보고, 운영 메모를 남깁니다.
      </p>

      {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}

      {members === null ? (
        <div className="flex items-center gap-2 py-8 text-sm text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          회원을 불러오는 중…
        </div>
      ) : members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-700 bg-stone-900/40 px-4 py-8 text-center text-sm text-stone-400">
          아직 등록된 회원이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} onSaved={load} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MemberRow({ member, onSaved }: { member: AdminMember; onSaved: () => void }) {
  const notesId = useId()
  const [notes, setNotes] = useState(member.notes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(false)
  const [busyAction, setBusyAction] = useState<'suspend' | 'restore' | 'withdraw' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const dirty = notes.trim() !== (member.notes ?? '').trim()
  const isWithdrawn = member.status === 'withdrawn'

  async function handleSave() {
    setIsSaving(true)
    setSavedAt(false)
    try {
      await updateAdminMemberNotes(member.id, notes)
      setSavedAt(true)
      onSaved()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLifecycle(action: 'suspend' | 'restore' | 'withdraw') {
    let reason: string | undefined
    if (action === 'suspend') {
      const prompted = window.prompt('정지 사유를 입력하세요. 비워두면 기본 사유로 저장됩니다.')
      if (prompted === null) {
        return
      }
      reason = prompted
    }
    if (
      action === 'withdraw' &&
      !window.confirm(
        '이 회원을 탈퇴 처리할까요? 비밀번호와 공개 이름이 제거되고 로그인할 수 없습니다.'
      )
    ) {
      return
    }
    setBusyAction(action)
    setActionError(null)
    try {
      await updateAdminMemberLifecycle(member.id, { action, reason })
      onSaved()
    } catch {
      setActionError('회원 상태 변경에 실패했습니다.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <li
      className={`rounded-xl border p-4 ${
        member.status === 'suspended'
          ? 'border-amber-300/30 bg-amber-300/5'
          : isWithdrawn
            ? 'border-red-300/25 bg-red-500/5'
            : 'border-stone-800 bg-stone-900/50'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-stone-50">{member.name || member.email}</span>
        <span className="inline-flex items-center rounded-full border border-stone-700 px-2 py-0.5 text-[11px] font-bold text-stone-300">
          {getRoleLabel(member.role)}
        </span>
        <StatusBadge status={member.status} />
        {member.lastActivityAt ? (
          <span className="text-[11px] text-stone-500">
            최근 활동{' '}
            {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(
              new Date(member.lastActivityAt)
            )}
          </span>
        ) : (
          <span className="text-[11px] text-stone-500">활동 기록 없음</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-stone-500">{member.email}</p>
      {member.suspensionReason || member.withdrawalReason ? (
        <p className="mt-1 text-[11px] font-semibold text-amber-100/80">
          {member.suspensionReason || member.withdrawalReason}
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-1 text-[11px] font-semibold text-red-200">{actionError}</p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="등록" value={member.projectCount} />
        <Stat label="리뷰" value={member.reviewCount} />
        <Stat label="업보트" value={member.upvoteCount} />
        <Stat label="제안" value={member.proposalCount} />
      </dl>

      <div className="mt-3">
        <label htmlFor={notesId} className="block text-[11px] font-bold text-stone-400">
          운영 메모
        </label>
        <div className="mt-1 flex items-end gap-2">
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
              setSavedAt(false)
            }}
            rows={2}
            maxLength={1000}
            placeholder="이 회원에 대한 운영 메모 (선택)"
            disabled={isWithdrawn}
            className="flex-1 resize-y rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
          />
          <button
            type="button"
            disabled={!dirty || isSaving || isWithdrawn}
            onClick={() => void handleSave()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-cyan-300 px-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : savedAt ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : null}
            {savedAt && !dirty ? '저장됨' : '저장'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {member.status === 'suspended' ? (
          <LifecycleButton
            busy={busyAction === 'restore'}
            disabled={busyAction !== null}
            onClick={() => void handleLifecycle('restore')}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            label="복구"
          />
        ) : member.status === 'active' ? (
          <LifecycleButton
            busy={busyAction === 'suspend'}
            disabled={busyAction !== null}
            onClick={() => void handleLifecycle('suspend')}
            icon={<Ban className="h-3.5 w-3.5" />}
            label="정지"
          />
        ) : null}
        {!isWithdrawn ? (
          <LifecycleButton
            danger
            busy={busyAction === 'withdraw'}
            disabled={busyAction !== null}
            onClick={() => void handleLifecycle('withdraw')}
            icon={<UserX className="h-3.5 w-3.5" />}
            label="탈퇴 처리"
          />
        ) : null}
      </div>
    </li>
  )
}

function StatusBadge({ status }: { status: AdminMember['status'] }) {
  const copy =
    status === 'suspended'
      ? { label: '정지', tone: 'border-amber-300/40 text-amber-100' }
      : status === 'withdrawn'
        ? { label: '탈퇴', tone: 'border-red-300/40 text-red-100' }
        : { label: '활성', tone: 'border-lime-300/35 text-lime-100' }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${copy.tone}`}
    >
      {copy.label}
    </span>
  )
}

function LifecycleButton({
  busy,
  danger,
  disabled,
  icon,
  label,
  onClick,
}: {
  busy: boolean
  danger?: boolean
  disabled?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/40 px-3 py-2 text-center">
      <dt className="text-[11px] text-stone-500">{label}</dt>
      <dd className="text-base font-black text-stone-100">{value}</dd>
    </div>
  )
}

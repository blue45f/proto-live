import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Users } from 'lucide-react'
import type { AdminMember } from '../../api'
import { fetchAdminMembers, updateAdminMemberNotes } from '../../api'
import { getRoleLabel } from '../../lib/format'

/**
 * 운영 콘솔 — 회원 디렉터리. 메이커/투자자/일반 회원의 활동 집계를 보고, 운영 메모를 남긴다.
 * 회원 데이터는 projects 도메인의 읽기 전용 뷰이며, 메모만 갱신 가능하다(상태 형태 불변).
 */
export function AdminMembersView() {
  const [members, setMembers] = useState<AdminMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchAdminMembers()
      .then(setMembers)
      .catch(() => setError('회원 목록을 불러오지 못했습니다.'))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load])

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
  const [notes, setNotes] = useState(member.notes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(false)

  const dirty = notes.trim() !== (member.notes ?? '').trim()

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

  return (
    <li className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-stone-50">{member.name || member.email}</span>
        <span className="inline-flex items-center rounded-full border border-stone-700 px-2 py-0.5 text-[11px] font-bold text-stone-300">
          {getRoleLabel(member.role)}
        </span>
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

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="등록" value={member.projectCount} />
        <Stat label="리뷰" value={member.reviewCount} />
        <Stat label="업보트" value={member.upvoteCount} />
        <Stat label="제안" value={member.proposalCount} />
      </dl>

      <div className="mt-3">
        <label className="block text-[11px] font-bold text-stone-400">운영 메모</label>
        <div className="mt-1 flex items-end gap-2">
          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
              setSavedAt(false)
            }}
            rows={2}
            maxLength={1000}
            placeholder="이 회원에 대한 운영 메모 (선택)"
            className="flex-1 resize-y rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-cyan-300/60"
          />
          <button
            type="button"
            disabled={!dirty || isSaving}
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
    </li>
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

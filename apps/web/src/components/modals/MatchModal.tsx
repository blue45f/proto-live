import { Loader2, Send } from 'lucide-react'
import React from 'react'

import { Modal } from '../Modal'

import type { FundingRange, MarketConfig, Project } from '../../infrastructure/api'

const MATCH_DEMO_LOG_KEY = 'protolive-match-demo-log-v1'
const MATCH_DEMO_LOG_LIMIT = 40

type MatchDemoAction = 'funding-range' | 'message' | 'legal' | 'privacy' | 'risk' | 'submit'
type MatchDemoLog = {
  id: string
  at: number
  action: MatchDemoAction
  label: string
  detail?: string
}

const makeMatchDemoLogId = () => `pl-match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const readMatchDemoLogs = (): MatchDemoLog[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(MATCH_DEMO_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is MatchDemoLog => {
        const candidate = item as Partial<MatchDemoLog>
        return (
          typeof candidate.id === 'string' &&
          typeof candidate.at === 'number' &&
          typeof candidate.action === 'string' &&
          typeof candidate.label === 'string'
        )
      })
      .slice(-MATCH_DEMO_LOG_LIMIT)
  } catch {
    return []
  }
}

const appendMatchDemoLog = (action: MatchDemoAction, label: string, detail?: string) => {
  if (typeof window === 'undefined') return

  try {
    const next = [
      ...readMatchDemoLogs(),
      { id: makeMatchDemoLogId(), at: Date.now(), action, label, detail },
    ].slice(-MATCH_DEMO_LOG_LIMIT)
    window.localStorage.setItem(MATCH_DEMO_LOG_KEY, JSON.stringify(next))
  } catch {
    // Local rehearsal log is best-effort.
  }
}

export function MatchModal({
  project,
  config,
  fundingRangeId,
  matchMessage,
  matchLegalNoticeAccepted,
  matchPrivacyConsentAccepted,
  matchRiskNoticeAccepted,
  isSendingMatch,
  onClose,
  onFundingRangeChange,
  onMessageChange,
  onLegalNoticeChange,
  onPrivacyConsentChange,
  onRiskNoticeChange,
  onSubmit,
}: {
  project: Project
  config: MarketConfig
  fundingRangeId: string
  matchMessage: string
  matchLegalNoticeAccepted: boolean
  matchPrivacyConsentAccepted: boolean
  matchRiskNoticeAccepted: boolean
  isSendingMatch: boolean
  onClose: () => void
  onFundingRangeChange: (value: string) => void
  onMessageChange: (value: string) => void
  onLegalNoticeChange: (value: boolean) => void
  onPrivacyConsentChange: (value: boolean) => void
  onRiskNoticeChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  const matchReadinessChecks = [
    { label: '투자 구간 선택', done: Boolean(fundingRangeId) },
    { label: '메시지 작성', done: matchMessage.trim().length >= 10 },
    { label: '법적 성격 확인', done: matchLegalNoticeAccepted },
    { label: '연락처 전달 동의', done: matchPrivacyConsentAccepted },
    { label: '초기 검토 리스크 확인', done: matchRiskNoticeAccepted },
  ]
  const matchReadinessRate = Math.round(
    (matchReadinessChecks.filter((check) => check.done).length / matchReadinessChecks.length) * 100
  )

  const recordMatchDemo = (action: MatchDemoAction, label: string, detail?: string) => {
    appendMatchDemoLog(action, `${project.title} · ${label}`, detail)
  }

  return (
    <Modal title="투자 관심 기록" subtitle={project.title} onClose={onClose}>
      <form
        onSubmit={(event) => {
          recordMatchDemo('submit', '투자 관심 제출')
          onSubmit(event)
        }}
        className="space-y-4"
      >
        <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
            투자자 확인 포인트
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-300">{project.description}</p>
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">투자 희망 구간</span>
          <select
            value={fundingRangeId}
            onChange={(event) => {
              onFundingRangeChange(event.target.value)
              recordMatchDemo('funding-range', '투자 구간 변경', event.target.value)
            }}
            className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-lime-300/60"
          >
            {config.fundingRanges.map((range: FundingRange) => (
              <option key={range.id} value={range.id}>
                {range.label} ({range.stage})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">
            창업자를 설득할 메시지
          </span>
          <textarea
            required
            maxLength={700}
            rows={4}
            value={matchMessage}
            onChange={(event) => onMessageChange(event.target.value)}
            onBlur={() => {
              if (matchMessage.trim()) {
                recordMatchDemo('message', '창업자 메시지 작성', `${matchMessage.trim().length}자`)
              }
            }}
            placeholder="리뷰 요청, 미팅 가능 일정, 관심 있는 지표를 남겨주세요."
            className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
        </label>
        {config.consentTerms ? (
          <div className="space-y-2 rounded-xl border border-stone-700 bg-stone-950/45 p-3 text-xs leading-5 text-stone-300">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-stone-100">동의 약관 전문</p>
              <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[10px] font-bold text-stone-400">
                v{config.consentTerms.version} · 무결성 검증
              </span>
            </div>
            {config.consentTerms.sections.map((section) => (
              <p key={section.key}>
                <span className="font-black text-stone-200">{section.title}.</span> {section.body}
              </p>
            ))}
          </div>
        ) : null}
        <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-xs leading-5 text-stone-300">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-cyan-100">매칭 리허설 체크</p>
              <p className="text-stone-400">
                약관·개인정보·리스크 확인 상태를 제출 전에 한눈에 점검합니다.
              </p>
            </div>
            <span className="rounded-full border border-cyan-300/35 px-2 py-1 font-black text-cyan-100">
              {matchReadinessRate}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-800">
            <span
              className="block h-full rounded-full bg-cyan-300"
              style={{ width: `${matchReadinessRate}%` }}
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {matchReadinessChecks.map((check) => (
              <div
                key={check.label}
                className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2"
              >
                <span
                  className={check.done ? 'font-black text-lime-200' : 'font-black text-stone-500'}
                >
                  {check.done ? '완료' : '대기'}
                </span>
                <p className="text-stone-300">{check.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="protolive-compliance-box space-y-2 rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50">
          <p className="font-black text-amber-100">기록 전 필수 확인</p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={matchLegalNoticeAccepted}
              onChange={(event) => {
                onLegalNoticeChange(event.target.checked)
                recordMatchDemo(
                  'legal',
                  event.target.checked ? '법적 성격 확인' : '법적 성격 확인 해제'
                )
              }}
              className="mt-1 h-4 w-4 rounded border-stone-600"
            />
            <span>이 기록은 투자 권유나 계약이 아니라 창업자에게 전달되는 관심 의향입니다.</span>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={matchPrivacyConsentAccepted}
              onChange={(event) => {
                onPrivacyConsentChange(event.target.checked)
                recordMatchDemo(
                  'privacy',
                  event.target.checked ? '연락처 전달 동의' : '연락처 전달 동의 해제'
                )
              }}
              className="mt-1 h-4 w-4 rounded border-stone-600"
            />
            <span>
              연락을 위해 내 이메일과 메시지가 해당 창업자 및 운영자에게 전달되는 데 동의합니다.
            </span>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={matchRiskNoticeAccepted}
              onChange={(event) => {
                onRiskNoticeChange(event.target.checked)
                recordMatchDemo(
                  'risk',
                  event.target.checked ? '초기 검토 리스크 확인' : '초기 검토 리스크 해제'
                )
              }}
              className="mt-1 h-4 w-4 rounded border-stone-600"
            />
            <span>초기 프로토타입 검토에는 실패, 지연, 정보 부족 위험이 있음을 확인했습니다.</span>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-lg border border-stone-700 text-sm font-black text-stone-300 hover:text-stone-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={
              isSendingMatch ||
              !matchLegalNoticeAccepted ||
              !matchPrivacyConsentAccepted ||
              !matchRiskNoticeAccepted
            }
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-lime-300 text-sm font-black text-slate-950 disabled:opacity-50"
          >
            {isSendingMatch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            의향 기록
          </button>
        </div>
      </form>
    </Modal>
  )
}

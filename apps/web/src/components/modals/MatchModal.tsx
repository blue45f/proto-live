import React from 'react';
import { Loader2, Send } from 'lucide-react';
import type { FundingRange, MarketConfig, Project } from '../../api';
import { Modal } from '../Modal';

export function MatchModal({
  project,
  config,
  fundingRangeId,
  matchMessage,
  matchLegalNoticeAccepted,
  matchPrivacyConsentAccepted,
  matchRiskNoticeAccepted,
  isSendingMatch,
  dialogRef,
  onClose,
  onFundingRangeChange,
  onMessageChange,
  onLegalNoticeChange,
  onPrivacyConsentChange,
  onRiskNoticeChange,
  onSubmit,
}: {
  project: Project;
  config: MarketConfig;
  fundingRangeId: string;
  matchMessage: string;
  matchLegalNoticeAccepted: boolean;
  matchPrivacyConsentAccepted: boolean;
  matchRiskNoticeAccepted: boolean;
  isSendingMatch: boolean;
  dialogRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onFundingRangeChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onLegalNoticeChange: (value: boolean) => void;
  onPrivacyConsentChange: (value: boolean) => void;
  onRiskNoticeChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Modal title="투자 관심 기록" subtitle={project.title} onClose={onClose} dialogRef={dialogRef}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">투자자 확인 포인트</p>
          <p className="mt-1 text-sm leading-6 text-stone-300">{project.description}</p>
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">투자 희망 구간</span>
          <select
            value={fundingRangeId}
            onChange={(event) => onFundingRangeChange(event.target.value)}
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
          <span className="mb-2 block text-xs font-black text-stone-300">창업자를 설득할 메시지</span>
          <textarea
            required
            maxLength={700}
            rows={4}
            value={matchMessage}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="리뷰 요청, 미팅 가능 일정, 관심 있는 지표를 남겨주세요."
            className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
        </label>
        <div className="protolive-compliance-box space-y-2 rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50">
          <p className="font-black text-amber-100">기록 전 필수 확인</p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={matchLegalNoticeAccepted}
              onChange={(event) => onLegalNoticeChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-600"
            />
            <span>이 기록은 투자 권유나 계약이 아니라 창업자에게 전달되는 관심 의향입니다.</span>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={matchPrivacyConsentAccepted}
              onChange={(event) => onPrivacyConsentChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-600"
            />
            <span>연락을 위해 내 이메일과 메시지가 해당 창업자 및 운영자에게 전달되는 데 동의합니다.</span>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={matchRiskNoticeAccepted}
              onChange={(event) => onRiskNoticeChange(event.target.checked)}
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
            disabled={isSendingMatch || !matchLegalNoticeAccepted || !matchPrivacyConsentAccepted || !matchRiskNoticeAccepted}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-lime-300 text-sm font-black text-slate-950 disabled:opacity-50"
          >
            {isSendingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            의향 기록
          </button>
        </div>
      </form>
    </Modal>
  );
}

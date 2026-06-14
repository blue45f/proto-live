import { AlertTriangle, BadgeCheck, CheckCircle2, Globe2, Loader2, ShieldCheck } from 'lucide-react'
import React from 'react'

import { BUILD_TOOLS, maturityCopy, stackCopy } from '../../lib/constants'
import { getValidationTone } from '../../lib/format'
import { parseTagInput } from '../../state/storage'
import { Modal } from '../Modal'

import type {
  MarketConfig,
  ProjectAccessMode,
  ProjectMaturity,
  ProjectStack,
} from '../../infrastructure/api'
import type { AuthSession } from '../../infrastructure/local-auth'

export function SubmitProjectModal({
  session,
  title,
  category,
  maturity,
  builtWith,
  customToolsInput,
  vibeCoded,
  config,
  accessMode,
  protectionNoticeAccepted,
  description,
  tagInput,
  liveUrl,
  urlCheckStatus,
  urlCheckMessage,
  isSubmitting,
  onClose,
  onTitleChange,
  onCategoryChange,
  onMaturityChange,
  stack,
  onStackChange,
  onToggleBuildTool,
  onCustomToolsInputChange,
  onVibeCodedChange,
  onAccessModeChange,
  onProtectionNoticeChange,
  onDescriptionChange,
  onTagInputChange,
  onLiveUrlChange,
  onVerifyUrl,
  onSubmit,
}: {
  session: AuthSession | null
  title: string
  category: string
  maturity: ProjectMaturity
  builtWith: string[]
  customToolsInput: string
  vibeCoded: boolean
  config: MarketConfig
  accessMode: ProjectAccessMode
  protectionNoticeAccepted: boolean
  description: string
  tagInput: string
  liveUrl: string
  urlCheckStatus: 'idle' | 'checking' | 'success' | 'error'
  urlCheckMessage: string
  isSubmitting: boolean
  onClose: () => void
  onTitleChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onMaturityChange: (value: ProjectMaturity) => void
  stack: ProjectStack | ''
  onStackChange: (value: ProjectStack | '') => void
  onToggleBuildTool: (id: string) => void
  onCustomToolsInputChange: (value: string) => void
  onVibeCodedChange: (value: boolean) => void
  onAccessModeChange: (value: ProjectAccessMode) => void
  onProtectionNoticeChange: (value: boolean) => void
  onDescriptionChange: (value: string) => void
  onTagInputChange: (value: string) => void
  onLiveUrlChange: (value: string) => void
  onVerifyUrl: () => void
  onSubmit: (event: React.FormEvent) => void
}) {
  const liveUrlId = React.useId()
  return (
    <Modal
      title="라이브 프로토타입 등록"
      subtitle="공인 사이트 확인 후 마켓에 반영됩니다."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs">
          <p className="mb-1 block font-black text-cyan-100">등록 계정</p>
          <p className="font-black text-stone-100">{session?.email ?? '비로그인'}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-stone-300">사이트 이름</span>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="예: SignalDesk"
              className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-black text-stone-300">카테고리</span>
            <select
              required
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-lime-300/60"
            >
              {config.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-950/45 p-3">
          <p className="mb-2 text-xs font-black text-stone-300">진행 단계</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(maturityCopy) as ProjectMaturity[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onMaturityChange(id)}
                aria-pressed={maturity === id}
                className={`min-h-16 rounded-lg border p-3 text-left transition ${
                  maturity === id
                    ? 'border-lime-300/60 bg-lime-300 text-slate-950'
                    : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/40'
                }`}
              >
                <span className="block text-sm font-black">{maturityCopy[id].label}</span>
                <span
                  className={`mt-1 block text-xs leading-5 ${maturity === id ? 'text-slate-800' : 'text-stone-500'}`}
                >
                  {maturityCopy[id].helper}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-stone-500">
            데모·프로토타입·갓 시작한 거친 초기물도 환영합니다. 단, 실제로 열리는 라이브 URL은
            필요해요.
          </p>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-black text-stone-300">
              빌드 유형 <span className="font-medium text-stone-500">(선택)</span>
            </span>
            <select
              value={stack}
              onChange={(event) => onStackChange(event.target.value as ProjectStack | '')}
              className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none focus:border-lime-300/60"
            >
              <option value="">선택 안 함</option>
              {(Object.keys(stackCopy) as ProjectStack[]).map((id) => (
                <option key={id} value={id}>
                  {stackCopy[id]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-100" />
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-50">상용화 전 서비스 보호 설정</p>
              <p className="mt-1 text-xs leading-5 text-amber-50/75">
                공개 URL을 제출하면 제품 흐름, 카피, 가격 실험, 내부 데모 계정이 외부에 노출될 수
                있습니다. 민감한 기능은 데모 데이터, 제한 계정, 워터마크, 별도 빌드로 보호하세요.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(config.accessModes.length > 0
              ? config.accessModes
              : [
                  {
                    id: 'screened' as ProjectAccessMode,
                    label: '요청 후 공개',
                    description: 'URL과 미리보기를 연결 요청 뒤 공유합니다.',
                  },
                  {
                    id: 'open' as ProjectAccessMode,
                    label: '바로 보기 가능',
                    description: '목록에서 바로 사이트 주소을 열람할 수 있습니다.',
                  },
                ]
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onAccessModeChange(mode.id)}
                className={`min-h-20 rounded-lg border p-3 text-left transition ${
                  accessMode === mode.id
                    ? 'border-lime-300/60 bg-lime-300 text-slate-950'
                    : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/40'
                }`}
              >
                <span className="block text-sm font-black">{mode.label}</span>
                <span
                  className={`mt-1 block text-xs leading-5 ${accessMode === mode.id ? 'text-slate-800' : 'text-stone-500'}`}
                >
                  {mode.description}
                </span>
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-start gap-3 rounded-lg border border-amber-300/20 bg-stone-950/45 p-3 text-xs leading-5 text-amber-50/85">
            <input
              type="checkbox"
              required
              checked={protectionNoticeAccepted}
              onChange={(event) => onProtectionNoticeChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-amber-300/50 bg-stone-950 accent-lime-300"
            />
            <span>
              제출 권한이 있는 서비스이며, 공개 사이트 확인 및 선택한 공개 범위에 따라 외부
              투자자에게 정보가 노출될 수 있음을 확인합니다.
            </span>
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-black text-stone-300">핵심 설명</span>
          <textarea
            required
            maxLength={1000}
            rows={4}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="투자자가 바로 검토할 수 있게 문제, 작동 범위, 차별점을 압축해 적어주세요."
            className="w-full resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
        </label>
        <label className="block">
          <span className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-stone-300">
            <span>태그</span>
            <span className="text-stone-500">쉼표로 구분, 최대 8개</span>
          </span>
          <input
            type="text"
            maxLength={180}
            value={tagInput}
            onChange={(event) => onTagInputChange(event.target.value)}
            placeholder="예: 학부모, 식단, MVP, 생활편의"
            className="min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
          {parseTagInput(tagInput).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parseTagInput(tagInput).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </label>
        <div className="rounded-lg border border-stone-700 bg-stone-950/45 p-3">
          <p className="mb-2 text-xs font-black text-stone-300">
            제작 도구
            <span className="ml-2 font-medium text-stone-500">
              바이브코딩에 쓴 도구를 알려주세요 (선택)
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BUILD_TOOLS.map((tool) => {
              const active = builtWith.includes(tool.id)
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onToggleBuildTool(tool.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs font-black transition ${
                    active
                      ? 'border-lime-300/60 bg-lime-300 text-slate-950'
                      : 'border-stone-700 bg-stone-950/55 text-stone-300 hover:border-cyan-300/40'
                  }`}
                >
                  {tool.label}
                </button>
              )
            })}
          </div>
          <input
            type="text"
            value={customToolsInput}
            onChange={(event) => onCustomToolsInputChange(event.target.value)}
            placeholder="기타 도구 (쉼표로 구분, 최대 3개)"
            className="mt-2 min-h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
          />
          <label className="mt-3 flex items-center gap-2 text-xs font-black text-stone-300">
            <input
              type="checkbox"
              checked={vibeCoded}
              onChange={(event) => onVibeCodedChange(event.target.checked)}
              className="h-4 w-4 rounded border-stone-600 bg-stone-950 accent-lime-300"
            />
            AI(바이브코딩)로 만들었어요
          </label>
        </div>
        <label htmlFor={liveUrlId} className="block">
          <span className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-stone-300">
            <span>라이브 데모 URL</span>
            <span className="text-cyan-200">HTTP/HTTPS, 공인망만 허용</span>
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={liveUrlId}
              type="url"
              required
              aria-label="라이브 데모 URL"
              value={liveUrl}
              onChange={(event) => onLiveUrlChange(event.target.value)}
              placeholder="https://your-live-demo.com"
              aria-invalid={urlCheckStatus === 'error' || undefined}
              aria-describedby={urlCheckStatus !== 'idle' ? 'submit-url-check' : undefined}
              className="min-h-11 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-lime-300/60"
            />
            <button
              type="button"
              onClick={() => void onVerifyUrl()}
              disabled={urlCheckStatus === 'checking'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/10 disabled:opacity-50"
            >
              {urlCheckStatus === 'checking' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe2 className="h-4 w-4" />
              )}
              사이트 확인
            </button>
          </div>
        </label>
        {urlCheckStatus !== 'idle' && (
          <div
            id="submit-url-check"
            role={urlCheckStatus === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`rounded-lg border p-3 text-sm ${getValidationTone({ success: urlCheckStatus === 'success', message: urlCheckMessage, checkedAt: new Date().toISOString() })}`}
          >
            <div className="flex items-start gap-2">
              {urlCheckStatus === 'checking' ? (
                <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
              ) : urlCheckStatus === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4" />
              )}
              <p className="leading-6">{urlCheckMessage}</p>
            </div>
          </div>
        )}
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
            disabled={isSubmitting || urlCheckStatus !== 'success' || !protectionNoticeAccepted}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-lime-300 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4" />
            )}
            확인 등록
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react'
import type { PolicyView as PolicyViewKind } from '../../lib/constants'
import {
  POLICY_PAGES,
  fetchPublicPolicy,
  formatPolicyDate,
  parsePolicyBlocks,
  policyExternalUrl,
  shortContentHash,
  type PublicPolicy,
} from '../../lib/termsdesk'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; policy: PublicPolicy }

/**
 * 약관/개인정보처리방침 내부 페이지. TermsDesk 공개 API에서 게시 정본(JSON)을
 * 받아 텍스트 블록으로 렌더하고, 하단 신뢰 표면에 버전·content-hash·시행일을
 * 표기한다. 로드 실패 시 TermsDesk 원문으로 가는 폴백 카드를 보여준다.
 */
export function PolicyView({ view }: { view: PolicyViewKind }) {
  const meta = POLICY_PAGES[view]
  const [attempt, setAttempt] = useState(0)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-6">
      <header>
        <p className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-lime-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          TermsDesk 게시 정본
        </p>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-stone-50 sm:text-4xl">
          {meta.label}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">
          이 문서는 TermsDesk에서 버전과 본문 해시로 관리되는 게시본을 그대로 보여줍니다.
        </p>
      </header>

      {/* key 리마운트로 슬러그 전환/재시도 시 로딩 상태를 초기화한다(이펙트 내 동기 setState 회피). */}
      <PolicyDocumentLoader
        key={`${meta.slug}:${attempt}`}
        slug={meta.slug}
        label={meta.label}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </div>
  )
}

function PolicyDocumentLoader({
  slug,
  label,
  onRetry,
}: {
  slug: string
  label: string
  onRetry: () => void
}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchPublicPolicy(slug, controller.signal)
      .then((policy) => setState({ status: 'ready', policy }))
      .catch(() => {
        // 언마운트/뷰 전환으로 끊은 요청은 에러 카드를 띄우지 않는다.
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [slug])

  if (state.status === 'loading') {
    return <PolicyDocumentSkeleton />
  }
  if (state.status === 'error') {
    return (
      <PolicyLoadErrorCard label={label} externalUrl={policyExternalUrl(slug)} onRetry={onRetry} />
    )
  }
  return <PolicyDocument policy={state.policy} />
}

function PolicyDocument({ policy }: { policy: PublicPolicy }) {
  return (
    <>
      <article className="rounded-3xl border border-stone-800 bg-stone-950/55 px-6 py-8 sm:px-10 sm:py-10">
        {parsePolicyBlocks(policy.body).map((block, index) => {
          if (block.kind === 'heading') {
            return (
              <h3
                key={index}
                className="mt-8 text-lg font-black tracking-tight text-stone-50 first:mt-0 sm:text-xl"
              >
                {block.text}
              </h3>
            )
          }
          if (block.kind === 'list') {
            return (
              <ul
                key={index}
                className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-300"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )
          }
          return (
            <p
              key={index}
              className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-300"
            >
              {block.text}
            </p>
          )
        })}
      </article>

      {/* 신뢰 표면: 게시본의 버전·본문 해시·시행일을 그대로 드러낸다. */}
      <footer className="rounded-2xl border border-stone-800 bg-stone-950/45 px-5 py-4">
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <dt className="font-bold text-stone-300">버전</dt>
            <dd className="font-black text-lime-200">{policy.versionLabel}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-bold text-stone-300">본문 해시</dt>
            <dd className="font-mono" title={policy.contentHash}>
              {shortContentHash(policy.contentHash)}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-bold text-stone-300">시행일</dt>
            <dd>{formatPolicyDate(policy.effectiveAt)}</dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-stone-800/70 pt-3 text-xs text-stone-500">
          {policy.orgName} · TermsDesk에서 게시·버전 관리 ·{' '}
          <a
            href={policyExternalUrl(policy.policySlug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-stone-400 underline-offset-2 hover:text-stone-100 hover:underline"
          >
            원문·이력 보기
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </footer>
    </>
  )
}

function PolicyDocumentSkeleton() {
  return (
    <div
      role="status"
      aria-label="문서를 불러오는 중"
      className="animate-pulse rounded-3xl border border-stone-800 bg-stone-950/55 px-6 py-8 sm:px-10 sm:py-10"
    >
      {[0, 1, 2].map((section) => (
        <div key={section} className={section === 0 ? '' : 'mt-8'}>
          <div className="h-5 w-44 rounded bg-stone-800" />
          <div className="mt-4 h-4 w-full rounded bg-stone-800" />
          <div className="mt-2 h-4 w-11/12 rounded bg-stone-800" />
          <div className="mt-2 h-4 w-2/3 rounded bg-stone-800" />
        </div>
      ))}
      <span className="sr-only">문서를 불러오는 중입니다</span>
    </div>
  )
}

function PolicyLoadErrorCard({
  label,
  externalUrl,
  onRetry,
}: {
  label: string
  externalUrl: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-700 bg-stone-950/50 p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-amber-300/35 bg-amber-300/10 text-amber-200">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-xl font-black text-stone-50">문서를 불러오지 못했어요</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
        잠시 후 다시 시도하거나, TermsDesk에 게시된 {label} 원문을 직접 확인할 수 있습니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200 active:translate-y-px"
        >
          <RefreshCw className="h-4 w-4" />
          다시 불러오기
        </button>
        <a
          href={externalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-700 px-4 text-sm font-black text-stone-300 transition hover:border-stone-500 hover:text-stone-100"
        >
          <ExternalLink className="h-4 w-4" />
          TermsDesk에서 원문 보기
        </a>
      </div>
    </div>
  )
}

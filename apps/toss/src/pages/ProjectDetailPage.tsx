import { Button } from '@toss/tds-mobile'
import { useEffect, useState } from 'react'

import {
  fetchProjects,
  getProject,
  coverUrl,
  MATURITY_LABEL,
  BUILT_WITH_LABEL,
  STACK_LABEL,
  type Project,
} from '../lib/api'
import { shareMessage } from '../lib/toss'
import { navigate } from '../router'
import { theme } from '../theme'
import { Badge, Cover, StatStrip } from '../ui'

export function ProjectDetailPage({ id = '' }: { id?: string }) {
  const [p, setP] = useState<Project | undefined>(() => getProject(id))
  const [loading, setLoading] = useState(!p)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!p)
      fetchProjects()
        .then(() => setP(getProject(id)))
        .finally(() => setLoading(false))
  }, [id, p])
  useEffect(() => {
    if (!toast) return
    const x = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(x)
  }, [toast])

  const Header = (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 56,
        padding: '0 8px',
        paddingTop: 'env(safe-area-inset-top)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        background: `color-mix(in oklab, ${theme.bg} 84%, transparent)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <button
        type="button"
        aria-label="뒤로"
        onClick={() => navigate('/')}
        className="pressable"
        style={{
          width: 44,
          height: 44,
          background: 'none',
          border: 'none',
          color: theme.text,
          fontSize: 24,
          cursor: 'pointer',
        }}
      >
        ←
      </button>
    </header>
  )
  if (loading)
    return (
      <div style={{ background: theme.bg, minHeight: '100dvh' }}>
        {Header}
        <p style={{ textAlign: 'center', color: theme.textMuted, paddingTop: 40 }}>불러오는 중…</p>
      </div>
    )
  if (!p)
    return (
      <div style={{ background: theme.bg, minHeight: '100dvh' }}>
        {Header}
        <p style={{ textAlign: 'center', color: theme.textMuted, paddingTop: 40 }}>
          프로토타입을 찾을 수 없어요.
        </p>
      </div>
    )

  const share = async () => {
    const r = await shareMessage(`[프로토라이브] ${p.title}\n${p.description || ''}`.trim())
    if (r === 'clipboard') setToast('클립보드에 복사했어요.')
  }
  const upvote = () => setToast('응원했어요! (토스 로그인 연동 시 반영)')
  const stats = [
    p.signalScore != null ? { label: '시그널', value: String(p.signalScore) } : null,
    p.upvoteCount != null ? { label: '응원', value: String(p.upvoteCount) } : null,
    p.reviewSummary?.reviewCount != null
      ? { label: '피드백', value: String(p.reviewSummary.reviewCount) }
      : null,
  ]
    .filter(Boolean)
    .slice(0, 3) as { label: string; value: string }[]

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg }}>
      {Header}
      <div className="rise" style={{ padding: '0 20px 110px' }}>
        <Cover src={coverUrl(p)} alt={p.title} height={190} radius={16} seed={p.title} />
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {p.category && <Badge accent>{p.category}</Badge>}
            {p.maturity && <Badge>{MATURITY_LABEL[p.maturity] || p.maturity}</Badge>}
            {p.stack && <Badge>{STACK_LABEL[p.stack] || p.stack}</Badge>}
            {p.validation?.success && <Badge accent>✅ 라이브 검증 통과</Badge>}
            {p.vibeCoded && <Badge>바이브코딩</Badge>}
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.3 }}>{p.title}</h1>

          {stats.length ? (
            <div style={{ marginTop: 18 }}>
              <StatStrip stats={stats} />
            </div>
          ) : null}

          {p.description && (
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.78,
                color: theme.text,
                margin: '20px 0 0',
                maxWidth: '72ch',
                whiteSpace: 'pre-line',
              }}
            >
              {p.description}
            </p>
          )}

          {p.builtWith?.length ? (
            <div style={{ marginTop: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>제작 도구</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {p.builtWith.map((b) => (
                  <Badge key={b} accent>
                    {BUILT_WITH_LABEL[b] || b}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {p.tags?.length ? (
            <div style={{ marginTop: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>키워드</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {p.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {p.eventSummary?.total ? (
            <p style={{ marginTop: 20, fontSize: 13.5, color: theme.textMuted }}>
              📈 누적 활동 {p.eventSummary.total}회
            </p>
          ) : null}

          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={upvote}
              className="pressable"
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                background: 'transparent',
                color: theme.text,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              👍 응원하기
            </button>
            <button
              type="button"
              onClick={share}
              className="pressable"
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                background: 'transparent',
                color: theme.text,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              공유하기
            </button>
          </div>
        </div>
      </div>

      {p.liveUrl && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
            background: `linear-gradient(to top, ${theme.bg} 72%, transparent)`,
            zIndex: 20,
          }}
        >
          <a href={p.liveUrl} target="_blank" rel="noopener noreferrer">
            <Button style={{ width: '100%' }}>라이브 프로토타입 보기</Button>
          </a>
        </div>
      )}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(84px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.86)',
            color: theme.text,
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13.5,
            maxWidth: '90%',
            textAlign: 'center',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

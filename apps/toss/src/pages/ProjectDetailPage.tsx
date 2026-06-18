import { Button } from '@toss/tds-mobile'
import { useEffect, useState } from 'react'

import { fetchProjects, getProject, type Project } from '../lib/api'
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
  const stats = [
    p.signalScore != null ? { label: '평가점수', value: String(p.signalScore) } : null,
    p.reviewSummary?.averageRating != null
      ? { label: '평균 별점', value: p.reviewSummary.averageRating.toFixed(1) }
      : null,
    p.reviewSummary?.reviewCount != null
      ? { label: '리뷰', value: String(p.reviewSummary.reviewCount) }
      : null,
    p.upvoteCount != null ? { label: '추천', value: String(p.upvoteCount) } : null,
  ]
    .filter(Boolean)
    .slice(0, 3) as { label: string; value: string }[]

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg }}>
      {Header}
      <div className="rise" style={{ padding: '0 20px 110px' }}>
        <div style={{ padding: '0 0 4px' }}>
          <Cover gradient={undefined} src={p.thumbnail} alt={p.title} height={172} radius={16} />
        </div>
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {p.category && <Badge accent>{p.category}</Badge>}
            {p.maturity && <Badge>{p.maturity}</Badge>}
            {p.tags?.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
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
                lineHeight: 1.75,
                color: theme.text,
                margin: '20px 0 0',
                maxWidth: '72ch',
                whiteSpace: 'pre-line',
              }}
            >
              {p.description}
            </p>
          )}

          {p.stack?.length ? (
            <div style={{ marginTop: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>기술 스택</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {p.stack.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 24 }}>
            <Button style={{ width: '100%' }} onClick={share}>
              공유하기
            </Button>
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
            <Button style={{ width: '100%' }}>라이브 프로토타입 보고 평가하기</Button>
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
            background: 'rgba(0,0,0,0.82)',
            color: theme.text,
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 14,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

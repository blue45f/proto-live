import { Top } from '@toss/tds-mobile'
import { useEffect, useMemo, useState } from 'react'

import { fetchProjects, coverUrl, MATURITY_LABEL, type Project } from '../lib/api'
import { navigate } from '../router'
import { theme, pageShell } from '../theme'
import { SearchBar, Chips, Badge, Cover } from '../ui'

const ALL = '전체'

export function ProjectListPage() {
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(ALL)

  useEffect(() => {
    fetchProjects()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const cats = useMemo(() => {
    const c = new Map<string, number>()
    for (const p of items) if (p.category) c.set(p.category, (c.get(p.category) || 0) + 1)
    return [
      ALL,
      ...[...c.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([g]) => g)
        .slice(0, 6),
    ]
  }, [items])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return items.filter((p) => {
      const okCat = cat === ALL || p.category === cat
      const okQ =
        !query ||
        [p.title, p.description, p.category, ...(p.tags || []), p.stack]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      return okCat && okQ
    })
  }, [items, q, cat])

  const open = (p: Project) => navigate(`/project/${encodeURIComponent(p.id)}`)

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg }}>
      <Top
        title={<Top.TitleParagraph size={22}>🧪 프로토라이브</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            메이커의 라이브 프로토타입을 발견하고 응원하세요
          </Top.SubtitleParagraph>
        }
      />
      <div style={pageShell}>
        <div className="rise" style={{ marginBottom: 12 }}>
          <SearchBar value={q} onChange={setQ} placeholder="프로토타입·기술스택 검색" />
        </div>
        {cats.length > 1 && (
          <div className="rise" style={{ animationDelay: '60ms', marginBottom: 18 }}>
            <Chips items={cats} active={cat} onPick={setCat} />
          </div>
        )}

        {loading && (
          <p style={{ textAlign: 'center', color: theme.textMuted, padding: '40px 0' }}>
            불러오는 중…
          </p>
        )}
        {error && (
          <p style={{ textAlign: 'center', color: theme.danger, padding: '24px 0' }}>{error}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p)}
              className="pressable rise"
              style={{
                animationDelay: `${90 + i * 30}ms`,
                display: 'flex',
                gap: 14,
                width: '100%',
                textAlign: 'left',
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius,
                padding: 14,
                color: theme.text,
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 60, flexShrink: 0 }}>
                <Cover src={coverUrl(p)} alt={p.title} height={60} radius={12} seed={p.title} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.title}
                </div>
                {(p.category || p.maturity) && (
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
                    {[p.category, p.maturity && (MATURITY_LABEL[p.maturity] || p.maturity)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {p.validation?.success && <Badge accent>✅ 검증</Badge>}
                  {p.vibeCoded && <Badge>바이브코딩</Badge>}
                  {p.signalScore != null && <Badge>시그널 {p.signalScore}</Badge>}
                  {p.upvoteCount ? <Badge>👍 {p.upvoteCount}</Badge> : null}
                </div>
              </div>
              <span
                aria-hidden
                style={{ color: theme.textMuted, fontSize: 20, opacity: 0.5, alignSelf: 'center' }}
              >
                ›
              </span>
            </button>
          ))}
        </div>
        {!loading && !error && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: theme.textMuted, padding: '40px 0' }}>
            ‘{q || cat}’ 결과가 없어요.
          </p>
        )}
      </div>
    </div>
  )
}

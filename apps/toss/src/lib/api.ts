import sample from '../sample-data.json'

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://proto-live.vercel.app'
).replace(/\/+$/, '')

// thumbnail은 원본 API가 `/thumbnails/x.jpg` 상대경로로 주므로 API origin을 붙여 절대경로로 만들어요.
const toAbsolute = (v: unknown): string | null =>
  typeof v === 'string' && v
    ? v.startsWith('http')
      ? v
      : `${API_BASE}${v.startsWith('/') ? '' : '/'}${v}`
    : null

// 투자 관련 필드(investorCount/committedAmount/ladderEligible 등)는 의도적으로 매핑하지 않아요(평가 특화).
export interface Project {
  id: string
  title: string
  description?: string
  tags?: string[]
  stack?: string[]
  category?: string
  maturity?: string
  liveUrl?: string
  thumbnail?: string | null
  signalScore?: number
  upvoteCount?: number
  reviewSummary?: { reviewCount?: number; averageRating?: number | null } | null
}

const norm = (r: Record<string, unknown>): Project => ({
  id: String(r.id),
  title: String(r.title ?? '프로토타입'),
  description: typeof r.description === 'string' ? r.description : undefined,
  tags: Array.isArray(r.tags) ? (r.tags as string[]) : undefined,
  stack: Array.isArray(r.stack) ? (r.stack as string[]) : undefined,
  category: typeof r.category === 'string' ? r.category : undefined,
  maturity: typeof r.maturity === 'string' ? r.maturity : undefined,
  liveUrl: typeof r.liveUrl === 'string' ? r.liveUrl : undefined,
  thumbnail: toAbsolute(r.thumbnail),
  signalScore: typeof r.signalScore === 'number' ? r.signalScore : undefined,
  upvoteCount: typeof r.upvoteCount === 'number' ? r.upvoteCount : undefined,
  reviewSummary: (r.reviewSummary as Project['reviewSummary']) ?? null,
})

const toArray = (d: unknown): Record<string, unknown>[] =>
  Array.isArray(d)
    ? d
    : Array.isArray((d as { items?: unknown[] })?.items)
      ? (d as { items: Record<string, unknown>[] }).items
      : []

const seed: Project[] = toArray(sample).map(norm)
let cache: Project[] = seed

export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(`${API_BASE}/api/projects`)
    if (!res.ok) throw new Error(String(res.status))
    cache = toArray(await res.json()).map(norm)
  } catch {
    cache = seed
  }
  return cache
}
export function getProject(id: string): Project | undefined {
  return cache.find((p) => p.id === id)
}

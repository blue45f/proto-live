import sample from '../sample-data.json'

// 도메인 타입은 일반 서비스(apps/web)의 단일 소스를 그대로 재사용해요(중복 선언 금지).
import type { Project } from '@web/infrastructure/api'

export type { Project }

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://proto-live.vercel.app'
).replace(/\/+$/, '')

// thumbnail은 API가 상대경로(`/thumbnails/x.jpg`)로 주므로 origin을 붙여요.
export const coverUrl = (p: Project): string | null => {
  const t = p.thumbnail
  return t ? (t.startsWith('http') ? t : `${API_BASE}${t.startsWith('/') ? '' : '/'}${t}`) : null
}

const toArray = (d: unknown): Project[] =>
  Array.isArray(d)
    ? (d as Project[])
    : Array.isArray((d as { items?: unknown[] })?.items)
      ? (d as { items: Project[] }).items
      : []

const seed: Project[] = toArray(sample)
let cache: Project[] = seed

export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(`${API_BASE}/api/projects`)
    if (!res.ok) throw new Error(String(res.status))
    cache = toArray(await res.json())
  } catch {
    cache = seed
  }
  return cache
}
export function getProject(id: string): Project | undefined {
  return cache.find((p) => String(p.id) === id)
}

// 표시용 한국어 라벨(프레젠테이션 전용 — 도메인 타입과 무관)
export const MATURITY_LABEL: Record<string, string> = {
  early: '초기',
  building: '개발 중',
  live: '라이브',
}
export const BUILT_WITH_LABEL: Record<string, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  copilot: 'Copilot',
  windsurf: 'Windsurf',
  v0: 'v0',
  bolt: 'Bolt',
}
export const STACK_LABEL: Record<string, string> = {
  web: '웹',
  app: '앱',
  game: '게임',
  tools: '도구',
}

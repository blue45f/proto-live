import { Project, ProjectEvent, ProjectEventSummary, ProjectEventType } from './project.models'

const EMPTY_EVENT_COUNTS: Record<ProjectEventType, number> = {
  create: 0,
  preview: 0,
  outbound: 0,
  match: 0,
  refresh: 0,
}

export function summarizeProjectEvents(events: ProjectEvent[]): ProjectEventSummary {
  const counts = { ...EMPTY_EVENT_COUNTS }
  let latestAt: string | null = null

  for (const event of events) {
    counts[event.type] += 1
    const eventTime = event.createdAt.toISOString()
    if (!latestAt || eventTime > latestAt) {
      latestAt = eventTime
    }
  }

  return {
    total: events.length,
    latestAt,
    counts,
  }
}

export function calculateProjectSignalScore(project: Project, events: ProjectEvent[]): number {
  const summary = summarizeProjectEvents(events)
  let score = 0

  if (project.validation.success) {
    score += 50
  }

  const responseMs = project.validation.responseTimeMs
  if (project.validation.success && typeof responseMs === 'number') {
    if (responseMs <= 200) score += 24
    else if (responseMs <= 500) score += 18
    else if (responseMs <= 1000) score += 12
    else if (responseMs <= 2000) score += 6
    else score += 2
  }

  score += Math.min(10, summary.counts.preview * 2)
  score += Math.min(12, summary.counts.outbound * 4)
  score += Math.min(24, summary.counts.match * 12 + project.matchCount * 8)

  if (summary.latestAt) {
    const ageHours = Math.max(0, (Date.now() - new Date(summary.latestAt).getTime()) / 36e5)
    if (ageHours <= 24) score += 6
    else if (ageHours <= 72) score += 3
  }

  return Math.min(100, Math.round(score))
}

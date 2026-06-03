import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import {
  createEmptyProjectsState,
  AuditLog,
  MatchProposal,
  Project,
  ProjectEvent,
  ProjectReview,
  ProjectReviewReport,
  ProjectsState,
} from './project.models'

interface SerializedProject extends Omit<Project, 'createdAt'> {
  createdAt: string
}

interface SerializedMatchProposal extends Omit<
  MatchProposal,
  'createdAt' | 'complianceAcceptedAt'
> {
  createdAt: string
  complianceAcceptedAt?: string
}

interface SerializedProjectEvent extends Omit<ProjectEvent, 'createdAt'> {
  createdAt: string
}

interface SerializedProjectReviewReport extends Omit<ProjectReviewReport, 'createdAt'> {
  createdAt: string
}

interface SerializedProjectReview extends Omit<
  ProjectReview,
  'createdAt' | 'lastReportedAt' | 'lastModeratedAt' | 'reportReasons'
> {
  createdAt: string
  lastReportedAt?: string | null
  lastModeratedAt?: string | null
  reportReasons?: SerializedProjectReviewReport[]
}

interface SerializedAuditLog extends Omit<AuditLog, 'createdAt'> {
  createdAt: string
}

interface SerializedProjectsState extends Omit<
  ProjectsState,
  'projects' | 'proposals' | 'events' | 'reviews' | 'auditLogs'
> {
  projects: SerializedProject[]
  proposals: SerializedMatchProposal[]
  events: SerializedProjectEvent[]
  reviews: SerializedProjectReview[]
  auditLogs: SerializedAuditLog[]
}

function defaultStorePath(): string {
  return process.env.PROJECT_STORE_PATH ?? join(process.cwd(), 'data', 'protolive-store.json')
}

function serializeState(state: ProjectsState): SerializedProjectsState {
  return {
    ...state,
    projects: state.projects.map((project) => ({
      ...project,
      createdAt: project.createdAt.toISOString(),
    })),
    proposals: state.proposals.map((proposal) => ({
      ...proposal,
      complianceAcceptedAt: proposal.complianceAcceptedAt?.toISOString(),
      createdAt: proposal.createdAt.toISOString(),
    })),
    events: state.events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
    reviews: state.reviews.map((review) => ({
      ...review,
      reportReasons: review.reportReasons?.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
      })),
      lastReportedAt: review.lastReportedAt ? review.lastReportedAt.toISOString() : null,
      lastModeratedAt: review.lastModeratedAt ? review.lastModeratedAt.toISOString() : null,
      createdAt: review.createdAt.toISOString(),
    })),
    auditLogs: state.auditLogs.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  }
}

function deserializeState(state: SerializedProjectsState): ProjectsState {
  return {
    users: Array.isArray(state.users) ? state.users : [],
    projects: Array.isArray(state.projects)
      ? state.projects.map((project) => ({
          ...project,
          accessMode: project.accessMode ?? 'open',
          protectionNoticeAccepted: project.protectionNoticeAccepted ?? true,
          createdAt: new Date(project.createdAt),
        }))
      : [],
    proposals: Array.isArray(state.proposals)
      ? state.proposals.map((proposal) => ({
          ...proposal,
          investorEmail: proposal.investorEmail ?? 'unknown-investor@protolive.local',
          legalNoticeAccepted: proposal.legalNoticeAccepted ?? true,
          privacyConsentAccepted: proposal.privacyConsentAccepted ?? true,
          riskNoticeAccepted: proposal.riskNoticeAccepted ?? true,
          complianceAcceptedAt: proposal.complianceAcceptedAt
            ? new Date(proposal.complianceAcceptedAt)
            : new Date(proposal.createdAt),
          status: proposal.status ?? 'submitted',
          createdAt: new Date(proposal.createdAt),
        }))
      : [],
    events: Array.isArray(state.events)
      ? state.events.map((event) => ({
          ...event,
          createdAt: new Date(event.createdAt),
        }))
      : [],
    reviews: Array.isArray(state.reviews)
      ? state.reviews.map((review) => ({
          ...review,
          parentId: review.parentId ?? null,
          status: review.status ?? 'visible',
          reportCount: Number.isInteger(review.reportCount) ? review.reportCount : 0,
          reportedBy: Array.isArray(review.reportedBy) ? review.reportedBy : [],
          reportReasons: Array.isArray(review.reportReasons)
            ? review.reportReasons.map((report) => ({
                ...report,
                createdAt: new Date(report.createdAt),
              }))
            : [],
          lastReportedAt: review.lastReportedAt ? new Date(review.lastReportedAt) : null,
          moderatedBy: review.moderatedBy ?? null,
          moderationNote: review.moderationNote ?? null,
          lastModeratedAt: review.lastModeratedAt ? new Date(review.lastModeratedAt) : null,
          createdAt: new Date(review.createdAt),
        }))
      : [],
    auditLogs: Array.isArray(state.auditLogs)
      ? state.auditLogs.map((entry) => ({
          ...entry,
          createdAt: new Date(entry.createdAt),
        }))
      : [],
    nextUserId: Number.isInteger(state.nextUserId) ? state.nextUserId : 1,
    nextProjectId: Number.isInteger(state.nextProjectId) ? state.nextProjectId : 1,
    nextProposalId: Number.isInteger(state.nextProposalId) ? state.nextProposalId : 1,
    nextEventId: Number.isInteger(state.nextEventId) ? state.nextEventId : 1,
    nextReviewId: Number.isInteger(state.nextReviewId) ? state.nextReviewId : 1,
    nextAuditLogId: Number.isInteger(state.nextAuditLogId) ? state.nextAuditLogId : 1,
  }
}

export class JsonProjectsStore {
  constructor(private readonly filePath = defaultStorePath()) {}

  read(): ProjectsState {
    if (!existsSync(this.filePath)) {
      return createEmptyProjectsState()
    }

    const contents = readFileSync(this.filePath, 'utf8')
    if (!contents.trim()) {
      return createEmptyProjectsState()
    }

    return deserializeState(JSON.parse(contents) as SerializedProjectsState)
  }

  write(state: ProjectsState): void {
    mkdirSync(dirname(this.filePath), { recursive: true })

    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`
    writeFileSync(temporaryPath, `${JSON.stringify(serializeState(state), null, 2)}\n`, 'utf8')
    renameSync(temporaryPath, this.filePath)
  }

  /**
   * Readiness probe for the JSON persistence layer (no DB here): the store
   * directory must be writable and any existing store file must parse. Used by
   * the /api/health/ready endpoint so orchestrators can gate traffic.
   */
  checkReadiness(): { ready: boolean; store: 'ok' | 'unwritable' | 'unreadable' } {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      accessSync(dirname(this.filePath), fsConstants.W_OK)
    } catch {
      return { ready: false, store: 'unwritable' }
    }

    try {
      this.read()
    } catch {
      return { ready: false, store: 'unreadable' }
    }

    return { ready: true, store: 'ok' }
  }
}

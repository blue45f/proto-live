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
  ProjectUpvote,
  ProjectLogEntry,
  AppNotification,
  UserStatus,
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

interface SerializedProjectUpvote extends Omit<ProjectUpvote, 'createdAt'> {
  createdAt: string
}

interface SerializedProjectLogEntry extends Omit<ProjectLogEntry, 'createdAt'> {
  createdAt: string
}

interface SerializedAppNotification extends Omit<AppNotification, 'createdAt'> {
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

export interface SerializedProjectsState extends Omit<
  ProjectsState,
  | 'projects'
  | 'proposals'
  | 'events'
  | 'reviews'
  | 'upvotes'
  | 'logEntries'
  | 'notifications'
  | 'auditLogs'
> {
  projects: SerializedProject[]
  proposals: SerializedMatchProposal[]
  events: SerializedProjectEvent[]
  reviews: SerializedProjectReview[]
  upvotes: SerializedProjectUpvote[]
  logEntries: SerializedProjectLogEntry[]
  notifications: SerializedAppNotification[]
  auditLogs: SerializedAuditLog[]
}

function defaultStorePath(): string {
  return process.env.PROJECT_STORE_PATH ?? join(process.cwd(), 'data', 'protolive-store.json')
}

export function serializeState(state: ProjectsState): SerializedProjectsState {
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
    upvotes: state.upvotes.map((upvote) => ({
      ...upvote,
      createdAt: upvote.createdAt.toISOString(),
    })),
    logEntries: state.logEntries.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
    notifications: state.notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
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

export function deserializeState(state: SerializedProjectsState): ProjectsState {
  return {
    users: Array.isArray(state.users)
      ? state.users.map((user) => {
          const status = normalizeUserStatus(user.status)
          if (status !== 'active') {
            return { ...user, status }
          }
          const activeUser = { ...user }
          delete activeUser.status
          return activeUser
        })
      : [],
    projects: Array.isArray(state.projects)
      ? state.projects.map((project) => ({
          ...project,
          accessMode: project.accessMode ?? 'open',
          // 레거시 레코드는 이미 라이브 검증을 통과한 운영 단계로 백필한다.
          maturity: project.maturity ?? 'live',
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
    upvotes: Array.isArray(state.upvotes)
      ? state.upvotes.map((upvote) => ({
          ...upvote,
          createdAt: new Date(upvote.createdAt),
        }))
      : [],
    logEntries: Array.isArray(state.logEntries)
      ? state.logEntries.map((entry) => ({
          ...entry,
          createdAt: new Date(entry.createdAt),
        }))
      : [],
    notifications: Array.isArray(state.notifications)
      ? state.notifications.map((notification) => ({
          ...notification,
          read: notification.read === true,
          createdAt: new Date(notification.createdAt),
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
    challenge: state.challenge ?? null,
    nextUserId: Number.isInteger(state.nextUserId) ? state.nextUserId : 1,
    nextProjectId: Number.isInteger(state.nextProjectId) ? state.nextProjectId : 1,
    nextProposalId: Number.isInteger(state.nextProposalId) ? state.nextProposalId : 1,
    nextEventId: Number.isInteger(state.nextEventId) ? state.nextEventId : 1,
    nextUpvoteId: Number.isInteger(state.nextUpvoteId) ? state.nextUpvoteId : 1,
    nextLogEntryId: Number.isInteger(state.nextLogEntryId) ? state.nextLogEntryId : 1,
    nextNotificationId: Number.isInteger(state.nextNotificationId) ? state.nextNotificationId : 1,
    nextReviewId: Number.isInteger(state.nextReviewId) ? state.nextReviewId : 1,
    nextAuditLogId: Number.isInteger(state.nextAuditLogId) ? state.nextAuditLogId : 1,
  }
}

function normalizeUserStatus(status: unknown): UserStatus {
  return status === 'suspended' || status === 'withdrawn' ? status : 'active'
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

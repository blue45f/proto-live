#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = new Set(process.argv.slice(2))
const isDryRun = args.has('--dry-run')
const isReset = args.has('--reset')

const ROOT = process.cwd()
const ROOT_BACKEND_DIR = join(ROOT, 'apps', 'api')
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR =
  existsSync(join(ROOT, 'package.json')) && existsSync(ROOT_BACKEND_DIR)
    ? ROOT_BACKEND_DIR
    : dirname(SCRIPT_DIR)

const DEFAULT_STORE_PATH = join(BACKEND_DIR, 'data', 'protolive-store.json')
const DEFAULT_FIXTURE_PATH = join(BACKEND_DIR, 'fixtures', 'test-data.json')
const FIXTURE_PATH =
  process.env.TEST_DATA_FIXTURE_PATH ??
  process.env.TEST_DATA_FIXTURE ??
  process.env.SEED_DATA_FIXTURE_PATH ??
  DEFAULT_FIXTURE_PATH
const STORE_PATH = process.env.PROJECT_STORE_PATH ?? DEFAULT_STORE_PATH

const DEFAULT_STATE = {
  users: [],
  projects: [],
  proposals: [],
  events: [],
  reviews: [],
  auditLogs: [],
  nextUserId: 1,
  nextProjectId: 1,
  nextProposalId: 1,
  nextEventId: 1,
  nextReviewId: 1,
  nextAuditLogId: 1,
}

function createDefaultState() {
  return {
    users: [],
    projects: [],
    proposals: [],
    events: [],
    reviews: [],
    auditLogs: [],
    nextUserId: DEFAULT_STATE.nextUserId,
    nextProjectId: DEFAULT_STATE.nextProjectId,
    nextProposalId: DEFAULT_STATE.nextProposalId,
    nextEventId: DEFAULT_STATE.nextEventId,
    nextReviewId: DEFAULT_STATE.nextReviewId,
    nextAuditLogId: DEFAULT_STATE.nextAuditLogId,
  }
}

const ALLOWED_ROLES = new Set(['maker', 'investor', 'member', 'admin'])
const ALLOWED_ACCESS_MODES = new Set(['screened', 'open'])
const ALLOWED_EVENT_TYPES = new Set(['create', 'preview', 'outbound', 'match', 'refresh'])
const ALLOWED_REVIEW_ROLES = new Set(['maker', 'investor', 'member'])
const ALLOWED_REVIEW_TYPES = new Set(['review', 'support', 'idea'])
const ALLOWED_REVIEW_STATUSES = new Set(['visible', 'reported', 'hidden'])
const ALLOWED_PROPOSAL_STATUSES = new Set(['submitted', 'contacted', 'closed'])
const ALLOWED_AUDIT_ACTIONS = new Set([
  'match_compliance_accepted',
  'review_reported',
  'review_hidden_auto',
  'review_moderated',
])
const ALLOWED_AUDIT_TARGETS = new Set(['project', 'review', 'match'])

const FUNDING_RANGES = {
  'pre-seed-10-30': { minAmount: 10_000_000, maxAmount: 30_000_000 },
  'pre-seed-30-50': { minAmount: 30_000_000, maxAmount: 50_000_000 },
  'seed-50-100': { minAmount: 50_000_000, maxAmount: 100_000_000 },
  'seed-100-300': { minAmount: 100_000_000, maxAmount: 300_000_000 },
  'series-a-300-plus': { minAmount: 300_000_000, maxAmount: 300_000_000 },
}

function safeParseInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function safeBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value
  }

  return fallback
}

function safeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((tag) => safeString(tag, null))
        .filter(Boolean)
        .map((tag) => tag.slice(0, 24))
    )
  ).slice(0, 8)
}

function safeDateIso(value, fallback) {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

function normalizeEmail(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeRole(value) {
  const role = normalizeStringLower(value)
  return ALLOWED_ROLES.has(role) ? role : 'maker'
}

function normalizeStringLower(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : null
}

function normalizeEmailList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(new Set(value.map((email) => normalizeEmail(email)).filter(Boolean)))
}

function safeReadJson(filePath) {
  try {
    if (!existsSync(filePath)) {
      return null
    }

    const raw = readFileSync(filePath, 'utf8')
    if (!raw.trim()) {
      return null
    }

    return JSON.parse(raw)
  } catch {
    return null
  }
}

function loadStoreState() {
  const parsed = safeReadJson(STORE_PATH)
  if (!parsed || typeof parsed !== 'object' || parsed === null) {
    return createDefaultState()
  }

  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    nextUserId: safeParseInt(parsed.nextUserId, DEFAULT_STATE.nextUserId),
    nextProjectId: safeParseInt(parsed.nextProjectId, DEFAULT_STATE.nextProjectId),
    nextProposalId: safeParseInt(parsed.nextProposalId, DEFAULT_STATE.nextProposalId),
    nextEventId: safeParseInt(parsed.nextEventId, DEFAULT_STATE.nextEventId),
    nextReviewId: safeParseInt(parsed.nextReviewId, DEFAULT_STATE.nextReviewId),
    nextAuditLogId: safeParseInt(parsed.nextAuditLogId, DEFAULT_STATE.nextAuditLogId),
  }
}

function writeStoreState(state) {
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  renameSync(tmp, STORE_PATH)
}

function loadFixture(path) {
  const parsed = safeReadJson(path)
  if (!parsed || typeof parsed !== 'object' || parsed === null) {
    throw new Error(`fixture 파일 형식이 올바르지 않습니다: ${path}`)
  }

  const rawAccounts = Array.isArray(parsed.accounts)
    ? parsed.accounts
    : Array.isArray(parsed.users)
      ? parsed.users
      : []

  if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
    throw new Error(`accounts(또는 users) 항목이 비어 있습니다: ${path}`)
  }

  const hasAnySection =
    Array.isArray(rawAccounts) ||
    Array.isArray(parsed.projects) ||
    Array.isArray(parsed.proposals) ||
    Array.isArray(parsed.events) ||
    Array.isArray(parsed.reviews) ||
    Array.isArray(parsed.auditLogs)

  if (!hasAnySection) {
    throw new Error(`fixture에 accounts/projects/proposals/events 중 하나가 필요합니다: ${path}`)
  }

  return {
    accounts: normalizeAccounts(rawAccounts),
    projects: normalizeProjects(Array.isArray(parsed.projects) ? parsed.projects : []),
    proposals: normalizeProposals(Array.isArray(parsed.proposals) ? parsed.proposals : []),
    events: normalizeEvents(Array.isArray(parsed.events) ? parsed.events : []),
    reviews: normalizeReviews(Array.isArray(parsed.reviews) ? parsed.reviews : []),
    auditLogs: normalizeAuditLogs(Array.isArray(parsed.auditLogs) ? parsed.auditLogs : []),
    nextUserId: safeParseInt(parsed.nextUserId, null),
    nextProjectId: safeParseInt(parsed.nextProjectId, null),
    nextProposalId: safeParseInt(parsed.nextProposalId, null),
    nextEventId: safeParseInt(parsed.nextEventId, null),
    nextReviewId: safeParseInt(parsed.nextReviewId, null),
    nextAuditLogId: safeParseInt(parsed.nextAuditLogId, null),
  }
}

function normalizeAccounts(accounts) {
  return accounts
    .map((entry) => ({
      id: safeParseInt(entry?.id, null),
      email: normalizeEmail(entry?.email),
      role: normalizeRole(entry?.role),
      password: safeString(entry?.password, ''),
      name: safeString(entry?.name, ''),
      description: safeString(entry?.description, ''),
      notes: safeString(entry?.notes, ''),
    }))
    .filter((entry) => entry.email !== null)
}

function normalizeProjects(projects) {
  return projects
    .map((entry) => {
      const id = safeParseInt(entry?.id, null)
      const userId = safeParseInt(entry?.userId, null)
      const category = safeString(entry?.category, 'Other')
      const accessMode = safeString(entry?.accessMode, 'open')
      const validatedAccessMode = ALLOWED_ACCESS_MODES.has(accessMode) ? accessMode : 'open'
      const now = new Date().toISOString()
      const validId = Number.isInteger(id) && id > 0
      const rawValidation = entry?.validation ?? {}
      const status = safeParseInt(rawValidation.status, null)
      const responseTimeMs = safeParseInt(rawValidation.responseTimeMs, null)
      const ownerEmail = normalizeEmail(entry?.ownerEmail)

      if (!validId) {
        return null
      }

      const title = safeString(entry?.title, null)
      const description = safeString(entry?.description, null)
      const liveUrl = safeString(entry?.liveUrl, null)

      if (!title || !description || !liveUrl) {
        return null
      }

      return {
        id,
        userId,
        ownerEmail,
        title,
        description,
        liveUrl,
        category,
        tags: normalizeTags(entry?.tags),
        accessMode: validatedAccessMode,
        protectionNoticeAccepted: safeBoolean(entry?.protectionNoticeAccepted, true),
        thumbnail: safeString(entry?.thumbnail, null),
        investorCount: safeParseInt(entry?.investorCount, 0),
        matchCount: safeParseInt(entry?.matchCount, 0),
        committedAmountMin: safeParseInt(entry?.committedAmountMin, 0),
        committedAmountMax: safeParseInt(entry?.committedAmountMax, 0),
        validation: {
          success: safeBoolean(rawValidation.success, false),
          ...(typeof status === 'number' ? { status } : {}),
          message: safeString(rawValidation.message, 'Seed validation completed'),
          ...(Number.isFinite(responseTimeMs) ? { responseTimeMs } : {}),
          checkedAt: safeDateIso(rawValidation.checkedAt, now),
          ...(safeString(rawValidation.finalUrl)
            ? { finalUrl: safeString(rawValidation.finalUrl) }
            : {}),
        },
        createdAt: safeDateIso(entry?.createdAt, now),
      }
    })
    .filter(Boolean)
}

function normalizeProposals(proposals) {
  return proposals
    .map((entry) => {
      const id = safeParseInt(entry?.id, null)
      const projectId = safeParseInt(entry?.projectId, null)
      const fundingRangeId = safeString(entry?.fundingRangeId, null)
      const message = safeString(entry?.message, null)
      const investorEmail =
        normalizeEmail(entry?.investorEmail) ?? 'unknown-investor@protolive.local'
      const status = normalizeStringLower(entry?.status)

      if (!Number.isInteger(id) || id <= 0) {
        return null
      }
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return null
      }
      if (!message || !FUNDING_RANGES[fundingRangeId]) {
        return null
      }

      return {
        id,
        projectId,
        investorEmail,
        fundingRangeId,
        message,
        legalNoticeAccepted: safeBoolean(entry?.legalNoticeAccepted, true),
        privacyConsentAccepted: safeBoolean(entry?.privacyConsentAccepted, true),
        riskNoticeAccepted: safeBoolean(entry?.riskNoticeAccepted, true),
        complianceAcceptedAt: safeDateIso(
          entry?.complianceAcceptedAt,
          entry?.createdAt ?? new Date().toISOString()
        ),
        status: ALLOWED_PROPOSAL_STATUSES.has(status) ? status : 'submitted',
        createdAt: safeDateIso(entry?.createdAt, new Date().toISOString()),
      }
    })
    .filter(Boolean)
}

function normalizeEvents(events) {
  return events
    .map((entry) => {
      const id = safeParseInt(entry?.id, null)
      const projectId = safeParseInt(entry?.projectId, null)
      const type = safeString(entry?.type, null)

      if (!Number.isInteger(id) || id <= 0) {
        return null
      }
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return null
      }
      if (!ALLOWED_EVENT_TYPES.has(type)) {
        return null
      }

      return {
        id,
        projectId,
        type,
        createdAt: safeDateIso(entry?.createdAt, new Date().toISOString()),
      }
    })
    .filter(Boolean)
}

function normalizeReviewRole(value) {
  const role = normalizeStringLower(value)
  return ALLOWED_REVIEW_ROLES.has(role) ? role : 'member'
}

function normalizeReviews(reviews) {
  return reviews
    .map((entry) => {
      const id = safeParseInt(entry?.id, null)
      const projectId = safeParseInt(entry?.projectId, null)
      const parentId = safeParseInt(entry?.parentId, null)
      const type = safeString(entry?.type, 'review')
      const rating = safeParseInt(entry?.rating, null)
      const authorEmail = normalizeEmail(entry?.authorEmail)
      const body = safeString(entry?.body, null)
      const status = normalizeStringLower(entry?.status)
      const reportCount = safeParseInt(entry?.reportCount, 0)

      if (!Number.isInteger(id) || id <= 0) {
        return null
      }
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return null
      }
      if (!authorEmail || !body || !ALLOWED_REVIEW_TYPES.has(type)) {
        return null
      }

      return {
        id,
        projectId,
        parentId: Number.isInteger(parentId) && parentId > 0 ? parentId : null,
        authorEmail,
        authorRole: normalizeReviewRole(entry?.authorRole),
        type,
        rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
        body,
        status: ALLOWED_REVIEW_STATUSES.has(status) ? status : 'visible',
        reportCount: Math.max(0, reportCount),
        reportedBy: normalizeEmailList(entry?.reportedBy),
        reportReasons: normalizeReviewReports(entry?.reportReasons),
        lastReportedAt: entry?.lastReportedAt ? safeDateIso(entry.lastReportedAt, null) : null,
        moderatedBy: normalizeEmail(entry?.moderatedBy),
        moderationNote: safeString(entry?.moderationNote, null),
        lastModeratedAt: entry?.lastModeratedAt ? safeDateIso(entry.lastModeratedAt, null) : null,
        createdAt: safeDateIso(entry?.createdAt, new Date().toISOString()),
      }
    })
    .filter(Boolean)
}

function normalizeReviewReports(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      const reporterEmail = normalizeEmail(entry?.reporterEmail)
      if (!reporterEmail) {
        return null
      }

      return {
        reporterEmail,
        reason: safeString(entry?.reason, null),
        createdAt: safeDateIso(entry?.createdAt, new Date().toISOString()),
      }
    })
    .filter(Boolean)
}

function normalizeAuditLogs(logs) {
  return logs
    .map((entry) => {
      const id = safeParseInt(entry?.id, null)
      const action = safeString(entry?.action, null)
      const actorEmail = normalizeEmail(entry?.actorEmail)
      const targetType = safeString(entry?.targetType, null)
      const targetId = safeParseInt(entry?.targetId, null)
      const projectId = safeParseInt(entry?.projectId, null)
      const message = safeString(entry?.message, null)

      if (!Number.isInteger(id) || id <= 0) return null
      if (!actorEmail || !message) return null
      if (!ALLOWED_AUDIT_ACTIONS.has(action) || !ALLOWED_AUDIT_TARGETS.has(targetType)) return null
      if (!Number.isInteger(targetId) || targetId <= 0) return null

      return {
        id,
        action,
        actorEmail,
        targetType,
        targetId,
        ...(Number.isInteger(projectId) && projectId > 0 ? { projectId } : {}),
        message,
        createdAt: safeDateIso(entry?.createdAt, new Date().toISOString()),
      }
    })
    .filter(Boolean)
}

function upsertById(target, incoming) {
  const map = new Map(target.map((item) => [item.id, item]))
  let changed = 0

  for (const item of incoming) {
    if (item === null || item === undefined) {
      continue
    }

    if (!map.has(item.id)) {
      changed += 1
      map.set(item.id, item)
      continue
    }

    const previous = map.get(item.id)
    const next = { ...previous, ...item }
    map.set(item.id, next)
    // Only count rows that actually changed, so the "no changes, skip" path
    // is not bypassed by re-runs over identical fixtures.
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changed += 1
    }
  }

  return {
    items: [...map.values()].sort((a, b) => a.id - b.id),
    changed,
  }
}

function updateNextIdsFromItems(state, fixtureState) {
  const maxUserId = Math.max(0, ...state.users.map((user) => safeParseInt(user.id, 0)))
  const maxProjectId = Math.max(0, ...state.projects.map((project) => safeParseInt(project.id, 0)))
  const maxProposalId = Math.max(
    0,
    ...state.proposals.map((proposal) => safeParseInt(proposal.id, 0))
  )
  const maxEventId = Math.max(0, ...state.events.map((event) => safeParseInt(event.id, 0)))
  const maxReviewId = Math.max(0, ...state.reviews.map((review) => safeParseInt(review.id, 0)))
  const maxAuditLogId = Math.max(0, ...state.auditLogs.map((entry) => safeParseInt(entry.id, 0)))

  state.nextUserId = Math.max(
    state.nextUserId,
    safeParseInt(fixtureState.nextUserId, 0),
    maxUserId + 1,
    DEFAULT_STATE.nextUserId
  )

  state.nextProjectId = Math.max(
    state.nextProjectId,
    safeParseInt(fixtureState.nextProjectId, 0),
    maxProjectId + 1,
    DEFAULT_STATE.nextProjectId
  )

  state.nextProposalId = Math.max(
    state.nextProposalId,
    safeParseInt(fixtureState.nextProposalId, 0),
    maxProposalId + 1,
    DEFAULT_STATE.nextProposalId
  )

  state.nextEventId = Math.max(
    state.nextEventId,
    safeParseInt(fixtureState.nextEventId, 0),
    maxEventId + 1,
    DEFAULT_STATE.nextEventId
  )

  state.nextReviewId = Math.max(
    state.nextReviewId,
    safeParseInt(fixtureState.nextReviewId, 0),
    maxReviewId + 1,
    DEFAULT_STATE.nextReviewId
  )

  state.nextAuditLogId = Math.max(
    state.nextAuditLogId,
    safeParseInt(fixtureState.nextAuditLogId, 0),
    maxAuditLogId + 1,
    DEFAULT_STATE.nextAuditLogId
  )
}

function reconcileProjectMetrics(state) {
  const proposalsByProject = new Map()

  for (const proposal of state.proposals) {
    const list = proposalsByProject.get(proposal.projectId) || []
    list.push(proposal)
    proposalsByProject.set(proposal.projectId, list)
  }

  for (const project of state.projects) {
    const proposals = proposalsByProject.get(project.id) || []
    let committedAmountMin = 0
    let committedAmountMax = 0

    for (const proposal of proposals) {
      const range = FUNDING_RANGES[proposal.fundingRangeId]
      committedAmountMin += range?.minAmount ?? 0
      committedAmountMax += range?.maxAmount ?? 0
    }

    project.investorCount = proposals.length
    project.matchCount = proposals.length
    project.committedAmountMin = committedAmountMin
    project.committedAmountMax = committedAmountMax
  }
}

function seed(state, fixtureState) {
  const summary = { users: 0, projects: 0, proposals: 0, events: 0, reviews: 0, auditLogs: 0 }

  const usersByEmail = new Map()
  for (const user of state.users) {
    const normalizedEmail = normalizeEmail(user.email)
    if (normalizedEmail) {
      usersByEmail.set(normalizedEmail, user)
    }
  }

  const usedUserIds = new Set(
    state.users.map((user) => safeParseInt(user.id, 0)).filter(Number.isInteger)
  )

  for (const account of fixtureState.accounts) {
    const existing = usersByEmail.get(account.email)

    if (existing) {
      const nextAccountFields = {
        role: account.role,
        password: account.password,
        name: account.name,
        description: account.description,
        notes: account.notes,
      }
      let changed = false

      for (const [key, value] of Object.entries(nextAccountFields)) {
        if (existing[key] !== value) {
          existing[key] = value
          changed = true
        }
      }

      if (existing.role !== account.role) {
        existing.role = account.role
        changed = true
      }

      if (changed) {
        summary.users += 1
      }

      continue
    }

    let assignedId = safeParseInt(account.id, null)
    if (!Number.isInteger(assignedId) || usedUserIds.has(assignedId)) {
      assignedId = state.nextUserId
      while (usedUserIds.has(assignedId)) {
        assignedId += 1
      }
    }

    const user = {
      id: assignedId,
      email: account.email,
      role: account.role,
      password: account.password,
      name: account.name,
      description: account.description,
      notes: account.notes,
    }

    state.users.push(user)
    usersByEmail.set(account.email, user)
    usedUserIds.add(user.id)
    state.nextUserId = Math.max(state.nextUserId, user.id + 1)
    summary.users += 1
  }

  const userIds = new Set(
    state.users.map((user) => safeParseInt(user.id, 0)).filter((id) => Number.isInteger(id))
  )

  const projectsWithResolvedOwner = fixtureState.projects
    .map((project) => {
      if (project.userId && userIds.has(project.userId)) {
        return project
      }

      if (project.ownerEmail) {
        const user = usersByEmail.get(project.ownerEmail)
        if (user?.id) {
          return {
            ...project,
            userId: user.id,
          }
        }
      }

      return null
    })
    .filter(Boolean)

  const projectResult = upsertById(state.projects, projectsWithResolvedOwner)
  state.projects = projectResult.items
  summary.projects = projectResult.changed

  const validProjectIds = new Set(
    state.projects
      .map((project) => safeParseInt(project.id, 0))
      .filter((id) => Number.isInteger(id))
  )

  const proposalCandidates = fixtureState.proposals.filter((proposal) =>
    validProjectIds.has(proposal.projectId)
  )
  const proposalResult = upsertById(state.proposals, proposalCandidates)
  state.proposals = proposalResult.items
  summary.proposals = proposalResult.changed

  const eventCandidates = fixtureState.events.filter((event) =>
    validProjectIds.has(event.projectId)
  )
  const eventResult = upsertById(state.events, eventCandidates)
  state.events = eventResult.items
  summary.events = eventResult.changed

  const reviewCandidates = fixtureState.reviews.filter((review) =>
    validProjectIds.has(review.projectId)
  )
  const reviewResult = upsertById(state.reviews, reviewCandidates)
  state.reviews = reviewResult.items
  summary.reviews = reviewResult.changed

  const auditLogResult = upsertById(state.auditLogs, fixtureState.auditLogs)
  state.auditLogs = auditLogResult.items
  summary.auditLogs = auditLogResult.changed

  reconcileProjectMetrics(state)
  state.projects = state.projects.map((project) => {
    const { ownerEmail, ...rest } = project
    return rest
  })
  updateNextIdsFromItems(state, fixtureState)

  return summary
}

function main() {
  const fixtureState = loadFixture(FIXTURE_PATH)
  const beforeState = isReset ? createDefaultState() : loadStoreState()
  const summary = seed(beforeState, fixtureState)

  const changed =
    summary.users +
    summary.projects +
    summary.proposals +
    summary.events +
    summary.reviews +
    summary.auditLogs

  if (changed === 0 && !isReset) {
    console.log('변경 항목이 없어 시드를 건너뜁니다.')
    return
  }

  if (isDryRun) {
    console.log(
      isReset
        ? '리셋 드라이 런 실행: 파일이 변경되지 않습니다.'
        : '드라이 런 실행: 파일이 변경되지 않습니다.'
    )
    console.log(
      `예상 변경 항목: 사용자 ${summary.users}개, 프로젝트 ${summary.projects}개, 제안 ${summary.proposals}개, 이벤트 ${summary.events}개, 리뷰 ${summary.reviews}개, 감사 로그 ${summary.auditLogs}개`
    )
    return
  }

  writeStoreState(beforeState)
  console.log(
    `${isReset ? '테스트 데이터 리셋 완료' : '테스트 데이터 시드 완료'}: 사용자 ${summary.users}개, 프로젝트 ${summary.projects}개, 제안 ${summary.proposals}개, 이벤트 ${summary.events}개, 리뷰 ${summary.reviews}개, 감사 로그 ${summary.auditLogs}개 동기화`
  )
}

main()

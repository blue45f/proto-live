import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  createEmptyProjectsState,
  MatchProposal,
  Project,
  ProjectEvent,
  ProjectReview,
  ProjectsState,
} from './project.models';

interface SerializedProject extends Omit<Project, 'createdAt'> {
  createdAt: string;
}

interface SerializedMatchProposal extends Omit<MatchProposal, 'createdAt'> {
  createdAt: string;
}

interface SerializedProjectEvent extends Omit<ProjectEvent, 'createdAt'> {
  createdAt: string;
}

interface SerializedProjectReview extends Omit<ProjectReview, 'createdAt'> {
  createdAt: string;
}

interface SerializedProjectsState extends Omit<ProjectsState, 'projects' | 'proposals' | 'events' | 'reviews'> {
  projects: SerializedProject[];
  proposals: SerializedMatchProposal[];
  events: SerializedProjectEvent[];
  reviews: SerializedProjectReview[];
}

function defaultStorePath(): string {
  return process.env.PROJECT_STORE_PATH ?? join(process.cwd(), 'data', 'protolive-store.json');
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
      createdAt: proposal.createdAt.toISOString(),
    })),
    events: state.events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
    reviews: state.reviews.map((review) => ({
      ...review,
      createdAt: review.createdAt.toISOString(),
    })),
  };
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
          lastReportedAt: review.lastReportedAt ? new Date(review.lastReportedAt) : null,
          createdAt: new Date(review.createdAt),
        }))
      : [],
    nextUserId: Number.isInteger(state.nextUserId) ? state.nextUserId : 1,
    nextProjectId: Number.isInteger(state.nextProjectId) ? state.nextProjectId : 1,
    nextProposalId: Number.isInteger(state.nextProposalId) ? state.nextProposalId : 1,
    nextEventId: Number.isInteger(state.nextEventId) ? state.nextEventId : 1,
    nextReviewId: Number.isInteger(state.nextReviewId) ? state.nextReviewId : 1,
  };
}

export class JsonProjectsStore {
  constructor(private readonly filePath = defaultStorePath()) {}

  read(): ProjectsState {
    if (!existsSync(this.filePath)) {
      return createEmptyProjectsState();
    }

    const contents = readFileSync(this.filePath, 'utf8');
    if (!contents.trim()) {
      return createEmptyProjectsState();
    }

    return deserializeState(JSON.parse(contents) as SerializedProjectsState);
  }

  write(state: ProjectsState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });

    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(serializeState(state), null, 2)}\n`, 'utf8');
    renameSync(temporaryPath, this.filePath);
  }
}

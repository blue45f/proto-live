import { FundingRangeId, ProjectAccessMode, ProjectCategory } from './project.constants';

export interface ValidationSnapshot {
  success: boolean;
  status?: number;
  message: string;
  responseTimeMs?: number;
  checkedAt: string;
  finalUrl?: string;
}

export interface Project {
  id: number;
  userId: number;
  title: string;
  description: string;
  liveUrl: string;
  category: ProjectCategory;
  accessMode: ProjectAccessMode;
  protectionNoticeAccepted: boolean;
  thumbnail?: string | null;
  investorCount: number;
  matchCount: number;
  committedAmountMin: number;
  committedAmountMax: number;
  validation: ValidationSnapshot;
  createdAt: Date;
  signalScore?: number;
  eventSummary?: ProjectEventSummary;
}

export interface User {
  id: number;
  email: string;
  role: 'maker' | 'investor';
}

export interface MatchProposal {
  id: number;
  projectId: number;
  fundingRangeId: FundingRangeId;
  message: string;
  createdAt: Date;
}

export type ProjectEventType = 'create' | 'preview' | 'outbound' | 'match' | 'refresh';

export interface ProjectEvent {
  id: number;
  projectId: number;
  type: ProjectEventType;
  createdAt: Date;
}

export interface AdminEventTrendPoint {
  date: string;
  total: number;
  create: number;
  preview: number;
  outbound: number;
  match: number;
  refresh: number;
}

export interface AdminFunnelMetric {
  previewToMatchRate: number;
  outboundToMatchRate: number;
  matchPerProjectRate: number;
  matchCount: number;
  previewCount: number;
  outboundCount: number;
  totalEvents: number;
}

export interface AdminTopProjectMetric {
  id: number;
  title: string;
  category: string;
  accessMode: ProjectAccessMode;
  signalScore: number;
  investorCount: number;
  matchCount: number;
  committedAmountMin: number;
  committedAmountMax: number;
}

export interface AdminCategoryMetric {
  category: string;
  projects: number;
  investorCount: number;
  matchCount: number;
  committedAmountMax: number;
}

export interface AdminRangeMetric {
  rangeId: string;
  label: string;
  proposalCount: number;
  totalMinAmount: number;
  totalMaxAmount: number;
  averageAmount: number;
}

export interface AdminDashboardMetrics {
  conversionFunnel: AdminFunnelMetric;
  eventTrend14d: AdminEventTrendPoint[];
  eventTotals: Record<ProjectEventType, number>;
  accessModeDistribution: Array<{ accessMode: ProjectAccessMode; projects: number; verified: number }>;
  topMatchProjects: AdminTopProjectMetric[];
  topSignalProjects: AdminTopProjectMetric[];
  categoryPerformance: AdminCategoryMetric[];
  proposalRangeDistribution: AdminRangeMetric[];
  lastUpdatedAt: string;
}

export interface ProjectEventSummary {
  total: number;
  latestAt: string | null;
  counts: Record<ProjectEventType, number>;
}

export interface ProjectsState {
  users: User[];
  projects: Project[];
  proposals: MatchProposal[];
  events: ProjectEvent[];
  nextUserId: number;
  nextProjectId: number;
  nextProposalId: number;
  nextEventId: number;
}

export function createEmptyProjectsState(): ProjectsState {
  return {
    users: [],
    projects: [],
    proposals: [],
    events: [],
    nextUserId: 1,
    nextProjectId: 1,
    nextProposalId: 1,
    nextEventId: 1,
  };
}

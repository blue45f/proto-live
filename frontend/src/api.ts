import axios, { AxiosError } from 'axios';

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
  category: string;
  accessMode: ProjectAccessMode;
  protectionNoticeAccepted?: boolean;
  thumbnail?: string | null;
  investorCount: number;
  matchCount: number;
  committedAmountMin: number;
  committedAmountMax: number;
  validation: ValidationSnapshot;
  createdAt: string;
  signalScore?: number;
  eventSummary?: ProjectEventSummary;
}

export type ProjectAccessMode = 'screened' | 'open';
export type ProjectEventType = 'create' | 'preview' | 'outbound' | 'match' | 'refresh';

export interface ProjectEventSummary {
  total: number;
  latestAt: string | null;
  counts: Record<ProjectEventType, number>;
}

export interface ProjectEvent {
  id: number;
  projectId: number;
  type: ProjectEventType;
  createdAt: string;
}

export interface FundingRange {
  id: string;
  label: string;
  stage: string;
  minAmount: number;
  maxAmount: number;
}

export interface MarketConfig {
  categories: string[];
  accessModes: Array<{
    id: ProjectAccessMode;
    label: string;
    description: string;
  }>;
  fundingRanges: FundingRange[];
  refreshIntervalMs: number;
  benchmarkSignals: string[];
}

export interface MarketStats {
  totalProjects: number;
  verifiedProjects: number;
  verificationRate: number;
  totalCommittedAmount: number;
  totalInvestors: number;
  averageResponseMs: number | null;
  categoryBreakdown: Array<{ category: string; count: number }>;
  totalSignals: number;
  topSignals: Array<{
    id: number;
    title: string;
    category: string;
    signalScore: number;
    latestEventAt: string | null;
  }>;
  lastUpdatedAt: string;
}

export interface CreateProjectPayload {
  email: string;
  title: string;
  description: string;
  liveUrl: string;
  category: string;
  accessMode: ProjectAccessMode;
  protectionNoticeAccepted: boolean;
}

export interface CreateMatchPayload {
  fundingRangeId: string;
  message: string;
}

export interface ProjectListQuery {
  q?: string;
  category?: string;
  accessMode?: ProjectAccessMode;
  sort?: 'signal' | 'recent' | 'created' | 'funding';
  minSignal?: number;
  minFundingAmount?: number;
  maxFundingAmount?: number;
  onlyVerified?: boolean;
  page?: number;
  limit?: number;
}

export interface ProjectListResponse {
  data: Project[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export type ProjectListPayload = Project[] | ProjectListResponse;

interface ApiErrorBody {
  message?: string | string[];
}

type ApiErrorResponse = AxiosError<ApiErrorBody>;

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003/api').replace(
  /\/$/,
  '',
);

const client = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
});

export async function fetchMarketConfig() {
  const response = await client.get<MarketConfig>('/projects/config');
  return response.data;
}

export async function fetchMarketStats() {
  const response = await client.get<MarketStats>('/projects/stats');
  return response.data;
}

export async function fetchProjects(query: ProjectListQuery = {}): Promise<ProjectListPayload> {
  const response = await client.get<ProjectListPayload>('/projects', { params: normalizeProjectQuery(query) });
  return response.data;
}

export async function fetchMarketSnapshot() {
  const [config, stats, projects] = await Promise.all([
    fetchMarketConfig(),
    fetchMarketStats(),
    fetchProjects(),
  ]);

  return {
    config,
    stats,
    projects: extractProjects(projects),
  };
}

export async function validateLiveUrl(url: string) {
  const response = await client.post<ValidationSnapshot>('/projects/validate', { url });
  return response.data;
}

export async function createProject(payload: CreateProjectPayload) {
  const response = await client.post<Project>('/projects', payload);
  return response.data;
}

export async function refreshAllProjects() {
  const response = await client.post<Project[]>('/projects/refresh');
  return response.data;
}

export async function refreshProject(id: number) {
  const response = await client.post<Project>(`/projects/${id}/refresh`);
  return response.data;
}

export async function createMatchProposal(id: number, payload: CreateMatchPayload) {
  const response = await client.post<Project>(`/projects/${id}/match`, payload);
  return response.data;
}

export async function investInProject(id: number) {
  const response = await client.post<Project>(`/projects/${id}/invest`);
  return response.data;
}

export async function recordProjectEvent(id: number, type: 'preview' | 'outbound' | 'refresh') {
  const response = await client.post<Project>(`/projects/${id}/events`, { type });
  return response.data;
}

export async function fetchProjectEvents(id: number) {
  const response = await client.get<ProjectEvent[]>(`/projects/${id}/events`);
  return response.data;
}

export function extractProjects(payload: ProjectListPayload): Project[] {
  return Array.isArray(payload) ? payload : payload.data;
}

export function hasPagination(payload: ProjectListPayload): payload is ProjectListResponse {
  return !Array.isArray(payload) && typeof payload.total === 'number';
}

function normalizeProjectQuery(query: ProjectListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (query.q?.trim()) params.q = query.q.trim();
  if (query.category?.trim()) params.category = query.category.trim();
  if (query.accessMode) params.accessMode = query.accessMode;
  if (query.sort && query.sort !== 'signal') params.sort = query.sort;
  if (query.minSignal !== undefined && Number.isFinite(query.minSignal)) params.minSignal = query.minSignal;
  if (query.minFundingAmount !== undefined && Number.isFinite(query.minFundingAmount))
    params.minFundingAmount = query.minFundingAmount;
  if (query.maxFundingAmount !== undefined && Number.isFinite(query.maxFundingAmount))
    params.maxFundingAmount = query.maxFundingAmount;
  if (query.onlyVerified === true) params.onlyVerified = 'true';
  if (query.page && Number.isFinite(query.page)) params.page = query.page;
  if (query.limit && Number.isFinite(query.limit)) params.limit = query.limit;

  return params;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseError = error as ApiErrorResponse;
    const rawMessage = responseError.response?.data?.message;

    if (Array.isArray(rawMessage)) {
      return rawMessage.join(' ');
    }

    if (typeof rawMessage === 'string' && rawMessage.trim()) {
      return rawMessage;
    }

    if (typeof responseError.message === 'string' && responseError.message.trim()) {
      return responseError.message;
    }
  }

  return fallback;
}

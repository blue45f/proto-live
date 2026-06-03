import type { ProjectListQuery } from '../api';
import {
  ADMIN_PATH_SEGMENT,
  type AppView,
  FILTER_PRESET_STORAGE_KEY,
  FUNDING_SORT_OPTIONS,
  LIST_VIEW_STORAGE_KEY,
  type ProjectListViewMode,
  type RawFilterSnapshot,
} from '../lib/constants';
import {
  ADMIN_REVENUE_CONFIG_STORAGE_KEY,
  ADMIN_REVENUE_SCENARIO_STORAGE_KEY,
  ADMIN_REVENUE_TARGET_STORAGE_KEY,
  DEFAULT_REVENUE_CONFIG,
  DEFAULT_REVENUE_TARGET,
  DEFAULT_SCENARIO_MULTIPLIERS,
  MAX_REVENUE_RATE,
  MAX_SCENARIO_MULTIPLIER,
  MIN_REVENUE_RATE,
  MIN_SCENARIO_MULTIPLIER,
  type RevenueModelConfig,
} from '../lib/revenue-config';

export function safeInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function toBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return toBoolean(value, fallback);
  return fallback;
}

export function parseTagInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n#]+/)
        .map((tag) => tag.trim().replace(/\s+/g, ' '))
        .filter((tag) => tag.length >= 2 && tag.length <= 24),
    ),
  ).slice(0, 8);
}

export function clampPageSize(value: number) {
  if (Number.isNaN(value)) return 12;
  return Math.max(1, Math.min(100, Math.floor(value)));
}

export function clampSort(value: string | null) {
  if (!value) return 'signal';
  return FUNDING_SORT_OPTIONS.includes(value as (typeof FUNDING_SORT_OPTIONS)[number])
    ? (value as ProjectListQuery['sort'])
    : 'signal';
}

export function safePositiveNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  return fallback;
}

export function safeNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

export function clampRate(value: number, min = MIN_REVENUE_RATE, max = MAX_REVENUE_RATE) {
  return Math.max(min, Math.min(max, value));
}

export function readAdminRevenueConfig(): RevenueModelConfig {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_REVENUE_CONFIG };
  }

  try {
    const raw = localStorage.getItem(ADMIN_REVENUE_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_REVENUE_CONFIG };

    const parsed = JSON.parse(raw) as Partial<RevenueModelConfig>;
    return {
      makerMonthlyFee: safePositiveNumber(parsed.makerMonthlyFee, DEFAULT_REVENUE_CONFIG.makerMonthlyFee),
      investorMonthlyFee: safePositiveNumber(
      parsed.investorMonthlyFee,
      DEFAULT_REVENUE_CONFIG.investorMonthlyFee,
    ),
    leadCaptureFee: safePositiveNumber(parsed.leadCaptureFee, DEFAULT_REVENUE_CONFIG.leadCaptureFee),
    investorAcquisitionCost: safePositiveNumber(
      parsed.investorAcquisitionCost,
      DEFAULT_REVENUE_CONFIG.investorAcquisitionCost,
    ),
    makerAcquisitionCost: safePositiveNumber(
      parsed.makerAcquisitionCost,
      DEFAULT_REVENUE_CONFIG.makerAcquisitionCost,
    ),
    estimatedMonthlyChurnRate: clampRate(
      safeNumber(parsed.estimatedMonthlyChurnRate, DEFAULT_REVENUE_CONFIG.estimatedMonthlyChurnRate),
      0.01,
      99.99,
    ),
    makerConversionRate: clampRate(safeNumber(parsed.makerConversionRate, DEFAULT_REVENUE_CONFIG.makerConversionRate)),
      investorConversionRate: clampRate(
        safeNumber(parsed.investorConversionRate, DEFAULT_REVENUE_CONFIG.investorConversionRate),
      ),
      closeLeadRate: clampRate(safeNumber(parsed.closeLeadRate, DEFAULT_REVENUE_CONFIG.closeLeadRate)),
      successFeeRate: clampRate(safeNumber(parsed.successFeeRate, DEFAULT_REVENUE_CONFIG.successFeeRate), 0.1, 30),
    };
  } catch {
    return { ...DEFAULT_REVENUE_CONFIG };
  }
}

export function normalizeScenarioMultipliers(values: unknown): number[] {
  const fallback = [...DEFAULT_SCENARIO_MULTIPLIERS];
  if (!Array.isArray(values)) {
    return fallback;
  }

  const parsed = values
    .map((value) => (typeof value === 'number' ? value : Number.parseFloat(String(value))))
    .filter((value) => Number.isFinite(value))
    .map((value) => {
      return Math.max(MIN_SCENARIO_MULTIPLIER, Math.min(MAX_SCENARIO_MULTIPLIER, value));
    })
    .map((value) => Math.round(value * 100) / 100);

  if (parsed.length === 0) {
    return fallback;
  }

  const unique = Array.from(new Set(parsed));
  if (unique.length === 0) {
    return fallback;
  }

  return unique.sort((a, b) => a - b);
}

export function readAdminScenarioMultipliers(): number[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_SCENARIO_MULTIPLIERS];
  }

  try {
    const raw = localStorage.getItem(ADMIN_REVENUE_SCENARIO_STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_SCENARIO_MULTIPLIERS];
    }

    const parsed = JSON.parse(raw) as unknown;
    return normalizeScenarioMultipliers(parsed);
  } catch {
    return [...DEFAULT_SCENARIO_MULTIPLIERS];
  }
}

export function readAdminRevenueTarget(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_REVENUE_TARGET;
  }

  try {
    const raw = localStorage.getItem(ADMIN_REVENUE_TARGET_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_REVENUE_TARGET;
    }

    const parsed = JSON.parse(raw);
    return safePositiveNumber((parsed as { targetMonthlyRevenue?: unknown }).targetMonthlyRevenue, DEFAULT_REVENUE_TARGET);
  } catch {
    return DEFAULT_REVENUE_TARGET;
  }
}

export function readFilterPreset(): RawFilterSnapshot {
  const fallback: RawFilterSnapshot = {
    q: '',
    category: 'All',
    tag: 'All',
    accessMode: 'All',
    sort: 'signal',
    page: 1,
    limit: 12,
    minSignal: 0,
    minFundingAmount: 0,
    maxFundingAmount: 0,
    onlyVerified: false,
    favorites: false,
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  let stored: Partial<RawFilterSnapshot> = {};
  try {
    const raw = localStorage.getItem(FILTER_PRESET_STORAGE_KEY);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch {
    stored = {};
  }

  const url = new URL(window.location.href);
  const saved = {
    q: url.searchParams.get('q') ?? null,
    category: url.searchParams.get('category') ?? null,
    tag: url.searchParams.get('tag') ?? null,
    accessMode: url.searchParams.get('accessMode') ?? null,
    sort: url.searchParams.get('sort') ?? null,
    page: url.searchParams.get('page'),
    limit: url.searchParams.get('limit'),
    minSignal: url.searchParams.get('minSignal'),
    minFundingAmount: url.searchParams.get('minFundingAmount'),
    maxFundingAmount: url.searchParams.get('maxFundingAmount'),
    onlyVerified: url.searchParams.get('onlyVerified'),
    favorites: url.searchParams.get('favorites'),
  };

  const hasAnyQuery = Array.from(url.searchParams.keys()).length > 0;
  if (!hasAnyQuery) {
    return {
      q: stored.q ?? fallback.q,
      category: stored.category ?? fallback.category,
      tag: stored.tag ?? fallback.tag,
      accessMode: stored.accessMode ?? fallback.accessMode,
      sort: clampSort(stored.sort ?? fallback.sort ?? null) as string,
      page: Math.max(1, safeInt(stored.page?.toString() ?? null, fallback.page ?? 1)),
      limit: clampPageSize(stored.limit ?? (fallback.limit ?? 12)),
      minSignal: Math.max(0, safeInt(stored.minSignal?.toString() ?? null, fallback.minSignal ?? 0)),
      minFundingAmount: Math.max(
        0,
        safeInt(stored.minFundingAmount?.toString() ?? null, fallback.minFundingAmount ?? 0),
      ),
      maxFundingAmount: Math.max(
        0,
        safeInt(stored.maxFundingAmount?.toString() ?? null, fallback.maxFundingAmount ?? 0),
      ),
      onlyVerified: parseBoolean(stored.onlyVerified, false),
      favorites: parseBoolean(stored.favorites, false),
    };
  }

  return {
    q: saved.q ?? fallback.q,
    category: saved.category ?? fallback.category,
    tag: saved.tag ?? fallback.tag,
    accessMode: saved.accessMode ?? fallback.accessMode,
    sort: clampSort(saved.sort) as string,
    page: safeInt(saved.page, fallback.page ?? 1),
    limit: safeInt(saved.limit, fallback.limit ?? 12),
    minSignal: Math.max(0, safeInt(saved.minSignal, fallback.minSignal ?? 0)),
    minFundingAmount: Math.max(0, safeInt(saved.minFundingAmount, fallback.minFundingAmount ?? 0)),
    maxFundingAmount: Math.max(0, safeInt(saved.maxFundingAmount, fallback.maxFundingAmount ?? 0)),
    onlyVerified: toBoolean(saved.onlyVerified, false),
    favorites: toBoolean(saved.favorites, false),
  };
}

export function readProjectListViewMode(): ProjectListViewMode {
  if (typeof window === 'undefined') {
    return 'compact';
  }

  const raw = localStorage.getItem(LIST_VIEW_STORAGE_KEY);
  return raw === 'cards' || raw === 'reviews' || raw === 'compact' ? raw : 'compact';
}

export function readInitialProjectId(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const match = window.location.pathname.match(/\/projects\/(\d+)\/?$/);
  if (!match) {
    return null;
  }

  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

export function readInitialView(): AppView {
  if (typeof window === 'undefined') {
    return 'market';
  }

  const url = new URL(window.location.href);
  const pathParts = url.pathname
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .slice(-1)[0];
  const isAdminPath = pathParts === ADMIN_PATH_SEGMENT;

  return url.searchParams.get('view') === 'admin' || isAdminPath ? 'admin' : 'market';
}

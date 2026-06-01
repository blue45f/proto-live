import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { ProjectsService } from '../src/projects/projects.service';
import { createEmptyProjectsState } from '../src/projects/project.models';
import { JsonProjectsStore } from '../src/projects/projects.store';
import { ProjectAccessMode, ProjectCategory } from '../src/projects/project.constants';

type SeedFn = (state: ReturnType<typeof createEmptyProjectsState>) => void;

async function withSeededService(seed: SeedFn, run: (service: ProjectsService) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-query-'));
  const previousStorePath = process.env.PROJECT_STORE_PATH;
  const filePath = join(dir, 'store.json');

  try {
    process.env.PROJECT_STORE_PATH = filePath;

    const state = createEmptyProjectsState();
    seed(state);
    new JsonProjectsStore(filePath).write(state);

    await run(new ProjectsService());
  } finally {
    if (previousStorePath === undefined) {
      delete process.env.PROJECT_STORE_PATH;
    } else {
      process.env.PROJECT_STORE_PATH = previousStorePath;
    }

    rmSync(dir, { recursive: true, force: true });
  }
}

test('getAllProjects supports category/search/access mode query filters', async () => {
  await withSeededService((state) => {
    state.users.push({ id: 1, email: 'maker@protolive.local', role: 'maker' });
    state.projects.push(
      {
        id: 1,
        userId: 1,
        title: 'Alpha Verified Stack',
        description: 'Realtime dashboard with trusted demo and clear KPI updates',
        liveUrl: 'https://alpha.example.com',
        category: 'AI & SaaS' as ProjectCategory,
        tags: ['MVP', 'review-loop', 'dashboard'],
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 2,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: {
          success: true,
          status: 200,
          message: 'ok',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://alpha.example.com',
          responseTimeMs: 150,
        },
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      },
      {
        id: 2,
        userId: 1,
        title: 'Beta Verified Notes',
        description: 'Verified idea validation workflow',
        liveUrl: 'https://beta.example.com',
        category: 'AI & SaaS' as ProjectCategory,
        tags: ['notes', 'research'],
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 1,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: {
          success: true,
          status: 200,
          message: 'ok',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://beta.example.com',
          responseTimeMs: 3500,
        },
        createdAt: new Date('2026-06-01T11:00:00.000Z'),
      },
      {
        id: 3,
        userId: 1,
        title: 'Gamma Draft',
        description: 'Draft screened private project',
        liveUrl: 'https://gamma.example.com',
        category: 'DevTools' as ProjectCategory,
        tags: ['private', 'developer'],
        accessMode: 'screened' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 0,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: {
          success: false,
          status: 503,
          message: 'error',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://gamma.example.com',
          responseTimeMs: 2200,
        },
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
      },
      {
        id: 4,
        userId: 1,
        title: 'Delta Verified Commerce',
        description: 'Commerce stack with verified landing',
        liveUrl: 'https://delta.example.com',
        category: 'FinTech' as ProjectCategory,
        tags: ['commerce', 'payments'],
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 0,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: {
          success: true,
          status: 200,
          message: 'ok',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://delta.example.com',
          responseTimeMs: 180,
        },
        createdAt: new Date('2026-06-01T09:00:00.000Z'),
      },
    );
    state.events.push(
      { id: 1, projectId: 1, type: 'preview', createdAt: new Date('2026-06-01T11:20:00.000Z') },
      { id: 2, projectId: 1, type: 'outbound', createdAt: new Date('2026-06-01T11:30:00.000Z') },
      { id: 3, projectId: 2, type: 'refresh', createdAt: new Date('2026-06-01T10:40:00.000Z') },
      { id: 4, projectId: 4, type: 'refresh', createdAt: new Date('2026-06-01T11:45:00.000Z') },
    );

    state.nextUserId = 2;
    state.nextProjectId = 5;
    state.nextProposalId = 1;
    state.nextEventId = 5;
  }, async (service) => {
    const aiProjects = await service.getAllProjects({ category: 'AI & SaaS' });
    assert.equal(aiProjects.length, 2);
    assert.equal(aiProjects.every((project) => project.category === 'AI & SaaS'), true);

    const screenedOnly = await service.getAllProjects({ accessMode: 'screened' });
    assert.equal(screenedOnly.length, 1);
    assert.equal(screenedOnly[0].id, 3);

    const openOnly = await service.getAllProjects({ accessMode: 'open' });
    assert.equal(openOnly.length, 3);

    const verifiedOnly = await service.getAllProjects({ onlyVerified: true });
    const verifiedIds = verifiedOnly.map((project) => project.id);
    assert.deepEqual(verifiedIds.slice().sort((a, b) => a - b), [1, 2, 4]);

    const searchHits = await service.getAllProjects({ q: 'verified' });
    const searchIds = searchHits.map((project) => project.id).sort((a, b) => a - b);
    assert.deepEqual(searchIds, [1, 2, 4]);

    const taggedProjects = await service.getAllProjects({ tag: 'MVP' });
    assert.deepEqual(taggedProjects.map((project) => project.id), [1]);

    const tagSearchHits = await service.getAllProjects({ q: 'review-loop' });
    assert.deepEqual(tagSearchHits.map((project) => project.id), [1]);

    const highSignal = await service.getAllProjects({ minSignal: 70, sort: 'signal' });
    assert.equal(highSignal.length, 2);
    assert.deepEqual(highSignal.map((project) => project.id).sort((a, b) => a - b), [1, 4]);
    assert.ok(highSignal.every((project) => (project.signalScore ?? 0) >= 70));

    const recent = await service.getAllProjects({ sort: 'recent' });
    assert.deepEqual(recent.map((project) => project.id), [4, 1, 2, 3]);

    const created = await service.getAllProjects({ sort: 'created' });
    assert.deepEqual(created.map((project) => project.id), [1, 2, 3, 4]);
  });
});

test('createProjectReview records reviews and one-level replies with summaries', async () => {
  await withSeededService((state) => {
    state.users.push({ id: 1, email: 'maker@protolive.local', role: 'maker' });
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Community Ready Project',
      description: 'review thread target',
      liveUrl: 'https://community.example.com',
      category: 'Social' as ProjectCategory,
      tags: ['community', 'reviews'],
      accessMode: 'open' as ProjectAccessMode,
      protectionNoticeAccepted: true,
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 0,
      committedAmountMax: 0,
      validation: {
        success: true,
        status: 200,
        message: 'ok',
        checkedAt: '2026-06-01T00:00:00.000Z',
        finalUrl: 'https://community.example.com',
        responseTimeMs: 80,
      },
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
    });

    state.nextUserId = 2;
    state.nextProjectId = 2;
    state.nextProposalId = 1;
    state.nextEventId = 1;
    state.nextReviewId = 1;
  }, async (service) => {
    const first = service.createProjectReview(1, {
      email: 'member@protolive.local',
      role: 'member',
      type: 'review',
      rating: 4,
      body: '처음 보는 사용자도 바로 이해할 수 있어서 좋습니다.',
    });

    assert.equal(first.review.id, 1);
    assert.equal(first.review.parentId, null);
    assert.equal(first.review.rating, 4);
    assert.equal(first.project.reviewSummary?.rootCount, 1);
    assert.equal(first.project.reviewSummary?.replyCount, 0);
    assert.equal(first.project.reviewSummary?.averageRating, 4);

    const reply = service.createProjectReview(1, {
      email: 'maker@protolive.local',
      role: 'maker',
      type: 'idea',
      parentId: first.review.id,
      body: '의견 감사합니다. 첫 화면 설명을 더 짧게 다듬겠습니다.',
    });

    assert.equal(reply.review.parentId, first.review.id);
    assert.equal(reply.review.type, 'review');
    assert.equal(reply.review.rating, null);
    assert.equal(reply.project.reviewSummary?.rootCount, 1);
    assert.equal(reply.project.reviewSummary?.replyCount, 1);
    assert.equal(reply.project.reviewSummary?.total, 2);

    const reviews = service.getProjectReviews(1);
    assert.deepEqual(reviews.map((review) => review.id), [1, 2]);

    assert.throws(
      () =>
        service.createProjectReview(1, {
          email: 'member2@protolive.local',
          role: 'member',
          type: 'idea',
          parentId: reply.review.id,
          body: '대댓글에 다시 답글을 남기는 케이스입니다.',
        }),
      (error: unknown) => {
        assert.ok(error instanceof BadRequestException);
        assert.equal((error as BadRequestException).message, '대댓글에는 추가 답글을 남길 수 없습니다.');
        return true;
      },
    );

    assert.throws(
      () =>
        service.createProjectReview(1, {
          email: 'member2@protolive.local',
          role: 'member',
          type: 'idea',
          parentId: 999,
          body: '존재하지 않는 원글에 답글을 남기는 케이스입니다.',
        }),
      (error: unknown) => {
        assert.ok(error instanceof BadRequestException);
        assert.equal((error as BadRequestException).message, '답글을 남길 원본 리뷰를 찾을 수 없습니다.');
        return true;
      },
    );
  });
});

test('getProjectList paginates projects and applies funding filters', async () => {
  await withSeededService((state) => {
    state.users.push({ id: 1, email: 'maker@protolive.local', role: 'maker' });
    state.projects.push(
      {
        id: 1,
        userId: 1,
        title: 'Small Scale',
        description: 'entry level build',
        liveUrl: 'https://small.example.com',
        category: 'AI & SaaS' as ProjectCategory,
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 0,
        matchCount: 1,
        committedAmountMin: 80,
        committedAmountMax: 120,
        validation: { success: true, status: 200, message: 'ok', checkedAt: '2026-06-01T00:00:00.000Z', finalUrl: 'https://small.example.com', responseTimeMs: 40 },
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      },
      {
        id: 2,
        userId: 1,
        title: 'Middle Scale',
        description: 'steady growth product',
        liveUrl: 'https://middle.example.com',
        category: 'FinTech',
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 2,
        matchCount: 3,
        committedAmountMin: 300,
        committedAmountMax: 500,
        validation: { success: true, status: 200, message: 'ok', checkedAt: '2026-06-01T00:00:00.000Z', finalUrl: 'https://middle.example.com', responseTimeMs: 60 },
        createdAt: new Date('2026-06-01T11:00:00.000Z'),
      },
      {
        id: 3,
        userId: 1,
        title: 'Large Scale',
        description: 'enterprise onboarding',
        liveUrl: 'https://large.example.com',
        category: 'DevTools',
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 4,
        matchCount: 2,
        committedAmountMin: 800,
        committedAmountMax: 1300,
        validation: { success: true, status: 200, message: 'ok', checkedAt: '2026-06-01T00:00:00.000Z', finalUrl: 'https://large.example.com', responseTimeMs: 80 },
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
      },
    );

    state.nextUserId = 2;
    state.nextProjectId = 4;
    state.nextProposalId = 1;
    state.nextEventId = 1;
  }, async (service) => {
    const firstPage = await service.getProjectList({ page: 1, limit: 2, sort: 'funding' });
    assert.equal(firstPage.page, 1);
    assert.equal(firstPage.limit, 2);
    assert.equal(firstPage.total, 3);
    assert.equal(firstPage.totalPages, 2);
    assert.equal(firstPage.hasPrev, false);
    assert.equal(firstPage.hasNext, true);
    assert.deepEqual(firstPage.data.map((project) => project.id), [3, 2]);

    const secondPage = await service.getProjectList({ page: 2, limit: 2, sort: 'funding' });
    assert.equal(secondPage.page, 2);
    assert.equal(secondPage.hasPrev, true);
    assert.equal(secondPage.hasNext, false);
    assert.equal(secondPage.data.length, 1);
    assert.equal(secondPage.data[0].id, 1);

    const requestedOverflowPage = await service.getProjectList({ page: 9, limit: 2, sort: 'funding' });
    assert.equal(requestedOverflowPage.page, 2);

    const fundedByRange = await service.getProjectList({ sort: 'funding', minFundingAmount: 200, maxFundingAmount: 900 });
    assert.equal(fundedByRange.total, 2);
    assert.deepEqual(fundedByRange.data.map((project) => project.id), [3, 2]);

    const atLeastMin = await service.getProjectList({ sort: 'funding', minFundingAmount: 100 });
    assert.equal(atLeastMin.total, 3);

    const atMostMax = await service.getProjectList({ sort: 'funding', maxFundingAmount: 500 });
    assert.equal(atMostMax.total, 2);
    assert.deepEqual(atMostMax.data.map((project) => project.id), [2, 1]);
  });
});

test('getAllProjects rejects invalid funding range', async () => {
  await withSeededService((state) => {
    state.users.push({ id: 1, email: 'maker@protolive.local', role: 'maker' });
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Invalid Funding',
      description: 'range test',
      liveUrl: 'https://invalid-funding.example.com',
      category: 'AI & SaaS' as ProjectCategory,
      accessMode: 'open' as ProjectAccessMode,
      protectionNoticeAccepted: true,
      investorCount: 0,
      matchCount: 0,
      committedAmountMin: 120,
      committedAmountMax: 280,
      validation: { success: true, status: 200, message: 'ok', checkedAt: '2026-06-01T00:00:00.000Z', finalUrl: 'https://invalid-funding.example.com', responseTimeMs: 50 },
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
    });

    state.nextUserId = 2;
    state.nextProjectId = 2;
    state.nextProposalId = 1;
    state.nextEventId = 1;
  }, async (service) => {
    const call = service.getAllProjects({
      minFundingAmount: 3000000,
      maxFundingAmount: 1000000,
    });

    await assert.rejects(call, (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal((error as BadRequestException).message, '최대 투자금은 최소 투자금보다 크거나 같아야 합니다.');
      return true;
    });
  });
});

test('getAdminDashboard returns health, risks, and action recommendations', async () => {
  await withSeededService((state) => {
    state.users.push({ id: 1, email: 'maker@protolive.local', role: 'maker' });
    state.users.push({ id: 2, email: 'maker2@protolive.local', role: 'maker' });
    state.projects.push(
      {
        id: 1,
        userId: 1,
        title: 'Healthy Project',
        description: 'Project with active signal and match',
        liveUrl: 'https://healthy.example.com',
        category: 'AI & SaaS' as ProjectCategory,
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 2,
        matchCount: 1,
        committedAmountMin: 100,
        committedAmountMax: 220,
        validation: {
          success: true,
          status: 200,
          message: 'ok',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://healthy.example.com',
          responseTimeMs: 90,
        },
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      },
      {
        id: 2,
        userId: 1,
        title: 'Silent Risky Project',
        description: 'No conversion and unverified',
        liveUrl: 'https://risky.example.com',
        category: 'FinTech' as ProjectCategory,
        accessMode: 'screened' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 0,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: {
          success: false,
          status: 503,
          message: 'down',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://risky.example.com',
          responseTimeMs: 2400,
        },
        createdAt: new Date('2026-06-01T11:00:00.000Z'),
      },
      {
        id: 3,
        userId: 2,
        title: 'Dormant Project',
        description: 'Low signal project',
        liveUrl: 'https://dormant.example.com',
        category: 'DevTools' as ProjectCategory,
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 0,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: {
          success: true,
          status: 200,
          message: 'ok',
          checkedAt: '2026-06-01T00:00:00.000Z',
          finalUrl: 'https://dormant.example.com',
          responseTimeMs: 1300,
        },
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
      },
    );
    state.proposals.push(
      {
        id: 1,
        projectId: 1,
        fundingRangeId: 'seed-50-100',
        message: 'seed proposal',
        createdAt: new Date('2026-06-01T12:10:00.000Z'),
      },
      {
        id: 2,
        projectId: 1,
        fundingRangeId: 'seed-100-300',
        message: 'seed2 proposal',
        createdAt: new Date('2026-06-01T12:15:00.000Z'),
      },
    );
    state.events.push(
      { id: 1, projectId: 1, type: 'create', createdAt: new Date('2026-06-01T12:00:00.000Z') },
      { id: 2, projectId: 1, type: 'preview', createdAt: new Date('2026-06-01T12:01:00.000Z') },
      { id: 3, projectId: 1, type: 'outbound', createdAt: new Date('2026-06-01T12:02:00.000Z') },
      { id: 4, projectId: 1, type: 'match', createdAt: new Date('2026-06-01T12:03:00.000Z') },
      { id: 5, projectId: 3, type: 'create', createdAt: new Date('2026-05-01T09:00:00.000Z') },
    );

    state.nextUserId = 3;
    state.nextProjectId = 4;
    state.nextProposalId = 3;
    state.nextEventId = 6;
  }, async (service) => {
    const dashboard = service.getAdminDashboard();

    assert.equal(dashboard.conversionFunnel.matchCount, 1);
    assert.equal(dashboard.conversionFunnel.previewToMatchRate, 100);
    assert.equal(dashboard.conversionFunnel.outboundToMatchRate, 100);
    assert.equal(dashboard.categoryPerformance.length, 3);
    assert.equal(dashboard.health.healthScore >= 0 && dashboard.health.healthScore <= 100, true);
    assert.equal(dashboard.health.riskCount, dashboard.riskProjects.length);
    assert.equal(dashboard.health.warningCount >= 1, true);
    assert.equal(Array.isArray(dashboard.recommendations), true);
    assert.equal(dashboard.recommendations.length > 0, true);
    assert.equal(dashboard.proposalRangeDistribution.length > 0, true);
    assert.equal(dashboard.riskProjects.some((project) => project.title.includes('Silent Risky Project')), true);
    assert.equal(dashboard.topMatchProjects[0].id, 1);
  });
});

test('getAdminRevenueProjection applies formulas and overrides assumptions', async () => {
  await withSeededService((state) => {
    state.users.push({ id: 1, email: 'maker@protolive.local', role: 'maker' });
    state.projects.push(
      {
        id: 1,
        userId: 1,
        title: 'Revenue Alpha',
        description: 'Alpha revenue scenario',
        liveUrl: 'https://alpha.example.com',
        category: 'AI & SaaS' as ProjectCategory,
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 2,
        matchCount: 1,
        committedAmountMin: 150,
        committedAmountMax: 3000,
        validation: { success: true, status: 200, message: 'ok', checkedAt: '2026-06-01T00:00:00.000Z', finalUrl: 'https://alpha.example.com', responseTimeMs: 120 },
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      },
      {
        id: 2,
        userId: 1,
        title: 'Revenue Beta',
        description: 'Beta revenue scenario',
        liveUrl: 'https://beta.example.com',
        category: 'FinTech' as ProjectCategory,
        accessMode: 'open' as ProjectAccessMode,
        protectionNoticeAccepted: true,
        investorCount: 0,
        matchCount: 0,
        committedAmountMin: 0,
        committedAmountMax: 0,
        validation: { success: false, status: 500, message: 'down', checkedAt: '2026-06-01T00:00:00.000Z', finalUrl: 'https://beta.example.com', responseTimeMs: 2000 },
        createdAt: new Date('2026-06-01T11:00:00.000Z'),
      },
    );

    state.events.push(
      { id: 1, projectId: 1, type: 'preview', createdAt: new Date('2026-06-01T12:10:00.000Z') },
      { id: 2, projectId: 1, type: 'outbound', createdAt: new Date('2026-06-01T12:11:00.000Z') },
      { id: 3, projectId: 2, type: 'preview', createdAt: new Date('2026-06-01T12:12:00.000Z') },
      { id: 4, projectId: 1, type: 'match', createdAt: new Date('2026-06-01T12:13:00.000Z') },
    );

    state.nextUserId = 2;
    state.nextProjectId = 3;
    state.nextProposalId = 1;
    state.nextEventId = 5;
  }, async (service) => {
    const overrideProjection = service.getAdminRevenueProjection({
      makerMonthlyFee: 1000,
      investorMonthlyFee: 500,
      leadCaptureFee: 100,
      makerConversionRate: 10,
      investorConversionRate: 50,
      closeLeadRate: 20,
      successFeeRate: 10,
      investorAcquisitionCost: 80000,
      makerAcquisitionCost: 120000,
      estimatedMonthlyChurnRate: 10,
      targetMonthlyRevenue: 2000,
      scenarioMultipliers: [0.5, 1.0, 1.4],
    });

    assert.equal(overrideProjection.monthlyMakerPlanRevenue, 100);
    assert.equal(overrideProjection.monthlyInvestorPlanRevenue, 500);
    assert.equal(overrideProjection.monthlyLeadRevenue, 400);
    assert.equal(overrideProjection.monthlyTransactionRevenue, 60);
    assert.equal(overrideProjection.totalMonthlyRevenue, 1060);
    assert.equal(overrideProjection.annualRevenue, 12720);
    assert.equal(overrideProjection.averageCommittedPerInvestor, 1500);
    assert.equal(overrideProjection.benchmarkGaps.length, 6);
    assert.equal(overrideProjection.scenarios.length, 3);
    assert.deepEqual(
      overrideProjection.scenarios.map((scenario) => scenario.multiplier),
      [0.5, 1, 1.4],
    );
    assert.equal(overrideProjection.assumptions.makerConversionRate, 10);
    assert.equal(overrideProjection.assumptions.investorAcquisitionCost, 80000);
    assert.equal(overrideProjection.assumptions.estimatedMonthlyChurnRate, 10);
    assert.equal(overrideProjection.assumptions.successFeeRate, 10);
    assert.equal(overrideProjection.targetGap.targetMonthlyRevenue, 2000);
    assert.equal(overrideProjection.targetGap.shortfall, 940);
    assert.equal(overrideProjection.targetGap.achievedRate, 53);
    assert.equal(overrideProjection.targetGap.drivers.length, 3);
    assert.equal(overrideProjection.targetGap.drivers.every((driver) => driver.acquisitionCostPerUnit >= 0), true);
    assert.equal(
      overrideProjection.targetGap.drivers.every((driver) => driver.estimatedPaybackMonths >= 0),
      true,
    );
    const firstDriver = overrideProjection.targetGap.drivers[0];
    assert.equal(typeof firstDriver.estimatedPaybackMonths, 'number');

    const defaultProjection = service.getAdminRevenueProjection();
    assert.equal(defaultProjection.scenarios.length, 4);
    assert.equal(defaultProjection.monthlyMakerPlanRevenue > overrideProjection.monthlyMakerPlanRevenue, true);
  });
});

test('getAdminDashboard includes revenue projection payload', async () => {
  await withSeededService((state) => {
    state.users.push({ id: 1, email: 'maker@protolive.local', role: 'maker' });
    state.projects.push({
      id: 1,
      userId: 1,
      title: 'Dashboard Revenue',
      description: 'Used by admin dashboard',
      liveUrl: 'https://dashboard.example.com',
      category: 'AI & SaaS' as ProjectCategory,
      accessMode: 'open' as ProjectAccessMode,
      protectionNoticeAccepted: true,
      investorCount: 5,
      matchCount: 1,
      committedAmountMin: 0,
      committedAmountMax: 5000,
      validation: { success: true, status: 200, message: 'ok', checkedAt: '2026-06-01T00:00:00.000Z', finalUrl: 'https://dashboard.example.com', responseTimeMs: 200 },
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
    });

    state.events.push(
      { id: 1, projectId: 1, type: 'create', createdAt: new Date('2026-06-01T12:10:00.000Z') },
      { id: 2, projectId: 1, type: 'preview', createdAt: new Date('2026-06-01T12:11:00.000Z') },
      { id: 3, projectId: 1, type: 'outbound', createdAt: new Date('2026-06-01T12:12:00.000Z') },
      { id: 4, projectId: 1, type: 'match', createdAt: new Date('2026-06-01T12:13:00.000Z') },
    );

    state.nextUserId = 2;
    state.nextProjectId = 2;
    state.nextProposalId = 1;
    state.nextEventId = 5;
  }, async (service) => {
    const dashboard = service.getAdminDashboard();
    const dashboardProjection = dashboard.revenue;

    assert.equal(dashboardProjection.assumptions.makerMonthlyFee, 25000);
    assert.equal(dashboardProjection.monthlyMakerPlanRevenue, 4500);
    assert.equal(dashboardProjection.monthlyInvestorPlanRevenue, 13300);
    assert.equal(dashboardProjection.monthlyLeadRevenue, 32000);
    assert.equal(dashboardProjection.totalMonthlyRevenue, 49821);
    assert.equal(dashboardProjection.annualRevenue, 597852);
    assert.equal(dashboardProjection.targetGap.targetMonthlyRevenue, 2500000);
    assert.equal(Array.isArray(dashboardProjection.targetGap.drivers), true);
    assert.equal(dashboardProjection.targetGap.drivers.every((driver) => Number.isFinite(driver.acquisitionCostPerUnit)), true);
    assert.equal(dashboardProjection.targetGap.drivers.every((driver) => Number.isFinite(driver.estimatedPaybackMonths)), true);
    assert.equal(dashboardProjection.benchmarkGaps.every((entry) => ['good', 'warning', 'critical'].includes(entry.status)), true);
    assert.equal(dashboardProjection.scenarios[0].label, '보수');
    assert.equal(dashboardProjection.scenarios[0].multiplier, 0.8);
    assert.equal(dashboardProjection.scenarios[1].multiplier, 1);
  });
});

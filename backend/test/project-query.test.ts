import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
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

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

function runSeedDataScript(options: {
  fixturePath: string;
  storePath: string;
  dryRun?: boolean;
}) {
  const args = ['scripts/seed-test-data.mjs'];
  if (options.dryRun) {
    args.push('--dry-run');
  }

  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PROJECT_STORE_PATH: options.storePath,
      TEST_DATA_FIXTURE_PATH: options.fixturePath,
    },
  });
}

function createFixture(directory: string, filename: string, content: unknown) {
  const path = join(directory, filename);
  writeFileSync(path, JSON.stringify(content, null, 2), 'utf8');
  return path;
}

function readStore(storePath: string) {
  return JSON.parse(readFileSync(storePath, 'utf8'));
}

test('test-data seed imports projects/proposals/events and recalculates project metrics', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-seed-data-'));
  const fixturePath = createFixture(
    dir,
    'fixture.json',
    {
      accounts: [
        {
          id: 4,
          email: 'maker.seed@protolive.local',
          role: 'maker',
          name: 'Seed Maker',
        },
        {
          id: 5,
          email: 'investor.seed@protolive.local',
          role: 'investor',
          name: 'Seed Investor',
        },
      ],
      projects: [
        {
          id: 2,
          userId: 4,
          title: 'Alpha Builder',
          description: '프로토타입 매출 검증용 프로젝트',
          liveUrl: 'https://example.com/alpha',
          category: 'AI & SaaS',
          accessMode: 'open',
          protectionNoticeAccepted: true,
          investorCount: 0,
          matchCount: 0,
          committedAmountMin: 0,
          committedAmountMax: 0,
          validation: {
            success: true,
            status: 200,
            message: 'ok',
            checkedAt: '2026-05-31T10:00:00.000Z',
          },
          createdAt: '2026-05-31T09:00:00.000Z',
        },
        {
          id: 3,
          userId: 4,
          ownerEmail: 'maker.seed@protolive.local',
          title: 'Beta Dashboard',
          description: '투자자 리드 테스트 프로젝트',
          liveUrl: 'https://example.com/beta',
          category: 'DevTools',
          accessMode: 'screened',
          protectionNoticeAccepted: true,
          validation: {
            success: true,
            status: 200,
            message: 'ok',
            checkedAt: '2026-05-31T11:00:00.000Z',
          },
          createdAt: '2026-05-31T10:30:00.000Z',
        },
      ],
      proposals: [
        {
          id: 10,
          projectId: 2,
          fundingRangeId: 'seed-50-100',
          message: '1차 제안',
          createdAt: '2026-06-01T03:00:00.000Z',
        },
        {
          id: 11,
          projectId: 2,
          fundingRangeId: 'pre-seed-10-30',
          message: '2차 제안',
          createdAt: '2026-06-01T03:20:00.000Z',
        },
        {
          id: 12,
          projectId: 3,
          fundingRangeId: 'seed-100-300',
          message: '베타 제안',
          createdAt: '2026-06-01T03:40:00.000Z',
        },
      ],
      events: [
        {
          id: 1,
          projectId: 2,
          type: 'create',
          createdAt: '2026-05-31T09:05:00.000Z',
        },
        {
          id: 2,
          projectId: 2,
          type: 'match',
          createdAt: '2026-06-01T04:00:00.000Z',
        },
        {
          id: 3,
          projectId: 3,
          type: 'preview',
          createdAt: '2026-06-01T04:10:00.000Z',
        },
      ],
      nextUserId: 6,
      nextProjectId: 4,
      nextProposalId: 13,
      nextEventId: 4,
    },
  );
  const storePath = join(dir, 'store.json');

  try {
    const result = runSeedDataScript({ fixturePath, storePath });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /테스트 데이터 시드 완료/);

    const state = readStore(storePath);
    assert.equal(state.users.length, 2);
    assert.equal(state.users[0].id, 4);
    assert.equal(state.projects.length, 2);
    assert.equal(state.proposals.length, 3);
    assert.equal(state.events.length, 3);

    const alpha = state.projects.find((project: { id: number }) => project.id === 2);
    const beta = state.projects.find((project: { id: number }) => project.id === 3);

    assert.ok(alpha);
    assert.ok(beta);
    assert.equal(alpha.investorCount, 2);
    assert.equal(alpha.matchCount, 2);
    assert.equal(alpha.committedAmountMin, 60_000_000);
    assert.equal(alpha.committedAmountMax, 130_000_000);
    assert.equal(beta.investorCount, 1);
    assert.equal(beta.matchCount, 1);
    assert.equal(beta.committedAmountMin, 100_000_000);
    assert.equal(beta.committedAmountMax, 300_000_000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('test-data seed updates existing user role and supports dry-run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-seed-data-update-'));
  const fixturePath = createFixture(
    dir,
    'fixture.json',
    {
      accounts: [
        {
          id: 1,
          email: 'same.user@protolive.local',
          role: 'investor',
        },
      ],
      projects: [
        {
          id: 1,
          ownerEmail: 'same.user@protolive.local',
          title: 'Owner Resolved by email',
          description: 'ownerEmail 해석 시나리오',
          liveUrl: 'https://example.com/owner',
          category: 'Social',
          accessMode: 'open',
          validation: {
            success: true,
            status: 200,
            message: 'ok',
            checkedAt: '2026-05-31T10:00:00.000Z',
          },
          createdAt: '2026-05-31T10:00:00.000Z',
        },
      ],
      proposals: [],
      events: [],
      nextUserId: 2,
      nextProjectId: 2,
      nextProposalId: 1,
      nextEventId: 1,
    },
  );
  const storePath = join(dir, 'store.json');

  writeFileSync(
    storePath,
    JSON.stringify(
      {
        users: [
          {
            id: 1,
            email: 'same.user@protolive.local',
            role: 'maker',
          },
        ],
        projects: [],
        proposals: [],
        events: [],
        nextUserId: 2,
        nextProjectId: 1,
        nextProposalId: 1,
        nextEventId: 1,
      },
      null,
      2,
    ),
    'utf8',
  );

  try {
    const dryRunResult = runSeedDataScript({ fixturePath, storePath, dryRun: true });
    assert.equal(dryRunResult.status, 0);
    assert.match(dryRunResult.stdout, /드라이 런 실행/);
    assert.match(dryRunResult.stdout, /예상 변경 항목/);

    const readState = readStore(storePath);
    const existingRoleBefore = readState.users[0].role;
    assert.equal(existingRoleBefore, 'maker');

    const result = runSeedDataScript({ fixturePath, storePath });
    assert.equal(result.status, 0);

    const afterState = readStore(storePath);
    assert.equal(afterState.users.length, 1);
    assert.equal(afterState.users[0].role, 'investor');
    assert.equal(afterState.projects.length, 1);
    assert.equal(afterState.projects[0].userId, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('test-data seed script errors when fixture is malformed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-seed-data-malformed-'));
  const fixturePath = join(dir, 'fixture.json');
  writeFileSync(fixturePath, '{ "accounts": [ { "email": "broken@protolive.local" } ', 'utf8');

  const storePath = join(dir, 'store.json');

  try {
    const result = runSeedDataScript({ fixturePath, storePath });

    assert.equal(result.status, 1);
    assert.match(result.stderr + result.stdout, /올바르지/);
    assert.equal(existsSync(storePath), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

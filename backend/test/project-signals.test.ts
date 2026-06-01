import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { calculateProjectSignalScore, summarizeProjectEvents } from '../src/projects/project-signals';
import { Project, ProjectEvent } from '../src/projects/project.models';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    userId: 1,
    title: 'Signal MVP',
    description: 'A prototype with measurable interest.',
    liveUrl: 'https://example.org/',
    category: 'AI & SaaS',
    accessMode: 'open',
    protectionNoticeAccepted: true,
    thumbnail: null,
    investorCount: 0,
    matchCount: 0,
    committedAmountMin: 0,
    committedAmountMax: 0,
    validation: {
      success: true,
      status: 200,
      message: 'ok',
      checkedAt: '2026-06-01T00:00:00.000Z',
      responseTimeMs: 180,
      finalUrl: 'https://example.org/',
    },
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function event(type: ProjectEvent['type'], createdAt: string): ProjectEvent {
  return {
    id: 1,
    projectId: 1,
    type,
    createdAt: new Date(createdAt),
  };
}

test('calculateProjectSignalScore rewards verified, fast, active projects', () => {
  const events = [
    event('preview', '2026-06-01T00:01:00.000Z'),
    event('outbound', '2026-06-01T00:02:00.000Z'),
    event('match', '2026-06-01T00:03:00.000Z'),
  ];

  const fastVerified = calculateProjectSignalScore(project({ matchCount: 1 }), events);
  const slowUnverified = calculateProjectSignalScore(
    project({
      matchCount: 0,
      validation: {
        success: false,
        status: 500,
        message: 'down',
        checkedAt: '2026-06-01T00:00:00.000Z',
        responseTimeMs: 2400,
      },
    }),
    [],
  );

  assert.ok(fastVerified > slowUnverified);
  assert.equal(calculateProjectSignalScore(project(), []), 74);
});

test('summarizeProjectEvents counts project events by type and exposes latest event time', () => {
  const summary = summarizeProjectEvents([
    event('preview', '2026-06-01T00:01:00.000Z'),
    event('preview', '2026-06-01T00:02:00.000Z'),
    event('outbound', '2026-06-01T00:03:00.000Z'),
    event('match', '2026-06-01T00:04:00.000Z'),
    event('refresh', '2026-06-01T00:05:00.000Z'),
  ]);

  assert.deepEqual(summary.counts, {
    create: 0,
    preview: 2,
    outbound: 1,
    match: 1,
    refresh: 1,
  });
  assert.equal(summary.total, 5);
  assert.equal(summary.latestAt, '2026-06-01T00:05:00.000Z');
});

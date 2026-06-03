import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectsController } from '../src/projects/projects.controller';
import { ProjectsService } from '../src/projects/projects.service';

function makeController() {
  const fakeService = {
    requireAdminSession: () => {
      throw new ForbiddenException('관리자 계정만 운영 검토를 처리할 수 있습니다.');
    },
    requireSession: () => {
      throw new ForbiddenException('로그인이 필요합니다.');
    },
    refreshAllProjects: async () => [],
    refreshProject: async () => ({
      id: 1,
    }),
    refreshProjectForSession: async () => ({
      id: 1,
    }),
    investInProject: async () => ({
      id: 1,
    }),
  } as unknown as ProjectsService;

  return new ProjectsController(fakeService);
}

test('refresh all projects requires an admin session before mutating state', async () => {
  const controller = makeController();

  await assert.rejects(
    () => (controller as any).refreshProjects({ headers: {} }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match((error as ForbiddenException).message, /관리자/);
      return true;
    },
  );
});

test('single project refresh requires a logged-in authorized session before mutating state', async () => {
  const controller = makeController();

  await assert.rejects(
    () => (controller as any).refreshProject(1, { headers: {} }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match((error as ForbiddenException).message, /로그인/);
      return true;
    },
  );
});

test('legacy invest endpoint no longer records automatic compliance consent', async () => {
  const controller = makeController();

  await assert.rejects(
    () => controller.investInProject(1),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match((error as BadRequestException).message, /투자 관심/);
      return true;
    },
  );
});

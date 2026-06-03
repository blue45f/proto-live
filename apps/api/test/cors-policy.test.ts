import { test } from 'node:test';
import * as assert from 'node:assert/strict';

async function loadCorsPolicy() {
  const modulePath = '../src/common/cors-policy';
  return import(modulePath) as Promise<{
    isCorsOriginAllowed: (origin: string | undefined, allowedOrigins: string[], nodeEnv?: string) => boolean;
  }>;
}

test('CORS policy only auto-allows localhost origins outside production', async () => {
  const { isCorsOriginAllowed } = await loadCorsPolicy();

  assert.equal(isCorsOriginAllowed(undefined, [], 'production'), true);
  assert.equal(isCorsOriginAllowed('https://app.protolive.example', ['https://app.protolive.example'], 'production'), true);
  assert.equal(isCorsOriginAllowed('http://localhost:4174', [], 'development'), true);
  assert.equal(isCorsOriginAllowed('http://localhost:4174', [], 'production'), false);
  assert.equal(isCorsOriginAllowed('https://evil.example', ['https://app.protolive.example'], 'production'), false);
});

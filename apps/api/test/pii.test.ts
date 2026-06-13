import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { maskEmail } from '../src/projects/pii'

test('maskEmail keeps first two chars and masks the rest of the local part', () => {
  assert.equal(maskEmail('member-parent@protolive.local'), 'me***@protolive.local')
})

test('maskEmail masks short local parts to one char + asterisk', () => {
  assert.equal(maskEmail('ab@protolive.local'), 'a*@protolive.local')
  assert.equal(maskEmail('a@protolive.local'), 'a*@protolive.local')
})

test('maskEmail is idempotent so double masking is safe', () => {
  const once = maskEmail('investor-impact@protolive.local')
  assert.equal(maskEmail(once), once)
})

test('maskEmail returns empty string for nullish input', () => {
  assert.equal(maskEmail(null), '')
  assert.equal(maskEmail(undefined), '')
})

test('maskEmail leaves a value without a domain untouched', () => {
  assert.equal(maskEmail('not-an-email'), 'not-an-email')
})

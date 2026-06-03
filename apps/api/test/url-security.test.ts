import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import {
  isPrivateAddress,
  normalizePublicHttpUrl,
  resolveRedirectUrl,
} from '../src/projects/url-security'

test('detects loopback, link-local, and private network addresses', () => {
  const blocked = [
    '127.0.0.1',
    '10.0.0.7',
    '172.16.4.5',
    '192.168.1.20',
    '169.254.169.254',
    '::1',
    'fc00::1',
    'fe80::1',
  ]

  for (const address of blocked) {
    assert.equal(isPrivateAddress(address), true, `${address} should be blocked`)
  }

  assert.equal(isPrivateAddress('8.8.8.8'), false)
  assert.equal(isPrivateAddress('2606:4700:4700::1111'), false)
})

test('normalizes only public http and https URLs', () => {
  assert.equal(normalizePublicHttpUrl('https://example.com/path').hostname, 'example.com')
  assert.equal(normalizePublicHttpUrl('http://example.com').protocol, 'http:')

  assert.throws(() => normalizePublicHttpUrl('file:///etc/passwd'), /http/i)
  assert.throws(() => normalizePublicHttpUrl('http://localhost:3000'), /public/i)
  assert.throws(() => normalizePublicHttpUrl('http://127.0.0.1:3000'), /public/i)
})

test('resolves redirects against the previous public URL and rejects unsafe targets', () => {
  const base = normalizePublicHttpUrl('https://example.com/products/demo')

  assert.equal(resolveRedirectUrl(base, '/next').href, 'https://example.com/next')
  assert.throws(() => resolveRedirectUrl(base, 'http://localhost/admin'), /public/i)
  assert.throws(() => resolveRedirectUrl(base, 'file:///tmp/secret'), /http/i)
})

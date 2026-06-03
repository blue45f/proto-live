import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JsonProjectsStore } from '../src/projects/projects.store'

test('checkReadiness reports ready for a writable dir with no store file yet', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-ready-'))
  try {
    const store = new JsonProjectsStore(join(dir, 'store.json'))
    assert.deepEqual(store.checkReadiness(), { ready: true, store: 'ok' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('checkReadiness reports ready for a writable dir with a valid store file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-ready-'))
  const filePath = join(dir, 'store.json')
  try {
    const store = new JsonProjectsStore(filePath)
    store.write(store.read())
    assert.deepEqual(store.checkReadiness(), { ready: true, store: 'ok' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('checkReadiness reports unreadable for a corrupt store file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protolive-ready-'))
  const filePath = join(dir, 'store.json')
  writeFileSync(filePath, '{ not valid json', 'utf8')
  try {
    const store = new JsonProjectsStore(filePath)
    const result = store.checkReadiness()
    assert.equal(result.ready, false)
    assert.equal(result.store, 'unreadable')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

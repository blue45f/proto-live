import { describe, expect, it } from 'vitest'
import { resolveRoleLabel, listTestAccounts } from './local-auth'

describe('local-auth', () => {
  it('maps known roles to Korean labels', () => {
    expect(resolveRoleLabel('maker')).toBe('창업자')
    expect(resolveRoleLabel('investor')).toBe('투자자')
    expect(resolveRoleLabel('admin')).toBe('운영자')
  })

  it('falls back to the generic member label for unknown roles', () => {
    expect(resolveRoleLabel('member' as never)).toBe('일반 회원')
  })

  it('returns test accounts sorted by id', () => {
    const accounts = listTestAccounts()
    const ids = accounts.map((a) => a.id)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})

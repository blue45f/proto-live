import testAccounts from './data/test-accounts.json';
import type { AuthRole, AuthSession } from './api';

export type { AuthRole, AuthSession };

export interface TestAccount {
  id: number;
  email: string;
  password: string;
  role: AuthRole;
  name: string;
  description?: string;
  notes?: string;
}

export function readSession(): AuthSession | null {
  return null;
}

export function clearSession() {
  return;
}

export function resolveRoleLabel(role: AuthRole) {
  if (role === 'maker') return '창업자';
  if (role === 'investor') return '투자자';
  if (role === 'admin') return '운영자';
  return '일반 회원';
}

export function listTestAccounts() {
  return [...(testAccounts.accounts as TestAccount[])].sort((a, b) => a.id - b.id);
}

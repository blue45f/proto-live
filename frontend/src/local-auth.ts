import testAccounts from './data/test-accounts.json';

export type AuthRole = 'maker' | 'investor' | 'member' | 'admin';

export interface TestAccount {
  id: number;
  email: string;
  password: string;
  role: AuthRole;
  name: string;
  description?: string;
  notes?: string;
}

export interface AuthSession {
  id: number;
  email: string;
  role: AuthRole;
  name: string;
}

const AUTH_SESSION_STORAGE_KEY = 'protolive:session:v1';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function readSessionRaw() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    const email = typeof parsed.email === 'string' ? normalizeEmail(parsed.email) : null;
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const role =
      parsed.role === 'investor' || parsed.role === 'member' || parsed.role === 'admin'
        ? parsed.role
        : 'maker';

    if (!email || !name) {
      return null;
    }

    return { id: Number(parsed.id) || 0, email, role, name } as AuthSession;
  } catch {
    return null;
  }
}

export function readSession(): AuthSession | null {
  return readSessionRaw();
}

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function resolveRoleLabel(role: AuthRole) {
  if (role === 'maker') return '창업자';
  if (role === 'investor') return '투자자';
  if (role === 'admin') return '운영자';
  return '일반 회원';
}

export function authenticateUser(email: string, password: string): AuthSession | null {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return null;
  }

  const account = (testAccounts.accounts as TestAccount[]).find(
    (entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === normalizedPassword,
  );

  if (!account) {
    return null;
  }

  return {
    id: account.id,
    email: account.email,
    role: account.role,
    name: account.name,
  };
}

export function listTestAccounts() {
  return [...(testAccounts.accounts as TestAccount[])].sort((a, b) => a.id - b.id);
}

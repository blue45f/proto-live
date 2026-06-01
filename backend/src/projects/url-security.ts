import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const LOCAL_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

export function isPrivateAddress(address: string): boolean {
  const normalized = address
    .trim()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split('%')[0]
    .toLowerCase();

  if (normalized.startsWith('::ffff:')) {
    return isPrivateAddress(normalized.slice(7));
  }

  const version = isIP(normalized);
  if (version === 4) {
    const octets = normalized.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
      return true;
    }

    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (version === 6) {
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }

  return true;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/\.$/, '').toLowerCase();
}

export function normalizePublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('URL must be a valid absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must use http or https.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URL credentials are not allowed.');
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname || LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) {
    throw new Error('URL must target a public internet host.');
  }

  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('URL must target a public internet host.');
  }

  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new Error('URL must target a public internet host.');
  }

  return parsed;
}

export function resolveRedirectUrl(baseUrl: URL, locationHeader?: string): URL {
  if (!locationHeader) {
    throw new Error('Redirect response did not include a Location header.');
  }

  return normalizePublicHttpUrl(new URL(locationHeader, baseUrl).href);
}

export async function assertResolvesToPublicInternet(url: URL): Promise<void> {
  const hostname = normalizeHostname(url.hostname);

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error('URL resolves to a private network address.');
    }
    return;
  }

  const records = await lookup(hostname, { all: true, verbatim: false });
  if (records.length === 0) {
    throw new Error('URL host did not resolve.');
  }

  const blocked = records.find((record) => isPrivateAddress(record.address));
  if (blocked) {
    throw new Error('URL resolves to a private network address.');
  }
}


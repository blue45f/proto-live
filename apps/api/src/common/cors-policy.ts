function isLocalFrontendOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.endsWith('.localhost');
  } catch {
    return false;
  }
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
  nodeEnv = process.env.NODE_ENV,
): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return nodeEnv !== 'production' && isLocalFrontendOrigin(origin);
}

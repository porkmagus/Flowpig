function splitAndTrim(value?: string): string[] {
  return value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function withHttp(origin: string) {
  return stripTrailingSlash(origin.startsWith('http') ? origin : `http://${origin}`);
}

function requireInProduction(name: string, value?: string) {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} must be set in production`);
  }

  return value;
}

export function getTrustedOrigins() {
  if (process.env.NODE_ENV !== 'production') {
    const configured = splitAndTrim(process.env.APP_URL).map(withHttp);
    const ports = ['5173', '5174', '5175', '5176', '5177', '4173', '3000'];
    const hosts = ['localhost', '127.0.0.1'];
    const origins = new Set(configured);

    for (const host of hosts) {
      for (const port of ports) {
        origins.add(`http://${host}:${port}`);
      }
    }

    return [...origins];
  }

  const origins = splitAndTrim(requireInProduction('APP_URL', process.env.APP_URL));
  if (origins.length === 0) {
    throw new Error('APP_URL must include at least one origin in production');
  }

  return origins;
}

export function getPrimaryAppUrl() {
  return getTrustedOrigins()[0] || 'http://localhost:5173';
}

export function getApiBaseUrl() {
  const configuredValue = process.env.BETTER_AUTH_URL || process.env.API_URL;
  const configured = configuredValue ? stripTrailingSlash(configuredValue) : undefined;
  const fallback = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3001';

  return requireInProduction('BETTER_AUTH_URL or API_URL', configured) || fallback;
}

export function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
  const fallback = process.env.NODE_ENV === 'production'
    ? undefined
    : 'dev_secret_not_secure_but_fine_for_local_development';

  return requireInProduction('BETTER_AUTH_SECRET', secret) || fallback;
}

export function getStoragePublicUrl() {
  const configured = process.env.STORAGE_PUBLIC_URL
    ? stripTrailingSlash(process.env.STORAGE_PUBLIC_URL)
    : undefined;
  if (configured) {
    return configured;
  }

  const apiBaseUrl = process.env.API_URL ? stripTrailingSlash(process.env.API_URL) : undefined;
  return apiBaseUrl ? `${apiBaseUrl}/uploads` : '/uploads';
}

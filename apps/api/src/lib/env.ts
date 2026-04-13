function splitAndTrim(value?: string) {
  return value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

function stripTrailingSlash(value?: string) {
  return value?.replace(/\/+$/, '');
}

function requireInProduction(name: string, value?: string) {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} must be set in production`);
  }

  return value;
}

export function getTrustedOrigins() {
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }

  const origins = splitAndTrim(requireInProduction('APP_URL', process.env.APP_URL));
  if (origins.length === 0) {
    throw new Error('APP_URL must include at least one origin in production');
  }

  return origins;
}

export function getPrimaryAppUrl() {
  return getTrustedOrigins()[0];
}

export function getApiBaseUrl() {
  const configured = stripTrailingSlash(process.env.BETTER_AUTH_URL || process.env.API_URL);
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
  const configured = stripTrailingSlash(process.env.STORAGE_PUBLIC_URL);
  if (configured) {
    return configured;
  }

  const apiBaseUrl = stripTrailingSlash(process.env.API_URL);
  return apiBaseUrl ? `${apiBaseUrl}/uploads` : '/uploads';
}

/**
 * Return-path preservation for the public prompt detail page (/p/:id).
 *
 * Detail pages are reachable directly, from the prompt library (/prompts) and
 * from the dashboard (/dashboard). To let the "back" affordance restore the
 * visitor's filters without ever becoming an open redirect, only root-relative
 * paths inside those two local studio routes are accepted; everything else
 * (protocol URLs, protocol-relative URLs, unknown routes, hashes) falls back to
 * the public catalog.
 */

export const DEFAULT_RETURN_TO = '/prompts';

/** Local studio routes a detail page may return to. */
const LOCAL_RETURN_PATHS = ['/prompts', '/dashboard'];

/** Query keys that carry library filters we want to preserve. */
const ALLOWED_QUERY_KEYS = new Set(['q', 'category', 'tags', 'usage']);

const MAX_LENGTH = 512;

function stripTrailingSlashes(pathname: string): string {
  if (pathname.length <= 1) return pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Validates an untrusted candidate into a known local path, or returns
 * `undefined` when it must be rejected.
 */
export function sanitizeReturnTo(candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') return undefined;

  const value = candidate.trim();
  if (!value || value.length > MAX_LENGTH) return undefined;

  // Root-relative single-slash paths only — rejects absolute URLs plus
  // protocol-relative ("//host") and backslash-smuggled variants.
  if (!value.startsWith('/')) return undefined;
  if (value.startsWith('//') || value.startsWith('/\\')) return undefined;
  if (value.includes('\\')) return undefined;

  // Reject anything carrying a scheme (http:, javascript:, data:, ...) and
  // raw control characters.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return undefined;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return undefined;

  // Drop the fragment, then split path from query.
  const withoutHash = value.split('#')[0];
  const queryIndex = withoutHash.indexOf('?');
  const rawPath = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1);

  const pathname = stripTrailingSlashes(rawPath);
  if (!LOCAL_RETURN_PATHS.includes(pathname)) return undefined;

  const params = new URLSearchParams(rawQuery);
  const safe = new URLSearchParams();
  params.forEach((paramValue, key) => {
    if (ALLOWED_QUERY_KEYS.has(key)) safe.append(key, paramValue);
  });

  const query = safe.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Resolves the destination used by detail-page "back" affordances.
 * Reads `location.state.returnTo` (React Router) and always returns a safe
 * local path, defaulting to the public catalog.
 */
export function resolveReturnTo(state: unknown): string {
  if (state && typeof state === 'object') {
    const candidate = (state as { returnTo?: unknown }).returnTo;
    const safe = sanitizeReturnTo(candidate);
    if (safe) return safe;
  }
  return DEFAULT_RETURN_TO;
}

/** Builds the returnTo payload for links that navigate to a detail page. */
export function buildReturnTo(pathname: string, search = ''): string | undefined {
  return sanitizeReturnTo(`${pathname}${search}`);
}

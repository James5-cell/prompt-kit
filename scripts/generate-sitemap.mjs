/**
 * generate-sitemap.mjs
 *
 * Build-time sitemap generator for Prompt Kit.
 * Queries Firestore for all published, non-deleted prompts and writes
 * a complete sitemap.xml into public/ before the Vite build runs.
 *
 * Usage (standalone):
 *   node scripts/generate-sitemap.mjs
 *
 * Usage (integrated — see package.json "prebuild" script):
 *   npm run build  →  runs generate-sitemap automatically before vite build
 *
 * Requirements:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON, OR
 *   - FIREBASE_SERVICE_ACCOUNT env var containing the JSON string directly.
 *   - No new npm packages: uses firebase-admin (already in dependencies).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Placeholders for dynamic firebase-admin imports
let initializeApp, cert, getApps, getFirestore;

// ─── Constants ───────────────────────────────────────────────────────────────

const CANONICAL_DOMAIN = 'https://www.205011.xyz';
const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../public/sitemap.xml');
const FIREBASE_PROJECT_ID = 'prompt-kit-7a67e';

/** Status values treated as publicly visible (mirrors isPublishedStatus in promptService.ts) */
const PUBLISHED_STATUSES = new Set(['published', 'active']);

// ─── Static routes ───────────────────────────────────────────────────────────

/** @type {Array<{ url: string; priority: string; changefreq: string; lastmod: string }>} */
const STATIC_ROUTES = [
  {
    url: `${CANONICAL_DOMAIN}/`,
    priority: '1.0',
    changefreq: 'weekly',
    lastmod: new Date().toISOString().split('T')[0],
  },
  {
    url: `${CANONICAL_DOMAIN}/prompts`,
    priority: '0.9',
    changefreq: 'daily',
    lastmod: new Date().toISOString().split('T')[0],
  },
  {
    url: `${CANONICAL_DOMAIN}/about`,
    priority: '0.8',
    changefreq: 'monthly',
    lastmod: new Date().toISOString().split('T')[0],
  },
];

// ─── Firebase Admin init ─────────────────────────────────────────────────────

/**
 * Returns true if any credential source is available.
 * Does NOT throw — safe to call before initAdmin().
 */
function hasCredentials() {
  return (
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );
}

async function initAdmin() {
  const appMod = await import('firebase-admin/app');
  const firestoreMod = await import('firebase-admin/firestore');
  initializeApp = appMod.initializeApp;
  cert = appMod.cert;
  getApps = appMod.getApps;
  getFirestore = firestoreMod.getFirestore;

  if (getApps().length > 0) return;

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountEnv) {
    // Injected as a JSON string (e.g. in CI/CD secrets)
    const serviceAccount = JSON.parse(serviceAccountEnv);
    initializeApp({ credential: cert(serviceAccount) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Standard ADC path — reads the file automatically
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
  }
}

// ─── Firestore query ─────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string; updatedAt: FirebaseFirestore.Timestamp | number | null }} PublicPrompt
 */

/**
 * Fetches all published, non-deleted prompt IDs and their updatedAt timestamps.
 * Mirrors the logic in firebase.ts / promptService.ts — no new API patterns.
 *
 * @returns {Promise<PublicPrompt[]>}
 */
async function fetchPublishedPrompts() {
  const db = getFirestore();
  const snapshot = await db
    .collection('prompts')
    .orderBy('updatedAt', 'desc')
    .get();

  /** @type {PublicPrompt[]} */
  const results = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Filter: soft-deleted
    if (data.isDeleted === true) continue;

    // Filter: non-public visibility
    if (data.visibility === 'private' || data.visibility === 'team') continue;

    // Filter: unpublished status
    const status = data.status ?? 'active'; // legacy docs without status = active
    if (!PUBLISHED_STATUSES.has(status)) continue;

    results.push({
      id: doc.id,
      updatedAt: data.updatedAt ?? null,
    });
  }

  console.log(`[sitemap] Found ${results.length} published public prompts.`);
  return results;
}

// ─── XML builders ────────────────────────────────────────────────────────────

/**
 * Converts a Firestore Timestamp, Unix ms number, or null to an ISO date string.
 * @param {FirebaseFirestore.Timestamp | number | null} value
 * @returns {string}
 */
function toISODate(value) {
  if (!value) return new Date().toISOString().split('T')[0];
  if (typeof value === 'number') return new Date(value).toISOString().split('T')[0];
  // Firestore Timestamp object
  if (typeof value.toDate === 'function') return value.toDate().toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

/**
 * Escapes XML special characters in a URL string.
 * @param {string} url
 * @returns {string}
 */
function escapeXml(url) {
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Renders a single <url> entry.
 * @param {{ url: string; lastmod: string; changefreq: string; priority: string }} entry
 * @returns {string}
 */
function renderUrlEntry({ url, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

/**
 * Builds the complete sitemap XML string.
 * @param {PublicPrompt[]} prompts
 * @returns {string}
 */
function buildSitemapXml(prompts) {
  const staticEntries = STATIC_ROUTES.map(renderUrlEntry);

  const dynamicEntries = prompts.map((prompt) =>
    renderUrlEntry({
      url: `${CANONICAL_DOMAIN}/p/${prompt.id}`,
      lastmod: toISODate(prompt.updatedAt),
      changefreq: 'weekly',
      priority: '0.8',
    })
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...dynamicEntries,
    '</urlset>',
  ].join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[sitemap] Starting sitemap generation...');

  // Ensure public/ directory exists (it should, but guard anyway)
  mkdirSync(resolve(dirname(fileURLToPath(import.meta.url)), '../public'), { recursive: true });

  if (!hasCredentials()) {
    // No service account available (e.g. plain Vercel deploy without env var).
    // Write a static-only sitemap so the build always succeeds.
    console.warn(
      '[sitemap] ⚠️  No FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS found.\n' +
      '  Writing static-only sitemap (dynamic /p/* routes omitted).\n' +
      '  To enable full sitemap: set FIREBASE_SERVICE_ACCOUNT in your build environment.'
    );
    const xml = buildSitemapXml([]);
    writeFileSync(OUTPUT_PATH, xml, 'utf-8');
    console.log(`[sitemap] ✅ Written ${STATIC_ROUTES.length} static URLs to ${OUTPUT_PATH}`);
    return;
  }

  await initAdmin();

  const prompts = await fetchPublishedPrompts();
  const xml = buildSitemapXml(prompts);

  writeFileSync(OUTPUT_PATH, xml, 'utf-8');

  const totalUrls = STATIC_ROUTES.length + prompts.length;
  console.log(`[sitemap] ✅ Written ${totalUrls} URLs to ${OUTPUT_PATH}`);
}

// Never exit(1) during prebuild — a sitemap failure must not break the Vite build.
// The warning above is sufficient for debugging.
main().catch((err) => {
  console.error('[sitemap] ⚠️  Sitemap generation failed (build will continue):', err.message);
  // Write static-only fallback so sitemap.xml is at least partially valid
  try {
    mkdirSync(resolve(dirname(fileURLToPath(import.meta.url)), '../public'), { recursive: true });
    writeFileSync(OUTPUT_PATH, buildSitemapXml([]), 'utf-8');
    console.warn('[sitemap] Wrote static-only fallback sitemap.');
  } catch (_) {
    // If even the fallback write fails, just warn and continue
    console.warn('[sitemap] Could not write fallback sitemap — skipping.');
  }
  process.exit(0); // Always exit 0 so prebuild does not abort npm run build
});

/**
 * prerender-prompts.mjs
 *
 * Post-build prerender script for Prompt Kit.
 * Takes the compiled dist/index.html, replaces metadata/JSON-LD/noscript fallback,
 * and outputs dist/prompts.html and dist/prompts/index.html for static hosting SEO.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Placeholders for dynamic firebase-admin imports
let initializeApp, cert, getApps, getFirestore;

// ─── Constants ───────────────────────────────────────────────────────────────

const INPUT_HTML_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/index.html');
const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/prompts');
const OUTPUT_INDEX_PATH = resolve(OUTPUT_DIR, 'index.html');
const OUTPUT_FILE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/prompts.html');

const CANONICAL_DOMAIN = 'https://www.205011.xyz';
const PUBLISHED_STATUSES = new Set(['published', 'active']);

const FALLBACK_PROMPTS = [
  {
    title: 'Python 代碼優化器 (Python Code Optimizer)',
    summary: '優化 Python 程式碼的效能、可讀性，並符合 PEP 8 規範。',
    category: '開發與編程',
    tagNames: ['Python', 'Code Quality', 'Optimization'],
  },
  {
    title: 'SEO 文章大綱生成器 (SEO Article Outline Builder)',
    summary: '根據關鍵字與目標受眾，自動規劃高點閱、符合 SEO 的結構化文章大綱。',
    category: '日常寫作與內容創作',
    tagNames: ['SEO', 'Content', 'Writing'],
  },
  {
    title: '每日新聞摘要助理 (Daily News Summarizer)',
    summary: '從長篇新聞或多個來源中，提煉出客觀、結構化的重點摘要。',
    category: '新聞分析與資訊整合',
    tagNames: ['News', 'Summary', 'Analysis'],
  },
  {
    title: 'React 乾淨代碼設計指南 (React Clean Code Guide)',
    summary: '評估 React 元件，提供符合最佳實踐的重構建議。',
    category: '技術棧與系統架構',
    tagNames: ['React', 'TypeScript', 'Clean Code'],
  },
  {
    title: '系統架構評審專家 (System Architecture Reviewer)',
    summary: '分析分散式系統架構，提出關於擴展性、安全性與可用性的優化建議。',
    category: '技術棧與系統架構',
    tagNames: ['Architecture', 'Cloud', 'System Design'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    const serviceAccount = JSON.parse(serviceAccountEnv);
    initializeApp({ credential: cert(serviceAccount) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
  }
}

async function fetchPublishedPrompts() {
  if (!hasCredentials()) {
    console.log('[prerender] No credentials found. Using fallback prompts.');
    return FALLBACK_PROMPTS;
  }

  try {
    await initAdmin();
    const db = getFirestore();
    const snapshot = await db
      .collection('prompts')
      .orderBy('updatedAt', 'desc')
      .get();

    const results = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.isDeleted === true) continue;
      if (data.visibility === 'private' || data.visibility === 'team') continue;
      const status = data.status ?? 'active';
      if (!PUBLISHED_STATUSES.has(status)) continue;

      results.push({
        title: data.title || 'Untitled Prompt',
        summary: data.summary || '',
        category: data.category || 'General',
        tagNames: data.tagNames || [],
      });
    }

    console.log(`[prerender] Fetched ${results.length} public prompts from Firestore.`);
    return results.length > 0 ? results : FALLBACK_PROMPTS;
  } catch (error) {
    console.error('[prerender] Failed to fetch prompts from Firestore:', error.message);
    return FALLBACK_PROMPTS;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[prerender] Starting prompts page prerendering...');

  if (!existsSync(INPUT_HTML_PATH)) {
    console.error(`[prerender] Input template not found at ${INPUT_HTML_PATH}. Run 'npm run build' first.`);
    process.exit(1);
  }

  let html = readFileSync(INPUT_HTML_PATH, 'utf-8');

  // 1. Metadata Replacements
  html = html.replace(
    /<title>.*?<\/title>/,
    '<title>Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit</title>'
  );

  html = html.replace(
    /<meta name="description" content=".*?" \/>/,
    '<meta name="description" content="瀏覽 Postsoma-2050 公開整理的 AI prompts，涵蓋開發、寫作、學習、新聞分析、技術棧、架構設計與知識管理等場景。" />'
  );

  html = html.replace(
    /<link rel="canonical" href=".*?" \/>/,
    '<link rel="canonical" href="https://www.205011.xyz/prompts" />'
  );

  // Open Graph replacements
  html = html.replace(
    /<meta property="og:url" content=".*?" \/>/,
    '<meta property="og:url" content="https://www.205011.xyz/prompts" />'
  );
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/,
    '<meta property="og:title" content="Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit" />'
  );
  html = html.replace(
    /<meta property="og:description" content=".*?" \/>/,
    '<meta property="og:description" content="瀏覽 Postsoma-2050 公開整理的 AI prompts，涵蓋開發、寫作、學習、新聞分析、技術棧、架構設計與知識管理等場景。" />'
  );

  // Twitter replacements
  html = html.replace(
    /<meta name="twitter:title" content=".*?" \/>/,
    '<meta name="twitter:title" content="Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit" />'
  );
  html = html.replace(
    /<meta name="twitter:description" content=".*?" \/>/,
    '<meta name="twitter:description" content="瀏覽 Postsoma-2050 公開整理的 AI prompts，涵蓋開發、寫作、學習、新聞分析、技術棧、架構設計與知識管理等場景。" />'
  );

  // 2. JSON-LD replacement with CollectionPage
  const jsonLdContent = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://www.205011.xyz/#website",
          "name": "Prompt Kit",
          "url": "https://www.205011.xyz/",
          "description": "Prompt Kit 是一個用來整理、重用與優化 AI Prompts 的知識庫和工作流工具。"
        },
        {
          "@type": "CollectionPage",
          "@id": "https://www.205011.xyz/prompts#webpage",
          "url": "https://www.205011.xyz/prompts",
          "name": "Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit",
          "description": "瀏覽 Postsoma-2050 公開整理的 AI prompts，涵蓋開發、寫作、學習、新聞分析、技術棧、架構設計與知識管理等場景。",
          "isPartOf": {
            "@id": "https://www.205011.xyz/#website"
          },
          "inLanguage": "zh-Hant"
        }
      ]
    }
    </script>
  `.trim();

  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    jsonLdContent
  );

  // 3. Noscript replacement with dynamic prompt catalog
  const prompts = await fetchPublishedPrompts();
  
  const promptsHtmlList = prompts.map(p => `
      <article style="border: 1px solid #2d2d2d; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #1e1e1e;">
        <h3 style="margin-top: 0; color: #60a5fa;">${escapeHtml(p.title)}</h3>
        <p style="color: #d1d5db;">${escapeHtml(p.summary)}</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
          <span style="font-size: 12px; background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px;">${escapeHtml(p.category)}</span>
          ${p.tagNames.map(tag => `<span style="font-size: 12px; background-color: #374151; color: #d1d5db; padding: 2px 8px; border-radius: 4px;">#${escapeHtml(tag)}</span>`).join('\n          ')}
        </div>
      </article>
  `).join('\n');

  const noscriptContent = `
    <noscript>
      <h1>Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit</h1>
      <p>瀏覽 Postsoma-2050 公開整理的 AI prompts，涵蓋開發、寫作、學習、新聞分析、技術棧、架構設計與知識管理等場景。</p>
      
      <section>
        <h2>熱門分類 (Categories)</h2>
        <ul>
          <li>開發與編程 (Development & Programming)</li>
          <li>日常寫作與內容創作 (Writing & Content Creation)</li>
          <li>新聞分析與資訊整合 (News Analysis & Info Synthesis)</li>
          <li>技術棧與系統架構 (Tech Stack & Architecture)</li>
          <li>學習與知識管理 (Learning & Knowledge Management)</li>
        </ul>
      </section>

      <section>
        <h2>公開 Prompt 列表 (Public Prompts)</h2>
        <div style="display: grid; gap: 16px; margin-top: 16px;">
          ${promptsHtmlList}
        </div>
      </section>
    </noscript>
  `.trim();

  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    noscriptContent
  );

  // 4. Output write
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_INDEX_PATH, html, 'utf-8');
  writeFileSync(OUTPUT_FILE_PATH, html, 'utf-8');

  console.log(`[prerender] ✅ Prerendered prompts page saved to:`);
  console.log(`  - ${OUTPUT_INDEX_PATH}`);
  console.log(`  - ${OUTPUT_FILE_PATH}`);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main().catch((err) => {
  console.error('[prerender] Prerender process failed:', err);
  process.exit(1);
});

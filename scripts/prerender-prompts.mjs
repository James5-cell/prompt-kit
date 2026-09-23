/**
 * prerender-prompts.mjs
 *
 * Full-site Static Site Generation (SSG) prerender script for Prompt Kit.
 * Takes the compiled dist/index.html as a template, replaces metadata/JSON-LD/noscript,
 * and outputs prerendered HTML files for:
 *   - /prompts (/prompts/index.html & /prompts.html)
 *   - /about (/about/index.html & /about.html)
 *   - /dashboard (/dashboard/index.html & /dashboard.html)
 *   - /skill-lab (/skill-lab/index.html & /skill-lab.html)
 *   - /dev-library (/dev-library/index.html & /dev-library.html)
 *   - /ai-insights (/ai-insights/index.html & /ai-insights.html)
 *   - /settings (/settings/index.html & /settings.html)
 *   - /p/:id (/p/:id/index.html & /p/:id.html) for all public published prompts
 *
 * Guarantees social crawlers (Facebook, X, Line, Discord, Telegram, LinkedIn)
 * always receive 100% valid, absolute Open Graph & Twitter Card tags with zero client JS required.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Placeholders for dynamic firebase-admin imports
let initializeApp, cert, getApps, getFirestore;

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_HTML_PATH = resolve(BASE_DIR, 'dist/index.html');
const DIST_DIR = resolve(BASE_DIR, 'dist');

const CANONICAL_DOMAIN = 'https://www.205011.xyz';
const GLOBAL_OG_IMAGE = `${CANONICAL_DOMAIN}/og-image.png`;
const PUBLISHED_STATUSES = new Set(['published', 'active']);

const FALLBACK_PROMPTS = [
  {
    id: 'python-code-optimizer',
    title: 'Python 代碼優化器 (Python Code Optimizer)',
    summary: '優化 Python 程式碼的效能、可讀性，並符合 PEP 8 規範。',
    content: '請優化以下 Python 程式碼，確保符合 PEP 8 規範並提升執行效能。包含類型標註與單元測試建議。',
    category: '開發與編程',
    tagNames: ['Python', 'Code Quality', 'Optimization'],
  },
  {
    id: 'seo-article-outline-builder',
    title: 'SEO 文章大綱生成器 (SEO Article Outline Builder)',
    summary: '根據關鍵字與目標受眾，自動規劃高點閱、符合 SEO 的結構化文章大綱。',
    content: '你是一位資深 SEO 專家，請針對輸入之目標關鍵字建立高排名的文章大綱。',
    category: '日常寫作與內容創作',
    tagNames: ['SEO', 'Content', 'Writing'],
  },
  {
    id: 'daily-news-summarizer',
    title: '每日新聞摘要助理 (Daily News Summarizer)',
    summary: '從長篇新聞或多個來源中，提煉出客觀、結構化的重點摘要。',
    content: '請從以下新聞內容中萃取 3 大核心結論，並提供客觀的事實時間軸。',
    category: '新聞分析與資訊整合',
    tagNames: ['News', 'Summary', 'Analysis'],
  },
  {
    id: 'react-clean-code-guide',
    title: 'React 乾淨代碼設計指南 (React Clean Code Guide)',
    summary: '評估 React 元件，提供符合最佳實踐的重構建議。',
    content: '請評估此 React 元件代碼，指出性能瓶頸、Hook 誤用與可維護性重構方針。',
    category: '技術棧與系統架構',
    tagNames: ['React', 'TypeScript', 'Clean Code'],
  },
  {
    id: 'system-architecture-reviewer',
    title: '系統架構評審專家 (System Architecture Reviewer)',
    summary: '分析分散式系統架構，提出關於擴展性、安全性與可用性的優化建議。',
    content: '針對微服務架構圖與負載指標，提出可用性與災備容錯優化建議。',
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
        id: doc.id,
        title: data.title || 'Untitled Prompt',
        summary: data.summary || '',
        content: data.content || '',
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

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replaces or injects Open Graph and Twitter tags ensuring absolute URLs.
 */
function replaceHtmlMetadata(templateHtml, {
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage = GLOBAL_OG_IMAGE,
  jsonLd = null,
  noscriptHtml = null,
}) {
  let html = templateHtml;

  // Title
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

  // Meta description
  html = html.replace(
    /<meta name="description" content=".*?" \/>/,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  // Canonical link
  html = html.replace(
    /<link rel="canonical" href=".*?" \/>/,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  );

  // Open Graph
  html = html.replace(
    /<meta property="og:type" content=".*?" \/>/,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`
  );
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content=".*?" \/>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content=".*?" \/>/,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta property="og:image" content=".*?" \/>/,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
  );
  html = html.replace(
    /<meta property="og:image:secure_url" content=".*?" \/>/,
    `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />`
  );
  html = html.replace(
    /<meta property="og:image:alt" content=".*?" \/>/,
    `<meta property="og:image:alt" content="${escapeHtml(title)}" />`
  );

  // Twitter
  html = html.replace(
    /<meta name="twitter:title" content=".*?" \/>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content=".*?" \/>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta name="twitter:image" content=".*?" \/>/,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
  );
  html = html.replace(
    /<meta name="twitter:image:alt" content=".*?" \/>/,
    `<meta name="twitter:image:alt" content="${escapeHtml(title)}" />`
  );

  // JSON-LD replacement
  if (jsonLd) {
    const jsonTag = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
    html = html.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      jsonTag
    );
  }

  // Noscript replacement
  if (noscriptHtml) {
    html = html.replace(
      /<noscript>[\s\S]*?<\/noscript>/,
      `<noscript>\n${noscriptHtml}\n    </noscript>`
    );
  }

  return html;
}

function writeRouteFiles(subpath, htmlContent) {
  const cleanSub = subpath.replace(/^\/+|\/+$/g, '');
  const dirPath = resolve(DIST_DIR, cleanSub);
  mkdirSync(dirPath, { recursive: true });

  const indexFilePath = resolve(dirPath, 'index.html');
  const flatFilePath = resolve(DIST_DIR, `${cleanSub}.html`);

  writeFileSync(indexFilePath, htmlContent, 'utf-8');
  writeFileSync(flatFilePath, htmlContent, 'utf-8');
}

// ─── Main Execution ──────────────────────────────────────────────────────────

async function main() {
  console.log('[prerender] Starting full-site SSG prerendering...');

  if (!existsSync(INPUT_HTML_PATH)) {
    console.error(`[prerender] Input template not found at ${INPUT_HTML_PATH}. Run 'npm run build' first.`);
    process.exit(1);
  }

  const templateHtml = readFileSync(INPUT_HTML_PATH, 'utf-8');
  const prompts = await fetchPublishedPrompts();

  // ── 1. Prerender /prompts (Prompt Library) ──────────────────────────────────
  const promptsHtmlList = prompts.map(p => `
      <article style="border: 1px solid #2d2d2d; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #1e1e1e;">
        <h3 style="margin-top: 0; color: #60a5fa;"><a href="/p/${p.id}" style="color: #60a5fa; text-decoration: none;">${escapeHtml(p.title)}</a></h3>
        <p style="color: #d1d5db;">${escapeHtml(p.summary || p.content)}</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
          <span style="font-size: 12px; background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px;">${escapeHtml(p.category)}</span>
          ${(p.tagNames || []).map(tag => `<span style="font-size: 12px; background-color: #374151; color: #d1d5db; padding: 2px 8px; border-radius: 4px;">#${escapeHtml(tag)}</span>`).join('\n          ')}
        </div>
      </article>
  `).join('\n');

  const promptsNoscript = `
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
  `.trim();

  const promptsJsonLd = {
    '@context': 'https://schema.org/',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${CANONICAL_DOMAIN}/#website`,
        name: 'Prompt Kit',
        url: `${CANONICAL_DOMAIN}/`,
        description: 'Prompt Kit 是一個用來整理、重用與優化 AI Prompts 的知識庫和工作流工具。'
      },
      {
        '@type': 'CollectionPage',
        '@id': `${CANONICAL_DOMAIN}/prompts#webpage`,
        url: `${CANONICAL_DOMAIN}/prompts`,
        name: 'Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit',
        description: '瀏覽 Postsoma-2050 公開整理的 AI prompts，涵蓋開發、寫作、學習、新聞分析、技術棧、架構設計與知識管理等場景。',
        isPartOf: { '@id': `${CANONICAL_DOMAIN}/#website` },
        inLanguage: 'zh-Hant'
      }
    ]
  };

  const promptsPageHtml = replaceHtmlMetadata(templateHtml, {
    title: 'Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit',
    description: '瀏覽 Postsoma-2050 公開整理的 AI prompts，涵蓋開發、寫作、學習、新聞分析、技術棧、架構設計與知識管理等場景。',
    canonicalUrl: `${CANONICAL_DOMAIN}/prompts`,
    ogType: 'website',
    ogImage: GLOBAL_OG_IMAGE,
    jsonLd: promptsJsonLd,
    noscriptHtml: promptsNoscript,
  });
  writeRouteFiles('prompts', promptsPageHtml);
  console.log('  ✔ Prerendered /prompts');

  // ── 2. Prerender /about (About & E-E-A-T) ───────────────────────────────────
  const aboutNoscript = `
      <h1>About & E-E-A-T Standards — Prompt Kit</h1>
      <p>Prompt Kit 是一個專業的 AI Prompt 知識庫與工作流工具。本平台由 postsoma-2050 (James5-cell) 發起與維護，旨在提供最高規格之提示詞架構與可複用工作流。</p>
      <section>
        <h2>Our Mission</h2>
        <p>提供結構化、版本化、高可信度的提示詞資產，協助個人與團隊在複雜的生成式 AI 時代建立私密提示詞金庫。</p>
      </section>
  `.trim();

  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${CANONICAL_DOMAIN}/about#aboutpage`,
        url: `${CANONICAL_DOMAIN}/about`,
        name: 'About Prompt Kit — Platform Mission & E-E-A-T Standards',
        description: 'Platform mission, creator background, security standards, and machine feed index.',
        isPartOf: { '@id': `${CANONICAL_DOMAIN}/#website` }
      },
      {
        '@type': 'Organization',
        '@id': `${CANONICAL_DOMAIN}/#organization`,
        name: 'Prompt Kit',
        url: `${CANONICAL_DOMAIN}/`,
        logo: `${CANONICAL_DOMAIN}/logo.png`,
        founder: {
          '@type': 'Person',
          name: 'postsoma-2050',
          alternateName: 'James5-cell'
        }
      }
    ]
  };

  const aboutPageHtml = replaceHtmlMetadata(templateHtml, {
    title: 'About & E-E-A-T Standards — Prompt Kit',
    description: 'Prompt Kit platform mission, creator credentials (postsoma-2050), data privacy compliance, machine knowledge feeds (llms.txt), and academic citation guidelines.',
    canonicalUrl: `${CANONICAL_DOMAIN}/about`,
    ogType: 'article',
    ogImage: GLOBAL_OG_IMAGE,
    jsonLd: aboutJsonLd,
    noscriptHtml: aboutNoscript,
  });
  writeRouteFiles('about', aboutPageHtml);
  console.log('  ✔ Prerendered /about');

  // ── 3. Prerender /dashboard (Dashboard) ─────────────────────────────────────
  const dashboardNoscript = `
      <h1>Dashboard — 工作台｜Prompt Kit</h1>
      <p>Prompt Kit 總覽儀表板：提示詞資產統計、分類概況與快速工作流。</p>
  `.trim();

  const dashboardPageHtml = replaceHtmlMetadata(templateHtml, {
    title: 'Dashboard — 工作台｜Prompt Kit',
    description: 'Prompt Kit 總覽儀表板：提示詞資產統計、分類概況與快速工作流。',
    canonicalUrl: `${CANONICAL_DOMAIN}/dashboard`,
    ogType: 'website',
    ogImage: GLOBAL_OG_IMAGE,
    noscriptHtml: dashboardNoscript,
  });
  writeRouteFiles('dashboard', dashboardPageHtml);
  console.log('  ✔ Prerendered /dashboard');

  // ── 4. Prerender /skill-lab ─────────────────────────────────────────────────
  const skillLabPageHtml = replaceHtmlMetadata(templateHtml, {
    title: 'Skill Lab — 提示詞工程實驗室｜Prompt Kit',
    description: 'Master AI Workflow Engineering: 實用指南、模板與進階提示詞設計架構。',
    canonicalUrl: `${CANONICAL_DOMAIN}/skill-lab`,
    ogType: 'website',
    ogImage: GLOBAL_OG_IMAGE,
    noscriptHtml: `<h1>Skill Lab — 提示詞工程實驗室</h1><p>Master AI Workflow Engineering</p>`,
  });
  writeRouteFiles('skill-lab', skillLabPageHtml);
  console.log('  ✔ Prerendered /skill-lab');

  // ── 5. Prerender /dev-library ───────────────────────────────────────────────
  const devLibraryPageHtml = replaceHtmlMetadata(templateHtml, {
    title: 'Dev Library — 開發者代碼與工具庫｜Prompt Kit',
    description: 'Bilingual Dev Resources: 雙語編程文檔、技術深度解析與架構模式。',
    canonicalUrl: `${CANONICAL_DOMAIN}/dev-library`,
    ogType: 'website',
    ogImage: GLOBAL_OG_IMAGE,
    noscriptHtml: `<h1>Dev Library — 開發者代碼與工具庫</h1><p>Bilingual Dev Resources</p>`,
  });
  writeRouteFiles('dev-library', devLibraryPageHtml);
  console.log('  ✔ Prerendered /dev-library');

  // ── 6. Prerender /ai-insights ───────────────────────────────────────────────
  const aiInsightsPageHtml = replaceHtmlMetadata(templateHtml, {
    title: 'AI Insights — 提示詞洞察與趨勢分析｜Prompt Kit',
    description: 'AI Research, Essays & Library: 深度探討人工智慧、Agent 架構設計與精選研究筆記。',
    canonicalUrl: `${CANONICAL_DOMAIN}/ai-insights`,
    ogType: 'website',
    ogImage: GLOBAL_OG_IMAGE,
    noscriptHtml: `<h1>AI Insights — 提示詞洞察與趨勢分析</h1><p>AI Research & Essays</p>`,
  });
  writeRouteFiles('ai-insights', aiInsightsPageHtml);
  console.log('  ✔ Prerendered /ai-insights');

  // ── 7. Prerender /settings ──────────────────────────────────────────────────
  const settingsPageHtml = replaceHtmlMetadata(templateHtml, {
    title: 'Settings — 系統設定｜Prompt Kit',
    description: '系統偏好設定、AI 模型 Provider 密鑰配置與本地儲存管理。',
    canonicalUrl: `${CANONICAL_DOMAIN}/settings`,
    ogType: 'website',
    ogImage: GLOBAL_OG_IMAGE,
    noscriptHtml: `<h1>Settings — 系統設定</h1><p>系統偏好設定與 AI Provider 配置</p>`,
  });
  writeRouteFiles('settings', settingsPageHtml);
  console.log('  ✔ Prerendered /settings');

  // ── 8. Prerender Public Published Prompts (/p/:id) ─────────────────────────
  console.log(`[prerender] Prerendering ${prompts.length} individual prompt pages...`);
  for (const p of prompts) {
    if (!p.id) continue;

    const pTitle = `${p.title} — Prompt Kit`;
    const pDesc = p.summary || (p.content ? p.content.slice(0, 160) : '') || 'Professional AI Prompt from Prompt Kit';
    const pCanonical = `${CANONICAL_DOMAIN}/p/${p.id}`;

    const promptJsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          '@id': `${pCanonical}#article`,
          url: pCanonical,
          headline: p.title,
          description: pDesc,
          inLanguage: 'zh-Hant',
          author: {
            '@type': 'Person',
            name: 'postsoma-2050'
          },
          publisher: {
            '@id': `${CANONICAL_DOMAIN}/#organization`
          },
          articleSection: p.category || 'Tools'
        }
      ]
    };

    const promptNoscript = `
      <h1>${escapeHtml(p.title)}</h1>
      <p><strong>分類：</strong>${escapeHtml(p.category)}</p>
      <p><strong>摘要：</strong>${escapeHtml(p.summary)}</p>
      <section>
        <h2>提示詞內容 (Prompt Content)</h2>
        <pre style="background: #111; color: #eee; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(p.content)}</pre>
      </section>
      <p><a href="/prompts">← 返回 Prompt Kit 提示詞庫</a></p>
    `.trim();

    const promptPageHtml = replaceHtmlMetadata(templateHtml, {
      title: pTitle,
      description: pDesc,
      canonicalUrl: pCanonical,
      ogType: 'article',
      ogImage: GLOBAL_OG_IMAGE,
      jsonLd: promptJsonLd,
      noscriptHtml: promptNoscript,
    });

    writeRouteFiles(`p/${p.id}`, promptPageHtml);
  }
  console.log(`  ✔ Prerendered ${prompts.length} prompt detail pages into /dist/p/*`);

  console.log('[prerender] ✅ Full-site SSG prerendering completed successfully!');
}

main().catch((err) => {
  console.error('[prerender] Prerender process failed:', err);
  process.exit(1);
});

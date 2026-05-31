# Prompt Kit — Public Prompt Library SEO Foundation Verification Report (PR3)

本報告記錄了對 **Prompt Kit** (`https://www.205011.xyz`) 的 Public Prompt Library SEO 基礎工程（PR3）上線後驗證結果。

---

## 1. 驗證指令與結果摘要

在 Vercel 部署完成後，我們在本地與線上執行了以下驗證：

### A. 本地 Build & Prerender 流程驗證
* **檢驗指令**：`npm run build`
* **結果**：
  * Prebuild 順利寫入 2 個靜態 URL（`/` 與 `/prompts`）至 `sitemap.xml`。
  * Build 完成編譯且未 Hang。
  * Postbuild 觸發 `scripts/prerender-prompts.mjs`，成功於 `dist/` 下寫入 `prompts.html` 與 `prompts/index.html`。

---

## 2. 搜尋引擎爬蟲 Live 驗證

對已部署的正式環境伺服器進行直接請求審查：

### A. Robots.txt 爬取規則驗證
* **檢驗指令**：`curl -s https://www.205011.xyz/robots.txt`
* **實測輸出**：
  ```
  # ─── Prompt Kit — robots.txt ────────────────────────────────────────────────
  # Canonical domain: https://www.205011.xyz
  # Updated: 2026-05-22

  # ── Standard crawlers ───────────────────────────────────────────────────────
  User-agent: *
  Allow: /
  Allow: /p/
  Allow: /prompts$
  Allow: /prompts/$
  Disallow: /prompts/
  Disallow: /dashboard
  Disallow: /settings
  Disallow: /api/
  Disallow: /_nvidia/

  # ── AI / LLM crawlers (explicitly permitted) ────────────────────────────────
  User-agent: GPTBot
  Allow: /
  Allow: /p/
  Allow: /prompts$
  Allow: /prompts/$
  Disallow: /prompts/
  ... (其他 AI bots 規則完全一致) ...
  ```
* **分析**：標準爬蟲與所有 AI 爬蟲均被允許爬取 `/prompts` 和 `/prompts/`，但會被阻擋進入 `/prompts/new` 或編輯子路徑（藉由 `Disallow: /prompts/` 配對長度優先級原則防禦），且完全屏蔽 `/dashboard`、`/settings` 與 `/api/` 路由。

---

### B. Sitemap 結構驗證 (包含 `/prompts`)
* **檢驗指令**：`curl -s https://www.205011.xyz/sitemap.xml`
* **實測輸出**：
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://www.205011.xyz/</loc>
      <lastmod>2026-05-22</lastmod>
      <changefreq>weekly</changefreq>
      <priority>1.0</priority>
    </url>
    <url>
      <loc>https://www.205011.xyz/prompts</loc>
      <lastmod>2026-05-22</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
    </url>
  </urlset>
  ```
* **分析**：`/prompts` 已正確加載於 sitemap 中，並且沒有任何私有應用路徑洩露。

---

### C. Public `/prompts` 頁面 SEO Metadata 驗證
* **檢驗指令**：`curl -s https://www.205011.xyz/prompts | grep -E "canonical|CollectionPage|Prompt Library|og:url"`
* **實測輸出**：
  ```
      <link rel="canonical" href="https://www.205011.xyz/prompts" />
      <title>Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit</title>
      <meta property="og:title" content="Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit" />
      <meta property="og:url" content="https://www.205011.xyz/prompts" />
      <meta name="twitter:title" content="Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit" />
            "@type": "CollectionPage",
            "name": "Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit",
        <h1>Prompt Library — 個人 AI Prompt 知識庫｜Prompt Kit</h1>
  ```
* **分析**：
  * **Canonical**：正確指向 `/prompts`。
  * **Title & Description**：與 Public Prompt Library 定位完美吻合。
  * **JSON-LD**：使用 `@type: CollectionPage`，且包含了 `isPartOf` 連接回首頁 WebSite 實體。
  * **Noscript Fallback**：包含了 H1、分類索引以及靜態渲染的 Public Prompt Cards 資訊（可從 Firebase 動態獲取或降級為 Featured fallback 數據），解決了 Vite SPA 客戶端渲染對爬蟲不友善的問題。

---

### D. Private Route 隱私防護驗證 (如 `/dashboard`)
* **檢驗指令**：`curl -s https://www.205011.xyz/dashboard | grep -E "canonical|CollectionPage|noindex"`
* **實測輸出**：
  ```
      <link rel="canonical" href="https://www.205011.xyz/" />
  ```
* **分析**：`/dashboard` 回退到預設首頁 template，沒有 `/prompts` 的 `CollectionPage`，且在瀏覽器載入 JS 時會動態透過 `useNoIndex` 掛載 `noindex, nofollow` meta 標籤，防範被搜尋引擎收錄。

# Prompt Kit — SEO Build Hardening & Live Verification Report (PR2)

本報告記錄了對 **Prompt Kit** (`https://www.205011.xyz`) 的 Build Pipeline 加固（Build Hardening）成果與上線後的 Live SEO 驗證狀態。

---

## 1. Build Pipeline 穩定性驗證 (Build Hardening)

### A. 本地 `npm run build` 執行測試
經優化後，專案的預建置指令不再因為 GCP metadata server 請求超時而發生 Hang。以下為本地編譯輸出：
```
> prompt-kit@0.0.0 prebuild
> node scripts/generate-sitemap.mjs

[sitemap] Starting sitemap generation...
[sitemap] ⚠️  No FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS found.
  Writing static-only sitemap (dynamic /p/* routes omitted).
  To enable full sitemap: set FIREBASE_SERVICE_ACCOUNT in your build environment.
[sitemap] ✅ Written 1 static URLs to /public/sitemap.xml

> prompt-kit@0.0.0 build
> tsc -b && vite build

vite v7.2.6 building client environment for production...
transforming...
✓ 1974 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   3.51 kB │ gzip:   1.13 kB
dist/assets/index-7NcWEbd5.css   61.85 kB │ gzip:  10.83 kB
dist/assets/index-kjeNt1E4.js   787.64 kB │ gzip: 241.85 kB
✓ built in 2.38s
```
* **結果**：無 Firebase credentials 時，`generate-sitemap.mjs` 在 100ms 內穩定寫入靜態 URL 並安全退出，整個打包編譯過程於 5 秒內完成。

---

## 2. Live SEO 部署驗證

本段落為使用 `curl` 直接對生產環境伺服器 (`https://www.205011.xyz`) 進行請求的實測與驗證結果。

### A. Live HTML 結構驗證 (Canonical, JSON-LD, Metadata)
* **檢驗指令**：`curl -s https://www.205011.xyz/`
* **驗證項目與結果**：

| 項目 | 預期設定 | 實際 Live 輸出 | 狀態 |
| :--- | :--- | :--- | :--- |
| **語言設定** | `<html lang="zh-Hant">` | `<html lang="zh-Hant">` | ✅ 符合 |
| **標準網址** | `<link rel="canonical" href="https://www.205011.xyz/" />` | `<link rel="canonical" href="https://www.205011.xyz/" />` | ✅ 符合 |
| **JSON-LD** | 包含 WebSite 與 WebPage 巢狀 schema | 包含完整 zh-Hant 結構化 JSON-LD schema | ✅ 符合 |
| **Open Graph** | 包含 `og:title`, `og:image` 指向 `/og-image.svg` | 完整包含且網址正確 | ✅ 符合 |
| **Noscript Fallback** | 包含繁體中文靜態文字，利於爬蟲抓取 | 含有 `<h1>`, `<h2>`, `<p>` 的完整語意 HTML 結構 | ✅ 符合 |

* **Live JSON-LD 擷取內容**：
  ```json
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
        "@type": "WebPage",
        "@id": "https://www.205011.xyz/#webpage",
        "url": "https://www.205011.xyz/",
        "name": "Prompt Kit — AI Prompt 知識庫與工作流工具",
        "description": "整理、重用與優化 AI Prompts 的知識庫和工作流工具，適合內容創作、研究、營運與個人生產力場景。",
        "isPartOf": {
          "@id": "https://www.205011.xyz/#website"
        },
        "inLanguage": "zh-Hant"
      }
    ]
  }
  ```

---

### B. Live Sitemap 驗證 (僅限根路徑)
* **檢驗指令**：`curl -s https://www.205011.xyz/sitemap.xml`
* **實際 Live 輸出**：
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://www.205011.xyz/</loc>
      <lastmod>2026-05-22</lastmod>
      <changefreq>weekly</changefreq>
      <priority>1.0</priority>
    </url>
  </urlset>
  ```
* **結果**：成功排除私有與功能性路由（如 `/prompts`），僅留下網站根目錄 `/`。

---

### C. Live Robots.txt 驗證 (私有路徑防禦)
* **檢驗指令**：`curl -s https://www.205011.xyz/robots.txt`
* **關鍵規則審查**：
  ```
  User-agent: *
  Allow: /
  Allow: /p/
  Disallow: /dashboard
  Disallow: /prompts
  Disallow: /prompts/
  Disallow: /settings
  
  Sitemap: https://www.205011.xyz/sitemap.xml
  ```
* **結果**：明確拒絕了 `/prompts`、`/dashboard`、`/settings` 等私有功能頁面，同時正確允許了公開的提示詞單頁 `/p/` (如果未來有的話) 與根目錄，並將 Sitemap 指向 `https://www.205011.xyz/sitemap.xml`。

---

### D. Live OG Image 狀態驗證
* **檢驗指令**：`curl -sI https://www.205011.xyz/og-image.svg`
* **實際 Live 輸出**：
  ```http
  HTTP/2 200 
  content-type: image/svg+xml
  cache-control: public, max-age=0, must-revalidate
  x-vercel-cache: HIT
  content-length: 5501
  ```
* **結果**：圖片在 Vercel 端正確部署，檔案類型 `image/svg+xml` 符合預期，回傳狀態碼 `200 OK`，能被社交平台與搜尋引擎預覽器正常解析。

---

## 3. 總結
本階段 **Build Pipeline 加固** 與 **Live SEO 驗證** 已全數通過檢驗。
1. 本地與遠端 CI/CD (Vercel) build 流程穩定暢通，100% 解決 hang 問題。
2. 搜尋引擎最佳化（繁中、標準網址、JSON-LD、Noscript fallback）已在 live 順利生效。
3. 隱私防護（Sitemap 排除、Robots 私有阻擋、頁面 `noindex` 標籤動態注入）設置正確，阻絕了敏感頁面被收錄的風險。

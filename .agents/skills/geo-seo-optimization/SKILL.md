---
name: geo-seo-optimization
description: Standardized rules, schemas, AI crawler policies, and E-E-A-T guidelines for Prompt Kit GEO (Generative Engine Optimization) and SEO.
---

# Prompt Kit GEO & SEO Standardization Guide

This document defines the core architecture and execution rules for Generative Engine Optimization (GEO) and Search Engine Optimization (SEO) across Prompt Kit (`https://www.205011.xyz`).

## 1. AI Crawler Permission Matrix (`robots.txt`)

All mainstream LLM and AI search engine crawlers MUST be explicitly permitted (`Allow: /`) for public content routes, while protecting sensitive internal operations:

- **Permitted AI Bots**: `GPTBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `anthropic-ai`, `Applebot-Extended`, `Google-Extended`, `GoogleOther`, `Amazonbot`, `Bytespider`, `CCBot`, `Diffbot`.
- **Public Allowed Routes**: `/`, `/prompts`, `/p/*`, `/about`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`.
- **Protected Internal Routes**: `/dashboard`, `/settings`, `/admin`, `/api/*`, `/_nvidia/`.

## 2. LLM Feed Architecture (`llms.txt` & `llms-full.txt`)

- **`public/llms.txt`**: High-density Markdown index detailing website metadata, core indexable sections, primary categories, JSON data schemas, AEO policy, and citation guidelines.
- **`public/llms-full.txt`**: Comprehensive structured knowledge graph containing full project scope, architectural features, multi-model execution engine workflows, E-E-A-T credentials, and step-by-step playbooks for direct zero-latency RAG and AI citation.

## 3. Schema.org JSON-LD Standardized Templates

Every page MUST render structured data using JSON-LD:

1. **Root Layout / WebSite**:
   - `@type`: `WebSite`
   - `@id`: `https://www.205011.xyz/#website`
   - `potentialAction`: `SearchAction` with target `https://www.205011.xyz/prompts?q={search_term_string}`
2. **Organization**:
   - `@type`: `Organization`
   - `@id`: `https://www.205011.xyz/#organization`
   - `name`: `Prompt Kit`
   - `url`: `https://www.205011.xyz/`
   - `logo`: `https://www.205011.xyz/logo.png`
   - `founder` / `author`: `James5-cell` / `postsoma-2050`
3. **SoftwareApplication**:
   - `@type`: `SoftwareApplication`
   - `applicationCategory`: `DeveloperApplication` / `UtilitiesApplication`
   - `operatingSystem`: `Web`
4. **Content Pages (`/p/{id}`)**:
   - `@type`: `Article` or `HowTo` or `SoftwareSourceCode`
   - `@type`: `BreadcrumbList` (`Home > Prompts > {title}`)

## 4. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) Audit Checklist

- [x] Clear creator attribution (`James5-cell` / `postsoma-2050`).
- [x] Dedicated `/about` page outlining platform vision, E-E-A-T credentials, data privacy & security policies.
- [x] Direct machine feed links (`/llms.txt`, `/llms-full.txt`) in navigation footer.
- [x] Academic & media citation guidelines with copyable BibTeX & plain-text formats.
- [x] 100% canonical URL matching `https://www.205011.xyz`.

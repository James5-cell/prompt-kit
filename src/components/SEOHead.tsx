import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_DOMAIN = 'https://www.205011.xyz';
const DEFAULT_DESCRIPTION =
  'Private Prompt Vault: 你的私密提示詞工作流與高價值資產庫';
const DEFAULT_OG_IMAGE = `${DEFAULT_DOMAIN}/og-image.png`;

function toAbsoluteUrl(url?: string): string {
  if (!url) return DEFAULT_OG_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${DEFAULT_DOMAIN}${cleanPath}`;
}

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
}: SEOHeadProps) {
  const location = useLocation();
  const fullTitle = title.includes('Prompt Kit') ? title : `${title} — Prompt Kit`;
  const canonicalUrl = toAbsoluteUrl(canonical || location.pathname);
  const fullOgImage = toAbsoluteUrl(ogImage);

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Prompt Kit" />
      <meta property="og:locale" content="zh_TW" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:secure_url" content={fullOgImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:image:alt" content={fullTitle} />

      {/* Dynamic JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

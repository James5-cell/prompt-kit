import { useEffect } from 'react';

declare const process: { env: Record<string, string | undefined> };

interface GoogleAnalyticsProps {
  gaId?: string;
}

export default function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  const envGaId =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GA_ID) ||
    (import.meta.env && (import.meta.env.NEXT_PUBLIC_GA_ID as string));

  const targetGaId = gaId || envGaId;
  const isProduction =
    import.meta.env.PROD || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

  useEffect(() => {
    // Only load GA4 in production environment when a valid Measurement ID exists
    if (!isProduction || !targetGaId || targetGaId.startsWith('G-XXXXXXXXXX')) {
      return;
    }

    // Guard against duplicate script injection
    if (document.getElementById('ga4-gtag-script')) {
      return;
    }

    // 1. Inject external gtag.js script
    const script = document.createElement('script');
    script.id = 'ga4-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(targetGaId)}`;
    document.head.appendChild(script);

    // 2. Initialize dataLayer and gtag configuration
    const inlineScript = document.createElement('script');
    inlineScript.id = 'ga4-inline-config';
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${targetGaId}');
    `;
    document.head.appendChild(inlineScript);
  }, [targetGaId, isProduction]);

  return null;
}

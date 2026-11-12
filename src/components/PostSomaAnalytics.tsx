import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CROSS_DOMAIN_LIST = [
  'postsoma-2050.website',
  'postsoma-2050.com',
  'www.205011.xyz',
  '205011.xyz',
  'www.205022.xyz',
  '205022.xyz',
  'www.205044.xyz',
  '205044.xyz',
  'www.205055.xyz',
  '205055.xyz',
  'www.205077.xyz',
  '205077.xyz',
  'quantbrews.win',
  'recipelab.cc',
  'www.readselah.org',
  'readselah.org',
  'prayselah.org',
  'postsomabooks.qzz.io',
];

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local')
  );
}

function isValidGaId(id?: string): id is string {
  return Boolean(
    id &&
      id !== 'PENDING' &&
      !id.startsWith('G-XXXXXXXX') &&
      id.startsWith('G-'),
  );
}

export default function PostSomaAnalytics() {
  const location = useLocation();
  const initializedRef = useRef(false);
  const lastTrackedPathRef = useRef<string | null>(null);

  const env = import.meta.env;
  const isProduction = env.PROD;

  const rollupGaId =
    env.VITE_GA_ROLLUP_ID || env.NEXT_PUBLIC_GA_ROLLUP_ID || 'G-NZ2V582QTN';
  const projectGaId =
    env.VITE_GA_PROJECT_ID ||
    env.NEXT_PUBLIC_GA_PROJECT_ID ||
    env.NEXT_PUBLIC_GA_ID ||
    '';
  const projectName =
    env.VITE_GA_PROJECT_NAME || env.NEXT_PUBLIC_GA_PROJECT_NAME || 'prompt_kit';
  const cognitiveLayer =
    env.VITE_GA_COGNITIVE_LAYER ||
    env.NEXT_PUBLIC_GA_COGNITIVE_LAYER ||
    'Utility';
  const umamiWebsiteId =
    env.VITE_UMAMI_WEBSITE_ID || env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';
  const umamiScriptUrl =
    env.VITE_UMAMI_SCRIPT_URL ||
    env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ||
    'https://pulse.postsoma-2050.website/pulse.js';

  useEffect(() => {
    if (!isProduction || typeof window === 'undefined') return;
    if (isLocalHostname(window.location.hostname)) return;

    const hasRollup = isValidGaId(rollupGaId);
    const hasProject = isValidGaId(projectGaId) && projectGaId !== rollupGaId;
    const primaryGaId = hasRollup ? rollupGaId : hasProject ? projectGaId : '';

    if (primaryGaId && !document.getElementById('postsoma-ga4-gtag')) {
      const gtagScript = document.createElement('script');
      gtagScript.id = 'postsoma-ga4-gtag';
      gtagScript.async = true;
      gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGaId)}`;
      document.head.appendChild(gtagScript);

      window.dataLayer = window.dataLayer || [];
      const gtag = function (...args: unknown[]) {
        window.dataLayer?.push(args);
      };
      window.gtag = window.gtag || gtag;

      window.gtag('js', new Date());
      window.gtag('set', 'linker', { domains: CROSS_DOMAIN_LIST });
      window.gtag('set', {
        project_name: projectName,
        cognitive_layer: cognitiveLayer,
      });

      if (hasRollup) {
        window.gtag('config', rollupGaId, {
          project_name: projectName,
          cognitive_layer: cognitiveLayer,
          send_page_view: false,
        });
      }

      if (hasProject) {
        window.gtag('config', projectGaId, {
          project_name: projectName,
          cognitive_layer: cognitiveLayer,
          send_page_view: false,
        });
      }

      initializedRef.current = true;
    }

    if (
      umamiWebsiteId &&
      umamiScriptUrl &&
      !document.getElementById('postsoma-umami-script')
    ) {
      const umamiScript = document.createElement('script');
      umamiScript.id = 'postsoma-umami-script';
      umamiScript.defer = true;
      umamiScript.src = umamiScriptUrl;
      umamiScript.setAttribute('data-website-id', umamiWebsiteId);
      document.head.appendChild(umamiScript);
    }
  }, [
    isProduction,
    rollupGaId,
    projectGaId,
    projectName,
    cognitiveLayer,
    umamiWebsiteId,
    umamiScriptUrl,
  ]);

  useEffect(() => {
    if (!isProduction || typeof window === 'undefined') return;
    if (isLocalHostname(window.location.hostname)) return;
    if (!initializedRef.current || typeof window.gtag !== 'function') return;

    const fullPath = `${location.pathname}${location.search}`;
    if (lastTrackedPathRef.current === fullPath) return;
    lastTrackedPathRef.current = fullPath;

    window.gtag('event', 'page_view', {
      page_path: fullPath,
      page_location: window.location.href,
      page_title: document.title,
      project_name: projectName,
      cognitive_layer: cognitiveLayer,
    });
  }, [isProduction, location.pathname, location.search, projectName, cognitiveLayer]);

  return null;
}

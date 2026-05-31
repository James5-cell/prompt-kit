import { useEffect } from 'react';

/**
 * Custom hook to dynamically inject `<meta name="robots" content="noindex, nofollow" />`
 * into the document head to prevent indexing of private/internal routes in the SPA.
 */
export function useNoIndex() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    let existed = true;

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
      existed = false;
    }

    const previousContent = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (meta) {
        if (existed && previousContent) {
          meta.setAttribute('content', previousContent);
        } else {
          meta.remove();
        }
      }
    };
  }, []);
}

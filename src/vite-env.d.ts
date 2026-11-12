/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_ROLLUP_ID?: string;
  readonly VITE_GA_PROJECT_ID?: string;
  readonly VITE_GA_PROJECT_NAME?: string;
  readonly VITE_GA_COGNITIVE_LAYER?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  readonly VITE_UMAMI_SCRIPT_URL?: string;
  readonly NEXT_PUBLIC_GA_ROLLUP_ID?: string;
  readonly NEXT_PUBLIC_GA_PROJECT_ID?: string;
  readonly NEXT_PUBLIC_GA_ID?: string;
  readonly NEXT_PUBLIC_GA_PROJECT_NAME?: string;
  readonly NEXT_PUBLIC_GA_COGNITIVE_LAYER?: string;
  readonly NEXT_PUBLIC_UMAMI_WEBSITE_ID?: string;
  readonly NEXT_PUBLIC_UMAMI_SCRIPT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

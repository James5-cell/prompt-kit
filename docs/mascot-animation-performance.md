# Prompt Kit mascot animation performance · 2026-10-04

## Changes

- Blink transforms now run on two tightly cropped HTML layers containing static SVG eyes, rather than SVG groups across a full-body canvas. Canonical coordinates, colors, halo geometry and 5.2s/120ms cadence remain unchanged.
- Promote only small body, sprout and eye layers. Layout/style containment preserves protruding accessories. Existing shadows, sparkle effect and cheeks remain visually unchanged.
- Sample pointer proximity once per 100ms, with one bounds read per sample. Travel already uses translate3d; no per-frame position writes added.
- Stop scheduler in background tabs. Pause CSS animation when offscreen, guarded or fully shy-hidden; keep foreground recovery ticking so the pet can return from hiding.
- Shy and shy_hide exclusively own recovery, preventing generic interrupt completion from prematurely cancelling the hiding transition.
- Original core/skin PNGs unchanged. Transparent WebP display derivatives use plate 396px, sprout 64px, bubble 144px and sparkles 80px widths, at least 3x displayed widths. Lossless WebP encoding follows downsampling.
- Shared mobile 118×129px / desktop 132×145px stages, anchors, breathing, blink, sprout, hover/click and site-specific actions preserved.

## Verification

- `node scripts/check-mascot-performance.mjs`: 7 shy recovery / visibility checks passed.
- `npm run build`: TypeScript and Vite passed; prerender completed using existing fallback content because Firebase build credentials are absent.
- Browser preview: four dark WebP layers loaded, eyes are SPAN layers with 5.2s animation, desktop stage 132×145px, mascot click accepted.
- `git diff --check`: passed.
- Actual GPU utilization is unmeasured; no numerical reduction or sub-20% guarantee claimed.

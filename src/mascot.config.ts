/** Prompt Kit mascot: canonical PostSoma core with the prepared prompt-kit skin. */
export const mascotConfig = {
  version: "1.0.0-prompt-kit",
  storageKey: "postsoma-prompt-kit-mascot-v1",
  core: {
    light: "/mascot/core/plate_light.png",
    dark: "/mascot/core/plate_dark.png",
    width: 1122,
    height: 1228,
    sprout: {
      light: "/mascot/core/sprout_light.png",
      dark: "/mascot/core/sprout_dark.png",
      left: "43.94%", top: "0%", displayWidth: "12.03%", displayHeight: "11.16%",
      pivot: "48.74% 85.4%",
    },
    eyes: [
      { x: 728.9, y: 563.8, moonRadius: 48.6, haloRadius: 66 },
      { x: 382.7, y: 563.9, moonRadius: 48.6, haloRadius: 66 },
    ],
  },
  slots: {
    bubble: {
      light: "/mascot/skins/prompt-kit/bubble_clean.png", dark: "/mascot/skins/prompt-kit/bubble_dark.png",
      right: "2%", top: "2%", width: "32%", zIndex: 3, pivot: "50% 50%", rotation: "rotate(4deg)",
      behavior: { follow_breath: true, on_click: "prompt_pulse", on_shock: "rattle" },
    },
    sparkles: {
      light: "/mascot/skins/prompt-kit/sparkles_clean.png", dark: "/mascot/skins/prompt-kit/sparkles_dark.png",
      left: "4%", top: "6%", width: "18%", zIndex: 4, pivot: "50% 50%", rotation: "rotate(-6deg)",
      behavior: { follow_breath: true, on_antic: "draft_spark" },
    },
  },
  behaviorWheel: [
    { id: "sprout_sway", weight: 40, durationMs: 3500 },
    { id: "peek_curious", weight: 30, durationMs: 1800 },
    { id: "wander_slide", weight: 20, durationMs: 4500 },
    { id: "subtle_tilt", weight: 10, durationMs: 1200 },
  ],
  siteAntic: { id: "draft_spark", minimumIdleMs: 20000, cooldownMs: 24000, chance: 0.16, durationMs: 1400 },
  scheduler: {
    tickMs: 100, heartbeatMs: 1000, durationDrift: 0.2, firstActionMs: 4500,
    idleGapMinMs: 1400, idleGapMaxMs: 2800, tapWindowMs: 320, activeIdleMs: 10000,
    sleepAfterMs: 90000, hoverMs: 560, clickMs: 760, flinchMs: 480, blushMs: 980,
    shyHideMs: 650, shyHiddenMs: 2400, shyQuietMs: 2000, alertMs: 900,
    scrollThresholdPx: 360, rapidPointerSpeedPxPerSecond: 900, nearbyRadiusPx: 150,
    minimumAlertGapMs: 1800,
  },
  motion: {
    stage: { mobile: { width: 118, height: 129 }, desktop: { width: 132, height: 145 } },
    restOffsetPx: { mobile: 81, desktop: 91 }, peekOffsetPx: { mobile: 67, desktop: 77 },
    hiddenOffsetPx: { mobile: 160, desktop: 176 },
    companionBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
    minHorizontalPercent: 16, maxHorizontalPercent: 84, startHorizontalPercent: 78,
    wanderMinPercent: 16, wanderMaxPercent: 84, wanderMinStepPercent: 16, wanderMaxStepPercent: 32,
  },
  drives: {
    defaults: { energy: 80, curiosity: 60, affection: 40 },
    energyDecayPerMinute: 1.5, curiosityDecayPerMinute: 2, affectionDecayPerMinute: 1,
    sleepRecoveryPerMinute: 10, hoverAffection: 8, clickAffection: 15, nearbyCuriosity: 10,
  },
  priorities: { autonomous: 0, environment: 1, direct: 2 },
} as const;

export type MascotBehaviorId = (typeof mascotConfig.behaviorWheel)[number]["id"] | typeof mascotConfig.siteAntic.id;

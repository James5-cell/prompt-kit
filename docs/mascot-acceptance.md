# Prompt Kit Mascot Integration

## Active slot behavior map

| Slot | Shared motion | Site action | Trigger |
|---|---|---|---|
| `bubble` | Follows core breathing | `prompt_pulse`; `rattle` | Single click; double tap/startle |
| `sparkles` | Follows core breathing | `draft_spark` antic | 16% chance when an autonomous action is selected after 20 seconds idle; 24-second cooldown |

The asset library has 17 skin folders. This Prompt Kit integration installs only its two prepared slots; the other site skins remain mapped in their own project integrations.

## Shared runtime contract

- One 100ms tick runs sensing, drive decay, weighted action selection, and state playback.
- Core cadence: 3.4s breathing, 5.2s blink, ±6° sprout sway; hover wiggle 560ms; click response plus hop.
- Autonomous wheel: sprout sway 40%, curious peek 30%, bottom-edge wander 20%, subtle tilt 10%; action duration drifts ±20%.
- Tap decoder: 320ms window; single click wakes, double tap startles, triple tap blushes and briefly hides before returning to the partial peek.
- User actions interrupt autonomous behavior. Long inactivity returns the mascot to a quiet rest/sleep posture.
- Scroll, nearby fast pointer motion, theme changes, editable controls, hidden tabs, fullscreen, and reduced motion are handled by the runtime guards.
- No third-party runtime dependency or speech/UI text is added.

## Acceptance

- The app uses the canonical baked plate and sprout layers, vector eyes at the shared core anchors, and only the supplied Prompt Kit transparent attachments.
- Both light/dark prepared accessory files and both baked core variants are served from `public/mascot/`; the current dark interface selects the dark assets.
- Desktop/mobile stage sizes and edge resting pose match the shared mascot contract.
- `npm run build` completed successfully, including TypeScript build checks. The Vite preview at `http://127.0.0.1:5180/dashboard` rendered the mascot on the Prompt Kit page.
- Source accessory manifest retains the supplied four-background penetration-test pass status.

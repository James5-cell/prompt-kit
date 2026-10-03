import { type CSSProperties, useEffect, useRef, useState } from "react"
import { mascotConfig } from "../mascot.config"
import { MascotEngine, type MascotSignal, type MascotSnapshot } from "./engine"
import "./mascot.css"

const initialSnapshot: MascotSnapshot = {
  mode: "rest",
  behavior: null,
  xPercent: mascotConfig.motion.startHorizontalPercent,
  transitionMs: 700,
  actionMs: 0,
  drives: { ...mascotConfig.drives.defaults },
}

function isEditing(target: Element | null) {
  return Boolean(target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"))
}

export default function PromptKitMascot() {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const signalsRef = useRef<MascotSignal[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let storage: Storage | null = null
    try { storage = window.localStorage } catch { /* Storage is optional. */ }
    const engine = new MascotEngine(storage, Date.now())
    setSnapshot(engine.snapshot())
    engine.consumeChanged()

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const readTheme = () => {
      const root = document.documentElement
      const next = root.classList.contains("light") || root.dataset.theme === "light" ? "light" : "dark"
      setTheme((previous) => {
        if (previous !== next) signalsRef.current.push({ type: "theme" })
        return next
      })
    }
    readTheme()
    const themeObserver = new MutationObserver(readTheme)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })

    let lastScrollPosition = window.scrollY
    const onScroll = (event: Event) => {
      const target = event.target
      const next = target instanceof Element ? target.scrollTop : window.scrollY
      if (Math.abs(next - lastScrollPosition) >= mascotConfig.scheduler.scrollThresholdPx) {
        signalsRef.current.push({ type: "scroll" })
        lastScrollPosition = next
      }
    }
    let lastPointer = { x: 0, y: 0, at: 0 }
    let lastPointerActivityAt = 0
    const onPointerMove = (event: PointerEvent) => {
      const now = Date.now()
      const current = { x: event.clientX, y: event.clientY, at: now }
      if (now - lastPointerActivityAt >= 1_000) {
        signalsRef.current.push({ type: "pointer_activity", near: false })
        lastPointerActivityAt = now
      }
      const elapsed = now - lastPointer.at
      if (lastPointer.at && elapsed > 0) {
        const speed = Math.hypot(current.x - lastPointer.x, current.y - lastPointer.y) / elapsed * 1_000
        const box = buttonRef.current?.getBoundingClientRect()
        const distance = box
          ? Math.hypot(current.x - (box.left + box.width / 2), current.y - (box.top + box.height / 2))
          : Number.POSITIVE_INFINITY
        if (speed >= mascotConfig.scheduler.rapidPointerSpeedPxPerSecond && distance < mascotConfig.scheduler.nearbyRadiusPx)
          signalsRef.current.push({ type: "nearby" })
      }
      lastPointer = current
    }
    const onVisibility = () => signalsRef.current.push({ type: "document_hidden", value: document.hidden })
    const onFullscreen = () => signalsRef.current.push({ type: "fullscreen", value: Boolean(document.fullscreenElement) })
    const onFocusIn = (event: FocusEvent) => signalsRef.current.push({ type: "busy", value: isEditing(event.target as Element) })
    const onFocusOut = (event: FocusEvent) => {
      if (isEditing(event.target as Element) && !isEditing(event.relatedTarget as Element))
        signalsRef.current.push({ type: "busy", value: false })
    }

    document.addEventListener("visibilitychange", onVisibility)
    document.addEventListener("fullscreenchange", onFullscreen)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("focusout", onFocusOut)
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    onVisibility()
    onFullscreen()
    signalsRef.current.push({ type: "busy", value: isEditing(document.activeElement) })

    const interval = window.setInterval(() => {
      engine.tick(Date.now(), signalsRef.current.splice(0), motionQuery.matches)
      if (engine.consumeChanged()) setSnapshot(engine.snapshot())
    }, mascotConfig.scheduler.tickMs)

    return () => {
      window.clearInterval(interval)
      themeObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      document.removeEventListener("fullscreenchange", onFullscreen)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("focusout", onFocusOut)
      document.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("pointermove", onPointerMove)
      signalsRef.current = []
    }
  }, [])

  const anchorX = () => {
    const box = buttonRef.current?.getBoundingClientRect()
    return box ? (box.left + box.width / 2) / window.innerWidth * 100 : snapshot.xPercent
  }
  const enqueue = (signal: MascotSignal) => signalsRef.current.push(signal)
  const plate = theme === "dark" ? mascotConfig.core.dark : mascotConfig.core.light
  const sprout = theme === "dark" ? mascotConfig.core.sprout.dark : mascotConfig.core.sprout.light
  const bubble = theme === "dark" ? mascotConfig.slots.bubble.dark : mascotConfig.slots.bubble.light
  const sparkles = theme === "dark" ? mascotConfig.slots.sparkles.dark : mascotConfig.slots.sparkles.light
  const style = {
    left: "50%",
    bottom: mascotConfig.motion.companionBottom,
    "--pk-x": `${snapshot.xPercent - 50}vw`,
    "--pk-transition-ms": `${snapshot.transitionMs}ms`,
    "--pk-action-ms": `${snapshot.actionMs}ms`,
  } as CSSProperties

  return (
    <aside aria-label="Prompt Kit mascot" className="pk-mascot-dock" data-mode={snapshot.mode}
      data-behavior={snapshot.behavior ?? "idle"} data-theme={theme} style={style}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "transform")
          enqueue({ type: "transition_end" })
      }}>
      <button ref={buttonRef} type="button" className="pk-mascot-button"
        aria-label="與 Prompt Kit 桌寵互動"
        onPointerEnter={() => enqueue({ type: "hover", anchorX: anchorX() })}
        onClick={() => enqueue({ type: "tap", at: Date.now(), anchorX: anchorX() })}>
        <span className="pk-mascot-stage" aria-hidden="true">
          <span className="pk-mascot-core">
            <img className="pk-mascot-plate" src={plate} alt="" draggable={false} />
            <span className="pk-mascot-sprout" style={{
              left: mascotConfig.core.sprout.left,
              top: mascotConfig.core.sprout.top,
              width: mascotConfig.core.sprout.displayWidth,
              height: mascotConfig.core.sprout.displayHeight,
              transformOrigin: mascotConfig.core.sprout.pivot,
            }}><img src={sprout} alt="" draggable={false} /></span>
            <span className="pk-mascot-bubble" style={{
              right: mascotConfig.slots.bubble.right,
              top: mascotConfig.slots.bubble.top,
              width: mascotConfig.slots.bubble.width,
              zIndex: mascotConfig.slots.bubble.zIndex,
              transform: mascotConfig.slots.bubble.rotation,
              transformOrigin: mascotConfig.slots.bubble.pivot,
            }} data-slot-click={mascotConfig.slots.bubble.behavior.on_click}
              data-slot-shock={mascotConfig.slots.bubble.behavior.on_shock}>
              <img src={bubble} alt="" draggable={false} />
            </span>
            <span className="pk-mascot-sparkles" style={{
              left: mascotConfig.slots.sparkles.left,
              top: mascotConfig.slots.sparkles.top,
              width: mascotConfig.slots.sparkles.width,
              zIndex: mascotConfig.slots.sparkles.zIndex,
              transform: mascotConfig.slots.sparkles.rotation,
              transformOrigin: mascotConfig.slots.sparkles.pivot,
            }} data-slot-antic={mascotConfig.slots.sparkles.behavior.on_antic}>
              <img src={sparkles} alt="" draggable={false} />
            </span>
            <svg className="pk-mascot-eyes" viewBox={`0 0 ${mascotConfig.core.width} ${mascotConfig.core.height}`}>
              {mascotConfig.core.eyes.map((eye, index) => <g className="pk-mascot-eye" key={index}
                style={{ transformOrigin: `${eye.x}px ${eye.y}px` }}>
                <circle className="pk-mascot-eye-halo" cx={eye.x} cy={eye.y} r={eye.haloRadius} />
                <circle className="pk-mascot-eye-moon" cx={eye.x} cy={eye.y} r={eye.moonRadius} />
              </g>)}
            </svg>
            <span className="pk-mascot-cheek pk-mascot-cheek-left" />
            <span className="pk-mascot-cheek pk-mascot-cheek-right" />
          </span>
        </span>
      </button>
    </aside>
  )
}

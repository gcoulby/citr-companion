import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// iPadOS Safari (13+) reports its userAgent as a plain desktop Mac — the only
// reliable way to tell it apart from a real Mac is that it exposes multi-touch
// where a real Mac doesn't. Combined with the phone/Android UA check below,
// this catches "phone or tablet" regardless of viewport width — an iPad is
// 768px+ wide even in portrait, so the width-based useIsMobile() above never
// flags it, even though it's the exact class of device (touch-first, WebKit,
// no console access) that things like the PDF View mobile gate exist for.
function isTouchTabletOrPhone(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const isIpad = /iPad/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))
  const isPhoneOrAndroid = /iPhone|iPod|Android/.test(ua)
  return isIpad || isPhoneOrAndroid
}

// For gates like "don't even load this on mobile" where the real criterion is
// "touch-first device with an unreliable WebKit/mobile-Safari environment",
// not "narrow screen". Width alone misses iPads; this also catches those.
export function useIsMobileOrTabletDevice() {
  const isMobile = useIsMobile()
  return isMobile || isTouchTabletOrPhone()
}

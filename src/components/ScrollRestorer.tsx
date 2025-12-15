"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

// Saves and restores scroll position per route+query within the session.
const ScrollRestorer = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const key = `${pathname}?${searchParams?.toString() || ""}`

  useEffect(() => {
    if (typeof window === "undefined") return

    // Restore scroll on mount
    const saved = sessionStorage.getItem(`scroll:${key}`)
    if (saved) {
      const y = parseInt(saved, 10)
      if (!Number.isNaN(y)) {
        window.scrollTo(0, y)
      }
    }

    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          sessionStorage.setItem(`scroll:${key}`, String(window.scrollY))
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      sessionStorage.setItem(`scroll:${key}`, String(window.scrollY))
      window.removeEventListener("scroll", handleScroll)
    }
  }, [key])

  return null
}

export default ScrollRestorer


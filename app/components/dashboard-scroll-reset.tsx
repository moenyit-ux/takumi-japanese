'use client'

import { useLayoutEffect } from 'react'

export default function DashboardScrollReset() {
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    resetScroll()

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll()
      secondFrame = window.requestAnimationFrame(resetScroll)
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  return null
}

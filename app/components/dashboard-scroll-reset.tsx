'use client'

import { useLayoutEffect } from 'react'

export default function DashboardScrollReset() {
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.querySelector<HTMLElement>('.portal-dashboard .content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    resetScroll()

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll()
      secondFrame = window.requestAnimationFrame(resetScroll)
    })
    const delayedResets = [50, 180, 420, 800].map((delay) => window.setTimeout(resetScroll, delay))
    const handlePageShow = () => window.requestAnimationFrame(resetScroll)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      delayedResets.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener('pageshow', handlePageShow)
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  return null
}

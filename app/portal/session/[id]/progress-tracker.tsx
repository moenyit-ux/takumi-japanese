'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  sessionId: string
  blockIds: string[]
  initialReadPercent: number
}

export default function ProgressTracker({ sessionId, blockIds, initialReadPercent }: Props) {
  const savedRef = useRef(initialReadPercent)
  const pendingRef = useRef<number | null>(null)
  const [savedPercent, setSavedPercent] = useState(initialReadPercent)

  useEffect(() => {
    if (blockIds.length === 0) return

    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    async function persist(percent: number, lastBlockId: string | null) {
      if (stopped || percent <= savedRef.current || pendingRef.current === percent) return
      pendingRef.current = percent

      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, readPercent: percent, lastBlockId }),
          keepalive: true,
        })

        if (response.ok) {
          savedRef.current = Math.max(savedRef.current, percent)
          setSavedPercent(savedRef.current)
        }
      } finally {
        pendingRef.current = null
      }
    }

    function measure() {
      let highest = -1

      blockIds.forEach((id, index) => {
        const element = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)
        if (!element) return
        const rect = element.getBoundingClientRect()
        if (rect.top <= window.innerHeight * 0.78) highest = index
      })

      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80
      if (nearBottom) highest = blockIds.length - 1
      if (highest < 0) return

      const percent = Math.min(100, Math.round(((highest + 1) / blockIds.length) * 100))
      const lastBlockId = blockIds[highest] || null

      if (timer) clearTimeout(timer)
      timer = setTimeout(() => persist(percent, lastBlockId), 450)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') measure()
    }

    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    document.addEventListener('visibilitychange', onVisibility)
    measure()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [blockIds, sessionId])

  if (blockIds.length === 0) return null

  return (
    <div className="save-state" aria-live="polite">
      <span>Progres materi tersimpan</span>
      <b>{savedPercent}%</b>
    </div>
  )
}

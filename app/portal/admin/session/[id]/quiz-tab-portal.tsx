'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export default function QuizTabPortal({ questionCount }: { questionCount: number }) {
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    setTarget(document.querySelector('[role="tablist"][aria-label="Jenis materi"]'))

    if (window.location.hash === '#quiz-editor') {
      const timer = window.setTimeout(() => {
        const sections = Array.from(document.querySelectorAll('section'))
        const quizSection = sections.find((section) => section.textContent?.includes('LATIHAN SESI'))
        quizSection?.scrollIntoView({ behavior: 'auto', block: 'start' })
      }, 150)
      return () => window.clearTimeout(timer)
    }
  }, [])

  function openQuizEditor() {
    const quizUrl = `${window.location.pathname}${window.location.search}#quiz-editor`
    window.open(quizUrl, '_blank', 'noopener,noreferrer')
  }

  if (!target) return null

  return createPortal(
    <button type="button" onClick={openQuizEditor} aria-label="Buka editor kuis sesi di tab baru" title="Buka kuis di tab baru">
      <b>{questionCount}</b>
      <span>Kuis</span>
      <small>Buka di tab baru</small>
    </button>,
    target,
  )
}

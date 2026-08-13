'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export default function QuizTabPortal({ questionCount }: { questionCount: number }) {
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    setTarget(document.querySelector('[role="tablist"][aria-label="Jenis materi"]'))
  }, [])

  function openQuizEditor() {
    const sections = Array.from(document.querySelectorAll('section'))
    const quizSection = sections.find((section) => section.textContent?.includes('LATIHAN SESI'))
    quizSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!target) return null

  return createPortal(
    <button type="button" onClick={openQuizEditor} aria-label="Isi kuis sesi">
      <b>{questionCount}</b>
      <span>Kuis</span>
      <small>Klik untuk isi</small>
    </button>,
    target,
  )
}

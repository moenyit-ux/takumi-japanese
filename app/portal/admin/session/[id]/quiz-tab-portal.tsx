'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export default function QuizTabPortal({ sessionId, questionCount }: { sessionId: string; questionCount: number }) {
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    setTarget(document.querySelector('[role="tablist"][aria-label="Jenis materi"]'))
  }, [])

  function openQuizEditor() {
    window.open(`/portal/admin/session/${sessionId}/quiz`, '_blank', 'noopener,noreferrer')
  }

  if (!target) return null

  return createPortal(
    <button type="button" onClick={openQuizEditor} aria-label="Buka editor kuis sesi" title="Buka editor kuis">
      <b>{questionCount}</b>
      <span>Kuis</span>
      <small>Klik untuk isi</small>
    </button>,
    target,
  )
}

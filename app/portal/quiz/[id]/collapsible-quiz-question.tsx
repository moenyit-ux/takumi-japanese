'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import ChevronIcon from '@/app/components/chevron-icon'

type Props = {
  position: number
  prompt: string
  answered?: boolean
  uncertain?: boolean
  preview?: boolean
  defaultOpen?: boolean
  children: ReactNode
}

export default function CollapsibleQuizQuestion({
  position,
  prompt,
  answered = false,
  uncertain = false,
  preview = false,
  defaultOpen = false,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const positionLabel = String(position).padStart(2, '0')
  const answerLabel = preview ? 'Preview soal' : answered ? 'Sudah dijawab' : 'Belum dijawab'

  return (
    <section className={`tm-quiz-collapsible${expanded ? ' expanded' : ''}${uncertain ? ' uncertain' : ''}`}>
      <button
        type="button"
        className="tm-quiz-collapsible-summary"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Minimalkan' : 'Buka'} soal ${position}`}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="tm-quiz-collapsible-number">{positionLabel}</span>
        <span className="tm-quiz-collapsible-copy">
          <b>Soal {position}</b>
          <small>{prompt}</small>
        </span>
        <span className="tm-quiz-collapsible-states">
          <span className={preview ? 'preview' : answered ? 'answered' : 'unanswered'}>
            {preview ? '◇' : answered ? '✓' : '○'} {answerLabel}
          </span>
          {uncertain && <span className="uncertain">⚑ Ragu-ragu</span>}
        </span>
        <span className="tm-quiz-collapsible-chevron" aria-hidden="true">
          <ChevronIcon direction={expanded ? 'up' : 'down'} />
        </span>
      </button>

      {expanded && <div className="tm-quiz-collapsible-body">{children}</div>}
    </section>
  )
}

'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import MaterialBookmark from './material-bookmark'
import BlockLearningStatusControl, { type BlockLearningStatus } from './block-learning-status-control'

type Props = {
  blockId: string
  anchorId: string
  positionLabel: string
  term: string
  reading: string | null
  initialStatus: BlockLearningStatus
  bookmarked: boolean
  preview?: boolean
  children: ReactNode
}

const statusMeta: Record<BlockLearningStatus, { label: string; icon: string }> = {
  not_started: { label: 'Belum dipelajari', icon: '○' },
  learned: { label: 'Sudah dipelajari', icon: '✓' },
  review: { label: 'Ingin dipelajari lagi', icon: '↻' },
}

export default function CollapsibleVocabularyCard({
  blockId,
  anchorId,
  positionLabel,
  term,
  reading,
  initialStatus,
  bookmarked,
  preview = false,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<BlockLearningStatus>(initialStatus)
  const current = statusMeta[status]

  if (!expanded) {
    return (
      <article className="tm-material-card tm-vocab-compact-card" data-block-id={blockId} id={anchorId}>
        <button
          type="button"
          className="tm-vocab-compact-toggle"
          aria-expanded="false"
          aria-label={`Buka detail kosakata ${term}`}
          onClick={() => setExpanded(true)}
        >
          <span className="tm-vocab-compact-number">{positionLabel}</span>
          <span className="tm-vocab-compact-word">
            <b>{term}</b>
            {reading && <small>{reading}</small>}
          </span>
          <span className={`tm-vocab-compact-status ${status}`}>
            <i aria-hidden="true">{current.icon}</i>
            <span>{current.label}</span>
          </span>
          <span className="tm-vocab-compact-chevron" aria-hidden="true">⌄</span>
        </button>
      </article>
    )
  }

  return (
    <article className="tm-material-card tm-vocab-expanded-card" data-block-id={blockId} id={anchorId}>
      <div className="tm-vocab-expanded-topbar">
        <button type="button" onClick={() => setExpanded(false)} aria-expanded="true">
          <span aria-hidden="true">⌃</span>
          Ringkas materi
        </button>
      </div>

      {children}

      <div className={`tm-material-actions tm-material-actions-status${preview ? ' preview' : ''}`}>
        {!preview && <MaterialBookmark blockId={blockId} initialBookmarked={bookmarked} />}
        <BlockLearningStatusControl
          blockId={blockId}
          initialStatus={status}
          preview={preview}
          onStatusChange={setStatus}
        />
      </div>
    </article>
  )
}

'use client'

import { useState } from 'react'

export type BlockLearningStatus = 'not_started' | 'review' | 'learned'

type Props = {
  blockId: string
  initialStatus: BlockLearningStatus
  preview?: boolean
}

const statusMeta: Record<BlockLearningStatus, { label: string; icon: string }> = {
  not_started: { label: 'Belum dipelajari', icon: '○' },
  learned: { label: 'Sudah dipelajari', icon: '✓' },
  review: { label: 'Ingin dipelajari lagi', icon: '↻' },
}

const actions: Array<{ value: Exclude<BlockLearningStatus, 'not_started'>; label: string; icon: string }> = [
  { value: 'learned', label: 'Sudah dipelajari', icon: '✓' },
  { value: 'review', label: 'Ingin dipelajari lagi', icon: '↻' },
]

export default function BlockLearningStatusControl({ blockId, initialStatus, preview = false }: Props) {
  const [status, setStatus] = useState<BlockLearningStatus>(initialStatus)
  const [saving, setSaving] = useState<BlockLearningStatus | null>(null)
  const [error, setError] = useState('')
  const current = statusMeta[status]

  async function updateStatus(nextStatus: BlockLearningStatus) {
    if (saving || nextStatus === status) return
    setError('')

    if (preview) {
      setStatus(nextStatus)
      return
    }

    setSaving(nextStatus)
    try {
      const response = await fetch('/api/progress/block-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, learningStatus: nextStatus }),
      })

      if (!response.ok) {
        setError('Status belum tersimpan. Coba lagi.')
        return
      }

      setStatus(nextStatus)
    } catch {
      setError('Koneksi terputus saat menyimpan status.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="tm-block-status-wrap">
      <div className="tm-block-status-current">
        <span>Status</span>
        <b className={`tm-block-status-pill ${status}`}>
          <i aria-hidden="true">{current.icon}</i>
          {current.label}
        </b>
      </div>

      <div className="tm-block-status-actions" role="group" aria-label="Ubah status materi">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            className={`${action.value}${status === action.value ? ' active' : ''}`}
            aria-pressed={status === action.value}
            disabled={Boolean(saving)}
            onClick={() => updateStatus(action.value)}
          >
            <span aria-hidden="true">{action.icon}</span>
            <b>{saving === action.value ? 'Menyimpan…' : action.label}</b>
          </button>
        ))}
      </div>

      {preview && <small className="tm-block-status-preview">Preview: tombol dapat dicoba, tetapi status tidak disimpan.</small>}
      {error && <small className="tm-learning-status-error" role="alert">{error}</small>}
    </div>
  )
}

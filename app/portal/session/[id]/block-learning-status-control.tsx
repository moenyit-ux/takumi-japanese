'use client'

import { useState } from 'react'

export type BlockLearningStatus = 'not_started' | 'review' | 'learned'

type Props = {
  blockId: string
  initialStatus: BlockLearningStatus
  preview?: boolean
  onStatusChange?: (status: BlockLearningStatus) => void
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

export default function BlockLearningStatusControl({ blockId, initialStatus, preview = false, onStatusChange }: Props) {
  const [status, setStatus] = useState<BlockLearningStatus>(initialStatus)
  const [saving, setSaving] = useState<BlockLearningStatus | null>(null)
  const [error, setError] = useState('')
  const current = statusMeta[status]

  function applyStatus(nextStatus: BlockLearningStatus) {
    setStatus(nextStatus)
    onStatusChange?.(nextStatus)
  }

  async function updateStatus(actionStatus: Exclude<BlockLearningStatus, 'not_started'>) {
    if (saving) return

    // Clicking an already-active choice turns it off and returns the material
    // to the automatic default state: "Belum dipelajari".
    const nextStatus: BlockLearningStatus = status === actionStatus ? 'not_started' : actionStatus
    setError('')

    if (preview) {
      applyStatus(nextStatus)
      return
    }

    setSaving(actionStatus)
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

      applyStatus(nextStatus)
    } catch {
      setError('Koneksi terputus saat menyimpan status.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="tm-block-status-wrap">
      <div className="tm-block-status-current">
        <small>Status belajar</small>
        <b className={`tm-block-status-pill ${status}`}>
          <i aria-hidden="true">{current.icon}</i>
          {current.label}
        </b>
      </div>

      <div className="tm-block-status-actions" role="group" aria-label="Ubah status materi">
        {actions.map((action) => {
          const active = status === action.value
          return (
            <button
              key={action.value}
              type="button"
              className={`${action.value}${active ? ' active' : ''}`}
              aria-pressed={active}
              aria-label={active ? `Nonaktifkan ${action.label}` : action.label}
              title={active ? 'Klik lagi untuk kembali ke Belum dipelajari' : undefined}
              disabled={Boolean(saving)}
              onClick={() => updateStatus(action.value)}
            >
              <span aria-hidden="true">{action.icon}</span>
              <b>{saving === action.value ? 'Menyimpan…' : action.label}</b>
            </button>
          )
        })}
      </div>

      {preview && <small className="tm-block-status-preview">Preview admin · perubahan tidak disimpan</small>}
      {error && <small className="tm-learning-status-error" role="alert">{error}</small>}
    </div>
  )
}

'use client'

import { useState } from 'react'

export type BlockLearningStatus = 'not_started' | 'review' | 'learned'

type Props = {
  blockId: string
  initialStatus: BlockLearningStatus
  preview?: boolean
}

const options: Array<{ value: BlockLearningStatus; label: string; icon: string }> = [
  { value: 'not_started', label: 'Belum dipelajari', icon: '○' },
  { value: 'learned', label: 'Sudah dipelajari', icon: '✓' },
  { value: 'review', label: 'Ingin dipelajari lagi', icon: '↻' },
]

export default function BlockLearningStatusControl({ blockId, initialStatus, preview = false }: Props) {
  const [status, setStatus] = useState<BlockLearningStatus>(initialStatus)
  const [saving, setSaving] = useState<BlockLearningStatus | null>(null)
  const [error, setError] = useState('')

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
      <div className="tm-block-status-label">Status materi</div>
      <div className="tm-block-status-options" role="group" aria-label="Status materi">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${status === option.value ? 'active ' : ''}${option.value}`}
            aria-pressed={status === option.value}
            disabled={Boolean(saving)}
            onClick={() => updateStatus(option.value)}
          >
            <span>{option.icon}</span>
            <b>{saving === option.value ? 'Menyimpan…' : option.label}</b>
          </button>
        ))}
      </div>
      {preview && <small className="tm-block-status-preview">Preview: perubahan status tidak disimpan.</small>}
      {error && <small className="tm-learning-status-error" role="alert">{error}</small>}
    </div>
  )
}

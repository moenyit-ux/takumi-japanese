'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type LearningStatus = 'not_started' | 'review' | 'learned'

type Props = {
  sessionId: string
  initialStatus: LearningStatus
}

const options: Array<{ value: LearningStatus; label: string; description: string }> = [
  { value: 'not_started', label: 'Belum dipelajari', description: 'Saya belum siap menandai materi ini selesai.' },
  { value: 'review', label: 'Perlu dipelajari lagi', description: 'Saya sudah belajar, tetapi masih ingin mengulang.' },
  { value: 'learned', label: 'Sudah dipelajari', description: 'Saya merasa sudah memahami materi ini.' },
]

export default function LearningStatusControl({ sessionId, initialStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<LearningStatus>(initialStatus)
  const [saving, setSaving] = useState<LearningStatus | null>(null)
  const [error, setError] = useState('')

  async function updateStatus(nextStatus: LearningStatus) {
    if (saving || nextStatus === status) return
    setSaving(nextStatus)
    setError('')

    try {
      const response = await fetch('/api/progress/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, learningStatus: nextStatus }),
      })

      if (!response.ok) {
        setError('Status belajar belum tersimpan. Coba lagi.')
        return
      }

      setStatus(nextStatus)
      router.refresh()
    } catch {
      setError('Koneksi terputus saat menyimpan status belajar.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="tm-learning-status" aria-labelledby="learning-status-title">
      <div>
        <div className="tm-callout-head"><div className="tm-icon-box">✓</div><b id="learning-status-title">Status belajar saya</b></div>
        <p>Pilih sesuai kondisi belajarmu sekarang. Status ini bisa diubah kapan saja.</p>
      </div>
      <div className="tm-learning-status-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={status === option.value ? 'active' : ''}
            aria-pressed={status === option.value}
            disabled={Boolean(saving)}
            onClick={() => updateStatus(option.value)}
          >
            <b>{saving === option.value ? 'Menyimpan…' : option.label}</b>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
      {error && <p className="tm-learning-status-error" role="alert">{error}</p>}
    </section>
  )
}

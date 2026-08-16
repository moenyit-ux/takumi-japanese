'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import jlpt from '../jlpt.module.css'
import review from './simulation-review-controls.module.css'

type ReviewStatus = 'saved' | 'needs_revision' | 'approved'

type Props = {
  quizId: string
  role: 'content_admin' | 'super_admin'
  reviewStatus: ReviewStatus
  reviewNote: string | null
  published: boolean
  locked: boolean
}

const statusLabel: Record<ReviewStatus, string> = {
  saved: 'Tersimpan',
  needs_revision: 'Perlu direvisi',
  approved: 'Disetujui',
}

export default function SimulationReviewControls({ quizId, role, reviewStatus, reviewNote, published, locked }: Props) {
  const router = useRouter()
  const [note, setNote] = useState(reviewNote || '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function setReview(status: 'needs_revision' | 'approved') {
    if (busy || locked) return
    if (status === 'needs_revision' && !note.trim()) {
      setMessage('Tuliskan catatan revisi terlebih dahulu.')
      return
    }

    setBusy(true)
    setMessage(status === 'approved' ? 'Menyetujui dan menerbitkan paket...' : 'Mengirim catatan revisi...')
    try {
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_simulation_review_status',
          quizId,
          status,
          note: status === 'needs_revision' ? note.trim() : '',
        }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok || data.error) throw new Error(data.error || 'Status simulasi gagal diperbarui.')
      setMessage(status === 'approved' ? 'Simulasi disetujui dan diterbitkan.' : 'Simulasi dikirim ke Perlu direvisi.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Status simulasi gagal diperbarui.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={review.panel}>
      <div className={review.head}>
        <div>
          <small>PERSETUJUAN SIMULASI</small>
          <h3>Status: {statusLabel[reviewStatus]}</h3>
          <p>
            {reviewStatus === 'approved' && published
              ? 'Paket sudah disetujui Super Admin dan diterbitkan.'
              : reviewStatus === 'needs_revision'
                ? 'Paket memerlukan perbaikan sebelum dapat diterbitkan.'
                : role === 'super_admin'
                  ? 'Periksa seluruh soal. Hanya Super Admin yang dapat menyetujui dan menerbitkan paket.'
                  : 'Paket tersimpan dan menunggu peninjauan Super Admin sebelum dapat diterbitkan.'}
          </p>
        </div>
        <span className={`${review.status} ${reviewStatus === 'approved' ? review.approved : reviewStatus === 'needs_revision' ? review.revision : ''}`}>
          {statusLabel[reviewStatus]}
        </span>
      </div>

      {reviewNote && reviewStatus === 'needs_revision' && (
        <div className={review.note}><b>Catatan revisi:</b> {reviewNote}</div>
      )}

      {reviewStatus === 'approved' && !locked && (
        <div className={review.info}>Jika soal diubah setelah disetujui, paket otomatis kembali ke status Tersimpan dan harus disetujui ulang sebelum diterbitkan.</div>
      )}

      {locked && (
        <div className={jlpt.historyWarning}>Paket ini sudah memiliki riwayat pengerjaan siswa. Status dan soal tidak dapat diubah lagi untuk menjaga konsistensi hasil.</div>
      )}

      {role === 'super_admin' && !locked && reviewStatus !== 'approved' && (
        <>
          <label className={jlpt.field}>Catatan revisi
            <textarea
              className={jlpt.textarea}
              value={note}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Isi hanya jika paket perlu dikembalikan untuk direvisi."
            />
          </label>
          <div className={review.actions}>
            <button className={jlpt.danger} type="button" disabled={busy} onClick={() => void setReview('needs_revision')}>Perlu direvisi</button>
            <button className={jlpt.save} type="button" disabled={busy} onClick={() => void setReview('approved')}>Setujui & terbitkan</button>
          </div>
        </>
      )}

      <div className={jlpt.message}>{message}</div>
    </section>
  )
}

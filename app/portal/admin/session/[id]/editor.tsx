'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../../admin.module.css'

type EditorData = {
  role: 'content_admin' | 'super_admin'
  session: {
    id: string
    level_id: string
    level_code: string
    level_name: string
    session_no: number
    title: string
    slug: string
    summary: string | null
    estimated_minutes: number
    access_tier: 'free' | 'paid'
    content_status: string
    published_at: string | null
    updated_at: string
  }
  blocks: Array<{
    id: string
    position: number
    kind: string
    title: string | null
    body: unknown
    audio_url: string | null
    image_url: string | null
    updated_at: string
  }>
  quiz: {
    id: string
    kind: string
    title: string
    pass_score: number
    time_limit_minutes: number | null
    published: boolean
    questions: Array<{
      id: string
      position: number
      kind: string
      prompt: string
      passage: string | null
      audio_url: string | null
      explanation_id: string | null
      explanation_text: string | null
      points: number
      options: Array<{
        id: string
        position: number
        label: string | null
        option_text: string
        is_correct: boolean
      }>
    }>
  }
  review_notes: Array<{
    id: string
    author_id: string | null
    author_name: string | null
    note: string
    created_at: string
  }>
}

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  review: 'Review',
  changes_requested: 'Perlu diperbaiki',
  approved: 'Disetujui',
  published: 'Published',
  archived: 'Diarsipkan',
}

async function callAdmin(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok || data.error) throw new Error(data.error || 'Perubahan gagal disimpan.')
}

function Workflow({ data }: { data: EditorData }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const isSuper = data.role === 'super_admin'

  async function setStatus(status: string) {
    setBusy(true)
    setMessage('Memproses...')
    try {
      await callAdmin({ action: 'set_status', sessionId: data.session.id, status, note })
      setNote('')
      setMessage(`Status diubah menjadi ${statusLabel[status] || status}.`)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal mengubah status.')
    } finally {
      setBusy(false)
    }
  }

  const blocksReady = data.blocks.length > 0
  const questionsReady = Boolean(data.quiz?.questions?.length)
  const validQuestions = questionsReady && data.quiz.questions.every(
    (question) => question.options.length >= 2 && question.options.filter((option) => option.is_correct).length === 1,
  )

  return (
    <div className={styles.workflowGrid}>
      <section className={styles.panel}>
        <h2>Kesiapan publish</h2>
        <div className={styles.readiness}>
          <div><span>Materi</span><b className={blocksReady ? styles.ready : styles.notReady}>{blocksReady ? `${data.blocks.length} materi ✓` : 'Belum ada'}</b></div>
          <div><span>Latihan sesi</span><b className={questionsReady ? styles.ready : styles.notReady}>{questionsReady ? `${data.quiz.questions.length} soal ✓` : 'Belum ada'}</b></div>
          <div><span>Kunci jawaban</span><b className={validQuestions ? styles.ready : styles.notReady}>{validQuestions ? 'Valid ✓' : 'Periksa lagi'}</b></div>
          <div><span>Nilai minimum</span><b>{data.quiz?.pass_score ?? 70}</b></div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Workflow</h2>
        <p className={styles.note}>Status sekarang: <b>{statusLabel[data.session.content_status] || data.session.content_status}</b></p>
        <label className={styles.label}>Catatan review
          <textarea className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Catatan untuk tim materi, alasan perbaikan, atau catatan persetujuan." />
        </label>
        <div className={styles.statusButtons}>
          <button className={styles.subtle} disabled={busy} onClick={() => setStatus('draft')}>Simpan sebagai Draft</button>
          <button className={styles.secondary} disabled={busy} onClick={() => setStatus('review')}>Kirim ke Review</button>
          {isSuper && <button className={styles.danger} disabled={busy} onClick={() => setStatus('changes_requested')}>Minta Perbaikan</button>}
          {isSuper && <button className={styles.secondary} disabled={busy} onClick={() => setStatus('approved')}>Setujui Materi</button>}
          {isSuper && <button className={styles.primary} disabled={busy} onClick={() => setStatus('published')}>Publikasikan</button>}
        </div>
        <div className={styles.message}>{message}</div>
      </section>

      <section className={`${styles.panel} ${styles.reviewPanel}`}>
        <h2>Catatan review</h2>
        {data.review_notes.length === 0 ? <div className={styles.empty}>Belum ada catatan review.</div> : data.review_notes.map((review) => (
          <div className={styles.reviewNote} key={review.id}>
            <b>{review.author_name || 'Admin Takumi'}</b>
            <p>{review.note}</p>
            <small>{new Date(review.created_at).toLocaleString('id-ID')}</small>
          </div>
        ))}
      </section>
    </div>
  )
}

export default function Editor({ initialData }: { initialData: EditorData }) {
  return (
    <>
      <header className={styles.editorHeader}>
        <div>
          <div className={styles.eyebrow}>{initialData.session.level_code} · SESI {initialData.session.session_no}</div>
          <h1>{initialData.session.title}</h1>
          <p>{initialData.session.level_name} · {initialData.session.access_tier === 'free' ? 'Akses gratis' : 'Akses premium'}</p>
        </div>
        <span className={`${styles.status} ${styles[initialData.session.content_status] || ''}`}>{statusLabel[initialData.session.content_status] || initialData.session.content_status}</span>
      </header>

      <div style={{ marginTop: 18 }}>
        <Workflow data={initialData} />
      </div>
    </>
  )
}

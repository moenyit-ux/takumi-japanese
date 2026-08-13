'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../../admin.module.css'
import layout from './workflow-layout.module.css'
import sessionStyles from './session-details.module.css'

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

function SessionDetails({ data }: { data: EditorData }) {
  const router = useRouter()
  const [title, setTitle] = useState(data.session.title)
  const [summary, setSummary] = useState(data.session.summary || '')
  const [minutes, setMinutes] = useState(data.session.estimated_minutes)
  const [accessTier, setAccessTier] = useState(data.session.access_tier)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setMessage('Menyimpan...')
    try {
      await callAdmin({
        action: 'save_session',
        sessionId: data.session.id,
        title,
        summary,
        estimatedMinutes: minutes,
        accessTier,
      })
      setMessage('Informasi sesi tersimpan.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan informasi sesi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className={`${styles.panel} ${sessionStyles.details}`}>
      <summary className={sessionStyles.summary}>
        <div className={sessionStyles.summaryMain}>
          <div className={sessionStyles.summaryTop}>
            <span className={sessionStyles.eyebrow}>{data.session.level_code} · SESI {data.session.session_no}</span>
          </div>
          <h1 className={sessionStyles.title}>{data.session.title}</h1>
          <p className={sessionStyles.meta}>{data.session.level_name} · {data.session.access_tier === 'free' ? 'Akses gratis' : 'Akses premium'}</p>
        </div>
        <div className={sessionStyles.summaryRight}>
          <span className={`${styles.status} ${styles[data.session.content_status] || ''}`}>{statusLabel[data.session.content_status] || data.session.content_status}</span>
          <span className={sessionStyles.toggle} aria-hidden="true" />
        </div>
      </summary>

      <div className={sessionStyles.body}>
        <div className={sessionStyles.bodyHead}>
          <h2>Informasi sesi</h2>
          <p>Bagian ini hanya perlu dibuka jika judul, ringkasan, durasi, atau akses sesi ingin diubah.</p>
        </div>
        <div className={styles.formGrid}>
          <label className={`${styles.label} ${styles.full}`}>Judul sesi
            <input className={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className={`${styles.label} ${styles.full}`}>Ringkasan
            <textarea className={styles.textarea} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Ringkasan singkat yang akan dilihat siswa." />
          </label>
          <label className={styles.label}>Estimasi menit
            <input className={styles.input} type="number" min={10} max={240} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
          </label>
          <label className={styles.label}>Akses
            <select className={styles.select} value={accessTier} onChange={(event) => setAccessTier(event.target.value as 'free' | 'paid')}>
              <option value="free">Gratis</option>
              <option value="paid">Premium</option>
            </select>
          </label>
        </div>
        <div className={styles.actions}>
          <button className={styles.primary} type="button" disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan informasi sesi'}</button>
        </div>
        <div className={styles.message}>{message}</div>
      </div>
    </details>
  )
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
    <div className={layout.grid}>
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

      <section className={`${styles.panel} ${layout.reviewPanel}`}>
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
      <SessionDetails data={initialData} />
      <div style={{ marginTop: 18 }}>
        <Workflow data={initialData} />
      </div>
    </>
  )
}

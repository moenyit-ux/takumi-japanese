'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../../admin.module.css'

type ContentBlock = {
  id: string
  position: number
  kind: string
  title: string | null
  body: unknown
  audio_url: string | null
  image_url: string | null
  updated_at: string
}

type Option = {
  id?: string
  position: number
  label: string | null
  option_text: string
  is_correct: boolean
}

type Question = {
  id: string
  position: number
  kind: string
  prompt: string
  passage: string | null
  audio_url: string | null
  explanation_id: string | null
  explanation_text: string | null
  points: number
  options: Option[]
}

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
  blocks: ContentBlock[]
  quiz: {
    id: string
    kind: string
    title: string
    pass_score: number
    time_limit_minutes: number | null
    published: boolean
    questions: Question[]
  }
  review_notes: Array<{
    id: string
    author_id: string | null
    author_name: string | null
    note: string
    created_at: string
  }>
}

type ApiPayload = Record<string, unknown>

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  review: 'Review',
  changes_requested: 'Perlu diperbaiki',
  approved: 'Disetujui',
  published: 'Published',
  archived: 'Diarsipkan',
}

const blockKinds = [
  ['vocabulary', 'Kosakata'],
  ['kanji', 'Kanji'],
  ['grammar', 'Tata bahasa'],
  ['reading', '読解 / Membaca'],
  ['listening', '聴解 / Mendengar'],
  ['note', 'Catatan'],
  ['image', 'Gambar'],
  ['audio', 'Audio'],
]

const questionKinds = [
  ['multiple_choice', 'Pilihan ganda'],
  ['reading', '読解 / Membaca'],
  ['listening', '聴解 / Mendengar'],
]

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function bodyText(value: unknown) {
  const body = asRecord(value)
  const candidate = body.text ?? body.description ?? body.explanation ?? body.passage
  return typeof candidate === 'string' ? candidate : ''
}

async function callAdmin(payload: ApiPayload) {
  const response = await fetch('/api/admin/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; data?: unknown }
  if (!response.ok || data.error) throw new Error(data.error || 'Perubahan gagal disimpan.')
  return data
}

function SessionSettings({ data }: { data: EditorData }) {
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
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.panel}>
      <h2>Informasi sesi</h2>
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
      <div className={styles.actions}><button className={styles.primary} disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan informasi sesi'}</button></div>
      <div className={styles.message}>{message}</div>
    </section>
  )
}

function BlockEditor({ sessionId, block, defaultPosition }: { sessionId: string; block?: ContentBlock; defaultPosition: number }) {
  const router = useRouter()
  const [position, setPosition] = useState(block?.position || defaultPosition)
  const [kind, setKind] = useState(block?.kind || 'vocabulary')
  const [title, setTitle] = useState(block?.title || '')
  const [text, setText] = useState(bodyText(block?.body))
  const [audioUrl, setAudioUrl] = useState(block?.audio_url || '')
  const [imageUrl, setImageUrl] = useState(block?.image_url || '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setMessage('Menyimpan...')
    try {
      await callAdmin({
        action: 'upsert_block',
        sessionId,
        blockId: block?.id || null,
        position,
        kind,
        title,
        contentBody: { ...asRecord(block?.body), text },
        audioUrl,
        imageUrl,
      })
      setMessage(block ? 'Blok diperbarui.' : 'Blok materi ditambahkan.')
      if (!block) {
        setTitle('')
        setText('')
        setAudioUrl('')
        setImageUrl('')
        setPosition((value) => value + 1)
      }
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan blok.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!block || !window.confirm('Hapus blok materi ini?')) return
    setBusy(true)
    try {
      await callAdmin({ action: 'delete_block', sessionId, blockId: block.id })
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menghapus blok.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.blockCard}>
      <div className={styles.cardHead}>
        <div><small>{block ? `BLOK ${String(block.position).padStart(2, '0')}` : 'TAMBAH BLOK'}</small><h3>{block?.title || 'Materi baru'}</h3></div>
        {block && <button className={styles.danger} disabled={busy} onClick={remove}>Hapus</button>}
      </div>
      <div className={styles.formGrid}>
        <label className={styles.label}>Urutan
          <input className={styles.input} type="number" min={1} value={position} onChange={(event) => setPosition(Number(event.target.value))} />
        </label>
        <label className={styles.label}>Jenis materi
          <select className={styles.select} value={kind} onChange={(event) => setKind(event.target.value)}>
            {blockKinds.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label className={`${styles.label} ${styles.full}`}>Judul blok
          <input className={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Kosakata tempat kerja" />
        </label>
        <label className={`${styles.label} ${styles.full}`}>Teks utama
          <textarea className={styles.textarea} value={text} onChange={(event) => setText(event.target.value)} placeholder="Masukkan materi yang sudah direview. Struktur data lain yang sudah ada tetap dipertahankan." />
        </label>
        <label className={styles.label}>URL audio (opsional)
          <input className={styles.input} type="url" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://…" />
        </label>
        <label className={styles.label}>URL gambar (opsional)
          <input className={styles.input} type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" />
        </label>
      </div>
      <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : block ? 'Simpan blok' : 'Tambah blok'}</button></div>
      <div className={styles.message}>{message}</div>
    </div>
  )
}

function normalizeOptions(question?: Question): Option[] {
  const source = (question?.options || []).map((option, index) => ({ ...option, position: index + 1, label: option.label || String.fromCharCode(65 + index) }))
  while (source.length < 4) {
    const index = source.length
    source.push({ position: index + 1, label: String.fromCharCode(65 + index), option_text: '', is_correct: false })
  }
  return source.slice(0, 6)
}

function QuestionEditor({ sessionId, quizId, question, defaultPosition }: { sessionId: string; quizId: string; question?: Question; defaultPosition: number }) {
  const router = useRouter()
  const [position, setPosition] = useState(question?.position || defaultPosition)
  const [kind, setKind] = useState(question?.kind || 'multiple_choice')
  const [prompt, setPrompt] = useState(question?.prompt || '')
  const [passage, setPassage] = useState(question?.passage || '')
  const [audioUrl, setAudioUrl] = useState(question?.audio_url || '')
  const [explanationId, setExplanationId] = useState(question?.explanation_id || '')
  const [explanationText, setExplanationText] = useState(question?.explanation_text || '')
  const [points, setPoints] = useState(question?.points || 1)
  const [options, setOptions] = useState<Option[]>(normalizeOptions(question))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? { ...option, option_text: value } : option))
  }

  function setCorrect(index: number) {
    setOptions((current) => current.map((option, optionIndex) => ({ ...option, is_correct: optionIndex === index })))
  }

  async function save() {
    const filled = options.filter((option) => option.option_text.trim()).map((option, index) => ({
      label: String.fromCharCode(65 + index),
      option_text: option.option_text.trim(),
      is_correct: option.is_correct,
    }))
    if (filled.length < 2) {
      setMessage('Isi minimal dua pilihan jawaban.')
      return
    }
    if (filled.filter((option) => option.is_correct).length !== 1) {
      setMessage('Pilih tepat satu jawaban benar di antara pilihan yang terisi.')
      return
    }

    setBusy(true)
    setMessage('Menyimpan...')
    try {
      await callAdmin({
        action: 'upsert_question',
        sessionId,
        quizId,
        questionId: question?.id || null,
        position,
        kind,
        prompt,
        passage,
        audioUrl,
        explanationId,
        explanationText,
        points,
        options: filled,
      })
      setMessage(question ? 'Soal diperbarui.' : 'Soal ditambahkan.')
      if (!question) {
        setPrompt('')
        setPassage('')
        setAudioUrl('')
        setExplanationId('')
        setExplanationText('')
        setOptions(normalizeOptions())
        setPosition((value) => value + 1)
      }
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan soal.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!question || !window.confirm('Hapus soal ini?')) return
    setBusy(true)
    try {
      await callAdmin({ action: 'delete_question', sessionId, quizId, questionId: question.id })
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menghapus soal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.questionCard}>
      <div className={styles.cardHead}>
        <div><small>{question ? `SOAL ${String(question.position).padStart(2, '0')}` : 'TAMBAH SOAL'}</small><h3>{question?.prompt || 'Soal baru'}</h3></div>
        {question && <button className={styles.danger} disabled={busy} onClick={remove}>Hapus</button>}
      </div>
      <div className={styles.formGrid}>
        <label className={styles.label}>Urutan
          <input className={styles.input} type="number" min={1} value={position} onChange={(event) => setPosition(Number(event.target.value))} />
        </label>
        <label className={styles.label}>Jenis soal
          <select className={styles.select} value={kind} onChange={(event) => setKind(event.target.value)}>
            {questionKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={`${styles.label} ${styles.full}`}>Pertanyaan
          <textarea className={styles.textarea} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Tuliskan pertanyaan." />
        </label>
        <label className={`${styles.label} ${styles.full}`}>Bacaan / konteks (opsional)
          <textarea className={styles.textarea} value={passage} onChange={(event) => setPassage(event.target.value)} placeholder="Gunakan untuk soal 読解 atau konteks tambahan." />
        </label>
        <label className={styles.label}>URL audio (聴解)
          <input className={styles.input} type="url" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://…" />
        </label>
        <label className={styles.label}>Bobot
          <input className={styles.input} type="number" min={0.1} step={0.1} value={points} onChange={(event) => setPoints(Number(event.target.value))} />
        </label>
      </div>

      <div className={styles.divider} />
      <h3>Pilihan jawaban</h3>
      <p className={styles.note}>Pilih tombol radio untuk menandai jawaban benar. Pilihan kosong tidak akan disimpan.</p>
      {options.map((option, index) => (
        <div className={styles.optionRow} key={`${question?.id || 'new'}-${index}`}>
          <input aria-label={`Jawaban benar ${index + 1}`} type="radio" name={`correct-${question?.id || 'new'}`} checked={option.is_correct} onChange={() => setCorrect(index)} />
          <span className={styles.optionLabel}>{String.fromCharCode(65 + index)}</span>
          <input className={styles.input} value={option.option_text} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Pilihan ${String.fromCharCode(65 + index)}`} />
        </div>
      ))}

      <div className={styles.divider} />
      <div className={styles.formGrid}>
        <label className={styles.label}>ID penjelasan (opsional)
          <input className={styles.input} value={explanationId} onChange={(event) => setExplanationId(event.target.value)} placeholder="mis. N4-S01-Q01" />
        </label>
        <label className={`${styles.label} ${styles.full}`}>Penjelasan bahasa Indonesia
          <textarea className={styles.textarea} value={explanationText} onChange={(event) => setExplanationText(event.target.value)} placeholder="Penjelasan ini baru ditampilkan setelah soal dinilai." />
        </label>
      </div>
      <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : question ? 'Simpan soal' : 'Tambah soal'}</button></div>
      <div className={`${styles.message} ${message.toLowerCase().includes('gagal') ? styles.error : ''}`}>{message}</div>
    </div>
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
  const validQuestions = questionsReady && data.quiz.questions.every((question) => question.options.length >= 2 && question.options.filter((option) => option.is_correct).length === 1)

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <h2>Kesiapan publish</h2>
        <div className={styles.readiness}>
          <div><span>Materi</span><b className={blocksReady ? styles.ready : styles.notReady}>{blocksReady ? `${data.blocks.length} blok ✓` : 'Belum ada'}</b></div>
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

      <section className={styles.panel}>
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
  const quizId = initialData.quiz?.id

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

      <div className={styles.editorGrid}>
        <div className={styles.stack}>
          <SessionSettings data={initialData} />

          <section className={styles.panel}>
            <div className={styles.cardHead}><div><div className={styles.eyebrow}>MATERI</div><h2>Blok pembelajaran</h2></div><span className={styles.smallMeta}>{initialData.blocks.length} blok</span></div>
            <p className={styles.note}>Gunakan blok untuk Kosakata, Kanji, Tata Bahasa, 読解, 聴解, catatan, gambar, atau audio. Urutan dapat diubah dari angka posisi.</p>
            {initialData.blocks.map((block) => <BlockEditor key={block.id} sessionId={initialData.session.id} block={block} defaultPosition={block.position} />)}
            <BlockEditor sessionId={initialData.session.id} defaultPosition={initialData.blocks.length + 1} />
          </section>

          <section className={styles.panel}>
            <div className={styles.cardHead}><div><div className={styles.eyebrow}>LATIHAN SESI</div><h2>{initialData.quiz?.title || 'Latihan sesi'}</h2></div><span className={styles.smallMeta}>Lulus ≥ {initialData.quiz?.pass_score ?? 70}</span></div>
            {!quizId ? <div className={styles.empty}>Struktur kuis sesi belum tersedia.</div> : <>
              <p className={styles.note}>Kunci jawaban dan penjelasan hanya tersedia di editor admin. Siswa tidak dapat membacanya sebelum penilaian.</p>
              {initialData.quiz.questions.map((question) => <QuestionEditor key={question.id} sessionId={initialData.session.id} quizId={quizId} question={question} defaultPosition={question.position} />)}
              <QuestionEditor sessionId={initialData.session.id} quizId={quizId} defaultPosition={initialData.quiz.questions.length + 1} />
            </>}
          </section>
        </div>

        <Workflow data={initialData} />
      </div>
    </>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import baseStyles from '../../../admin.module.css'
import quizStyles from './quiz-groups.module.css'
import RichTextInput from '../../../rich-text-input'
import FormattedText from '@/app/components/formatted-text'

const styles = { ...baseStyles, ...quizStyles }

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

type QuizGroup = {
  id: string
  group_no: number
  title: string
  pass_score: number
  time_limit_minutes: number | null
  published: boolean
  questions: Question[]
}

type Props = {
  sessionId: string
  role: string
  quizzes: QuizGroup[]
}

const questionKinds = [
  ['multiple_choice', 'Pilihan ganda'],
  ['reading', '読解 / Membaca'],
  ['listening', '聴解 / Mendengar'],
]

async function callAdmin(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { data?: unknown; error?: string }
  if (!response.ok || data.error) throw new Error(data.error || 'Perubahan gagal disimpan.')
  return data.data
}

async function uploadAudio(sessionId: string, file: File) {
  const form = new FormData()
  form.append('sessionId', sessionId)
  form.append('file', file)
  const response = await fetch('/api/admin/assets', { method: 'POST', body: form })
  const data = await response.json().catch(() => ({})) as { asset?: string; error?: string }
  if (!response.ok || !data.asset) throw new Error(data.error || 'Upload audio gagal.')
  return data.asset
}

function normalizeOptions(question?: Question): Option[] {
  const source = (question?.options || []).map((option, index) => ({
    ...option,
    position: index + 1,
    label: option.label || String.fromCharCode(65 + index),
  }))

  while (source.length < 4) {
    const index = source.length
    source.push({
      position: index + 1,
      label: String.fromCharCode(65 + index),
      option_text: '',
      is_correct: false,
    })
  }

  return source.slice(0, 6)
}

function QuestionCard({ sessionId, quizId, question, defaultPosition }: { sessionId: string; quizId: string; question?: Question; defaultPosition: number }) {
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

  function updateOption(index: number, patch: Partial<Option>) {
    setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option))
  }

  function setCorrect(index: number) {
    setOptions((current) => current.map((option, optionIndex) => ({ ...option, is_correct: optionIndex === index })))
  }

  function addOption() {
    if (options.length >= 6) return
    const index = options.length
    setOptions([...options, { position: index + 1, label: String.fromCharCode(65 + index), option_text: '', is_correct: false }])
  }

  async function handleAudio(file: File) {
    setBusy(true)
    setMessage('Mengunggah audio...')
    try {
      const path = await uploadAudio(sessionId, file)
      setAudioUrl(path)
      setMessage('Audio terunggah. Simpan soal untuk menyimpan perubahan.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload audio gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    const filled = options
      .filter((option) => option.option_text.trim())
      .map((option, index) => ({
        label: String.fromCharCode(65 + index),
        option_text: option.option_text.trim(),
        is_correct: option.is_correct,
      }))

    if (!prompt.trim()) {
      setMessage('Pertanyaan belum diisi.')
      return
    }
    if (filled.length < 2) {
      setMessage('Isi minimal dua pilihan jawaban.')
      return
    }
    if (filled.filter((option) => option.is_correct).length !== 1) {
      setMessage('Pilih tepat satu jawaban benar.')
      return
    }

    setBusy(true)
    setMessage('Menyimpan soal...')
    try {
      await callAdmin({
        action: 'upsert_question',
        sessionId,
        quizId,
        questionId: question?.id || null,
        position,
        kind,
        prompt: prompt.trim(),
        passage,
        audioUrl,
        explanationId,
        explanationText,
        points,
        options: filled,
      })
      setMessage(question ? 'Soal diperbarui.' : 'Soal berhasil ditambahkan.')
      if (!question) {
        setPrompt('')
        setPassage('')
        setAudioUrl('')
        setExplanationId('')
        setExplanationText('')
        setPoints(1)
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
    <details className={styles.quizQuestion} open={question ? undefined : true}>
      <summary className={styles.quizQuestionSummary}>
        <span>{question ? `SOAL ${String(question.position).padStart(2, '0')}` : 'TAMBAH SOAL'}</span>
        <b>{question ? <FormattedText text={question.prompt} /> : 'Buat soal baru'}</b>
        <i>{question ? 'Buka editor' : 'Isi soal'}</i>
      </summary>
    <section className={styles.panel}>
      <div className={styles.cardHead}>
        <div>
          <div className={styles.eyebrow}>{question ? `SOAL ${String(question.position).padStart(2, '0')}` : 'TAMBAH SOAL'}</div>
          <h2>{question ? <FormattedText text={question.prompt} /> : 'Soal baru'}</h2>
        </div>
        {question && <button className={styles.danger} type="button" disabled={busy} onClick={remove}>Hapus soal</button>}
      </div>

      <div className={styles.formGrid}>
        <label className={styles.label}>Urutan
          <input className={styles.input} type="number" min={1} value={position} onChange={(event) => setPosition(Math.max(1, Number(event.target.value) || 1))} />
        </label>
        <label className={styles.label}>Jenis soal
          <select className={styles.select} value={kind} onChange={(event) => setKind(event.target.value)}>
            {questionKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className={styles.label}>Poin
          <input className={styles.input} type="number" min={1} value={points} onChange={(event) => setPoints(Math.max(1, Number(event.target.value) || 1))} />
        </label>

        <label className={`${styles.label} ${styles.full}`}>Pertanyaan
          <RichTextInput className={styles.textarea} value={prompt} onChange={setPrompt} placeholder="Tuliskan pertanyaan kuis." />
        </label>

        {(kind === 'reading' || passage) && <label className={`${styles.label} ${styles.full}`}>Bacaan / konteks
          <textarea className={styles.textarea} value={passage} onChange={(event) => setPassage(event.target.value)} placeholder="Isi bacaan untuk soal dokkai bila diperlukan." />
        </label>}

        {(kind === 'listening' || audioUrl) && <label className={`${styles.label} ${styles.full}`}>Audio Choukai
          <input className={styles.input} value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="storage://learning-assets/..." />
          <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAudio(file) }} />
        </label>}
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        <div className={styles.cardHead}>
          <div><div className={styles.eyebrow}>PILIHAN JAWABAN</div><h3>Pilih satu jawaban benar</h3></div>
          {options.length < 6 && <button className={styles.subtle} type="button" onClick={addOption}>+ Pilihan</button>}
        </div>
        {options.map((option, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 10, alignItems: 'center' }}>
            <b>{String.fromCharCode(65 + index)}</b>
            <RichTextInput multiline={false} className={styles.input} value={option.option_text} onChange={(value) => updateOption(index, { option_text: value })} placeholder={`Pilihan ${String.fromCharCode(65 + index)}`} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
              <input type="radio" name={`correct-${question?.id || 'new'}`} checked={option.is_correct} onChange={() => setCorrect(index)} /> Benar
            </label>
          </div>
        ))}
      </div>

      <div className={styles.formGrid} style={{ marginTop: 18 }}>
        <label className={`${styles.label} ${styles.full}`}>Penjelasan jawaban
          <textarea className={styles.textarea} value={explanationText} onChange={(event) => setExplanationText(event.target.value)} placeholder="Penjelasan yang ditampilkan setelah siswa menjawab." />
        </label>
        <label className={`${styles.label} ${styles.full}`}>ID penjelasan (opsional)
          <input className={styles.input} value={explanationId} onChange={(event) => setExplanationId(event.target.value)} placeholder="Kosongkan bila tidak digunakan." />
        </label>
      </div>

      <div className={styles.actions}>
        <button className={styles.primary} type="button" disabled={busy} onClick={save}>{busy ? 'Memproses…' : question ? 'Simpan perubahan' : 'Tambah soal'}</button>
      </div>
      <div className={styles.message}>{message}</div>
    </section>
    </details>
  )
}

export default function QuizEditor({ sessionId, role, quizzes }: Props) {
  const router = useRouter()
  const [activeQuizId, setActiveQuizId] = useState(quizzes[0]?.id || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!quizzes.some((quiz) => quiz.id === activeQuizId)) {
      setActiveQuizId(quizzes[0]?.id || '')
    }
  }, [activeQuizId, quizzes])

  const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId) || quizzes[0]

  async function createGroup() {
    setBusy(true)
    setMessage('Membuat kelompok kuis baru...')
    try {
      const result = await callAdmin({ action: 'create_quiz_group', sessionId }) as { id?: string } | null
      if (result?.id) setActiveQuizId(result.id)
      setMessage('Kelompok kuis baru berhasil dibuat.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kelompok kuis gagal dibuat.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteGroup() {
    if (!activeQuiz || !window.confirm(`Hapus Kuis ${activeQuiz.group_no} beserta semua soalnya?`)) return
    setBusy(true)
    setMessage('Menghapus kelompok kuis...')
    try {
      await callAdmin({ action: 'delete_quiz_group', sessionId, quizId: activeQuiz.id })
      setActiveQuizId(quizzes.find((quiz) => quiz.id !== activeQuiz.id)?.id || '')
      setMessage('Kelompok kuis berhasil dihapus.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kelompok kuis gagal dihapus.')
    } finally {
      setBusy(false)
    }
  }

  async function setPublished(published: boolean) {
    if (!activeQuiz) return
    setBusy(true)
    setMessage(published ? 'Menerbitkan kelompok kuis...' : 'Menarik kelompok kuis...')
    try {
      await callAdmin({ action: 'set_quiz_group_published', sessionId, quizId: activeQuiz.id, published })
      setMessage(published ? 'Kelompok kuis sudah diterbitkan.' : 'Kelompok kuis kembali menjadi draft.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Status kelompok kuis gagal diubah.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.stack}>
      <section className={`${styles.panel} ${styles.quizGroupsPanel}`}>
        <div className={styles.quizGroupsHead}>
          <div>
            <div className={styles.eyebrow}>KELOMPOK KUIS</div>
            <h2>Pilih kuis yang ingin diisi</h2>
            <p className={styles.note}>Setiap kelompok menyimpan daftar soal dan hasil pengerjaannya secara terpisah.</p>
          </div>
          <button className={`${styles.primary} ${styles.quizCreateButton}`} type="button" disabled={busy} onClick={createGroup}>
            <span className={styles.quizCreateIcon} aria-hidden="true">＋</span>
            <span className={styles.quizCreateCopy}>
              <b>Kuis baru</b>
              <small>Tambah kelompok</small>
            </span>
            <i aria-hidden="true">→</i>
          </button>
        </div>

        <div className={styles.quizGroupTabs} role="tablist" aria-label="Kelompok kuis">
          {quizzes.map((quiz) => (
            <button
              className={quiz.id === activeQuiz?.id ? styles.quizGroupActive : ''}
              type="button"
              role="tab"
              aria-selected={quiz.id === activeQuiz?.id}
              onClick={() => setActiveQuizId(quiz.id)}
              key={quiz.id}
            >
              <small>KUIS</small>
              <b>{String(quiz.group_no).padStart(2, '0')}</b>
              <span>{quiz.questions.length} soal</span>
              <i>{quiz.published ? 'Terbit' : 'Draft'}</i>
            </button>
          ))}
        </div>
        {message && <div className={styles.message}>{message}</div>}
      </section>

      {activeQuiz ? (
        <>
          <section className={`${styles.panel} ${styles.quizGroupToolbar}`}>
            <div>
              <div className={styles.eyebrow}>KUIS {String(activeQuiz.group_no).padStart(2, '0')}</div>
              <h2>{activeQuiz.title}</h2>
              <p className={styles.note}>{activeQuiz.questions.length} soal · Nilai lulus ≥ {activeQuiz.pass_score} · {activeQuiz.published ? 'Sudah diterbitkan' : 'Masih draft'}</p>
            </div>
            <div className={styles.actions}>
              {role === 'super_admin' && (
                <button className={styles.secondary} type="button" disabled={busy} onClick={() => void setPublished(!activeQuiz.published)}>
                  {activeQuiz.published ? 'Jadikan draft' : 'Terbitkan kuis'}
                </button>
              )}
              {quizzes.length > 1 && <button className={styles.danger} type="button" disabled={busy} onClick={deleteGroup}>Hapus kelompok</button>}
            </div>
          </section>

          {activeQuiz.questions.map((question) => (
            <QuestionCard key={question.id} sessionId={sessionId} quizId={activeQuiz.id} question={question} defaultPosition={question.position} />
          ))}
          <QuestionCard sessionId={sessionId} quizId={activeQuiz.id} defaultPosition={activeQuiz.questions.length + 1} />
        </>
      ) : (
        <section className={styles.empty}>Belum ada kelompok kuis. Tekan “+ Kuis baru” untuk memulai.</section>
      )}
    </div>
  )
}
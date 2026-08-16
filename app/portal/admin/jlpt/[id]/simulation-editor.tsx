'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import jlpt from '../jlpt.module.css'

type SectionKind = 'multiple_choice' | 'reading' | 'listening'

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
  kind: SectionKind
  prompt: string
  passage: string | null
  audio_url: string | null
  explanation_id: string | null
  explanation_text: string | null
  points: number
  options: Option[]
}

type Props = {
  quizId: string
  questions: Question[]
  locked?: boolean
}

const sections: Array<{ key: SectionKind; label: string; jp: string; description: string }> = [
  { key: 'multiple_choice', label: 'Gengo Chishiki', jp: '言語知識', description: 'Soal huruf, kosakata, tata bahasa, dan penggunaan bahasa.' },
  { key: 'reading', label: 'Dokkai', jp: '読解', description: 'Soal membaca dengan bacaan atau konteks yang dapat digunakan bersama pertanyaan.' },
  { key: 'listening', label: 'Choukai', jp: '聴解', description: 'Soal mendengar dengan audio. Skrip dapat disimpan sebagai konteks internal bila diperlukan.' },
]

function normalizeOptions(question?: Question): Option[] {
  const source = (question?.options || []).map((option, index) => ({
    ...option,
    position: index + 1,
    label: String.fromCharCode(65 + index),
  }))
  while (source.length < 4) {
    const index = source.length
    source.push({ position: index + 1, label: String.fromCharCode(65 + index), option_text: '', is_correct: false })
  }
  return source.slice(0, 4)
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

async function uploadAudio(quizId: string, file: File) {
  const form = new FormData()
  form.append('quizId', quizId)
  form.append('file', file)
  const response = await fetch('/api/admin/assets', { method: 'POST', body: form })
  const data = await response.json().catch(() => ({})) as { asset?: string; error?: string }
  if (!response.ok || !data.asset) throw new Error(data.error || 'Upload audio gagal.')
  return data.asset
}

function QuestionCard({ quizId, question, defaultPosition, defaultKind, locked }: {
  quizId: string
  question?: Question
  defaultPosition: number
  defaultKind: SectionKind
  locked?: boolean
}) {
  const router = useRouter()
  const [position, setPosition] = useState(question?.position || defaultPosition)
  const [kind, setKind] = useState<SectionKind>(question?.kind || defaultKind)
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

  async function handleAudio(file: File) {
    setBusy(true)
    setMessage('Mengunggah audio...')
    try {
      const path = await uploadAudio(quizId, file)
      setAudioUrl(path)
      setMessage('Audio terunggah. Klik Simpan soal untuk menyimpan perubahan.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload audio gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (locked) return
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
        action: 'upsert_simulation_question',
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
      setMessage(question ? 'Perubahan soal tersimpan.' : 'Soal simulasi berhasil ditambahkan.')
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
    if (!question || locked || !window.confirm('Hapus soal simulasi ini?')) return
    setBusy(true)
    try {
      await callAdmin({ action: 'delete_simulation_question', quizId, questionId: question.id })
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menghapus soal.')
    } finally {
      setBusy(false)
    }
  }

  const title = question?.prompt || 'Soal baru'
  const section = sections.find((item) => item.key === kind) || sections[0]

  return (
    <details className={jlpt.questionCard} open={!question}>
      <summary>
        <span className={jlpt.questionNumber}>{String(position).padStart(2, '0')}</span>
        <div className={jlpt.questionHeading}>
          <small>{question ? `${section.jp} · SOAL ${String(position).padStart(2, '0')}` : 'TAMBAH SOAL'}</small>
          <b>{title}</b>
        </div>
        <span className={jlpt.chevron}>⌄</span>
      </summary>

      <div className={jlpt.questionBody}>
        <div className={jlpt.questionGrid}>
          <label className={jlpt.field}>Nomor soal
            <input className={jlpt.input} type="number" min={1} value={position} disabled={locked} onChange={(event) => setPosition(Math.max(1, Number(event.target.value) || 1))} />
          </label>
          <label className={jlpt.field}>Bagian ujian
            <select className={jlpt.select} value={kind} disabled={locked} onChange={(event) => setKind(event.target.value as SectionKind)}>
              {sections.map((item) => <option value={item.key} key={item.key}>{item.jp} · {item.label}</option>)}
            </select>
          </label>
          <label className={jlpt.field}>Poin
            <input className={jlpt.input} type="number" min={1} step="0.5" value={points} disabled={locked} onChange={(event) => setPoints(Math.max(.5, Number(event.target.value) || 1))} />
          </label>

          <label className={`${jlpt.field} ${jlpt.full}`}>Pertanyaan
            <textarea className={jlpt.textarea} value={prompt} disabled={locked} onChange={(event) => setPrompt(event.target.value)} placeholder="Tuliskan pertanyaan seperti pada format JLPT." />
          </label>

          {(kind === 'reading' || passage) && (
            <label className={`${jlpt.field} ${jlpt.full}`}>Bacaan / konteks
              <textarea className={jlpt.textarea} value={passage} disabled={locked} onChange={(event) => setPassage(event.target.value)} placeholder="Masukkan bacaan atau konteks yang diperlukan untuk soal ini." />
            </label>
          )}

          {(kind === 'listening' || audioUrl) && (
            <div className={`${jlpt.field} ${jlpt.full}`}>
              <span>Audio Choukai</span>
              <div className={jlpt.audioBox}>
                <input className={jlpt.input} value={audioUrl} disabled={locked} onChange={(event) => setAudioUrl(event.target.value)} placeholder="storage://learning-assets/simulations/..." />
                {!locked && <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAudio(file) }} />}
              </div>
            </div>
          )}
        </div>

        <div className={jlpt.options}>
          <div className={jlpt.field}>Pilihan jawaban</div>
          {options.map((option, index) => (
            <div className={jlpt.optionRow} key={index}>
              <span className={jlpt.optionLabel}>{String.fromCharCode(65 + index)}</span>
              <input className={jlpt.input} value={option.option_text} disabled={locked} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Pilihan ${String.fromCharCode(65 + index)}`} />
              <label className={jlpt.correctChoice}>
                <input type="radio" name={`correct-${question?.id || `new-${defaultKind}`}`} checked={option.is_correct} disabled={locked} onChange={() => setCorrect(index)} /> Benar
              </label>
            </div>
          ))}
        </div>

        <div className={jlpt.questionGrid}>
          <label className={`${jlpt.field} ${jlpt.full}`}>Penjelasan jawaban
            <textarea className={jlpt.textarea} value={explanationText} disabled={locked} onChange={(event) => setExplanationText(event.target.value)} placeholder="Penjelasan untuk ditampilkan setelah simulasi selesai." />
          </label>
          <label className={`${jlpt.field} ${jlpt.full}`}>ID penjelasan (opsional)
            <input className={jlpt.input} value={explanationId} disabled={locked} onChange={(event) => setExplanationId(event.target.value)} placeholder="Kosongkan bila tidak digunakan." />
          </label>
        </div>

        {!locked && (
          <div className={jlpt.actions}>
            <button className={jlpt.save} type="button" disabled={busy} onClick={save}>{busy ? 'Memproses…' : question ? 'Simpan perubahan' : 'Tambah soal'}</button>
            {question && <button className={jlpt.danger} type="button" disabled={busy} onClick={remove}>Hapus soal</button>}
          </div>
        )}
        <div className={jlpt.message}>{message}</div>
      </div>
    </details>
  )
}

export default function SimulationEditor({ quizId, questions, locked = false }: Props) {
  const [activeSection, setActiveSection] = useState<SectionKind>('multiple_choice')
  const counts = useMemo(() => ({
    multiple_choice: questions.filter((item) => item.kind === 'multiple_choice').length,
    reading: questions.filter((item) => item.kind === 'reading').length,
    listening: questions.filter((item) => item.kind === 'listening').length,
  }), [questions])
  const visible = useMemo(() => questions.filter((item) => item.kind === activeSection).sort((a, b) => a.position - b.position), [questions, activeSection])
  const activeMeta = sections.find((item) => item.key === activeSection) || sections[0]
  const nextPosition = questions.reduce((max, item) => Math.max(max, item.position), 0) + 1

  return (
    <>
      <div className={jlpt.sectionTabs} role="tablist" aria-label="Bagian simulasi JLPT">
        {sections.map((item) => (
          <button className={activeSection === item.key ? jlpt.active : ''} type="button" role="tab" aria-selected={activeSection === item.key} key={item.key} onClick={() => setActiveSection(item.key)}>
            <span>{item.jp} · {item.label}</span><b>{counts[item.key]}</b>
          </button>
        ))}
      </div>

      <div className={jlpt.sectionIntro}>
        <div><small>{activeMeta.jp}</small><h3>{activeMeta.label}</h3><p>{activeMeta.description}</p></div>
        <strong>{visible.length} soal</strong>
      </div>

      {locked && <div className={jlpt.historyWarning}>Paket ini sudah memiliki riwayat pengerjaan siswa. Untuk menjaga konsistensi hasil lama, soal dikunci dan tidak dapat diedit atau dihapus.</div>}

      <div className={jlpt.questionList}>
        {visible.length ? visible.map((question) => (
          <QuestionCard key={question.id} quizId={quizId} question={question} defaultPosition={question.position} defaultKind={activeSection} locked={locked} />
        )) : <div className={jlpt.empty}>Belum ada soal di bagian {activeMeta.jp}.</div>}
        {!locked && <QuestionCard quizId={quizId} defaultPosition={nextPosition} defaultKind={activeSection} />}
      </div>
    </>
  )
}

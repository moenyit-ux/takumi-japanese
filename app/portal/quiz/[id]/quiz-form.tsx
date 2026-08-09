'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

type Option = {
  id: string
  question_id: string
  position: number
  label: string | null
  option_text: string
}

type Question = {
  id: string
  position: number
  kind: string
  prompt: string
  passage: string | null
  audio_url: string | null
  points: number
  options: Option[]
}

type Result = {
  attempt_id: string
  attempt_no: number
  score: number
  pass_score: number
  passed: boolean
  wrong_count: number
  question_count: number
}

type Props = {
  quizId: string
  sessionId: string | null
  title: string
  passScore: number
  timeLimitMinutes: number | null
  questions: Question[]
}

export default function QuizForm({ quizId, sessionId, title, passScore, timeLimitMinutes, questions }: Props) {
  const router = useRouter()
  const startedAt = useRef(Date.now())
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || result) return

    setBusy(true)
    setMessage('Menilai jawaban...')

    const response = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId,
        answers,
        timeSpentSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.result) {
      setMessage(payload?.error === 'quiz_not_available'
        ? 'Latihan ini tidak tersedia untuk akun Anda.'
        : payload?.error === 'quiz_has_no_questions'
          ? 'Bank soal latihan ini masih kosong.'
          : 'Jawaban belum dapat dinilai. Silakan coba lagi.')
      setBusy(false)
      return
    }

    setResult(payload.result as Result)
    setMessage('')
    setBusy(false)
    router.refresh()
  }

  if (result) {
    return (
      <section className="quiz-result panel">
        <div className="eyebrow">HASIL PERCOBAAN {result.attempt_no}</div>
        <div className="score-orb">{Math.round(result.score)}</div>
        <h2>{result.passed ? 'Lulus latihan' : 'Belum mencapai target'}</h2>
        <p>Nilai Anda <b>{result.score}</b>. Target latihan ini <b>≥{result.pass_score}</b>. {result.wrong_count} dari {result.question_count} soal perlu ditinjau lagi.</p>
        <p>Soal yang salah sudah otomatis dimasukkan ke <b>Dipelajari Lagi</b>.</p>
        <div className="actions">
          {sessionId && <Link className="btn primary" href={`/portal/session/${sessionId}`}>Kembali ke sesi</Link>}
          <Link className="btn ghost" href="/portal/bookmark">Buka Dipelajari Lagi</Link>
        </div>
      </section>
    )
  }

  return (
    <form className="quiz-form" onSubmit={submit}>
      <section className="quiz-intro panel">
        <div><div className="eyebrow">LATIHAN</div><h1>{title}</h1><p>Target kelulusan ≥{passScore}. Jawaban salah akan otomatis masuk ke Dipelajari Lagi.</p></div>
        <div className="quiz-meta"><b>{questions.length}</b><span>soal</span>{timeLimitMinutes && <small>Batas waktu: {timeLimitMinutes} menit</small>}</div>
      </section>

      {questions.map((question) => (
        <article className="question-card" key={question.id}>
          <div className="question-number">{String(question.position).padStart(2, '0')}</div>
          {question.passage && <div className="reading-passage">{question.passage}</div>}
          {question.audio_url && <audio controls preload="none" src={question.audio_url}>Browser Anda tidak mendukung audio.</audio>}
          <h2>{question.prompt}</h2>
          <div className="option-list">
            {question.options.map((option) => (
              <label className={answers[question.id] === option.id ? 'selected' : ''} key={option.id}>
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                />
                <span>{option.label || String(option.position)}</span>
                <b>{option.option_text}</b>
              </label>
            ))}
          </div>
        </article>
      ))}

      <section className="quiz-submit panel">
        <div><b>{Object.keys(answers).length}/{questions.length} terjawab</b><p>Soal yang belum dijawab akan dinilai salah.</p></div>
        <button className="btn primary" disabled={busy || questions.length === 0}>{busy ? 'Menilai...' : 'Kirim jawaban'}</button>
      </section>
      <p className="message" aria-live="polite">{message}</p>
    </form>
  )
}

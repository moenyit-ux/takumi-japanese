'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import FormattedText from '@/app/components/formatted-text'

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

type ReviewQuestion = {
  id: string
  position: number
  kind: string
  prompt: string
  selected_option_id: string | null
  selected_option_text: string | null
  correct_option_id: string | null
  correct_option_text: string | null
  is_correct: boolean
  explanation_id: string | null
  explanation_text: string | null
}

type Review = {
  attempt_id: string
  attempt_no: number
  score: number
  result_status: string
  questions: ReviewQuestion[]
}

type Props = {
  quizId: string
  sessionId: string | null
  title: string
  passScore: number
  timeLimitMinutes: number | null
  questions: Question[]
  initialBookmarkedQuestionIds?: string[]
  nextHref?: string | null
}

function formatTime(value: number) {
  const total = Math.max(0, Math.floor(value))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const kindLabel: Record<string, string> = {
  multiple_choice: 'Kosakata',
  reading: 'Dokkai',
  listening: 'Choukai',
}

export default function QuizForm({ quizId, sessionId, title, passScore, timeLimitMinutes, questions, initialBookmarkedQuestionIds = [], nextHref }: Props) {
  const router = useRouter()
  const startedAt = useRef(Date.now())
  const answersRef = useRef<Record<string, string>>({})
  const gradingRef = useRef(false)
  const totalSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : null

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>(() => Object.fromEntries(initialBookmarkedQuestionIds.map((id) => [id, true])))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [showAllReview, setShowAllReview] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [remaining, setRemaining] = useState<number | null>(totalSeconds)

  const current = questions[currentIndex] || questions[0]

  function choose(questionId: string, optionId: string) {
    const next = { ...answersRef.current, [questionId]: optionId }
    answersRef.current = next
    setAnswers(next)
  }

  async function toggleBookmark(questionId: string) {
    const active = Boolean(bookmarked[questionId])
    setMessage('')
    try {
      const response = await fetch('/api/bookmarks/question', {
        method: active ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })
      const payload = await response.json().catch(() => null) as { bookmarked?: boolean } | null
      if (!response.ok || typeof payload?.bookmarked !== 'boolean') {
        setMessage('Tanda soal belum dapat diperbarui.')
        return
      }
      setBookmarked((value) => ({ ...value, [questionId]: payload.bookmarked as boolean }))
      setMessage(payload.bookmarked ? 'Soal ditandai untuk dipelajari lagi.' : 'Tanda soal dihapus.')
    } catch {
      setMessage('Tanda soal belum dapat diperbarui.')
    }
  }

  async function grade(auto = false) {
    if (gradingRef.current || result) return
    if (!auto && !window.confirm('Kirim jawaban dan lihat hasil kuis sekarang?')) return

    gradingRef.current = true
    setBusy(true)
    setMessage(auto ? 'Waktu habis. Menilai jawaban...' : 'Menilai jawaban...')
    const elapsed = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, answers: answersRef.current, timeSpentSeconds: elapsed }),
      })
      const payload = await response.json().catch(() => null) as { result?: Result; review?: Review | null; error?: string } | null

      if (!response.ok || !payload?.result) {
        setMessage(payload?.error === 'quiz_not_available'
          ? 'Latihan ini tidak tersedia untuk akun Anda.'
          : payload?.error === 'quiz_has_no_questions'
            ? 'Bank soal latihan ini masih kosong.'
            : 'Jawaban belum dapat dinilai. Silakan coba lagi.')
        return
      }

      setDurationSeconds(elapsed)
      setResult(payload.result)
      setReview(payload.review || null)
      setMessage('')
      router.refresh()
    } catch {
      setMessage('Jawaban belum dapat dinilai. Periksa koneksi lalu coba lagi.')
    } finally {
      gradingRef.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    if (remaining == null || result || busy) return
    if (remaining <= 0) {
      void grade(true)
      return
    }
    const timer = window.setTimeout(() => setRemaining((value) => value == null ? null : Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining, result, busy]) // eslint-disable-line react-hooks/exhaustive-deps

  function retry() {
    answersRef.current = {}
    startedAt.current = Date.now()
    gradingRef.current = false
    setAnswers({})
    setCurrentIndex(0)
    setResult(null)
    setReview(null)
    setShowAllReview(false)
    setDurationSeconds(0)
    setRemaining(totalSeconds)
    setMessage('')
  }

  if (result) {
    const correct = Math.max(0, result.question_count - result.wrong_count)
    const reviewRows = review?.questions || []
    const visibleReview = showAllReview ? reviewRows : reviewRows.filter((item) => !item.is_correct)

    return (
      <div className="tm-result-shell">
        <section className="tm-result-hero">
          <div className="tm-result-title"><div className="tm-icon-box">🏆</div><div><h1>Hasil Kuis {title}</h1><small>Target: Melihat hasil belajar dan bagian yang harus diperbaiki.</small></div></div>
          <div className="tm-score-card">
            <div><small>Nilai</small><b>{Math.round(result.score)}</b></div>
            <div><b>{correct}/{result.question_count}</b><small>benar</small></div>
            <div><b className="tm-pass-pill">{result.passed ? '✓ Lulus' : '↻ Belum lulus'}</b></div>
          </div>
          <p className="tm-description" style={{ textAlign: 'center', marginTop: 10 }}>{result.passed ? 'Kerja bagus! Kamu sudah memahami materi dengan cukup baik.' : 'Belum mencapai target. Tinjau soal yang salah lalu coba lagi saat sudah siap.'}</p>
        </section>

        <div className="tm-result-stats">
          <article><span>Durasi</span><b>{formatTime(durationSeconds)}</b></article>
          <article><span>Benar</span><b>{correct}</b></article>
          <article><span>Salah</span><b>{result.wrong_count}</b></article>
          <article><span>Bookmark</span><b>{result.wrong_count}</b></article>
        </div>

        <section className="tm-review-panel">
          <h2>Soal yang perlu ditinjau</h2>
          <p className="tm-description">Soal salah otomatis masuk ke Dipelajari Lagi. Jawaban benar dan penjelasan baru ditampilkan setelah kuis selesai.</p>
          {visibleReview.length === 0 ? <p className="tm-inline-message">Tidak ada soal yang perlu ditinjau.</p> : visibleReview.map((item) => (
            <article className={`tm-review-item ${item.is_correct ? 'correct' : 'wrong'}`} key={item.id}>
              <div>
                <b>Soal {item.position} · {kindLabel[item.kind] || item.kind}</b>
                <p><FormattedText text={item.prompt} /></p>
                {!item.is_correct && <div className="tm-review-answer">Jawaban kamu: {item.selected_option_text || 'Tidak dijawab'}<br />Jawaban benar: <b>{item.correct_option_text || '—'}</b></div>}
                {item.explanation_text && <p><FormattedText text={item.explanation_text} /></p>}
              </div>
              <span>{item.is_correct ? '✓' : '✕'}</span>
            </article>
          ))}
        </section>

        <div className="tm-result-actions">
          <button type="button" onClick={() => setShowAllReview((value) => !value)}>{showAllReview ? 'Tampilkan yang salah saja' : 'Review Jawaban'}</button>
          <button type="button" onClick={retry}>↻ Ulangi Kuis</button>
          <Link className="wide" href={nextHref || (sessionId ? `/portal/session/${sessionId}` : '/portal/dashboard')}>Lanjut ke Berikutnya →</Link>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <form onSubmit={(event) => { event.preventDefault(); void grade(false) }}>
      <section className="tm-quiz-intro-card">
        <h1>Kuis Akhir Sesi</h1>
        <p className="tm-description">Target: Menguji pemahaman kosakata, kanji, bunpou, dokkai dan choukai.</p>
      </section>

      <section className="tm-quiz-instruction">
        <div className="tm-icon-box">☼</div>
        <div><b>Petunjuk</b><p className="tm-description">Pilih satu jawaban yang paling tepat. Kamu bisa menandai soal untuk dipelajari lagi nanti.</p></div>
      </section>

      <div className="tm-quiz-meta-grid">
        <div className="tm-quiz-meta-box">☷ {questions.length} Soal</div>
        <div className="tm-quiz-meta-box">◷ {timeLimitMinutes ? `${timeLimitMinutes} Menit` : 'Tanpa Batas'}</div>
        <div className="tm-quiz-meta-box">☆ Target {passScore}/100</div>
        <div className="tm-quiz-meta-box">☷ Pilihan Ganda</div>
      </div>

      <div className="tm-quiz-layout">
        <section className="tm-question-map">
          <h3>Nomor Soal</h3>
          <div className="tm-question-numbers">
            {questions.map((question, index) => (
              <a
                className={`${answers[question.id] ? 'answered' : ''}${index === currentIndex ? ' current' : ''}`}
                href="#quiz-question"
                key={question.id}
                onClick={() => setCurrentIndex(index)}
                title={bookmarked[question.id] ? 'Ditandai untuk dipelajari lagi' : undefined}
              >{question.position}</a>
            ))}
          </div>
        </section>
        <aside className="tm-time-box"><small>Sisa Waktu</small><b>{remaining == null ? '—' : formatTime(remaining)}</b></aside>
      </div>

      <article className="tm-quiz-question-card" id="quiz-question">
        <div className="tm-question-topline"><small>Pertanyaan {current.position}/{questions.length}</small><span className="tm-question-kind">{kindLabel[current.kind] || current.kind}</span></div>
        {current.passage && <div className="tm-passage">{current.passage}</div>}
        {current.audio_url && <div className="tm-audio-panel"><audio controls preload="none" src={current.audio_url}>Browser Anda tidak mendukung audio.</audio></div>}
        <h2><FormattedText text={current.prompt} /></h2>
        <div className="tm-answer-list">
          {current.options.map((option) => (
            <label className={answers[current.id] === option.id ? 'selected' : ''} key={option.id}>
              <input type="radio" name={current.id} value={option.id} checked={answers[current.id] === option.id} onChange={() => choose(current.id, option.id)} />
              <span className="tm-answer-letter">{option.label || String.fromCharCode(64 + option.position)}</span>
              <b><FormattedText text={option.option_text} /></b>
            </label>
          ))}
        </div>
      </article>

      <div className="tm-material-actions">
        <button className={bookmarked[current.id] ? 'saved' : ''} type="button" onClick={() => void toggleBookmark(current.id)}>{bookmarked[current.id] ? '♡ Sudah ditandai' : '♡ Tandai untuk dipelajari lagi'}</button>
        {currentIndex < questions.length - 1
          ? <button type="button" onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}>Lanjut ke Berikutnya →</button>
          : <button type="submit">Selesai melihat soal →</button>}
      </div>

      <section className="tm-quiz-submitbar">
        <div><b>{Object.keys(answers).length}/{questions.length} terjawab</b><p className="tm-inline-message">Soal yang belum dijawab akan dinilai salah.</p></div>
        <button type="submit" disabled={busy || questions.length === 0}>{busy ? 'Menilai...' : 'Kirim jawaban'}</button>
      </section>
      <p className="tm-inline-message" aria-live="polite">{message}</p>
    </form>
  )
}

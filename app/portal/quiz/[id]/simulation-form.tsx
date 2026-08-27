'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import FormattedText from '@/app/components/formatted-text'

type Option = { id: string; question_id: string; position: number; label: string | null; option_text: string }
type Question = { id: string; position: number; kind: string; prompt: string; passage: string | null; audio_url: string | null; points: number; options: Option[] }
type SimulationState = { attempt_id: string; attempt_no: number; remaining_seconds: number; total_seconds: number; offline_seconds: number; resume_count: number; answers: Record<string, string>; expired: boolean }
type Result = { attempt_id: string; attempt_no: number; score: number; pass_score: number; passed: boolean; wrong_count: number; question_count: number; time_spent_seconds?: number; offline_seconds?: number; resume_count?: number }
type Props = { quizId: string; title: string; passScore: number; timeLimitMinutes: number | null; questions: Question[] }

function formatTime(value: number) {
  const total = Math.max(0, Math.floor(value))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function SimulationForm({ quizId, title, passScore, timeLimitMinutes, questions }: Props) {
  const router = useRouter()
  const answersRef = useRef<Record<string, string>>({})
  const stateRef = useRef<SimulationState | null>(null)
  const syncingRef = useRef(false)
  const finishingRef = useRef(false)
  const completedRef = useRef(false)
  const baseRemainingRef = useRef<number | null>(null)
  const baseAtRef = useRef(Date.now())

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [state, setState] = useState<SimulationState | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Menyiapkan simulasi...')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  function setCanonicalAnswers(next: Record<string, string>) {
    answersRef.current = next
    setAnswers(next)
  }

  function applyState(next: SimulationState) {
    stateRef.current = next
    setState(next)
    baseRemainingRef.current = Math.max(0, next.remaining_seconds)
    baseAtRef.current = Date.now()
    setRemaining(Math.max(0, next.remaining_seconds))
    setCanonicalAnswers(next.answers || {})
  }

  function freezeDisplayedTimer() {
    const base = baseRemainingRef.current
    if (base == null) return
    const elapsed = Math.max(0, Math.floor((Date.now() - baseAtRef.current) / 1000))
    const current = Math.max(0, base - elapsed)
    baseRemainingRef.current = current
    baseAtRef.current = Date.now()
    setRemaining(current)
  }

  function markIntentionalLeave() {
    const current = stateRef.current
    if (!current || completedRef.current || finishingRef.current || !navigator.onLine) return
    void fetch('/api/quiz/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', attemptId: current.attempt_id, answers: answersRef.current }),
      keepalive: true,
    }).catch(() => undefined)
  }

  async function start() {
    if (syncingRef.current || finishingRef.current || result) return
    syncingRef.current = true
    setStatus('Menyiapkan simulasi...')
    try {
      const response = await fetch('/api/quiz/simulation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', quizId }),
      })
      const payload = await response.json().catch(() => null) as { state?: SimulationState } | null
      if (!response.ok || !payload?.state) {
        setConnected(false)
        setStatus(navigator.onLine ? 'Simulasi belum dapat dimulai.' : 'Tidak ada koneksi. Timer belum dimulai.')
        return
      }
      applyState(payload.state)
      setConnected(true)
      setStatus(payload.state.resume_count > 0 ? 'Percobaan sebelumnya berhasil dipulihkan.' : 'Autosave aktif.')
      setMessage('')
    } catch {
      setConnected(false)
      setStatus('Koneksi terputus. Timer belum berjalan.')
    } finally {
      syncingRef.current = false
    }
  }

  async function sync() {
    const current = stateRef.current
    if (!current || syncingRef.current || finishingRef.current || result || !navigator.onLine) return false
    syncingRef.current = true
    setStatus('Menyimpan...')
    try {
      const response = await fetch('/api/quiz/simulation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', attemptId: current.attempt_id, answers: answersRef.current }),
      })
      const payload = await response.json().catch(() => null) as { state?: SimulationState } | null
      if (!response.ok || !payload?.state) {
        freezeDisplayedTimer()
        setConnected(false)
        setStatus('Autosave gagal. Timer dijeda sampai koneksi pulih.')
        return false
      }
      applyState(payload.state)
      setConnected(true)
      setStatus(payload.state.resume_count > current.resume_count ? 'Koneksi pulih. Progres berhasil dipulihkan.' : 'Tersimpan otomatis.')
      return true
    } catch {
      freezeDisplayedTimer()
      setConnected(false)
      setStatus('Koneksi terputus. Timer dijeda; progres tersimpan aman.')
      return false
    } finally {
      syncingRef.current = false
    }
  }

  async function finish(auto = false) {
    const current = stateRef.current
    if (!current || finishingRef.current || result) return
    if (!navigator.onLine) {
      freezeDisplayedTimer()
      setConnected(false)
      setMessage('Koneksi sedang terputus. Sambungkan internet untuk mengakhiri dan menilai simulasi.')
      return
    }
    if (!auto && !window.confirm('Akhiri simulasi sekarang? Percobaan ini tidak dapat dilanjutkan setelah dinilai.')) return

    finishingRef.current = true
    setBusy(true)
    setMessage(auto ? 'Waktu habis. Menilai jawaban...' : 'Mengakhiri simulasi dan menilai jawaban...')
    try {
      const response = await fetch('/api/quiz/simulation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', attemptId: current.attempt_id, answers: answersRef.current }),
      })
      const payload = await response.json().catch(() => null) as { result?: Result; error?: string } | null
      if (!response.ok || !payload?.result) {
        setMessage(payload?.error === 'quiz_has_no_questions' ? 'Bank soal simulasi masih kosong.' : 'Simulasi belum dapat dinilai. Progres tetap tersimpan.')
        return
      }
      completedRef.current = true
      setResult(payload.result)
      setConnected(true)
      setMessage('')
      router.refresh()
    } catch {
      freezeDisplayedTimer()
      setConnected(false)
      setMessage('Koneksi terputus saat mengirim. Progres tetap tersimpan dan dapat dilanjutkan setelah tersambung kembali.')
    } finally {
      finishingRef.current = false
      setBusy(false)
    }
  }

  useEffect(() => { void start() }, [quizId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const offline = () => {
      freezeDisplayedTimer()
      setConnected(false)
      setStatus('Koneksi terputus. Timer dijeda; jawaban terakhir tetap aman.')
    }
    const online = () => {
      setStatus('Koneksi kembali. Menyinkronkan...')
      if (stateRef.current) void sync(); else void start()
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        markIntentionalLeave()
        return
      }
      if (navigator.onLine && stateRef.current) {
        setConnected(false)
        setStatus('Memeriksa waktu dan progres...')
        void sync()
      }
    }
    const pageHide = () => markIntentionalLeave()

    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    window.addEventListener('pagehide', pageHide)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
      window.removeEventListener('pagehide', pageHide)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state || result) return
    const timer = window.setInterval(() => {
      if (!connected || baseRemainingRef.current == null) return
      const elapsed = Math.max(0, Math.floor((Date.now() - baseAtRef.current) / 1000))
      setRemaining(Math.max(0, baseRemainingRef.current - elapsed))
    }, 500)
    return () => window.clearInterval(timer)
  }, [state?.attempt_id, connected, result])

  useEffect(() => {
    if (!state || result) return
    const heartbeat = window.setInterval(() => { if (navigator.onLine) void sync() }, 5000)
    return () => window.clearInterval(heartbeat)
  }, [state?.attempt_id, result]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state || result || !connected) return
    const autosave = window.setTimeout(() => { if (navigator.onLine) void sync() }, 700)
    return () => window.clearTimeout(autosave)
  }, [answers, state?.attempt_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state || result || busy || remaining !== 0 || !connected) return
    void finish(true)
  }, [remaining, connected, state?.attempt_id, result, busy]) // eslint-disable-line react-hooks/exhaustive-deps

  function choose(questionId: string, optionId: string) {
    setCanonicalAnswers({ ...answersRef.current, [questionId]: optionId })
  }

  if (result) {
    return (
      <section className="quiz-result panel">
        <div className="eyebrow">HASIL SIMULASI · PERCOBAAN {result.attempt_no}</div>
        <div className="score-orb">{Math.round(result.score)}</div>
        <h2>{result.passed ? 'Target simulasi tercapai' : 'Belum mencapai target'}</h2>
        <p>Nilai <b>{result.score}</b> · target <b>≥{result.pass_score}</b> · {result.wrong_count} dari {result.question_count} soal perlu ditinjau.</p>
        <p>Waktu aktif {formatTime(result.time_spent_seconds || 0)}{result.offline_seconds ? ` · gangguan koneksi tercatat ${formatTime(result.offline_seconds)}` : ''}.</p>
        <div className="actions"><Link className="btn primary" href="/portal/dashboard">Kembali ke dashboard</Link><Link className="btn ghost" href="/portal/bookmark">Dipelajari Lagi</Link></div>
      </section>
    )
  }

  return (
    <form className="quiz-form" onSubmit={(event) => { event.preventDefault(); void finish(false) }}>
      <section className="quiz-intro panel">
        <div><div className="eyebrow">SIMULASI JLPT</div><h1>{title}</h1><p>Target ≥{passScore}. Simulasi tidak dapat dijeda manual. Jawaban tersimpan otomatis; saat koneksi benar-benar terputus, timer dijeda dan dilanjutkan setelah sinkron kembali.</p></div>
        <div className="quiz-meta"><b>{questions.length}</b><span>soal</span><strong className="simulation-timer">{remaining == null ? '—:—' : formatTime(remaining)}</strong><small>{timeLimitMinutes || 0} menit total</small></div>
      </section>

      <section className={`simulation-status panel ${connected ? 'is-online' : 'is-offline'}`}>
        <div><b>{connected ? '● Terhubung' : '● Tidak terhubung'}</b><p>{status}</p></div>
        <div><span>Percobaan {state?.attempt_no || '—'}</span>{state && <small>{state.resume_count} pemulihan koneksi</small>}</div>
      </section>

      {questions.map((question) => (
        <article className="question-card" key={question.id}>
          <div className="question-number">{String(question.position).padStart(2, '0')}</div>
          {question.passage && <div className="reading-passage">{question.passage}</div>}
          {question.audio_url && <audio controls preload="none" src={question.audio_url}>Browser Anda tidak mendukung audio.</audio>}
          <h2><FormattedText text={question.prompt} /></h2>
          <div className="option-list">
            {question.options.map((option) => (
              <label className={answers[question.id] === option.id ? 'selected' : ''} key={option.id}>
                <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} disabled={!state || busy} onChange={() => choose(question.id, option.id)} />
                <span>{option.label || String(option.position)}</span><b><FormattedText text={option.option_text} /></b>
              </label>
            ))}
          </div>
        </article>
      ))}

      <section className="quiz-submit panel">
        <div><b>{Object.keys(answers).length}/{questions.length} terjawab</b><p>{connected ? status : 'Timer dan pengiriman jawaban menunggu koneksi kembali.'}</p></div>
        <button className="btn primary" disabled={busy || !state || !connected || questions.length === 0}>{busy ? 'Menilai...' : 'Akhiri & nilai simulasi'}</button>
      </section>
      <p className="message" aria-live="polite">{message}</p>
    </form>
  )
}

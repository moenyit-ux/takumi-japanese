import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase/server'
import styles from '../../admin.module.css'
import jlpt from '../jlpt.module.css'
import SimulationEditor from './simulation-editor'
import SimulationReviewControls from './simulation-review-controls'

type ReviewStatus = 'saved' | 'needs_revision' | 'approved'

type EditorData = {
  role: 'content_admin' | 'super_admin'
  level: { id: string; code: string; name: string }
  quiz: {
    id: string
    title: string
    pass_score: number
    time_limit_minutes: number | null
    section_label: string | null
    published: boolean
    review_status: ReviewStatus
    review_note: string | null
    reviewed_by: string | null
    reviewed_at: string | null
    attempt_count: number
    questions: Array<{
      id: string
      position: number
      kind: 'multiple_choice' | 'reading' | 'listening'
      prompt: string
      passage: string | null
      audio_url: string | null
      explanation_id: string | null
      explanation_text: string | null
      points: number
      options: Array<{
        id?: string
        position: number
        label: string | null
        option_text: string
        is_correct: boolean
      }>
    }>
  }
}

function reviewLabel(status: ReviewStatus) {
  if (status === 'approved') return 'Disetujui'
  if (status === 'needs_revision') return 'Perlu direvisi'
  return 'Tersimpan'
}

export default async function SimulationPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'content_admin' && profile?.role !== 'super_admin') redirect('/portal/dashboard')

  const { data, error } = await supabase.rpc('admin_get_simulation_editor', { p_quiz_id: id })
  if (error || !data) notFound()
  const editor = data as EditorData
  const locked = editor.quiz.attempt_count > 0

  return (
    <main className={styles.editorShell}>
      <div className={styles.editorTop}>
        <Link href={`/portal/admin/jlpt?level=${editor.level.code}`}>← Kembali ke daftar paket {editor.level.code}</Link>
        <span className={styles.roleBadge}>{editor.role === 'super_admin' ? 'SUPER ADMIN' : 'CONTENT ADMIN'}</span>
      </div>

      <header className={styles.editorHeader}>
        <div>
          <div className={styles.eyebrow}>模擬試験 · {editor.level.code}</div>
          <h1>{editor.quiz.title}</h1>
          <p>{editor.level.name} · {editor.quiz.questions.length} soal</p>
          <div className={jlpt.editorMeta}>
            <span>{editor.quiz.time_limit_minutes ?? '—'} menit</span>
            <span>Nilai lulus ≥ {editor.quiz.pass_score}</span>
            <span>{reviewLabel(editor.quiz.review_status)}</span>
          </div>
          {editor.quiz.section_label && <p style={{ marginTop: 12 }}>{editor.quiz.section_label}</p>}
        </div>
      </header>

      <SimulationReviewControls
        quizId={editor.quiz.id}
        role={editor.role}
        reviewStatus={editor.quiz.review_status}
        reviewNote={editor.quiz.review_note}
        published={editor.quiz.published}
        locked={locked}
      />

      <SimulationEditor
        quizId={editor.quiz.id}
        questions={editor.quiz.questions}
        locked={locked}
      />
    </main>
  )
}

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../../../lib/supabase/server'
import QuizEditor from './quiz-editor'
import styles from '../../../admin.module.css'

type EditorData = {
  role: string
  session: {
    id: string
    level_code: string
    level_name: string
    session_no: number
    title: string
  }
  quiz: {
    id: string
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
  } | null
}

type QuizGroup = NonNullable<EditorData['quiz']> & {
  group_no: number
}

export default async function QuizOnlyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'content_admin' && profile?.role !== 'super_admin') redirect('/portal/dashboard')

  const [editorResult, quizGroupsResult] = await Promise.all([
    supabase.rpc('admin_get_session_editor', { p_session_id: id }),
    supabase.rpc('admin_get_quiz_groups', { p_session_id: id }),
  ])
  if (editorResult.error || !editorResult.data || quizGroupsResult.error) notFound()

  const editorData = editorResult.data as EditorData
  const quizGroups = (quizGroupsResult.data || []) as QuizGroup[]

  return (
    <main className={`takumi-admin-page takumi-admin-editor ${styles.editorShell}`}>
      <div className={styles.editorTop}>
        <Link href={`/portal/admin?level=${editorData.session.level_code}`}>← Kembali ke kategori {editorData.session.level_code}</Link>
        <Link href={`/portal/admin/session/${editorData.session.id}/preview`}>Preview siswa</Link>
      </div>

      <header className={styles.editorHeader}>
        <div>
          <div className={styles.eyebrow}>{editorData.session.level_code} · KUIS</div>
          <h1>Kuis {editorData.session.level_code}</h1>
          <p>{editorData.session.level_name} · {quizGroups.length} kelompok kuis · {quizGroups.reduce((total, quiz) => total + quiz.questions.length, 0)} soal</p>
        </div>
      </header>

      {quizGroups.length === 0 ? (
        <section className={styles.panel}>
          <h2>Kuis belum tersedia</h2>
          <p className={styles.note}>Struktur kuis untuk level ini belum dibuat.</p>
        </section>
      ) : (
        <QuizEditor sessionId={editorData.session.id} role={editorData.role} quizzes={quizGroups} />
      )}
    </main>
  )
}

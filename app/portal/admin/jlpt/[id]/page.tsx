import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase/server'
import styles from '../../admin.module.css'
import jlpt from '../jlpt.module.css'
import SimulationEditor from './simulation-editor'

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

type PackageLink = {
  id: string
  title: string
}

type PackageListData = {
  packages: PackageLink[]
}

function packageNumber(title: string, index: number) {
  const match = title.match(/Paket\s+(\d+)/i)
  return match ? Number(match[1]) : index + 1
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

  const { data: packageData } = await supabase.rpc('admin_list_simulation_packages', { p_level_code: editor.level.code })
  const packages = ((packageData as PackageListData | null)?.packages || [])
    .map((item, index) => ({ ...item, no: packageNumber(item.title, index) }))
    .sort((a, b) => a.no - b.no)

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
            <span>{editor.quiz.published ? 'Dipublikasikan' : 'Draft'}</span>
          </div>
          {editor.quiz.section_label && <p style={{ marginTop: 12 }}>{editor.quiz.section_label}</p>}
        </div>
      </header>

      {packages.length > 0 && (
        <nav className={jlpt.packageSwitcher} aria-label={`Pilih paket simulasi ${editor.level.code}`}>
          <span className={jlpt.packageSwitcherLabel}>PILIH PAKET</span>
          <div className={jlpt.packageSwitcherLinks}>
            {packages.map((item) => (
              <Link
                className={item.id === editor.quiz.id ? jlpt.currentPackage : ''}
                href={`/portal/admin/jlpt/${item.id}`}
                aria-current={item.id === editor.quiz.id ? 'page' : undefined}
                key={item.id}
              >
                Paket {item.no}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <SimulationEditor
        quizId={editor.quiz.id}
        questions={editor.quiz.questions}
        locked={editor.quiz.attempt_count > 0}
      />
    </main>
  )
}

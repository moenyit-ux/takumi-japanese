import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import TakumiStudyHeader from '../../../../../components/takumi-study-header'
import MaterialView, { type ContentBlock } from '../../../../session/[id]/material-view'
import { createClient } from '../../../../../../lib/supabase/server'
import { resolveLearningAsset } from '../../../../../../lib/supabase/assets'
import styles from './preview.module.css'

type StudyKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'

type Option = {
  id: string
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
    level_code: string
    level_name: string
    session_no: number
    title: string
    summary: string | null
    estimated_minutes: number
    access_tier: 'free' | 'paid'
    content_status: string
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
}

export default async function AdminSessionPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'content_admin' && profile?.role !== 'super_admin') redirect('/portal/dashboard')

  const { data, error } = await supabase.rpc('admin_get_session_editor', { p_session_id: id })
  if (error || !data) notFound()
  const editor = data as EditorData

  const { data: level } = await supabase.from('levels').select('total_sessions').eq('code', editor.session.level_code).maybeSingle()
  const blocks = await Promise.all((editor.blocks || []).map(async (block) => ({
    ...block,
    audio_url: await resolveLearningAsset(supabase, block.audio_url),
    image_url: await resolveLearningAsset(supabase, block.image_url),
  })))
  const questions = await Promise.all((editor.quiz?.questions || []).map(async (question) => ({
    ...question,
    audio_url: await resolveLearningAsset(supabase, question.audio_url),
  })))

  const anchors: Partial<Record<StudyKind, string>> = {}
  for (const block of blocks) {
    if ((block.kind === 'vocabulary' || block.kind === 'kanji' || block.kind === 'grammar' || block.kind === 'reading' || block.kind === 'listening') && !anchors[block.kind]) {
      anchors[block.kind] = `#${block.kind}`
    }
  }
  const first = blocks.find((block) => block.kind === 'vocabulary' || block.kind === 'kanji' || block.kind === 'grammar' || block.kind === 'reading' || block.kind === 'listening')
  const active = (first?.kind || 'vocabulary') as StudyKind
  const quizHref = questions.length > 0 ? '#preview-quiz' : null

  return (
    <main className={`tm-material-page ${styles.previewWrap}`}>
      <div className={styles.banner}>
        <div><b>PREVIEW ADMIN · {editor.session.content_status.toUpperCase()}</b><br /><span>Tidak menyimpan progres, nilai, atau bookmark. Siswa belum melihat draft sebelum publish.</span></div>
        <Link className={styles.back} href={`/portal/admin/session/${editor.session.id}`}>← Kembali ke editor</Link>
      </div>

      <TakumiStudyHeader
        backHref={`/portal/admin/session/${editor.session.id}`}
        active={active}
        sessionNo={editor.session.session_no}
        totalSessions={level?.total_sessions || null}
        anchors={anchors}
        quizHref={quizHref}
      />

      {editor.session.summary && <section className="tm-callout" style={{ marginBottom: 14 }}><div className="tm-callout-head"><div className="tm-icon-box">✦</div><b>{editor.session.title}</b></div><p>{editor.session.summary}</p></section>}

      {blocks.length === 0 ? (
        <section className="tm-material-card tm-empty-card"><h2>Materi sesi belum diisi</h2><p>Preview akan mengikuti tampilan siswa begitu materi ditambahkan.</p></section>
      ) : (
        <MaterialView blocks={blocks} bookmarkedIds={new Set<string>()} quizHref={quizHref} />
      )}

      <section className={`panel ${styles.quizPreview}`} id="preview-quiz">
        <div className={styles.quizHead}>
          <div><div className="eyebrow">PREVIEW LATIHAN SESI</div><h2>{editor.quiz?.title || 'Latihan sesi'}</h2></div>
          <span>{questions.length} soal · Lulus ≥ {editor.quiz?.pass_score ?? 70}</span>
        </div>

        {questions.length === 0 ? <div className={styles.empty}>Belum ada soal pada latihan sesi.</div> : questions.map((question) => {
          const correct = question.options.find((option) => option.is_correct)
          return (
            <article className="question-card" key={question.id}>
              <div className="question-number">{String(question.position).padStart(2, '0')}</div>
              {question.passage && <div className="reading-passage">{question.passage}</div>}
              {question.audio_url && <audio controls preload="none" src={question.audio_url}>Browser Anda tidak mendukung audio.</audio>}
              <h2>{question.prompt}</h2>
              <div className="option-list">
                {question.options.map((option) => (
                  <label className={styles.muted} key={option.id}>
                    <input type="radio" disabled />
                    <span>{option.label || String(option.position)}</span>
                    <b>{option.option_text}</b>
                  </label>
                ))}
              </div>
              <details className={styles.answerKey}>
                <summary>Kunci & penjelasan admin</summary>
                <p>Jawaban benar: <b>{correct?.label || correct?.option_text || 'Belum ditentukan'}</b></p>
                {question.explanation_text && <p>{question.explanation_text}</p>}
              </details>
            </article>
          )
        })}
      </section>
    </main>
  )
}

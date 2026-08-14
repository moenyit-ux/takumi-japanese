import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import TakumiStudyHeader from '../../../../../components/takumi-study-header'
import MaterialView, { type ContentBlock } from '../../../../session/[id]/material-view'
import { createClient } from '../../../../../../lib/supabase/server'
import { resolveLearningAsset } from '../../../../../../lib/supabase/assets'
import styles from './preview.module.css'

type MaterialKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'
type StudyKind = MaterialKind | 'quiz'

const materialKinds: MaterialKind[] = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening']

function isMaterialKind(value: string | undefined): value is MaterialKind {
  return Boolean(value && materialKinds.includes(value as MaterialKind))
}

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

type SearchParams = {
  section?: string | string[]
}

export default async function AdminSessionPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const query = await searchParams
  const requestedSection = Array.isArray(query.section) ? query.section[0] : query.section

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

  const firstStructured = materialKinds.find((kind) => blocks.some((block) => block.kind === kind)) || 'vocabulary'
  let carryKind: MaterialKind = firstStructured
  const categorizedBlocks = blocks.map((block) => {
    if (isMaterialKind(block.kind)) carryKind = block.kind
    return { block, pageKind: carryKind }
  })
  const availableKinds = materialKinds.filter((kind) => categorizedBlocks.some((entry) => entry.pageKind === kind))
  const firstAvailable = availableKinds[0] || firstStructured
  const active: StudyKind = requestedSection === 'quiz' && questions.length > 0
    ? 'quiz'
    : isMaterialKind(requestedSection) && availableKinds.includes(requestedSection)
      ? requestedSection
      : firstAvailable

  const previewBase = `/portal/admin/session/${editor.session.id}/preview`
  const anchors: Partial<Record<MaterialKind, string>> = {}
  availableKinds.forEach((kind) => {
    anchors[kind] = `${previewBase}?section=${kind}`
  })
  const quizHref = questions.length > 0 ? `${previewBase}?section=quiz` : null

  const visibleBlocks = active === 'quiz'
    ? []
    : categorizedBlocks.filter((entry) => entry.pageKind === active).map((entry) => entry.block)
  const currentIndex = active === 'quiz' ? -1 : availableKinds.indexOf(active)
  const nextKind = currentIndex >= 0 ? availableKinds[currentIndex + 1] : undefined
  const nextHref = nextKind ? `${previewBase}?section=${nextKind}` : quizHref

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

      {active !== 'quiz' && editor.session.summary && (
        <section className="tm-callout" style={{ marginBottom: 14 }}>
          <div className="tm-callout-head"><div className="tm-icon-box">✦</div><b>{editor.session.title}</b></div>
          <p>{editor.session.summary}</p>
        </section>
      )}

      {active === 'quiz' ? (
        <section className={`panel ${styles.quizPreview}`}>
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
      ) : visibleBlocks.length === 0 ? (
        <section className="tm-material-card tm-empty-card">
          <h2>Materi {active} belum diisi</h2>
          <p>Pilih kategori lain di atas atau kembali ke editor untuk menambahkan materi.</p>
        </section>
      ) : (
        <MaterialView blocks={visibleBlocks} bookmarkedIds={new Set<string>()} quizHref={nextHref} />
      )}
    </main>
  )
}

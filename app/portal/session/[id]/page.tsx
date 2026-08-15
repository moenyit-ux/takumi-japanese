import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import TakumiStudyHeader from '../../../components/takumi-study-header'
import { createClient } from '../../../../lib/supabase/server'
import { resolveLearningAsset } from '../../../../lib/supabase/assets'
import MaterialView, { type ContentBlock } from './material-view'
import ProgressTracker from './progress-tracker'

type StudyKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'
type LearningStatus = 'not_started' | 'review' | 'learned'

const studyKinds: StudyKind[] = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening']

function isStudyKind(value: string | undefined): value is StudyKind {
  return Boolean(value && studyKinds.includes(value as StudyKind))
}

function normalizeLearningStatus(status?: string | null): LearningStatus {
  if (status === 'review' || status === 'learned') return status
  return 'not_started'
}

function overallLearningStatusLabel(statuses: LearningStatus[], total: number) {
  if (total > 0 && statuses.filter((status) => status === 'learned').length === total) return 'Sudah dipelajari'
  if (statuses.some((status) => status === 'review')) return 'Ingin dipelajari lagi'
  return 'Belum dipelajari'
}

type SearchParams = {
  section?: string | string[]
}

export default async function SessionPage({
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

  const { data: session, error: sessionError } = await supabase
    .from('learning_sessions')
    .select('id, level_id, session_no, title, summary, estimated_minutes, access_tier, content_status')
    .eq('id', id)
    .maybeSingle()

  if (sessionError || !session) notFound()

  const [levelResult, entitlementResult, blocksResult, progressResult, quizResult, bookmarkResult] = await Promise.all([
    supabase.from('levels').select('code, name').eq('id', session.level_id).maybeSingle(),
    supabase.from('entitlements').select('active, starts_at, ends_at').eq('level_id', session.level_id),
    supabase.from('content_blocks').select('id, position, kind, title, body, audio_url, image_url').eq('session_id', session.id).order('position'),
    supabase.from('session_progress').select('read_percent, status, highest_score, last_block_id').eq('session_id', session.id).maybeSingle(),
    supabase.from('quizzes').select('id, title, pass_score').eq('session_id', session.id).eq('kind', 'session').eq('published', true).maybeSingle(),
    supabase.from('bookmarks').select('content_block_id').not('content_block_id', 'is', null),
  ])

  const now = Date.now()
  const premium = (entitlementResult.data || []).some((item) => {
    const starts = new Date(item.starts_at).getTime()
    const ends = item.ends_at ? new Date(item.ends_at).getTime() : Number.POSITIVE_INFINITY
    return item.active && starts <= now && ends > now
  })
  const canOpen = session.content_status === 'published' && (session.access_tier === 'free' || premium)
  const levelCode = levelResult.data?.code || 'N4'

  if (!canOpen) {
    return (
      <main className="tm-material-page">
        <Link className="tm-back" href={`/portal/materi?level=${levelCode}`} aria-label="Kembali">←</Link>
        <section className="panel locked-panel" style={{ marginTop: 20 }}>
          <div className="eyebrow">{levelCode} · MATERI</div>
          <h1>{session.title}</h1>
          {session.content_status !== 'published'
            ? <p>Materi ini belum dipublikasikan.</p>
            : <><p>Materi ini termasuk akses premium.</p><Link className="btn primary" href="/portal/pembayaran">Lihat akses premium</Link></>}
        </section>
      </main>
    )
  }

  const rawBlocks = (blocksResult.data || []) as ContentBlock[]
  const blocks = await Promise.all(rawBlocks.map(async (block) => ({
    ...block,
    audio_url: await resolveLearningAsset(supabase, block.audio_url),
    image_url: await resolveLearningAsset(supabase, block.image_url),
  })))

  const blockIds = rawBlocks.map((block) => block.id)
  const statusResult = blockIds.length
    ? await supabase.from('content_block_learning_statuses').select('content_block_id, learning_status').in('content_block_id', blockIds)
    : { data: [] as Array<{ content_block_id: string; learning_status: string }> }

  const learningStatuses: Record<string, LearningStatus> = {}
  for (const row of statusResult.data || []) {
    learningStatuses[row.content_block_id] = normalizeLearningStatus(row.learning_status)
  }

  const firstStructured = studyKinds.find((kind) => blocks.some((block) => block.kind === kind)) || 'vocabulary'
  let carryKind: StudyKind = firstStructured
  const categorizedBlocks = blocks.map((block) => {
    if (isStudyKind(block.kind)) carryKind = block.kind
    return { block, pageKind: carryKind }
  })
  const availableKinds = studyKinds.filter((kind) => categorizedBlocks.some((entry) => entry.pageKind === kind))
  const firstAvailable = availableKinds[0] || firstStructured

  const progressBlocks = availableKinds.flatMap((kind) =>
    categorizedBlocks
      .filter((entry) => entry.pageKind === kind)
      .map((entry) => entry.block)
      .sort((a, b) => a.position - b.position),
  )

  const progress = progressResult.data
  const initialReadPercent = progress?.read_percent || 0
  const statusList = progressBlocks.map((block) => learningStatuses[block.id] || 'not_started')
  const overallStatus = overallLearningStatusLabel(statusList, progressBlocks.length)
  const quizHref = quizResult.data ? `/portal/quiz/${quizResult.data.id}` : null
  const bookmarkedIds = new Set((bookmarkResult.data || []).map((item) => item.content_block_id).filter((value): value is string => Boolean(value)))

  const active: StudyKind = isStudyKind(requestedSection) && availableKinds.includes(requestedSection)
    ? requestedSection
    : firstAvailable

  const sessionBase = `/portal/session/${session.id}`
  const anchors: Partial<Record<StudyKind, string>> = {}
  availableKinds.forEach((kind) => {
    anchors[kind] = `${sessionBase}?section=${kind}`
  })

  const visibleBlocks = categorizedBlocks
    .filter((entry) => entry.pageKind === active)
    .map((entry) => entry.block)
    .sort((a, b) => a.position - b.position)

  return (
    <main className="tm-material-page">
      <TakumiStudyHeader
        backHref={`/portal/materi?level=${levelCode}`}
        active={active}
        progressPercent={initialReadPercent}
        learningStatus={overallStatus}
        anchors={anchors}
        quizHref={quizHref}
      />

      {session.summary && (
        <section className="tm-callout" style={{ marginBottom: 14 }}>
          <div className="tm-callout-head"><div className="tm-icon-box">✦</div><b>{session.title}</b></div>
          <p>{session.summary}</p>
        </section>
      )}

      {blocks.length === 0 ? (
        <section className="tm-material-card tm-empty-card">
          <h2>Materi belum diisi</h2>
          <p>Kerangka materi sudah aktif, tetapi isi kosakata, kanji, bunpou, dokkai, atau choukai belum dimasukkan oleh Tim Takumi.</p>
        </section>
      ) : visibleBlocks.length === 0 ? (
        <section className="tm-material-card tm-empty-card">
          <h2>Materi belum tersedia</h2>
          <p>Pilih kategori lain pada navigasi di atas.</p>
        </section>
      ) : (
        <MaterialView blocks={visibleBlocks} bookmarkedIds={bookmarkedIds} learningStatuses={learningStatuses} />
      )}

      <ProgressTracker sessionId={session.id} blockIds={progressBlocks.map((block) => block.id)} initialReadPercent={initialReadPercent} />

      <section className="tm-callout" style={{ marginTop: 16 }}>
        <div className="tm-callout-head"><div className="tm-icon-box">✓</div><b>Syarat kelulusan materi</b></div>
        <p>Status pada setiap materi adalah penilaian pribadi dan dapat diubah kapan saja. Kelulusan teknis tetap dihitung dari seluruh materi yang dibaca dan nilai latihan minimal {quizResult.data?.pass_score ?? 70}. Nilai tertinggi saat ini: <b>{progress?.highest_score ?? '—'}</b>.</p>
      </section>
    </main>
  )
}

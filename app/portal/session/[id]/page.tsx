import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import TakumiStudyHeader from '../../../components/takumi-study-header'
import { createClient } from '../../../../lib/supabase/server'
import { resolveLearningAsset } from '../../../../lib/supabase/assets'
import MaterialView, { type ContentBlock } from './material-view'
import ProgressTracker from './progress-tracker'

type StudyKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    supabase.from('levels').select('code, name, total_sessions').eq('id', session.level_id).maybeSingle(),
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
          <div className="eyebrow">{levelCode} · SESI {session.session_no}</div>
          <h1>{session.title}</h1>
          {session.content_status !== 'published'
            ? <p>Materi sesi ini belum dipublikasikan.</p>
            : <><p>Sesi ini termasuk akses premium.</p><Link className="btn primary" href="/portal/pembayaran">Lihat akses premium</Link></>}
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
  const progress = progressResult.data
  const initialReadPercent = progress?.read_percent || 0
  const quizHref = quizResult.data ? `/portal/quiz/${quizResult.data.id}` : null
  const bookmarkedIds = new Set((bookmarkResult.data || []).map((item) => item.content_block_id).filter((value): value is string => Boolean(value)))

  const anchors: Partial<Record<StudyKind, string>> = {}
  for (const block of blocks) {
    if ((block.kind === 'vocabulary' || block.kind === 'kanji' || block.kind === 'grammar' || block.kind === 'reading' || block.kind === 'listening') && !anchors[block.kind]) {
      anchors[block.kind] = `#${block.kind}`
    }
  }
  const activeBlock = blocks.find((block) => block.kind === 'vocabulary' || block.kind === 'kanji' || block.kind === 'grammar' || block.kind === 'reading' || block.kind === 'listening')
  const active = (activeBlock?.kind || 'vocabulary') as StudyKind

  return (
    <main className="tm-material-page">
      <TakumiStudyHeader
        backHref={`/portal/materi?level=${levelCode}`}
        active={active}
        sessionNo={session.session_no}
        totalSessions={levelResult.data?.total_sessions || null}
        anchors={anchors}
        quizHref={quizHref}
      />

      {session.summary && <section className="tm-callout" style={{ marginBottom: 14 }}><div className="tm-callout-head"><div className="tm-icon-box">✦</div><b>{session.title}</b></div><p>{session.summary}</p></section>}

      {blocks.length === 0 ? (
        <section className="tm-material-card tm-empty-card">
          <h2>Materi sesi belum diisi</h2>
          <p>Struktur sesi sudah aktif, tetapi isi kosakata, kanji, bunpou, dokkai, atau choukai belum dimasukkan oleh Tim Takumi.</p>
        </section>
      ) : (
        <MaterialView blocks={blocks} bookmarkedIds={bookmarkedIds} quizHref={quizHref} />
      )}

      <ProgressTracker sessionId={session.id} blockIds={blocks.map((block) => block.id)} initialReadPercent={initialReadPercent} />

      <section className="tm-callout" style={{ marginTop: 16 }}>
        <div className="tm-callout-head"><div className="tm-icon-box">✓</div><b>Target selesai sesi</b></div>
        <p>Seluruh materi perlu dibaca dan nilai latihan harus mencapai minimal {quizResult.data?.pass_score ?? 70}. Nilai tertinggi saat ini: <b>{progress?.highest_score ?? '—'}</b>.</p>
      </section>
    </main>
  )
}

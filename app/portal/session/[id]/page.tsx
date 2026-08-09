import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { resolveLearningAsset } from '../../../../lib/supabase/assets'
import ProgressTracker from './progress-tracker'

type ContentBlock = {
  id: string
  position: number
  kind: string
  title: string | null
  body: unknown
  audio_url: string | null
  image_url: string | null
}

type BodyRecord = Record<string, unknown>

function asRecord(value: unknown): BodyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as BodyRecord : null
}

function textOf(body: BodyRecord | null, key: string) {
  const value = body?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function BlockBody({ block }: { block: ContentBlock }) {
  const body = asRecord(block.body)
  const text = textOf(body, 'text') || textOf(body, 'description') || textOf(body, 'explanation') || textOf(body, 'passage')
  const items = Array.isArray(body?.items) ? body?.items : []

  return (
    <>
      {text && <p className="block-text">{text}</p>}

      {items.length > 0 && (
        <div className="learning-items">
          {items.map((raw, index) => {
            const item = asRecord(raw)
            if (!item) return null
            const term = textOf(item, 'term') || textOf(item, 'word') || textOf(item, 'kanji') || textOf(item, 'pattern') || `Item ${index + 1}`
            const reading = textOf(item, 'reading') || textOf(item, 'furigana')
            const meaning = textOf(item, 'meaning') || textOf(item, 'translation')
            const example = textOf(item, 'example')
            const exampleTranslation = textOf(item, 'example_translation') || textOf(item, 'exampleTranslation')

            return (
              <div className="learning-item" key={`${block.id}-${index}`}>
                <div><b>{term}</b>{reading && <small>{reading}</small>}</div>
                {meaning && <p>{meaning}</p>}
                {example && <blockquote>{example}{exampleTranslation && <small>{exampleTranslation}</small>}</blockquote>}
              </div>
            )
          })}
        </div>
      )}

      {block.image_url && <img className="learning-image" src={block.image_url} alt={block.title || 'Materi Takumi'} loading="lazy" />}
      {block.audio_url && <audio className="learning-audio" controls preload="none" src={block.audio_url}>Browser Anda tidak mendukung audio.</audio>}

      {!text && items.length === 0 && !block.image_url && !block.audio_url && (
        <p className="muted">Isi blok ini belum tersedia.</p>
      )}
    </>
  )
}

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

  const [levelResult, entitlementResult, blocksResult, progressResult, quizResult] = await Promise.all([
    supabase.from('levels').select('code, name').eq('id', session.level_id).maybeSingle(),
    supabase.from('entitlements').select('active, starts_at, ends_at').eq('level_id', session.level_id),
    supabase.from('content_blocks').select('id, position, kind, title, body, audio_url, image_url').eq('session_id', session.id).order('position'),
    supabase.from('session_progress').select('read_percent, status, highest_score, last_block_id').eq('session_id', session.id).maybeSingle(),
    supabase.from('quizzes').select('id, title, pass_score').eq('session_id', session.id).eq('kind', 'session').eq('published', true).maybeSingle(),
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
      <main className="learning-shell narrow">
        <Link className="back-link" href={`/portal/materi?level=${levelCode}`}>← Kembali ke daftar sesi</Link>
        <section className="panel locked-panel">
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

  return (
    <main className="learning-shell">
      <div className="learning-topbar">
        <Link className="back-link" href={`/portal/materi?level=${levelCode}`}>← {levelCode} · Daftar sesi</Link>
        <span>±{session.estimated_minutes} menit</span>
      </div>

      <header className="learning-header">
        <div className="eyebrow">{levelResult.data?.name || levelCode} · SESI {session.session_no}</div>
        <h1>{session.title}</h1>
        {session.summary && <p>{session.summary}</p>}
        <div className="learning-progress"><i style={{ width: `${initialReadPercent}%` }} /></div>
        <small>Progres membaca: {initialReadPercent}% · Nilai tertinggi: {progress?.highest_score ?? '—'}</small>
      </header>

      {blocks.length === 0 ? (
        <section className="panel empty learning-empty">
          <h2>Materi sesi belum diisi</h2>
          <p>Struktur sesi sudah aktif, tetapi isi kosakata, kanji, tata bahasa, 読解, atau 聴解 belum dimasukkan oleh Tim Takumi.</p>
        </section>
      ) : (
        <div className="learning-blocks">
          {blocks.map((block) => (
            <article className="learning-block" data-block-id={block.id} key={block.id}>
              <div className="block-meta"><span>{String(block.position).padStart(2, '0')}</span><small>{block.kind.toUpperCase()}</small></div>
              {block.title && <h2>{block.title}</h2>}
              <BlockBody block={block} />
            </article>
          ))}
        </div>
      )}

      <ProgressTracker sessionId={session.id} blockIds={blocks.map((block) => block.id)} initialReadPercent={initialReadPercent} />

      <section className="session-finish panel">
        <div>
          <div className="eyebrow">LATIHAN SESI</div>
          <h2>{quizResult.data?.title || 'Latihan belum dipublikasikan'}</h2>
          <p>Sesi dinyatakan selesai setelah seluruh materi dibaca dan nilai latihan mencapai minimal {quizResult.data?.pass_score ?? 70}.</p>
        </div>
        {quizResult.data
          ? <Link className="btn primary" href={`/portal/quiz/${quizResult.data.id}`}>Mulai latihan →</Link>
          : <span className="muted">Belum tersedia</span>}
      </section>
    </main>
  )
}

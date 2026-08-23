import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import DashboardScrollReset from '../../components/dashboard-scroll-reset'

type Level = {
  id: string
  code: string
  name: string
}

type LearningSession = {
  id: string
  level_id: string
  session_no: number
  title: string
  slug: string
  access_tier: string
  content_status: string
  estimated_minutes: number
}

type Progress = {
  session_id: string
  read_percent: number
  status: string
  learning_status: string
  highest_score: number | null
  updated_at: string
}

type Attempt = {
  score: number | null
  result_status: string | null
  submitted_at: string | null
}

type BookmarkRow = {
  id: string
  category: string
  source: string
  created_at: string
}

type Entitlement = {
  level_id: string
  active: boolean
  starts_at: string
  ends_at: string | null
}

type ContentBlockRef = {
  session_id: string
}

type PortalData = {
  userName: string
  role: string
  levels: Level[]
  sessions: LearningSession[]
  contentSessionIds: string[]
  progress: Progress[]
  attempts: Attempt[]
  bookmarks: BookmarkRow[]
  entitlements: Entitlement[]
}

const baseNav = [
  ['dashboard', 'Beranda', '⌂'],
  ['materi', 'Materi', '文'],
  ['bookmark', 'Bookmark', '☆'],
  ['hasil', 'Hasil', '↗'],
  ['pembayaran', 'Premium', '¥'],
  ['settings', 'Pengaturan', '⚙'],
]

function hasActiveAccess(entitlements: Entitlement[], levelId: string) {
  const now = Date.now()
  return entitlements.some((item) => {
    const starts = new Date(item.starts_at).getTime()
    const ends = item.ends_at ? new Date(item.ends_at).getTime() : Number.POSITIVE_INFINITY
    return item.level_id === levelId && item.active && starts <= now && ends > now
  })
}

function getLearningStatus(progress?: Progress) {
  if (progress?.learning_status === 'learned') return 'Sudah dipelajari'
  if (progress?.learning_status === 'review') return 'Perlu dipelajari lagi'
  return 'Belum dipelajari'
}

function Shell({ section, children, isAdmin, userName }: { section: string; children: React.ReactNode; isAdmin: boolean; userName: string }) {
  const nav = isAdmin ? [...baseNav, ['admin', 'Admin', '▦']] : baseNav

  return (
    <div className={`portal portal-${section}`}>
      <aside className="side">
        <div className="brand"><span>匠</span><div><b>Takumi</b><small>Japanese</small></div></div>
        <div className="side-user"><small>MASUK SEBAGAI</small><b>{userName}</b></div>
        <nav>
          {nav.map(([slug, label, icon]) => (
            <Link className={section === slug ? 'active' : ''} href={`/portal/${slug}`} key={slug}>
              <i>{icon}</i>{label}
            </Link>
          ))}
        </nav>
        <div className="quote">人生は一生の勉強<small>Belajar adalah perjalanan seumur hidup.</small></div>
        <form action="/auth/signout" method="post"><button className="btn ghost full" type="submit">Keluar</button></form>
      </aside>
      <main className="content">{children}</main>
      <nav className="bottom">
        {baseNav.slice(0, 4).map(([slug, label, icon]) => (
          <Link className={section === slug ? 'active' : ''} href={`/portal/${slug}`} key={slug}><i>{icon}</i><small>{label}</small></Link>
        ))}
      </nav>
    </div>
  )
}

function Dashboard({ data }: { data: PortalData }) {
  const materialIdSet = new Set(data.contentSessionIds)
  const materials = data.sessions.filter((item) => materialIdSet.has(item.id))
  const progressByMaterial = new Map(data.progress.map((item) => [item.session_id, item]))
  const learned = materials.filter((item) => progressByMaterial.get(item.id)?.learning_status === 'learned')
  const review = materials.filter((item) => progressByMaterial.get(item.id)?.learning_status === 'review')
  const notStarted = materials.filter((item) => {
    const status = progressByMaterial.get(item.id)?.learning_status
    return status !== 'learned' && status !== 'review'
  })

  const nextMaterial = materials.find((material) => {
    const status = progressByMaterial.get(material.id)?.learning_status
    const access = material.access_tier === 'free' || hasActiveAccess(data.entitlements, material.level_id)
    return status !== 'learned' && material.content_status === 'published' && access
  })
  const nextProgress = nextMaterial ? progressByMaterial.get(nextMaterial.id) : undefined
  const nextLevel = nextMaterial ? data.levels.find((level) => level.id === nextMaterial.level_id) : undefined
  const overallPercent = materials.length === 0 ? 0 : Math.min(100, Math.round((learned.length / materials.length) * 100))
  const summaries = [
    { number: '01', label: 'Sudah dipelajari', value: learned.length, note: 'Materi selesai' },
    { number: '02', label: 'Pelajari lagi', value: review.length, note: 'Masuk daftar ulasan' },
    { number: '03', label: 'Belum dimulai', value: notStarted.length, note: 'Siap untuk dipelajari' },
  ]

  return (
    <div className="dashboard-view">
      <DashboardScrollReset />
      <div className="dashboard-top-space" aria-hidden="true" />
      <header className="dashboard-head">
        <div>
          <div className="dashboard-kicker">RUANG BELAJAR TAKUMI</div>
          <h1>Selamat datang kembali,<br /><em>{data.userName}.</em></h1>
          <p>Belajar sesuai ritmemu, dengan arah yang tetap jelas.</p>
        </div>
        <Link className="dashboard-head-link" href="/portal/materi">Lihat semua materi <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="dashboard-resume">
        <div className="dashboard-resume-copy">
          <div className="dashboard-resume-label">
            <span>LANJUTKAN BELAJAR</span>
            <small>{nextLevel?.code || 'TAKUMI'} · {nextMaterial ? `MATERI ${String(nextMaterial.session_no).padStart(2, '0')}` : 'MATERI'}</small>
          </div>
          {nextMaterial ? (
            <>
              <h2>{nextMaterial.title}</h2>
              <div className="dashboard-resume-meta">
                <div><span>Progres baca</span><b>{nextProgress?.read_percent || 0}%</b></div>
                <div><span>Status</span><b>{getLearningStatus(nextProgress)}</b></div>
              </div>
              <Link className="dashboard-primary-action" href={`/portal/session/${nextMaterial.id}`}>Lanjutkan materi <span aria-hidden="true">→</span></Link>
            </>
          ) : (
            <>
              <h2>Belum ada materi yang perlu dilanjutkan.</h2>
              <p className="dashboard-empty-copy">Materi baru akan muncul di sini setelah dipublikasikan.</p>
              <Link className="dashboard-primary-action" href="/portal/materi">Lihat materi <span aria-hidden="true">→</span></Link>
            </>
          )}
        </div>
        <div className="dashboard-resume-mark" aria-hidden="true">
          <small>CONTINUE</small>
          <span>続</span>
          <b>{overallPercent}%</b>
        </div>
      </section>

      <section className="dashboard-summaries" aria-label="Ringkasan progres belajar">
        {summaries.map((summary) => (
          <article key={summary.number}>
            <small>{summary.number}</small>
            <div><span>{summary.label}</span><p>{summary.note}</p></div>
            <b>{summary.value}</b>
          </article>
        ))}
      </section>

      <div className="dashboard-columns">
        <section className="dashboard-programs">
          <div className="dashboard-section-heading">
            <div><small>PROGRAM BELAJAR</small><h2>Jalur Anda</h2></div>
            <span>{overallPercent}% selesai</span>
          </div>
          <div className="dashboard-program-list">
            {data.levels.map((level, index) => {
              const levelMaterials = materials.filter((item) => item.level_id === level.id)
              const learnedForLevel = levelMaterials.filter((item) => progressByMaterial.get(item.id)?.learning_status === 'learned').length
              const percent = levelMaterials.length === 0 ? 0 : Math.min(100, Math.round((learnedForLevel / levelMaterials.length) * 100))
              const freeCount = levelMaterials.filter((item) => item.access_tier === 'free').length
              const premium = hasActiveAccess(data.entitlements, level.id)
              return (
                <Link className="dashboard-program" href={`/portal/materi?level=${level.code}`} key={level.id}>
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  <b>{level.code}</b>
                  <div className="dashboard-program-copy">
                    <h3>{level.name}</h3>
                    <p>{levelMaterials.length} materi · {freeCount} gratis · {premium ? 'Premium aktif' : 'Freemium'}</p>
                    <div className="dashboard-progress" aria-label={`Progres ${percent}%`}><i style={{ width: `${percent}%` }} /></div>
                  </div>
                  <strong>{percent}% <span aria-hidden="true">→</span></strong>
                </Link>
              )
            })}
          </div>
        </section>

        <aside className="dashboard-standard">
          <div className="dashboard-section-heading"><div><small>STANDAR TAKUMI</small><h2>Patokan latihan</h2></div></div>
          <p>Gunakan nilai berikut sebagai penanda kesiapan sebelum melanjutkan.</p>
          <div className="dashboard-standard-list">
            <div><span>01</span><b>Latihan materi</b><strong>≥70</strong></div>
            <div><span>02</span><b>Evaluasi berkala</b><strong>≥75</strong></div>
            <div><span>03</span><b>Simulasi JLPT</b><strong>≥75</strong></div>
          </div>
          <small className="dashboard-standard-note">焦らず、止まらず。<br />Tidak perlu terburu-buru, jangan berhenti.</small>
        </aside>
      </div>
    </div>
  )
}

function Materi({ data, selectedCode }: { data: PortalData; selectedCode: string }) {
  const selectedLevel = data.levels.find((level) => level.code === selectedCode) || data.levels[0]
  if (!selectedLevel) return <section className="panel"><h2>Program belum tersedia</h2></section>

  const materialIdSet = new Set(data.contentSessionIds)
  const materials = data.sessions
    .filter((session) => session.level_id === selectedLevel.id && materialIdSet.has(session.id))
    .sort((a, b) => a.session_no - b.session_no)
  const progressByMaterial = new Map(data.progress.map((item) => [item.session_id, item]))
  const premium = hasActiveAccess(data.entitlements, selectedLevel.id)

  return (
    <>
      <div className="head"><div><div className="eyebrow">MATERI</div><h1>{selectedLevel.name}</h1><p>{materials.length} materi tersedia · pelajari sesuai ritme Anda</p></div><div className="tabs">{data.levels.map((level) => <Link className={level.id === selectedLevel.id ? 'on' : ''} href={`/portal/materi?level=${level.code}`} key={level.id}>{level.code}</Link>)}</div></div>

      {materials.length === 0 ? (
        <section className="panel empty"><h2>Belum ada materi</h2><p>Materi akan muncul di halaman ini setelah Tim Takumi mulai mengisinya.</p></section>
      ) : (
        <div className="sessiongrid">
          {materials.map((material, index) => {
            const progress = progressByMaterial.get(material.id)
            const isFree = material.access_tier === 'free'
            const isPublished = material.content_status === 'published'
            const canOpen = isPublished && (isFree || premium)
            const learningStatus = getLearningStatus(progress)
            const accessStatus = !isPublished ? 'Segera hadir' : isFree ? 'Gratis' : premium ? 'Premium' : 'Terkunci'
            const learned = progress?.learning_status === 'learned'
            const review = progress?.learning_status === 'review'

            return <article key={material.id} className={!canOpen ? 'locked' : ''}>
              <b className="num">{String(index + 1).padStart(2, '0')}</b>
              <div><small>MATERI {index + 1}</small><h3>{material.title}</h3><p>{learningStatus} · {accessStatus}{progress?.read_percent ? ` · baca ${progress.read_percent}%` : ''}</p></div>
              <strong>{learned ? '✓' : review ? '↻' : canOpen ? <Link aria-label={`Buka materi ${index + 1}`} href={`/portal/session/${material.id}`}>▶</Link> : '🔒'}</strong>
            </article>
          })}
        </div>
      )}
    </>
  )
}

function Bookmark({ data }: { data: PortalData }) {
  const groups = [
    ['review', 'Ingin dipelajari lagi'],
    ['uncertain', 'Masih ragu'],
    ['mastered', 'Sudah dikuasai'],
  ]

  return (
    <>
      <div className="head"><div><div className="eyebrow">BOOKMARK</div><h1>Dipelajari Lagi</h1><p>Soal salah masuk otomatis ke sini setelah latihan dinilai.</p></div></div>
      <div className="stats">{groups.map(([key, label]) => <article key={key}><span>{label}</span><b>{data.bookmarks.filter((item) => item.category === key).length}</b></article>)}</div>
      {data.bookmarks.length === 0 && <section className="panel empty"><h2>Belum ada bookmark</h2><p>Setelah Anda mengerjakan latihan, soal yang salah akan muncul di sini secara otomatis.</p></section>}
    </>
  )
}

function Hasil({ data }: { data: PortalData }) {
  const scored = data.attempts.filter((item) => item.score != null)
  const latest = scored[0]?.score ?? null
  const highest = scored.reduce<number | null>((max, item) => item.score == null ? max : Math.max(max ?? item.score, item.score), null)

  return (
    <>
      <div className="head"><div><div className="eyebrow">HASIL BELAJAR</div><h1>Perkembangan Anda</h1><p>Seluruh percobaan disimpan; nilai tertinggi menentukan kelulusan latihan.</p></div></div>
      <div className="stats"><article><span>Nilai terbaru</span><b>{latest ?? '—'}</b></article><article><span>Nilai tertinggi</span><b>{highest ?? '—'}</b></article><article><span>Total percobaan</span><b>{data.attempts.length}</b></article></div>
      <section className="panel"><h2>Riwayat nilai</h2>{scored.length === 0 ? <p>Belum ada hasil latihan. Riwayat akan muncul setelah soal dipublikasikan dan dikerjakan.</p> : scored.slice(0, 10).map((item, index) => <div className="row" key={`${item.submitted_at}-${index}`}><b>Percobaan {data.attempts.length - index}</b><span>{item.score} · {item.result_status === 'passed' ? 'Lulus' : 'Belum lulus'}</span></div>)}</section>
    </>
  )
}

function Pembayaran() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">AKSES PREMIUM</div><h1>Pilih paket belajar</h1><p>Aktivasi manual maksimal 1×24 jam setelah pembayaran diverifikasi admin.</p></div></div>
      <div className="plans"><article><small>BULANAN</small><h2>¥980</h2><p>/ bulan</p><button className="btn ghost full">Pilih bulanan</button></article><article className="featured"><small>3 BULAN</small><h2>¥2.700</h2><p>lebih hemat</p><button className="btn primary full">Pilih 3 bulan</button></article></div>
      <section className="panel"><h2>Status tahap awal</h2><p>Form pengiriman bukti pembayaran akan diaktifkan pada tahap berikutnya. Struktur database pembayaran dan akses premium sudah tersedia.</p></section>
    </>
  )
}

async function loadData(): Promise<PortalData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, levelsResult, sessionsResult, contentBlocksResult, progressResult, attemptsResult, bookmarksResult, entitlementsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
    supabase.from('levels').select('id, code, name'),
    supabase.from('learning_sessions').select('id, level_id, session_no, title, slug, access_tier, content_status, estimated_minutes').order('session_no'),
    supabase.from('content_blocks').select('session_id'),
    supabase.from('session_progress').select('session_id, read_percent, status, learning_status, highest_score, updated_at').order('updated_at', { ascending: false }),
    supabase.from('quiz_attempts').select('score, result_status, submitted_at').order('started_at', { ascending: false }).limit(100),
    supabase.from('bookmarks').select('id, category, source, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('entitlements').select('level_id, active, starts_at, ends_at'),
  ])

  const levels = (levelsResult.data || []) as Level[]
  levels.sort((a, b) => a.code === 'N4' ? -1 : b.code === 'N4' ? 1 : a.code.localeCompare(b.code))
  const contentSessionIds = [...new Set(((contentBlocksResult.data || []) as ContentBlockRef[]).map((item) => item.session_id))]

  return {
    userName: profileResult.data?.full_name || user.email?.split('@')[0] || 'Siswa',
    role: profileResult.data?.role || 'student',
    levels,
    sessions: (sessionsResult.data || []) as LearningSession[],
    contentSessionIds,
    progress: (progressResult.data || []) as Progress[],
    attempts: (attemptsResult.data || []) as Attempt[],
    bookmarks: (bookmarksResult.data || []) as BookmarkRow[],
    entitlements: (entitlementsResult.data || []) as Entitlement[],
  }
}

export default async function Portal({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ level?: string }> }) {
  const [{ section }, query, data] = await Promise.all([params, searchParams, loadData()])
  const isAdmin = data.role === 'super_admin' || data.role === 'content_admin'

  if (section === 'admin' && !isAdmin) redirect('/portal/dashboard')

  let content: React.ReactNode
  if (section === 'materi') content = <Materi data={data} selectedCode={query.level === 'N3' ? 'N3' : 'N4'} />
  else if (section === 'bookmark') content = <Bookmark data={data} />
  else if (section === 'hasil') content = <Hasil data={data} />
  else if (section === 'pembayaran') content = <Pembayaran />
  else content = <Dashboard data={data} />

  return <Shell section={section} isAdmin={isAdmin} userName={data.userName}>{content}</Shell>
}

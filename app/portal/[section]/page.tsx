import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'

type Level = {
  id: string
  code: string
  name: string
  total_sessions: number
  free_sessions: number
  target_minutes_per_session: number
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
  status: string
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

type PortalData = {
  userName: string
  role: string
  levels: Level[]
  sessions: LearningSession[]
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
]

function hasActiveAccess(entitlements: Entitlement[], levelId: string) {
  const now = Date.now()
  return entitlements.some((item) => {
    const starts = new Date(item.starts_at).getTime()
    const ends = item.ends_at ? new Date(item.ends_at).getTime() : Number.POSITIVE_INFINITY
    return item.level_id === levelId && item.active && starts <= now && ends > now
  })
}

function Shell({ section, children, isAdmin, userName }: { section: string; children: React.ReactNode; isAdmin: boolean; userName: string }) {
  const nav = isAdmin ? [...baseNav, ['admin', 'Admin', '⚙']] : baseNav

  return (
    <div className="portal">
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
  const completed = data.progress.filter((item) => item.status === 'completed')
  const maxScore = data.attempts.reduce<number | null>((max, item) => item.score == null ? max : Math.max(max ?? item.score, item.score), null)
  const needsReview = data.bookmarks.filter((item) => item.category === 'review').length

  const sessionsById = new Map(data.sessions.map((item) => [item.id, item]))
  const nextSession = data.sessions.find((session) => !completed.some((item) => item.session_id === session.id))

  return (
    <>
      <div className="head"><div><div className="eyebrow">DASHBOARD</div><h1>Selamat datang, {data.userName}</h1><p>Data di halaman ini sekarang dibaca langsung dari akun dan database Takumi.</p></div></div>

      <section className="resume">
        <div>
          <div className="eyebrow">LANJUTKAN BELAJAR</div>
          {nextSession ? <><h2>{nextSession.title}</h2><p>±{nextSession.estimated_minutes} menit · {nextSession.access_tier === 'free' ? 'Akses gratis' : 'Akses premium'}</p><Link className="btn primary" href={`/portal/materi?level=${data.levels.find((l) => l.id === nextSession.level_id)?.code || 'N4'}`}>Buka daftar sesi →</Link></> : <><h2>Belum ada sesi berikutnya</h2><p>Materi baru akan muncul setelah dipublikasikan atau akses Anda diaktifkan.</p><Link className="btn primary" href="/portal/materi">Lihat materi →</Link></>}
        </div>
        <div>匠</div>
      </section>

      <div className="stats">
        <article><span>Sesi selesai</span><b>{completed.length}</b></article>
        <article><span>Nilai tertinggi</span><b>{maxScore ?? '—'}</b></article>
        <article><span>Perlu diulang</span><b>{needsReview}</b></article>
      </div>

      <div className="twocol">
        <section>
          <h2>Program Anda</h2>
          {data.levels.map((level) => {
            const doneForLevel = completed.filter((item) => sessionsById.get(item.session_id)?.level_id === level.id).length
            const percent = Math.min(100, Math.round((doneForLevel / level.total_sessions) * 100))
            const premium = hasActiveAccess(data.entitlements, level.id)
            return <div className="course" key={level.id}><b>{level.code}</b><div><h3>{level.name}</h3><p>{level.total_sessions} sesi · {level.free_sessions} gratis · {premium ? 'Premium aktif' : 'Freemium'}</p><div className="bar"><i style={{ width: `${percent}%` }} /></div></div><strong>{percent}%</strong></div>
          })}
        </section>
        <section className="panel"><h2>Target kelulusan</h2><div className="row"><b>Latihan sesi</b><span>≥70</span></div><div className="row"><b>Evaluasi 5 sesi</b><span>≥75</span></div><div className="row"><b>Simulasi JLPT</b><span>≥75</span></div></section>
      </div>
    </>
  )
}

function Materi({ data, selectedCode }: { data: PortalData; selectedCode: string }) {
  const selectedLevel = data.levels.find((level) => level.code === selectedCode) || data.levels[0]
  if (!selectedLevel) return <section className="panel"><h2>Program belum tersedia</h2></section>

  const visibleSessions = data.sessions.filter((session) => session.level_id === selectedLevel.id)
  const recordByNo = new Map(visibleSessions.map((session) => [session.session_no, session]))
  const progressBySession = new Map(data.progress.map((item) => [item.session_id, item]))
  const premium = hasActiveAccess(data.entitlements, selectedLevel.id)

  return (
    <>
      <div className="head"><div><div className="eyebrow">MATERI</div><h1>{selectedLevel.name}</h1><p>{selectedLevel.total_sessions} sesi · target ±{selectedLevel.target_minutes_per_session} menit per sesi</p></div><div className="tabs">{data.levels.map((level) => <Link className={level.id === selectedLevel.id ? 'on' : ''} href={`/portal/materi?level=${level.code}`} key={level.id}>{level.code}</Link>)}</div></div>
      <div className="sessiongrid">
        {Array.from({ length: selectedLevel.total_sessions }, (_, index) => index + 1).map((sessionNo) => {
          const session = recordByNo.get(sessionNo)
          const progress = session ? progressBySession.get(session.id) : undefined
          const isFree = sessionNo <= selectedLevel.free_sessions
          const canOpen = Boolean(session && (isFree || premium))
          return <article key={sessionNo} className={!canOpen ? 'locked' : ''}>
            <b className="num">{String(sessionNo).padStart(2, '0')}</b>
            <div><small>SESI {sessionNo}</small><h3>{session?.title || `Sesi ${selectedLevel.code} ${String(sessionNo).padStart(2, '0')}`}</h3><p>±{session?.estimated_minutes || selectedLevel.target_minutes_per_session} menit · minimal 70 · {progress?.status === 'completed' ? 'Selesai' : isFree ? 'Gratis' : premium ? 'Premium' : 'Terkunci'}</p></div>
            <strong>{progress?.status === 'completed' ? '✓' : canOpen ? '▶' : '🔒'}</strong>
          </article>
        })}
      </div>
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
      <div className="head"><div><div className="eyebrow">BOOKMARK</div><h1>Dipelajari Lagi</h1><p>Soal salah akan masuk otomatis setelah bank soal dipublikasikan.</p></div></div>
      <div className="stats">{groups.map(([key, label]) => <article key={key}><span>{label}</span><b>{data.bookmarks.filter((item) => item.category === key).length}</b></article>)}</div>
      {data.bookmarks.length === 0 && <section className="panel empty"><h2>Belum ada bookmark</h2><p>Setelah Anda mengerjakan latihan, soal yang salah dapat muncul di sini secara otomatis.</p></section>}
    </>
  )
}

function Hasil({ data }: { data: PortalData }) {
  const scored = data.attempts.filter((item) => item.score != null)
  const latest = scored[0]?.score ?? null
  const highest = scored.reduce<number | null>((max, item) => item.score == null ? max : Math.max(max ?? item.score, item.score), null)

  return (
    <>
      <div className="head"><div><div className="eyebrow">HASIL BELAJAR</div><h1>Perkembangan Anda</h1><p>Seluruh percobaan disimpan; nilai tertinggi menentukan kelulusan.</p></div></div>
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

function Admin({ data }: { data: PortalData }) {
  const totalSessions = data.levels.reduce((sum, level) => sum + level.total_sessions, 0)
  return (
    <>
      <div className="head"><div><div className="eyebrow">ADMIN</div><h1>Panel Operasional</h1><p>Akses halaman ini hanya ditampilkan untuk role admin.</p></div></div>
      <div className="four"><article><span>Program</span><b>{data.levels.length}</b></article><article><span>Total sesi</span><b>{totalSessions}</b></article><article><span>Sesi terlihat</span><b>{data.sessions.length}</b></article><article><span>Konten publik</span><b>{data.sessions.filter((s) => s.content_status === 'published').length}</b></article></div>
      <section className="panel"><h2>Alur konten</h2><div className="flow"><span>Draft</span>→<span>Review</span>→<span>Perlu diperbaiki</span>→<span>Disetujui</span>→<span>Published</span></div><p>Editor materi lengkap akan dibangun setelah fondasi autentikasi ini stabil.</p></section>
    </>
  )
}

async function loadData(): Promise<PortalData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, levelsResult, sessionsResult, progressResult, attemptsResult, bookmarksResult, entitlementsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
    supabase.from('levels').select('id, code, name, total_sessions, free_sessions, target_minutes_per_session'),
    supabase.from('learning_sessions').select('id, level_id, session_no, title, slug, access_tier, content_status, estimated_minutes').order('session_no'),
    supabase.from('session_progress').select('session_id, status, highest_score, updated_at').order('updated_at', { ascending: false }),
    supabase.from('quiz_attempts').select('score, result_status, submitted_at').order('started_at', { ascending: false }).limit(100),
    supabase.from('bookmarks').select('id, category, source, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('entitlements').select('level_id, active, starts_at, ends_at'),
  ])

  const levels = (levelsResult.data || []) as Level[]
  levels.sort((a, b) => a.code === 'N4' ? -1 : b.code === 'N4' ? 1 : a.code.localeCompare(b.code))

  return {
    userName: profileResult.data?.full_name || user.email?.split('@')[0] || 'Siswa',
    role: profileResult.data?.role || 'student',
    levels,
    sessions: (sessionsResult.data || []) as LearningSession[],
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
  else if (section === 'admin') content = <Admin data={data} />
  else content = <Dashboard data={data} />

  return <Shell section={section} isAdmin={isAdmin} userName={data.userName}>{content}</Shell>
}

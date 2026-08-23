import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import DashboardScrollReset from '../../components/dashboard-scroll-reset'
import PortalNavIcon, { type PortalNavIconName } from '../../components/portal-nav-icon'

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

type NavItem = {
  slug: string
  label: string
  icon: PortalNavIconName
}

const baseNav: NavItem[] = [
  { slug: 'dashboard', label: 'Beranda', icon: 'home' },
  { slug: 'materi', label: 'Materi', icon: 'material' },
  { slug: 'bookmark', label: 'Bookmark', icon: 'bookmark' },
  { slug: 'hasil', label: 'Hasil', icon: 'results' },
  { slug: 'pembayaran', label: 'Premium', icon: 'premium' },
  { slug: 'settings', label: 'Pengaturan', icon: 'settings' },
  { slug: 'support', label: 'Bantuan', icon: 'support' },
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
  const nav: NavItem[] = isAdmin
    ? [...baseNav, { slug: 'admin', label: 'Admin', icon: 'admin' }]
    : baseNav

  return (
    <div className={`portal portal-${section}`}>
      <aside className="side">
        <div className="brand"><span>匠</span><div><b>Takumi</b><small>Japanese</small></div></div>
        <div className="side-user"><small>MASUK SEBAGAI</small><b>{userName}</b></div>
        <nav>
          {nav.map(({ slug, label, icon }) => (
            <Link className={section === slug ? 'active' : ''} href={`/portal/${slug}`} key={slug}>
              <i><PortalNavIcon name={icon} /></i>{label}
            </Link>
          ))}
        </nav>
        <div className="quote">人生は一生の勉強<small>Belajar adalah perjalanan seumur hidup.</small></div>
        <form action="/auth/signout" method="post"><button className="btn ghost full" type="submit">Keluar</button></form>
      </aside>
      <main className="content">{children}</main>
      <nav className="bottom">
        {baseNav.map(({ slug, label, icon }) => (
          <Link className={section === slug ? 'active' : ''} href={`/portal/${slug}`} key={slug}><i><PortalNavIcon name={icon} /></i><small>{label}</small></Link>
        ))}
      </nav>
    </div>
  )
}

function PortalSectionHeader({ number, eyebrow, title, description, mark, children }: {
  number: string
  eyebrow: string
  title: string
  description: string
  mark: string
  children?: React.ReactNode
}) {
  return (
    <header className="portal-section-head">
      <div className="portal-section-copy">
        <div className="portal-section-kicker"><span>{number}</span>{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
      <div className="portal-section-mark" aria-hidden="true"><small>TAKUMI JAPANESE</small><b>{mark}</b></div>
    </header>
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
  const freeCount = materials.filter((material) => material.access_tier === 'free').length
  const learnedCount = materials.filter((material) => progressByMaterial.get(material.id)?.learning_status === 'learned').length

  return (
    <div className="portal-section-view">
      <PortalSectionHeader number="01" eyebrow="MATERI BELAJAR" title={selectedLevel.name} description={`${materials.length} materi terarah untuk membangun kemampuan secara bertahap.`} mark="文">
        <nav className="portal-level-tabs" aria-label="Pilih level">
          {data.levels.map((level) => <Link className={level.id === selectedLevel.id ? 'on' : ''} href={`/portal/materi?level=${level.code}`} key={level.id}><small>LEVEL</small>{level.code}</Link>)}
        </nav>
      </PortalSectionHeader>

      <section className="portal-section-summary" aria-label="Ringkasan materi">
        <article><small>01</small><span>Total materi</span><b>{materials.length}</b></article>
        <article><small>02</small><span>Sudah dipelajari</span><b>{learnedCount}</b></article>
        <article><small>03</small><span>Akses tersedia</span><b>{premium ? 'Penuh' : `${freeCount} gratis`}</b></article>
      </section>

      {materials.length === 0 ? (
        <section className="portal-empty-certificate"><small>MATERI · {selectedLevel.code}</small><h2>Belum ada materi yang diterbitkan.</h2><p>Materi akan muncul di halaman ini setelah Tim Takumi mulai mengisinya.</p><b aria-hidden="true">準</b></section>
      ) : (
        <section className="portal-material-list" aria-label={`Daftar materi ${selectedLevel.code}`}>
          {materials.map((material, index) => {
            const progress = progressByMaterial.get(material.id)
            const isFree = material.access_tier === 'free'
            const isPublished = material.content_status === 'published'
            const canOpen = isPublished && (isFree || premium)
            const learningStatus = getLearningStatus(progress)
            const accessStatus = !isPublished ? 'Segera hadir' : isFree ? 'Gratis' : premium ? 'Premium' : 'Terkunci'
            const learned = progress?.learning_status === 'learned'
            const review = progress?.learning_status === 'review'

            const body = <>
              <div className="portal-material-index"><small>{selectedLevel.code}</small><b>{String(index + 1).padStart(2, '0')}</b></div>
              <div className="portal-material-copy"><small>MATERI {String(index + 1).padStart(2, '0')} · {material.estimated_minutes || 0} MENIT</small><h3>{material.title}</h3><p>{learningStatus} · {accessStatus}{progress?.read_percent ? ` · baca ${progress.read_percent}%` : ''}</p></div>
              <div className="portal-material-state"><span>{learned ? 'SELESAI' : review ? 'ULANGI' : canOpen ? 'MULAI' : 'TERKUNCI'}</span><b aria-hidden="true">{learned ? '✓' : review ? '↻' : canOpen ? '→' : '—'}</b></div>
            </>

            return canOpen ? (
              <Link className="portal-material-card" aria-label={`Buka materi ${index + 1}: ${material.title}`} href={`/portal/session/${material.id}`} key={material.id}>{body}</Link>
            ) : <article className="portal-material-card locked" key={material.id}>{body}</article>
          })}
        </section>
      )}
    </div>
  )
}

function Bookmark({ data }: { data: PortalData }) {
  const groups = [
    ['review', 'Ingin dipelajari lagi'],
    ['uncertain', 'Masih ragu'],
    ['mastered', 'Sudah dikuasai'],
  ]

  return (
    <div className="portal-section-view">
      <PortalSectionHeader number="02" eyebrow="BOOKMARK" title="Dipelajari lagi" description="Satu tempat untuk mengulang bagian yang masih ragu dan menguatkan yang sudah dipahami." mark="復" />
      <section className="portal-section-summary portal-bookmark-summary" aria-label="Ringkasan bookmark">
        {groups.map(([key, label], index) => <article key={key}><small>{String(index + 1).padStart(2, '0')}</small><span>{label}</span><b>{data.bookmarks.filter((item) => item.category === key).length}</b></article>)}
      </section>
      {data.bookmarks.length === 0 ? (
        <section className="portal-empty-certificate"><small>REVIEW · AUTOMATIS</small><h2>Belum ada yang perlu diulang.</h2><p>Soal yang belum tepat akan tersimpan otomatis di sini setelah latihan dinilai.</p><b aria-hidden="true">復</b></section>
      ) : (
        <section className="portal-ledger">
          <div className="portal-ledger-head"><div><small>DAFTAR ULANGAN</small><h2>Bookmark terbaru</h2></div><b>{data.bookmarks.length} item</b></div>
          {data.bookmarks.slice(0, 20).map((item, index) => (
            <article key={item.id}><small>{String(index + 1).padStart(2, '0')}</small><div><b>{groups.find(([key]) => key === item.category)?.[1] || 'Tersimpan'}</b><span>{item.source || 'Latihan Takumi'}</span></div><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('id-ID')}</time></article>
          ))}
        </section>
      )}
    </div>
  )
}

function Hasil({ data }: { data: PortalData }) {
  const scored = data.attempts.filter((item) => item.score != null)
  const latest = scored[0]?.score ?? null
  const highest = scored.reduce<number | null>((max, item) => item.score == null ? max : Math.max(max ?? item.score, item.score), null)
  const passed = scored.filter((item) => item.result_status === 'passed').length

  return (
    <div className="portal-section-view">
      <PortalSectionHeader number="03" eyebrow="HASIL BELAJAR" title="Perkembangan Anda" description="Setiap percobaan disimpan agar kemajuan terlihat, bukan sekadar terasa." mark="績" />
      <section className="portal-section-summary" aria-label="Ringkasan hasil belajar">
        <article><small>01</small><span>Nilai terbaru</span><b>{latest ?? '—'}</b></article>
        <article><small>02</small><span>Nilai tertinggi</span><b>{highest ?? '—'}</b></article>
        <article><small>03</small><span>Latihan lulus</span><b>{passed}</b></article>
      </section>
      <section className="portal-ledger portal-result-ledger">
        <div className="portal-ledger-head"><div><small>ARSIP NILAI</small><h2>Riwayat percobaan</h2></div><b>{scored.length} tercatat</b></div>
        {scored.length === 0 ? <p className="portal-ledger-empty">Belum ada hasil latihan. Riwayat akan muncul setelah soal dipublikasikan dan dikerjakan.</p> : scored.slice(0, 10).map((item, index) => (
          <article key={`${item.submitted_at}-${index}`}><small>{String(index + 1).padStart(2, '0')}</small><div><b>Percobaan {data.attempts.length - index}</b><span>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('id-ID') : 'Tanggal belum tersedia'}</span></div><strong className={item.result_status === 'passed' ? 'passed' : ''}>{item.score}<small>{item.result_status === 'passed' ? 'LULUS' : 'ULANGI'}</small></strong></article>
        ))}
      </section>
    </div>
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

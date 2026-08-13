import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import styles from './admin.module.css'
import overview from './admin-overview.module.css'

type Level = {
  id: string
  code: string
  name: string
  total_sessions: number
  free_sessions: number
}

type Session = {
  id: string
  level_id: string
  session_no: number
  title: string
  access_tier: string
  content_status: string
  updated_at: string
}

type ContentProgress = {
  session_id: string
  block_count: number | string
}

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  review: 'Review',
  changes_requested: 'Perlu diperbaiki',
  approved: 'Disetujui',
  published: 'Published',
  archived: 'Diarsipkan',
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle()
  const role = profile?.role || 'student'
  if (role !== 'super_admin' && role !== 'content_admin') redirect('/portal/dashboard')

  const [levelsResult, sessionsResult, progressResult] = await Promise.all([
    supabase.from('levels').select('id, code, name, total_sessions, free_sessions'),
    supabase.from('learning_sessions').select('id, level_id, session_no, title, access_tier, content_status, updated_at').order('session_no'),
    supabase.rpc('admin_content_progress'),
  ])

  const levels = (levelsResult.data || []) as Level[]
  levels.sort((a, b) => a.code === 'N4' ? -1 : b.code === 'N4' ? 1 : a.code.localeCompare(b.code))
  const sessions = (sessionsResult.data || []) as Session[]
  const progressRows = (progressResult.data || []) as ContentProgress[]
  const progressBySession = new Map(progressRows.map((item) => [item.session_id, Number(item.block_count) || 0]))

  const selectedCode = query.level === 'N3' ? 'N3' : 'N4'
  const selectedLevel = levels.find((level) => level.code === selectedCode) || levels[0]
  const selectedSessions = selectedLevel ? sessions.filter((session) => session.level_id === selectedLevel.id) : []

  const published = sessions.filter((session) => session.content_status === 'published').length
  const review = sessions.filter((session) => session.content_status === 'review').length
  const needsChanges = sessions.filter((session) => session.content_status === 'changes_requested').length
  const draftsInProgress = sessions.filter((session) => session.content_status === 'draft' && (progressBySession.get(session.id) || 0) > 0).length

  return (
    <main className={styles.adminShell}>
      <div className={styles.topbar}>
        <Link href="/portal/dashboard">← Dashboard siswa</Link>
        <div className={overview.topbarLinks}>
          <Link href="/portal/admin/support">Support →</Link>
          {role === 'super_admin' && <><Link href="/portal/admin/users">Pengguna →</Link><Link href="/portal/admin/payments">Pembayaran →</Link></>}
          <span className={styles.roleBadge}>{role === 'super_admin' ? 'SUPER ADMIN' : 'CONTENT ADMIN'}</span>
        </div>
      </div>

      <header className={`${styles.hero} ${overview.heroFix}`}>
        <div>
          <div className={styles.eyebrow}>TAKUMI CONTENT STUDIO</div>
          <h1>Panel Admin Materi</h1>
          <p>Susun sesi, isi materi, buat soal, kirim ke review, lalu publikasikan setelah pengecekan akhir.</p>
        </div>
        <div className={styles.heroMark}>匠</div>
      </header>

      <section className={styles.stats}>
        <article><span>Total sesi</span><b>{sessions.length}</b></article>
        <article><span>Published</span><b>{published}</b></article>
        <article><span>Menunggu review</span><b>{review}</b></article>
        <article><span>Perlu diperbaiki</span><b>{needsChanges}</b></article>
      </section>

      <section className={styles.workflow}>
        <div className={draftsInProgress > 0 ? overview.workflowActive : ''}><b>1</b><span>{draftsInProgress > 0 ? `Draft · ${draftsInProgress} aktif` : 'Draft'}</span></div>
        <i>→</i>
        <div><b>2</b><span>Review</span></div>
        <i>→</i>
        <div><b>3</b><span>Perbaikan / Approved</span></div>
        <i>→</i>
        <div><b>4</b><span>Published</span></div>
      </section>

      <div className={styles.sectionHead}>
        <div>
          <div className={styles.eyebrow}>DAFTAR SESI</div>
          <h2>{selectedLevel?.name || selectedCode}</h2>
        </div>
        <div className={styles.tabs}>
          {levels.map((level) => (
            <Link className={level.code === selectedCode ? styles.activeTab : ''} href={`/portal/admin?level=${level.code}`} key={level.id}>{level.code}</Link>
          ))}
        </div>
      </div>

      <div className={styles.sessionList}>
        {selectedSessions.map((session) => {
          const blockCount = progressBySession.get(session.id) || 0
          const isDraftActive = session.content_status === 'draft' && blockCount > 0
          return (
            <article className={styles.sessionRow} key={session.id}>
              <div className={styles.sessionNo}>{String(session.session_no).padStart(2, '0')}</div>
              <div className={styles.sessionInfo}>
                <small>SESI {session.session_no} · {session.access_tier === 'free' ? 'GRATIS' : 'PREMIUM'}</small>
                <h3>{session.title}</h3>
                <p>Terakhir diperbarui {new Date(session.updated_at).toLocaleDateString('id-ID')}{blockCount > 0 ? ` · ${blockCount} blok materi` : ''}</p>
              </div>
              <span className={`${styles.status} ${styles[session.content_status] || ''} ${isDraftActive ? overview.draftActive : ''}`}>{isDraftActive ? 'Draft aktif' : (statusLabel[session.content_status] || session.content_status)}</span>
              <Link className={styles.editButton} href={`/portal/admin/session/${session.id}`}>Edit →</Link>
            </article>
          )
        })}
      </div>
    </main>
  )
}

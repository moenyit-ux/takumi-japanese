import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import CreateMaterialButton from './create-material-button'
import baseStyles from './admin.module.css'
import categoryStyles from './admin-categories.module.css'
import overview from './admin-overview.module.css'

const styles = { ...baseStyles, ...categoryStyles }

type Level = {
  id: string
  code: string
  name: string
}

type Session = {
  id: string
  level_id: string
  session_no: number
  title: string
  access_tier: string
  content_status: string
  created_by: string | null
  updated_at: string
}

type ContentProgress = {
  session_id: string
  block_count: number | string
}

type ContentBlockSummary = {
  session_id: string
  kind: string
}

type CategoryKey = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening' | 'quiz' | 'jlpt'

type Category = {
  key: CategoryKey
  mark: string
  label: string
  japanese: string
  description: string
  targetN4?: number
  targetN3?: number
}

const categories: Category[] = [
  { key: 'vocabulary', mark: '語', label: 'Kosakata', japanese: '単語', description: 'Tambah, edit, dan review kosakata.', targetN4: 1000, targetN3: 2000 },
  { key: 'kanji', mark: '漢', label: 'Kanji', japanese: '漢字', description: 'Kanji, bacaan, arti, dan contoh.', targetN4: 200, targetN3: 350 },
  { key: 'grammar', mark: '文', label: 'Bunpou', japanese: '文法', description: 'Pola kalimat, penjelasan, dan contoh.', targetN4: 100, targetN3: 130 },
  { key: 'reading', mark: '読', label: 'Dokkai', japanese: '読解', description: 'Bacaan dan latihan pemahaman.', targetN4: 25, targetN3: 25 },
  { key: 'listening', mark: '聴', label: 'Choukai', japanese: '聴解', description: 'Skrip, audio, dan materi listening.', targetN4: 25, targetN3: 25 },
  { key: 'quiz', mark: '問', label: 'Kuis', japanese: 'クイズ', description: 'Latihan dan kuis yang terus di-update.' },
  { key: 'jlpt', mark: '模', label: 'JLPT', japanese: '模擬試験', description: 'Kelola 5 paket simulasi JLPT per level.', targetN4: 5, targetN3: 5 },
]

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle()
  const role = profile?.role || 'student'
  if (role !== 'super_admin' && role !== 'content_admin') redirect('/portal/dashboard')

  const [levelsResult, sessionsResult, progressResult, blocksResult] = await Promise.all([
    supabase.from('levels').select('id, code, name'),
    supabase.from('learning_sessions').select('id, level_id, session_no, title, access_tier, content_status, created_by, updated_at').order('session_no'),
    supabase.rpc('admin_content_progress'),
    supabase.from('content_blocks').select('session_id, kind'),
  ])

  const levels = (levelsResult.data || []) as Level[]
  levels.sort((a, b) => a.code === 'N4' ? -1 : b.code === 'N4' ? 1 : a.code.localeCompare(b.code))
  const sessions = (sessionsResult.data || []) as Session[]
  const progressRows = (progressResult.data || []) as ContentProgress[]
  const blocks = (blocksResult.data || []) as ContentBlockSummary[]
  const progressBySession = new Map(progressRows.map((item) => [item.session_id, Number(item.block_count) || 0]))
  const activeSessions = sessions.filter((session) =>
    Boolean(session.created_by)
    || (progressBySession.get(session.id) || 0) > 0
    || session.content_status !== 'draft',
  )

  const selectedCode = query.level === 'N3' ? 'N3' : 'N4'
  const selectedLevel = levels.find((level) => level.code === selectedCode) || levels[0]
  const selectedSessions = selectedLevel ? activeSessions.filter((session) => session.level_id === selectedLevel.id) : []
  const workspace = selectedSessions[0] || null
  const selectedSessionIds = new Set(selectedSessions.map((session) => session.id))
  const selectedBlocks = blocks.filter((block) => selectedSessionIds.has(block.session_id))
  const countByKind = new Map<string, number>()
  selectedBlocks.forEach((block) => countByKind.set(block.kind, (countByKind.get(block.kind) || 0) + 1))

  const published = activeSessions.filter((session) => session.content_status === 'published').length
  const review = activeSessions.filter((session) => session.content_status === 'review').length
  const needsChanges = activeSessions.filter((session) => session.content_status === 'changes_requested').length
  const draftsInProgress = activeSessions.filter((session) => session.content_status === 'draft').length

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
          <p>Pilih level lalu masuk langsung ke jenis materi yang ingin diisi. Kosakata, kanji, bunpou, dokkai, choukai, kuis, dan simulasi JLPT dikelola sebagai kelompok terpisah.</p>
        </div>
        <div className={styles.heroMark}>匠</div>
      </header>

      <section className={styles.stats}>
        <article><span>Materi terisi</span><b>{selectedBlocks.length}</b></article>
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

      <div className={styles.categoryHeader}>
        <div>
          <div className={styles.eyebrow}>ISI MATERI</div>
          <h2>{selectedLevel?.name || selectedCode}</h2>
          <p>Pilih kategori yang ingin dikerjakan.</p>
        </div>
        <div className={styles.tabs}>
          {levels.map((level) => (
            <Link className={level.code === selectedCode ? styles.activeTab : ''} href={`/portal/admin?level=${level.code}`} key={level.id}>{level.code}</Link>
          ))}
        </div>
      </div>

      <section className={styles.categoryGrid}>
        {categories.map((category) => {
          const target = selectedCode === 'N3' ? category.targetN3 : category.targetN4
          const count = countByKind.get(category.key) || 0
          const isQuiz = category.key === 'quiz'
          const isJlpt = category.key === 'jlpt'
          const href = workspace
            ? isQuiz
              ? `/portal/admin/session/${workspace.id}/quiz`
              : `/portal/admin/session/${workspace.id}#material-studio`
            : null

          return (
            <article className={`${styles.categoryCard} ${isJlpt ? styles.categoryCardAccent : ''}`} key={category.key}>
              <div className={styles.categoryMark}>{category.mark}</div>
              <div className={styles.categoryBody}>
                <small>{category.japanese}</small>
                <h3>{category.label}</h3>
                <p>{category.description}</p>
                <div className={styles.categoryMeta}>
                  {isQuiz ? (
                    <><b>Kuis</b><span>terus di-update</span></>
                  ) : isJlpt ? (
                    <><b>5</b><span>paket simulasi / level</span></>
                  ) : (
                    <><b>{count}</b><span>terisi{target ? ` · target ${target.toLocaleString('id-ID')}` : ''}</span></>
                  )}
                </div>
              </div>
              <div className={styles.categoryAction}>
                {isJlpt ? (
                  <span className={styles.comingSoon}>Panel simulasi berikutnya</span>
                ) : href ? (
                  <Link className={styles.editButton} href={href}>{count > 0 || isQuiz ? 'Buka →' : 'Mulai isi →'}</Link>
                ) : selectedLevel ? (
                  <CreateMaterialButton
                    levelId={selectedLevel.id}
                    levelCode={selectedLevel.code}
                    className={styles.editButton}
                    label={`Mulai ${category.label} →`}
                    destination={isQuiz ? 'quiz' : 'material'}
                  />
                ) : null}
              </div>
            </article>
          )
        })}
      </section>

      <div className={styles.adminHint}>
        <b>Catatan sistem</b>
        <span>Data lama “Sesi N4 01” tetap dipertahankan sebagai wadah internal agar materi yang sudah dimasukkan tidak hilang, tetapi nama sesi tidak lagi dipakai dalam alur kerja Yozi.</span>
      </div>
    </main>
  )
}

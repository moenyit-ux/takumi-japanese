import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import styles from '../admin.module.css'
import overview from '../admin-overview.module.css'
import jlpt from './jlpt.module.css'

type ReviewStatus = 'saved' | 'needs_revision' | 'approved'

type PackageRow = {
  id: string
  title: string
  pass_score: number
  time_limit_minutes: number | null
  section_label: string | null
  published: boolean
  review_status: ReviewStatus
  review_note: string | null
  question_count: number
  language_count: number
  reading_count: number
  listening_count: number
}

type PackageData = {
  level: { id: string; code: string; name: string }
  packages: PackageRow[]
}

function packageNumber(title: string, index: number) {
  const match = title.match(/Paket\s+(\d+)/i)
  return match ? Number(match[1]) : index + 1
}

function reviewLabel(status: ReviewStatus) {
  if (status === 'approved') return 'Disetujui'
  if (status === 'needs_revision') return 'Perlu direvisi'
  return 'Tersimpan'
}

export default async function JlptAdminPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const query = await searchParams
  const levelCode = query.level === 'N3' ? 'N3' : 'N4'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'content_admin' && profile?.role !== 'super_admin') redirect('/portal/dashboard')

  const { data, error } = await supabase.rpc('admin_list_simulation_packages', { p_level_code: levelCode })
  if (error || !data) redirect(`/portal/admin?level=${levelCode}`)
  const editor = data as PackageData

  return (
    <main className={styles.adminShell}>
      <div className={styles.topbar}>
        <Link href={`/portal/admin?level=${editor.level.code}`}>← Kembali ke kategori {editor.level.code}</Link>
        <span className={styles.roleBadge}>SIMULASI JLPT</span>
      </div>

      <header className={`${styles.hero} ${overview.heroFix}`}>
        <div>
          <div className={styles.eyebrow}>模擬試験 · {editor.level.code}</div>
          <h1>Simulasi JLPT {editor.level.code}</h1>
          <p>Kelola lima paket simulasi sebagai ujian penuh. Soal dibagi menjadi 文字・語彙, 文法・読解, dan 聴解 agar pengisian materi mengikuti struktur ujian.</p>
        </div>
        <div className={styles.heroMark}>模</div>
      </header>

      <div className={jlpt.header}>
        <div>
          <div className={styles.eyebrow}>PAKET SIMULASI</div>
          <h2>{editor.level.name}</h2>
          <p>Paket tersimpan sampai ditinjau dan disetujui Super Admin. Hanya paket yang sudah disetujui yang dapat diterbitkan.</p>
        </div>
        <div className={jlpt.levelTabs}>
          <Link className={editor.level.code === 'N4' ? jlpt.active : ''} href="/portal/admin/jlpt?level=N4">N4</Link>
          <Link className={editor.level.code === 'N3' ? jlpt.active : ''} href="/portal/admin/jlpt?level=N3">N3</Link>
        </div>
      </div>

      <section className={jlpt.packageGrid}>
        {editor.packages.map((item, index) => {
          const no = packageNumber(item.title, index)
          const revisionStyle = item.review_status === 'needs_revision'
            ? { background: '#fff2ed', color: '#9e4f36' }
            : undefined
          return (
            <article className={jlpt.packageCard} key={item.id}>
              <div className={jlpt.packageTop}>
                <div className={jlpt.packageNo}>{String(no).padStart(2, '0')}</div>
                <div className={jlpt.packageTitle}>
                  <small>PAKET {String(no).padStart(2, '0')}</small>
                  <h3>{item.title}</h3>
                  <p>{item.section_label || 'Pembagian waktu belum diatur.'}</p>
                </div>
                <span className={`${jlpt.status} ${item.review_status === 'approved' ? jlpt.published : ''}`} style={revisionStyle}>{reviewLabel(item.review_status)}</span>
              </div>

              <div className={jlpt.stats}>
                <div className={jlpt.stat}><b>{item.language_count}</b><span>文字・語彙</span></div>
                <div className={jlpt.stat}><b>{item.reading_count}</b><span>文法・読解</span></div>
                <div className={jlpt.stat}><b>{item.listening_count}</b><span>聴解</span></div>
              </div>

              {item.review_status === 'needs_revision' && item.review_note && (
                <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fff7ef', color: '#8b5729', fontSize: 11, lineHeight: 1.55 }}><b>Catatan revisi:</b> {item.review_note}</div>
              )}

              <div className={jlpt.packageMeta}>
                <span>{item.question_count} soal</span>
                <span>{item.time_limit_minutes ?? '—'} menit</span>
                <span>Nilai lulus ≥ {item.pass_score}</span>
              </div>

              <div className={jlpt.packageAction}>
                <Link href={`/portal/admin/jlpt/${item.id}`}>{item.question_count > 0 ? 'Buka paket →' : 'Mulai isi soal →'}</Link>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

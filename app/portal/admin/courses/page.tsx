import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import CoursesClient, { type CourseAdminUser } from './courses-client'
import styles from '../admin.module.css'

export default async function AdminCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') redirect('/portal/admin')

  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw new Error(error.message)
  const users = ((data || []) as CourseAdminUser[]).filter((item) => item.role === 'student')
  const activeCourses = users.flatMap((item) => item.course_enrollments || []).filter((item) => item.status === 'active')

  return (
    <main className={`takumi-admin-page takumi-admin-courses ${styles.adminShell}`}>
      <div className={styles.topbar}>
        <Link href="/portal/admin">← Panel Admin</Link>
        <div className={styles.roleBadge}>SUPER ADMIN</div>
      </div>

      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>KURSUS & AKSES PREMIUM</div>
          <h1>Kursus Siswa</h1>
          <p>Daftarkan siswa ke kelas tatap muka. Untuk level premium yang sudah tersedia, akses Website Premium Takumi dibuat dan dicabut otomatis mengikuti status kursus.</p>
        </div>
        <div className={styles.heroMark}>学</div>
      </section>

      <section className={styles.stats}>
        <article><span>Total siswa</span><b>{users.length}</b></article>
        <article><span>Kursus aktif</span><b>{activeCourses.length}</b></article>
        <article><span>Premium tersambung</span><b>{activeCourses.filter((item) => item.premium_ready).length}</b></article>
        <article><span>Akselerasi aktif</span><b>{activeCourses.filter((item) => item.pace === 'accelerated').length}</b></article>
      </section>

      <CoursesClient users={users} />
    </main>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import UsersClient, { type AdminUser } from './users-client'
import styles from '../admin.module.css'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') redirect('/portal/admin')

  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw new Error(error.message)
  const users = (data || []) as AdminUser[]

  return (
    <main className={`takumi-admin-page ${styles.adminShell}`}>
      <div className={styles.topbar}>
        <Link href="/portal/admin">← Panel Admin</Link>
        <div className={styles.roleBadge}>SUPER ADMIN</div>
      </div>
      <section className={styles.hero}>
        <div><div className={styles.eyebrow}>AKUN & AKSES</div><h1>Pengguna Takumi</h1><p>Kelola role admin, perangkat aktif, akses premium, dan permintaan penghapusan akun.</p></div>
        <div className={styles.heroMark}>人</div>
      </section>
      <section className={styles.stats}>
        <article><span>Total pengguna</span><b>{users.length}</b></article>
        <article><span>Student</span><b>{users.filter((item) => item.role === 'student').length}</b></article>
        <article><span>Content Admin</span><b>{users.filter((item) => item.role === 'content_admin').length}</b></article>
        <article><span>Permintaan hapus</span><b>{users.filter((item) => item.deletion_request && ['requested','confirmed','processing'].includes(item.deletion_request.status)).length}</b></article>
      </section>
      <UsersClient users={users} />
    </main>
  )
}

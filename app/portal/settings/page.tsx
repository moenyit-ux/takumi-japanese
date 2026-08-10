import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import SettingsClient from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, devicesResult, deletionResult] = await Promise.all([
    supabase.from('profiles').select('full_name, birth_year, role').eq('id', user.id).maybeSingle(),
    supabase.from('user_devices').select('id, device_name, last_seen_at, revoked_at').order('last_seen_at', { ascending: false }),
    supabase.from('deletion_requests').select('id, reason, status, requested_at, completed_at').order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  return (
    <main className="learning-shell narrow">
      <div className="learning-topbar"><Link className="back-link" href="/portal/dashboard">← Dashboard</Link><span>Pengaturan akun</span></div>
      <header className="learning-header">
        <div className="eyebrow">AKUN TAKUMI</div>
        <h1>{profileResult.data?.full_name || 'Pengaturan akun'}</h1>
        <p>{user.email} · {profileResult.data?.birth_year ? `lahir ${profileResult.data.birth_year}` : 'tahun lahir belum diisi'} · {profileResult.data?.role || 'student'}</p>
      </header>
      <section className="panel">
        <h2>Bantuan</h2>
        <p>Jika ada kendala akun, pembayaran, akses premium, materi, atau masalah teknis, buat tiket agar permintaan tercatat.</p>
        <p><Link href="/portal/support">Buka Support Center →</Link></p>
      </section>
      <section className="panel">
        <h2>Keamanan</h2>
        <p><Link href="/forgot-password">Ganti kata sandi melalui email →</Link></p>
        <p>Untuk keamanan akun dan mencegah penggunaan bersama tanpa izin, maksimal dua perangkat aktif dapat digunakan bersamaan.</p>
      </section>
      <SettingsClient devices={devicesResult.data || []} deletionRequest={deletionResult.data || null} />
    </main>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import DeviceManager from './device-manager'

export default async function DeviceLimitPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: devices } = await supabase
    .from('user_devices')
    .select('id, device_name, last_seen_at, revoked_at')
    .order('last_seen_at', { ascending: false })

  return (
    <main className="learning-shell narrow">
      <header className="learning-header">
        <div className="eyebrow">KEAMANAN AKUN</div>
        <h1>Akses perangkat perlu diperiksa</h1>
        <p>Takumi membatasi satu akun pada maksimal dua perangkat aktif pada saat yang sama.</p>
      </header>
      <DeviceManager devices={devices || []} reason={query.reason} />
      <section className="panel"><form action="/auth/signout" method="post"><button className="btn ghost" type="submit">Keluar dari akun</button></form></section>
    </main>
  )
}

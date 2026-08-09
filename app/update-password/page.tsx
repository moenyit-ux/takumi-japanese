import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import PasswordForm from './password-form'

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/forgot-password')

  return (
    <main className="auth">
      <aside>
        <div className="brand"><span>匠</span><div><b>Takumi</b><small>Japanese</small></div></div>
        <div><div className="eyebrow">PEMULIHAN AKUN</div><h1>Buat kata sandi baru.</h1><p>Tautan pemulihan sudah diverifikasi. Gunakan kata sandi yang tidak dipakai di layanan lain.</p></div>
      </aside>
      <section>
        <h2>Ganti kata sandi</h2>
        <PasswordForm />
        <Link href="/portal/dashboard">Kembali ke dashboard</Link>
      </section>
    </main>
  )
}

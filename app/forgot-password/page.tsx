'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    setBusy(true)
    setMessage('Mengirim tautan reset...')

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Jika email tersebut terdaftar, tautan penggantian kata sandi telah dikirim. Tautan hanya dapat digunakan dalam waktu terbatas.')
    }
    setBusy(false)
  }

  return (
    <main className="auth">
      <aside>
        <div className="brand"><span>匠</span><div><b>Takumi</b><small>Japanese</small></div></div>
        <div><div className="eyebrow">KEAMANAN AKUN</div><h1>Ganti kata sandi melalui email.</h1><p>Takumi akan mengirim tautan pemulihan ke alamat email akun Anda.</p></div>
      </aside>
      <section>
        <h2>Lupa kata sandi</h2>
        <p>Masukkan email yang dipakai saat mendaftar.</p>
        <form onSubmit={submit}>
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="nama@email.com" /></label>
          <button disabled={busy} className="btn primary full">{busy ? 'Mengirim...' : 'Kirim tautan reset'}</button>
        </form>
        <p className="message" aria-live="polite">{message}</p>
        <Link href="/login">← Kembali ke halaman masuk</Link>
      </section>
    </main>
  )
}

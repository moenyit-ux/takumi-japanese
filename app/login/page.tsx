'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setMessage('Memproses...')

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const supabase = createClient()

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: String(form.get('name') || '').trim(),
            birth_year: String(form.get('birth_year') || '').trim(),
          },
        },
      })

      if (error) {
        setMessage(error.message)
        setBusy(false)
        return
      }

      if (data.session) {
        router.replace('/portal/dashboard')
        router.refresh()
        return
      }

      setMessage('Email verifikasi telah dikirim. Buka email Takumi lalu klik tautan verifikasi untuk mengaktifkan akun.')
      setBusy(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message === 'Email not confirmed'
        ? 'Email belum diverifikasi. Silakan buka email verifikasi Takumi terlebih dahulu.'
        : error.message)
      setBusy(false)
      return
    }

    router.replace('/portal/dashboard')
    router.refresh()
  }

  return (
    <main className="auth">
      <aside>
        <div className="brand"><span>匠</span><div><b>Takumi</b><small>Japanese</small></div></div>
        <div>
          <div className="eyebrow">BELAJAR SESUAI RITMEMU</div>
          <h1>Hari kerja boleh panjang. Progres tetap jalan.</h1>
          <p>Masuk untuk melanjutkan N4 atau N3 dari posisi terakhir.</p>
        </div>
      </aside>

      <section>
        <div className="switch">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setMessage('') }}>Masuk</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setMessage('') }}>Daftar</button>
        </div>

        <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Buat akun Takumi'}</h2>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <label>Nama<input name="name" required autoComplete="name" placeholder="Nama Anda" /></label>
              <label>Tahun lahir<input name="birth_year" inputMode="numeric" pattern="[0-9]{4}" required placeholder="1992" /></label>
            </>
          )}
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="nama@email.com" /></label>
          <label>Kata sandi<input name="password" type="password" minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Minimal 8 karakter" /></label>
          {mode === 'login' && <Link href="/forgot-password">Lupa kata sandi?</Link>}
          <button disabled={busy} className="btn primary full">{busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar & verifikasi email'}</button>
        </form>

        <p className="message" aria-live="polite">{message}</p>
        <Link href="/">← Kembali ke beranda</Link>
      </section>
    </main>
  )
}

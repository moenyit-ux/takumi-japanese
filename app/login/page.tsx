'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { PublicBrand } from '../components/public-shell'
import styles from './login.module.css'

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
    <main className={styles.page}>
      <aside className={styles.context}>
        <Link href="/" aria-label="Takumi Japanese — Beranda"><PublicBrand /></Link>
        <div className={styles.contextMain}>
          <div className={styles.contextLabel}>RUANG BELAJAR TAKUMI</div>
          <h1>Hari kerja boleh panjang. <em>Progres tetap jalan.</em></h1>
          <p>Masuk untuk melanjutkan materi N4 atau N3 dari posisi terakhir.</p>
          <div className={styles.contextMeta}>
            <span>学ぶ</span>
            <div><strong>Belajar sesuai ritmemu.</strong><small>Tanpa kehilangan arah.</small></div>
          </div>
        </div>
        <small className={styles.contextFooter}>TAKUMI STUDY SYSTEM · INDONESIA × JEPANG</small>
      </aside>

      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <Link className={styles.back} href="/">← Kembali ke beranda</Link>
          <div className={styles.switch}>
            <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? styles.active : ''} onClick={() => { setMode('login'); setMessage('') }}>Masuk</button>
            <button type="button" aria-pressed={mode === 'signup'} className={mode === 'signup' ? styles.active : ''} onClick={() => { setMode('signup'); setMessage('') }}>Daftar</button>
          </div>

          <div className={styles.formHeading}>
            <small>{mode === 'login' ? 'LANJUTKAN PERJALANANMU' : 'MULAI DARI SINI'}</small>
            <h2>{mode === 'login' ? 'Selamat datang kembali.' : 'Buat akun Takumi.'}</h2>
            <p>{mode === 'login' ? 'Materi dan progres terakhirmu sudah menunggu.' : 'Coba 15% materi terlebih dahulu, tanpa biaya.'}</p>
          </div>

          <form className={styles.form} onSubmit={submit}>
            {mode === 'signup' && (
              <div className={styles.formRow}>
                <label><span>Nama</span><input name="name" required autoComplete="name" placeholder="Nama lengkap" /></label>
                <label><span>Tahun lahir</span><input name="birth_year" inputMode="numeric" pattern="[0-9]{4}" required placeholder="1992" /></label>
              </div>
            )}
            <label><span>Email</span><input name="email" type="email" required autoComplete="email" placeholder="nama@email.com" /></label>
            <label><span>Kata sandi</span><input name="password" type="password" minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Minimal 8 karakter" /></label>
            {mode === 'login' && <Link className={styles.forgot} href="/forgot-password">Lupa kata sandi?</Link>}
            <button disabled={busy} className={styles.submit}>{busy ? 'Memproses...' : mode === 'login' ? 'Masuk ke ruang belajar →' : 'Daftar & verifikasi email →'}</button>
          </form>

          <p className={styles.message} aria-live="polite">{message}</p>
          <p className={styles.security}>Akun dan progres belajar dilindungi melalui autentikasi aman.</p>
        </div>
      </section>
    </main>
  )
}

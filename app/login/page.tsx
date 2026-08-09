'use client'

import Link from 'next/link'
import { useState } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tckqxueaytwalbfgqyya.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_xLGNC9gxqvhTnZI5jtOfuA_99JSyv5N'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('Memproses...')

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    const path = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'
    const body = mode === 'signup'
      ? {
          email,
          password,
          data: {
            full_name: String(form.get('name') || ''),
            birth_year: String(form.get('birth_year') || ''),
          },
        }
      : { email, password }

    const response = await fetch(SUPABASE_URL + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      setMessage(data.msg || data.error_description || data.message || 'Terjadi kesalahan.')
      return
    }

    if (mode === 'signup') {
      setMessage('Email verifikasi telah dikirim. Silakan cek inbox Anda.')
      return
    }

    localStorage.setItem('takumi-session', JSON.stringify(data))
    location.href = '/portal/dashboard'
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
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Masuk</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Daftar</button>
        </div>

        <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Buat akun Takumi'}</h2>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <label>Nama<input name="name" required placeholder="Nama Anda" /></label>
              <label>Tahun lahir<input name="birth_year" pattern="[0-9]{4}" placeholder="1992" /></label>
            </>
          )}
          <label>Email<input name="email" type="email" required placeholder="nama@email.com" /></label>
          <label>Kata sandi<input name="password" type="password" minLength={8} required placeholder="Minimal 8 karakter" /></label>
          <button className="btn primary full">{mode === 'login' ? 'Masuk' : 'Daftar & verifikasi email'}</button>
        </form>

        <p className="message">{message}</p>
        <Link href="/">← Kembali ke beranda</Link>
      </section>
    </main>
  )
}

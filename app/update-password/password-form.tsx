'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'

export default function PasswordForm() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm') || '')

    if (password.length < 8) {
      setMessage('Kata sandi minimal 8 karakter.')
      return
    }
    if (password !== confirm) {
      setMessage('Konfirmasi kata sandi tidak sama.')
      return
    }

    setBusy(true)
    setMessage('Memperbarui kata sandi...')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }

    setMessage('Kata sandi berhasil diperbarui.')
    router.replace('/portal/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit}>
      <label>Kata sandi baru<input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Minimal 8 karakter" /></label>
      <label>Ulangi kata sandi<input name="confirm" type="password" minLength={8} required autoComplete="new-password" placeholder="Ketik ulang kata sandi" /></label>
      <button disabled={busy} className="btn primary full">{busy ? 'Memperbarui...' : 'Simpan kata sandi baru'}</button>
      <p className="message" aria-live="polite">{message}</p>
    </form>
  )
}

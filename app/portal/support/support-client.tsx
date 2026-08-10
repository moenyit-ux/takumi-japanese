'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './support.module.css'

type SupportMessage = {
  id: string
  sender_role: 'student' | 'admin' | 'system'
  body: string
  created_at: string
}

export type SupportTicket = {
  id: string
  category: string
  subject: string
  priority: string
  status: string
  created_at: string
  response_due_at: string | null
  last_customer_message_at: string | null
  last_admin_message_at: string | null
  needs_response: boolean
  messages: SupportMessage[]
}

const categoryLabel: Record<string, string> = {
  account: 'Akun',
  payment: 'Pembayaran',
  access: 'Akses premium',
  learning: 'Belajar',
  content_error: 'Kesalahan materi',
  technical: 'Masalah teknis',
  other: 'Lainnya',
}

const statusLabel: Record<string, string> = {
  open: 'Menunggu',
  in_progress: 'Sedang ditangani',
  resolved: 'Selesai',
  closed: 'Ditutup',
}

async function send(payload: Record<string, unknown>) {
  const response = await fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Permintaan bantuan gagal dikirim.')
}

export default function SupportClient({ initialTickets, userName }: { initialTickets: SupportTicket[]; userName: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [replies, setReplies] = useState<Record<string, string>>({})

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setMessage('Mengirim tiket...')
    try {
      await send({
        action: 'create',
        category: String(form.get('category') || 'other'),
        subject: String(form.get('subject') || ''),
        message: String(form.get('message') || ''),
      })
      event.currentTarget.reset()
      setMessage('Tiket berhasil dikirim. Tim Takumi akan menindaklanjuti sesuai jam layanan.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal mengirim tiket.')
    } finally {
      setBusy(false)
    }
  }

  async function reply(ticketId: string) {
    const text = (replies[ticketId] || '').trim()
    if (!text || busy) return
    setBusy(true)
    setMessage('Mengirim balasan...')
    try {
      await send({ action: 'reply', requestId: ticketId, message: text })
      setReplies((current) => ({ ...current, [ticketId]: '' }))
      setMessage('Balasan terkirim.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal mengirim balasan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className={`panel ${styles.formPanel}`}>
        <div className="eyebrow">BUAT TIKET</div>
        <h2>Hubungi tim Takumi</h2>
        <p>Kasus pembayaran dan akses premium otomatis diberi prioritas lebih tinggi.</p>
        <form onSubmit={createTicket} className={styles.form}>
          <label>Kategori
            <select name="category" defaultValue="technical">
              <option value="account">Akun</option>
              <option value="payment">Pembayaran</option>
              <option value="access">Akses premium</option>
              <option value="learning">Belajar</option>
              <option value="content_error">Kesalahan materi</option>
              <option value="technical">Masalah teknis</option>
              <option value="other">Lainnya</option>
            </select>
          </label>
          <label>Subjek<input name="subject" minLength={5} maxLength={160} required placeholder="Contoh: akses N4 belum terbuka" /></label>
          <label>Jelaskan masalah<textarea name="message" minLength={10} maxLength={5000} required placeholder="Tuliskan apa yang terjadi dan apa yang sudah Anda coba." /></label>
          <button className="btn primary" disabled={busy}>{busy ? 'Memproses...' : 'Kirim tiket'}</button>
        </form>
        <p className="message" aria-live="polite">{message}</p>
      </section>

      <section className={styles.ticketSection}>
        <div className={styles.sectionHead}><div><div className="eyebrow">RIWAYAT BANTUAN</div><h2>{userName}</h2></div><b>{initialTickets.length} tiket</b></div>
        {initialTickets.length === 0 && <div className="panel"><p>Belum ada tiket bantuan.</p></div>}
        {initialTickets.map((ticket) => {
          const overdue = Boolean(ticket.needs_response && ticket.response_due_at && new Date(ticket.response_due_at).getTime() < Date.now())
          return (
            <article className={styles.ticket} key={ticket.id}>
              <div className={styles.ticketHead}>
                <div><small>{categoryLabel[ticket.category] || ticket.category}</small><h3>{ticket.subject}</h3></div>
                <span className={`${styles.badge} ${overdue ? styles.overdue : ''}`}>{overdue ? 'Melewati target' : statusLabel[ticket.status] || ticket.status}</span>
              </div>
              <p className={styles.meta}>Dibuat {new Date(ticket.created_at).toLocaleString('id-ID')} · prioritas {ticket.priority}</p>
              {ticket.needs_response && ticket.response_due_at && <p className={styles.sla}>Target respons: {new Date(ticket.response_due_at).toLocaleString('id-ID')}</p>}
              <div className={styles.thread}>
                {ticket.messages.map((item) => (
                  <div className={`${styles.bubble} ${item.sender_role === 'admin' ? styles.adminBubble : styles.studentBubble}`} key={item.id}>
                    <b>{item.sender_role === 'admin' ? 'Tim Takumi' : 'Anda'}</b>
                    <p>{item.body}</p>
                    <small>{new Date(item.created_at).toLocaleString('id-ID')}</small>
                  </div>
                ))}
              </div>
              {ticket.status !== 'closed' && (
                <div className={styles.replyBox}>
                  <textarea value={replies[ticket.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [ticket.id]: event.target.value }))} maxLength={5000} placeholder="Tambahkan balasan..." />
                  <button className="btn ghost" disabled={busy || !(replies[ticket.id] || '').trim()} onClick={() => reply(ticket.id)}>Kirim balasan</button>
                </div>
              )}
            </article>
          )
        })}
      </section>
    </>
  )
}

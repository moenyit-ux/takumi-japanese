'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../admin.module.css'
import supportStyles from '../../support/support.module.css'

type SupportMessage = {
  id: string
  sender_role: 'student' | 'admin' | 'system'
  body: string
  created_at: string
  internal?: boolean
}

export type AdminSupportTicket = {
  id: string
  user_id: string | null
  email: string | null
  full_name: string | null
  category: string
  subject: string
  priority: string
  status: string
  created_at: string
  response_due_at: string | null
  last_message_at: string
  needs_response: boolean
  overdue: boolean
  messages: SupportMessage[]
}

type SupportSettings = {
  whatsapp_number: string | null
  whatsapp_enabled: boolean
  service_timezone: string
  service_start: string
  service_end: string
  response_hours_open: number
  response_hours_closed: number
}

const categoryLabel: Record<string, string> = {
  account: 'Akun', payment: 'Pembayaran', access: 'Akses premium', learning: 'Belajar',
  content_error: 'Kesalahan materi', technical: 'Masalah teknis', other: 'Lainnya',
}

async function adminAction(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/support', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Aksi support gagal.')
}

export default function AdminSupportClient({ tickets, role, settings }: { tickets: AdminSupportTicket[]; role: string; settings: SupportSettings }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [replies, setReplies] = useState<Record<string, string>>({})

  async function run(payload: Record<string, unknown>, success: string) {
    if (busy) return
    setBusy(true)
    setMessage('Memproses...')
    try {
      await adminAction(payload)
      setMessage(success)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operasi gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function reply(ticket: AdminSupportTicket) {
    const text = (replies[ticket.id] || '').trim()
    if (!text) return
    await run({ action: 'reply', requestId: ticket.id, message: text }, 'Balasan terkirim.')
    setReplies((current) => ({ ...current, [ticket.id]: '' }))
  }

  function update(ticket: AdminSupportTicket, status: string, priority: string) {
    return run({ action: 'update', requestId: ticket.id, status, priority }, 'Status tiket diperbarui.')
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await run({
      action: 'settings',
      whatsappNumber: String(form.get('whatsapp_number') || ''),
      whatsappEnabled: form.get('whatsapp_enabled') === 'on',
    }, 'Pengaturan WhatsApp diperbarui.')
  }

  return (
    <div className={styles.stack}>
      {role === 'super_admin' && (
        <section className={styles.panel}>
          <div className={styles.eyebrow}>KANAL LAYANAN</div>
          <h2>WhatsApp resmi</h2>
          <p className={styles.note}>Nomor belum diisi secara otomatis. Masukkan nomor resmi Takumi dengan kode negara tanpa tanda +, misalnya format 62xxxxxxxxxx.</p>
          <form onSubmit={saveSettings} className={styles.formGrid}>
            <label className={styles.label}>Nomor WhatsApp<input className={styles.input} name="whatsapp_number" defaultValue={settings.whatsapp_number || ''} placeholder="62xxxxxxxxxx" /></label>
            <label className={styles.label}>Status
              <span><input name="whatsapp_enabled" type="checkbox" defaultChecked={settings.whatsapp_enabled} /> Aktifkan tombol WhatsApp untuk siswa</span>
            </label>
            <div className={styles.full}><button className={styles.primary} disabled={busy}>Simpan pengaturan</button></div>
          </form>
          <p className={styles.note}>Jam layanan tetap Senin–Jumat {settings.service_start.slice(0, 5)}–{settings.service_end.slice(0, 5)} WIB. Target respons saat jam layanan ≤{settings.response_hours_open} jam; di luar jam layanan ≤{settings.response_hours_closed} jam.</p>
        </section>
      )}

      <p className={styles.message} aria-live="polite">{message}</p>

      {tickets.length === 0 && <section className={styles.panel}><p className={styles.note}>Belum ada tiket bantuan.</p></section>}

      {tickets.map((ticket) => (
        <section className={styles.panel} key={ticket.id}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.eyebrow}>{categoryLabel[ticket.category] || ticket.category} · {ticket.priority.toUpperCase()}</div>
              <h2>{ticket.subject}</h2>
              <p className={styles.note}>{ticket.full_name || 'Siswa'} · {ticket.email || 'email tidak tersedia'} · masuk {new Date(ticket.created_at).toLocaleString('id-ID')}</p>
            </div>
            <span className={styles.roleBadge}>{ticket.overdue ? 'LEWAT TARGET' : ticket.status.toUpperCase()}</span>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.label}>Status
              <select className={styles.select} value={ticket.status} disabled={busy} onChange={(event) => update(ticket, event.target.value, ticket.priority)}>
                <option value="open">Menunggu</option>
                <option value="in_progress">Sedang ditangani</option>
                <option value="resolved">Selesai</option>
                <option value="closed">Ditutup</option>
              </select>
            </label>
            <label className={styles.label}>Prioritas
              <select className={styles.select} value={ticket.priority} disabled={busy} onChange={(event) => update(ticket, ticket.status, event.target.value)}>
                <option value="normal">Normal</option>
                <option value="high">Tinggi</option>
                <option value="critical">Kritis</option>
              </select>
            </label>
          </div>

          {ticket.needs_response && ticket.response_due_at && (
            <p className={ticket.overdue ? styles.error : styles.note}>Target respons: {new Date(ticket.response_due_at).toLocaleString('id-ID')}</p>
          )}

          <div className={supportStyles.thread}>
            {ticket.messages.filter((item) => !item.internal).map((item) => (
              <div className={`${supportStyles.bubble} ${item.sender_role === 'admin' ? supportStyles.adminBubble : supportStyles.studentBubble}`} key={item.id}>
                <b>{item.sender_role === 'admin' ? 'Tim Takumi' : 'Siswa'}</b>
                <p>{item.body}</p>
                <small>{new Date(item.created_at).toLocaleString('id-ID')}</small>
              </div>
            ))}
          </div>

          {ticket.status !== 'closed' && (
            <div className={supportStyles.replyBox}>
              <textarea value={replies[ticket.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [ticket.id]: event.target.value }))} maxLength={5000} placeholder="Balas siswa..." />
              <button className={styles.primary} disabled={busy || !(replies[ticket.id] || '').trim()} onClick={() => reply(ticket)}>Kirim balasan</button>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

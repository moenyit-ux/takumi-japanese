'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../admin.module.css'
import support from './admin-support.module.css'
import threadStyles from '../../support/support.module.css'

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
  account: 'Akun',
  payment: 'Pembayaran',
  access: 'Akses premium',
  learning: 'Belajar',
  content_error: 'Kesalahan materi',
  technical: 'Masalah teknis',
  other: 'Lainnya',
}

const statusLabel: Record<string, string> = {
  open: 'BARU',
  in_progress: 'DIPROSES',
  resolved: 'SELESAI',
  closed: 'DITUTUP',
}

async function adminAction(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
    <div className={support.stack}>
      {role === 'super_admin' && (
        <section className={support.card}>
          <div className={support.cardHeader}>
            <div className={styles.eyebrow}>KANAL BANTUAN</div>
            <h2>WhatsApp resmi</h2>
            <p>Nomor ini akan ditampilkan kepada siswa ketika bantuan WhatsApp diaktifkan.</p>
          </div>

          <form onSubmit={saveSettings}>
            <div className={support.formGrid}>
              <div className={support.field}>
                <label htmlFor="whatsapp_number">Nomor WhatsApp</label>
                <input
                  className={support.input}
                  id="whatsapp_number"
                  name="whatsapp_number"
                  defaultValue={settings.whatsapp_number || ''}
                  placeholder="Contoh: 6281234567890"
                  inputMode="tel"
                />
                <small>Gunakan kode negara tanpa tanda +.</small>
              </div>

              <div className={support.field}>
                <span className={support.fieldLabel}>Status WhatsApp</span>
                <div className={support.toggleBox}>
                  <input
                    id="whatsapp_enabled"
                    name="whatsapp_enabled"
                    type="checkbox"
                    defaultChecked={settings.whatsapp_enabled}
                  />
                  <label htmlFor="whatsapp_enabled">Aktifkan untuk siswa</label>
                </div>
              </div>
            </div>

            <div className={support.actions}>
              <button className={styles.primary} disabled={busy}>Simpan perubahan</button>
              <p className={support.successMessage} aria-live="polite">{message}</p>
            </div>
          </form>

          <div className={support.infoGrid}>
            <article className={support.infoCard}>
              <span>Jam layanan</span>
              <b>Senin–Jumat</b>
              <p>{settings.service_start.slice(0, 5)}–{settings.service_end.slice(0, 5)} WIB</p>
            </article>
            <article className={support.infoCard}>
              <span>Target respons</span>
              <b>≤ {settings.response_hours_open} jam</b>
              <p>Jam layanan · di luar jam layanan ≤ {settings.response_hours_closed} jam</p>
            </article>
          </div>
        </section>
      )}

      <section className={support.ticketSection}>
        <div className={support.sectionHeader}>
          <div>
            <div className={styles.eyebrow}>ANTREAN SUPPORT</div>
            <h2>Tiket bantuan</h2>
            <p>Pertanyaan dan kendala siswa akan muncul di sini.</p>
          </div>
        </div>

        {role !== 'super_admin' && message && <p className={support.successMessage} aria-live="polite">{message}</p>}

        {tickets.length === 0 ? (
          <div className={support.emptyState}>
            <div className={support.emptyInner}>
              <div className={support.emptyIcon}>?</div>
              <h3>Belum ada tiket bantuan</h3>
              <p>Pertanyaan atau laporan siswa akan muncul di sini.</p>
            </div>
          </div>
        ) : (
          <div className={support.ticketList}>
            {tickets.map((ticket) => (
              <article className={support.ticketCard} key={ticket.id}>
                <div className={support.ticketHead}>
                  <div className={support.ticketTitle}>
                    <small>{categoryLabel[ticket.category] || ticket.category} · {ticket.priority.toUpperCase()}</small>
                    <h3>{ticket.subject}</h3>
                    <p className={support.ticketMeta}>
                      {ticket.full_name || 'Siswa'} · {ticket.email || 'email tidak tersedia'} · masuk {new Date(ticket.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className={`${support.ticketBadge} ${ticket.overdue ? support.ticketBadgeOverdue : ''}`}>
                    {ticket.overdue ? 'LEWAT SLA' : (statusLabel[ticket.status] || ticket.status.toUpperCase())}
                  </span>
                </div>

                <div className={support.ticketControls}>
                  <div className={support.field}>
                    <label htmlFor={`status-${ticket.id}`}>Status</label>
                    <select
                      className={support.select}
                      id={`status-${ticket.id}`}
                      value={ticket.status}
                      disabled={busy}
                      onChange={(event) => update(ticket, event.target.value, ticket.priority)}
                    >
                      <option value="open">Baru</option>
                      <option value="in_progress">Diproses</option>
                      <option value="resolved">Selesai</option>
                      <option value="closed">Ditutup</option>
                    </select>
                  </div>

                  <div className={support.field}>
                    <label htmlFor={`priority-${ticket.id}`}>Prioritas</label>
                    <select
                      className={support.select}
                      id={`priority-${ticket.id}`}
                      value={ticket.priority}
                      disabled={busy}
                      onChange={(event) => update(ticket, ticket.status, event.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">Tinggi</option>
                      <option value="critical">Mendesak</option>
                    </select>
                  </div>
                </div>

                {ticket.needs_response && ticket.response_due_at && (
                  <p className={`${support.slaLine} ${ticket.overdue ? support.slaOverdue : ''}`}>
                    Target respons: {new Date(ticket.response_due_at).toLocaleString('id-ID')}
                  </p>
                )}

                <div className={support.threadWrap}>
                  <div className={threadStyles.thread}>
                    {ticket.messages.filter((item) => !item.internal).map((item) => (
                      <div className={`${threadStyles.bubble} ${item.sender_role === 'admin' ? threadStyles.adminBubble : threadStyles.studentBubble}`} key={item.id}>
                        <b>{item.sender_role === 'admin' ? 'Tim Takumi' : 'Siswa'}</b>
                        <p>{item.body}</p>
                        <small>{new Date(item.created_at).toLocaleString('id-ID')}</small>
                      </div>
                    ))}
                  </div>
                </div>

                {ticket.status !== 'closed' && (
                  <div className={support.replyArea}>
                    <textarea
                      value={replies[ticket.id] || ''}
                      onChange={(event) => setReplies((current) => ({ ...current, [ticket.id]: event.target.value }))}
                      maxLength={5000}
                      placeholder="Balas siswa..."
                    />
                    <div className={support.replyActions}>
                      <button className={styles.primary} disabled={busy || !(replies[ticket.id] || '').trim()} onClick={() => reply(ticket)}>
                        Kirim balasan
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import SupportClient, { type SupportTicket } from './support-client'
import styles from './support.module.css'

type SupportSettings = {
  whatsapp_number: string | null
  whatsapp_enabled: boolean
  service_timezone: string
  service_start: string
  service_end: string
  response_hours_open: number
  response_hours_closed: number
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, ticketsResult, settingsResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.rpc('my_support_requests'),
    supabase.from('support_settings').select('whatsapp_number, whatsapp_enabled, service_timezone, service_start, service_end, response_hours_open, response_hours_closed').eq('id', 1).maybeSingle(),
  ])

  const tickets = (ticketsResult.data || []) as SupportTicket[]
  const settings = (settingsResult.data || {
    whatsapp_number: null,
    whatsapp_enabled: false,
    service_timezone: 'Asia/Jakarta',
    service_start: '08:00:00',
    service_end: '17:00:00',
    response_hours_open: 3,
    response_hours_closed: 24,
  }) as SupportSettings

  const whatsapp = settings.whatsapp_enabled && settings.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number}`
    : null

  return (
    <main className={`learning-shell narrow ${styles.shell}`}>
      <div className="learning-topbar"><Link className="back-link" href="/portal/dashboard">← Dashboard</Link><span>Bantuan</span></div>
      <header className="learning-header">
        <div className="eyebrow">TAKUMI SUPPORT CENTER</div>
        <h1>Ada yang menghambat belajar?</h1>
        <p>Kirim tiket supaya masalah akun, akses, pembayaran, materi, atau teknis tercatat dan bisa ditindaklanjuti.</p>
      </header>

      <section className={styles.slaGrid}>
        <article><small>JAM LAYANAN</small><b>Senin–Jumat</b><span>{settings.service_start.slice(0, 5)}–{settings.service_end.slice(0, 5)} WIB</span></article>
        <article><small>TARGET SAAT LAYANAN</small><b>≤ {settings.response_hours_open} jam</b><span>untuk tiket yang masuk saat jam layanan</span></article>
        <article><small>DI LUAR JAM LAYANAN</small><b>≤ {settings.response_hours_closed} jam</b><span>target respons awal</span></article>
      </section>

      {whatsapp ? (
        <section className="panel"><h2>WhatsApp Takumi</h2><p>Untuk pembayaran atau akses yang mendesak, Anda juga dapat menghubungi WhatsApp resmi Takumi.</p><a className="btn primary" href={whatsapp} target="_blank" rel="noreferrer">Buka WhatsApp →</a></section>
      ) : (
        <section className="panel"><h2>WhatsApp Takumi</h2><p>Nomor WhatsApp resmi belum diaktifkan di sistem. Gunakan tiket bantuan agar permintaan tetap tercatat.</p></section>
      )}

      <SupportClient initialTickets={tickets} userName={profileResult.data?.full_name || 'Siswa'} />
    </main>
  )
}

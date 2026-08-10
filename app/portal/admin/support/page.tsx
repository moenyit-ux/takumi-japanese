import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import AdminSupportClient, { type AdminSupportTicket } from './support-admin-client'
import styles from '../admin.module.css'

type SupportSettings = {
  whatsapp_number: string | null
  whatsapp_enabled: boolean
  service_timezone: string
  service_start: string
  service_end: string
  response_hours_open: number
  response_hours_closed: number
}

export default async function AdminSupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role || 'student'
  if (role !== 'super_admin' && role !== 'content_admin') redirect('/portal/dashboard')

  const [ticketsResult, settingsResult] = await Promise.all([
    supabase.rpc('admin_list_support_requests', { p_status: null }),
    supabase.from('support_settings').select('whatsapp_number, whatsapp_enabled, service_timezone, service_start, service_end, response_hours_open, response_hours_closed').eq('id', 1).maybeSingle(),
  ])

  const tickets = (ticketsResult.data || []) as AdminSupportTicket[]
  const settings = (settingsResult.data || {
    whatsapp_number: null,
    whatsapp_enabled: false,
    service_timezone: 'Asia/Jakarta',
    service_start: '08:00:00',
    service_end: '17:00:00',
    response_hours_open: 3,
    response_hours_closed: 24,
  }) as SupportSettings

  const open = tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length
  const priority = tickets.filter((ticket) => ticket.priority === 'high' || ticket.priority === 'critical').length
  const overdue = tickets.filter((ticket) => ticket.overdue).length
  const waiting = tickets.filter((ticket) => ticket.needs_response).length

  return (
    <main className={styles.adminShell}>
      <div className={styles.topbar}>
        <Link href="/portal/admin">← Content Studio</Link>
        <span className={styles.roleBadge}>{role === 'super_admin' ? 'SUPER ADMIN' : 'CONTENT ADMIN'} · SUPPORT</span>
      </div>

      <header className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>TAKUMI OPERATIONS</div>
          <h1>Antrean bantuan siswa</h1>
          <p>Pembayaran dan akses premium otomatis mendapat prioritas tinggi. Respons tercatat supaya SLA layanan mudah dipantau.</p>
        </div>
        <div className={styles.heroMark}>?</div>
      </header>

      <section className={styles.stats}>
        <article><span>Aktif</span><b>{open}</b></article>
        <article><span>Menunggu jawaban</span><b>{waiting}</b></article>
        <article><span>Prioritas tinggi</span><b>{priority}</b></article>
        <article><span>Melewati target</span><b>{overdue}</b></article>
      </section>

      <AdminSupportClient tickets={tickets} role={role} settings={settings} />
    </main>
  )
}

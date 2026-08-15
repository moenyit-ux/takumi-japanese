import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import AdminPaymentsClient from './payments-client'
import styles from './admin-payments.module.css'

type PaymentRow = {
  id: string
  email: string
  full_name: string | null
  level_code: string
  plan_name: string
  payment_method: string
  amount_yen: number
  duration_months: number
  currency: string
  reference_no: string | null
  proof_url: string
  proof_signed_url?: string | null
  status: string
  submitted_at: string
  verified_at: string | null
  admin_note: string | null
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') redirect('/portal/admin')

  const [paymentsResult, methodsResult] = await Promise.all([
    supabase.rpc('admin_list_payments', { p_status: null }),
    supabase.from('payment_methods').select('id, label, bank_name, account_name, account_number, instructions, active, updated_at').order('created_at'),
  ])

  const rows = ((paymentsResult.data || []) as PaymentRow[]).slice(0, 200)
  const payments = await Promise.all(rows.map(async (payment) => {
    const prefix = 'storage://payment-proofs/'
    if (!payment.proof_url?.startsWith(prefix)) return payment
    const path = payment.proof_url.slice(prefix.length)
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 600)
    return { ...payment, proof_signed_url: data?.signedUrl || null }
  }))

  const pending = payments.filter((payment) => payment.status === 'pending').length
  const verified = payments.filter((payment) => payment.status === 'verified').length

  return (
    <main className={styles.shell}>
      <div className={styles.topbar}>
        <Link href="/portal/admin">← Content Studio</Link>
        <span>SUPER ADMIN · PEMBAYARAN</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <small>TAKUMI OPERATIONS</small>
          <h1>Verifikasi pembayaran</h1>
          <p>Periksa bukti transfer sebelum mengaktifkan premium. Verifikasi berhasil akan membuat entitlement N4/N3 secara otomatis.</p>
        </div>
        <b className={styles.heroMark}>✓</b>
      </section>

      <section className={styles.accessGrid} aria-label="Ringkasan pembayaran">
        <article className={styles.accessCard}><small>MENUNGGU</small><h2>{pending}</h2><p>Perlu diperiksa</p></article>
        <article className={styles.accessCard}><small>TERVERIFIKASI</small><h2>{verified}</h2><p>Pembayaran berhasil</p></article>
      </section>

      <AdminPaymentsClient payments={payments} methods={methodsResult.data || []} />
    </main>
  )
}

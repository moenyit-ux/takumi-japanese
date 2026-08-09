import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import PaymentClient from './payment-client'
import styles from './payment.module.css'

export default async function PaymentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [levelsResult, plansResult, methodsResult, paymentsResult, entitlementsResult] = await Promise.all([
    supabase.from('levels').select('id, code, name').in('code', ['N4', 'N3']),
    supabase.from('premium_plans').select('id, code, name, duration_months, amount_yen, active').eq('active', true).order('duration_months'),
    supabase.from('payment_methods').select('id, label, bank_name, account_name, account_number, instructions, active').eq('active', true),
    supabase.from('payments').select('id, level_id, package_code, amount_yen, duration_months, currency, reference_no, status, submitted_at, verified_at, admin_note').order('submitted_at', { ascending: false }).limit(50),
    supabase.from('entitlements').select('level_id, starts_at, ends_at, active, source').eq('active', true),
  ])

  const levels = levelsResult.data || []
  levels.sort((a, b) => a.code === 'N4' ? -1 : b.code === 'N4' ? 1 : a.code.localeCompare(b.code))

  return (
    <main className={styles.shell}>
      <div className={styles.topbar}>
        <Link href="/portal/dashboard">← Dashboard</Link>
        <span>PEMBAYARAN MANUAL</span>
      </div>
      <header className={styles.hero}>
        <div><small>TAKUMI PREMIUM</small><h1>Aktifkan akses N4 / N3</h1><p>Pilih level dan paket, transfer sesuai metode yang tersedia, lalu kirim bukti pembayaran. Target verifikasi maksimal 1×24 jam setelah pembayaran diperiksa admin.</p></div>
        <b>¥</b>
      </header>
      <PaymentClient
        levels={levels}
        plans={plansResult.data || []}
        methods={methodsResult.data || []}
        payments={paymentsResult.data || []}
        entitlements={entitlementsResult.data || []}
      />
    </main>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import styles from './payment.module.css'

type Level = { id: string; code: string; name: string }
type Plan = { id: string; code: string; name: string; duration_months: number; amount_yen: number; active: boolean }
type Method = { id: string; label: string; bank_name: string | null; account_name: string | null; account_number: string | null; instructions: string | null; active: boolean }
type Payment = { id: string; level_id: string; package_code: string; amount_yen: number; duration_months: number; currency: string; reference_no: string | null; status: string; submitted_at: string; verified_at: string | null; admin_note: string | null }
type Entitlement = { level_id: string; starts_at: string; ends_at: string | null; active: boolean; source: string }

const statusText: Record<string, string> = {
  pending: 'Menunggu verifikasi',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
  refunded: 'Dikembalikan',
}

export default function PaymentClient({ levels, plans, methods, payments, entitlements }: { levels: Level[]; plans: Plan[]; methods: Method[]; payments: Payment[]; entitlements: Entitlement[] }) {
  const router = useRouter()
  const [levelId, setLevelId] = useState(levels[0]?.id || '')
  const [planCode, setPlanCode] = useState(plans[0]?.code || '')
  const [methodId, setMethodId] = useState(methods[0]?.id || '')
  const [referenceNo, setReferenceNo] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedPlan = plans.find((plan) => plan.code === planCode)
  const selectedMethod = methods.find((method) => method.id === methodId)
  const pendingForLevel = payments.some((payment) => payment.level_id === levelId && payment.status === 'pending')
  const levelById = useMemo(() => new Map(levels.map((level) => [level.id, level])), [levels])

  async function submit() {
    if (!file) return setMessage('Pilih foto atau PDF bukti pembayaran terlebih dahulu.')
    if (!levelId || !planCode || !methodId) return setMessage('Pilih level, paket, dan metode pembayaran.')
    if (pendingForLevel) return setMessage('Masih ada pembayaran yang menunggu verifikasi untuk level ini.')

    setBusy(true)
    setMessage('Mengunggah bukti pembayaran...')
    try {
      const form = new FormData()
      form.append('file', file)
      const uploadResponse = await fetch('/api/payments/proof', { method: 'POST', body: form })
      const uploadData = await uploadResponse.json() as { proofUrl?: string; error?: string }
      if (!uploadResponse.ok || !uploadData.proofUrl) throw new Error(uploadData.error || 'Upload bukti gagal.')

      setMessage('Menyimpan permintaan verifikasi...')
      const response = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId, planCode, paymentMethodId: methodId, proofUrl: uploadData.proofUrl, referenceNo }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Pembayaran gagal dikirim.')

      setMessage('Bukti pembayaran terkirim. Status akan berubah setelah diverifikasi admin.')
      setFile(null)
      setReferenceNo('')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className={styles.accessGrid}>
        {levels.map((level) => {
          const active = entitlements.filter((item) => item.level_id === level.id && item.active).sort((a, b) => new Date(b.ends_at || '2999-01-01').getTime() - new Date(a.ends_at || '2999-01-01').getTime())[0]
          return <article className={styles.accessCard} key={level.id}><small>{level.code}</small><h2>{level.name}</h2><p>{active ? `Premium aktif sampai ${active.ends_at ? new Date(active.ends_at).toLocaleDateString('id-ID') : 'tanpa batas'}` : 'Belum ada akses premium aktif'}</p></article>
        })}
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>Kirim bukti pembayaran</h2>
          {methods.length === 0 ? <div className={styles.notice}>Metode transfer belum dikonfigurasi oleh admin. Pembayaran belum dapat dikirim.</div> : <>
            <label>Level
              <select value={levelId} onChange={(e) => setLevelId(e.target.value)}>{levels.map((level) => <option value={level.id} key={level.id}>{level.code} · {level.name}</option>)}</select>
            </label>
            <label>Paket
              <select value={planCode} onChange={(e) => setPlanCode(e.target.value)}>{plans.map((plan) => <option value={plan.code} key={plan.id}>{plan.name} · ¥{plan.amount_yen.toLocaleString('ja-JP')}</option>)}</select>
            </label>
            <label>Metode transfer
              <select value={methodId} onChange={(e) => setMethodId(e.target.value)}>{methods.map((method) => <option value={method.id} key={method.id}>{method.label}</option>)}</select>
            </label>

            {selectedMethod && <div className={styles.methodBox}>
              <b>{selectedMethod.label}</b>
              {selectedMethod.bank_name && <p>Bank: {selectedMethod.bank_name}</p>}
              {selectedMethod.account_name && <p>Nama rekening: {selectedMethod.account_name}</p>}
              {selectedMethod.account_number && <p>Nomor rekening: {selectedMethod.account_number}</p>}
              {selectedMethod.instructions && <p>{selectedMethod.instructions}</p>}
              {selectedPlan && <strong>Jumlah transfer: ¥{selectedPlan.amount_yen.toLocaleString('ja-JP')}</strong>}
            </div>}

            <label>Nomor referensi transfer (opsional)<input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Nomor transaksi / catatan transfer" /></label>
            <label>Bukti pembayaran<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
            <p className={styles.hint}>JPG, PNG, WebP, atau PDF. Maksimal 10 MB.</p>
            <button className={styles.primary} disabled={busy || pendingForLevel} onClick={submit}>{busy ? 'Memproses…' : pendingForLevel ? 'Menunggu verifikasi level ini' : 'Kirim bukti pembayaran'}</button>
          </>}
          {message && <div className={styles.message}>{message}</div>}
        </section>

        <section className={styles.panel}>
          <h2>Riwayat pembayaran</h2>
          {payments.length === 0 ? <div className={styles.empty}>Belum ada pembayaran.</div> : payments.map((payment) => <article className={styles.history} key={payment.id}>
            <div><b>{levelById.get(payment.level_id)?.code || 'JLPT'} · {payment.duration_months} bulan</b><small>{new Date(payment.submitted_at).toLocaleString('id-ID')}</small></div>
            <strong>¥{payment.amount_yen.toLocaleString('ja-JP')}</strong>
            <span className={`${styles.status} ${styles[payment.status] || ''}`}>{statusText[payment.status] || payment.status}</span>
            {payment.admin_note && <p>Catatan admin: {payment.admin_note}</p>}
          </article>)}
        </section>
      </div>
    </>
  )
}

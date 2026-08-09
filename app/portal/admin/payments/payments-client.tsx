'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../../pembayaran/payment.module.css'

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

type Method = {
  id: string
  label: string
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  instructions: string | null
  active: boolean
  updated_at: string
}

async function post(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/payments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const data = await response.json() as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Operasi gagal.')
}

function PaymentCard({ payment }: { payment: PaymentRow }) {
  const router = useRouter()
  const [note, setNote] = useState(payment.admin_note || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function setStatus(status: 'verified' | 'rejected' | 'refunded') {
    if (status === 'refunded' && !window.confirm('Batalkan entitlement dari pembayaran ini dan tandai sebagai refunded?')) return
    setBusy(true)
    setMessage('Memproses...')
    try {
      await post({ action: 'set_status', paymentId: payment.id, status, note })
      setMessage('Status pembayaran diperbarui.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operasi gagal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={styles.history}>
      <div><b>{payment.full_name || payment.email} · {payment.level_code}</b><small>{payment.email} · {new Date(payment.submitted_at).toLocaleString('id-ID')}</small></div>
      <strong>¥{payment.amount_yen.toLocaleString('ja-JP')}</strong>
      <span className={`${styles.status} ${styles[payment.status] || ''}`}>{payment.status}</span>
      <p>{payment.plan_name} · {payment.payment_method}{payment.reference_no ? ` · Ref: ${payment.reference_no}` : ''}</p>
      {payment.proof_signed_url && <p><a href={payment.proof_signed_url} target="_blank" rel="noreferrer">Buka bukti pembayaran ↗</a></p>}
      <label>Catatan admin<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional; wajib diisi jika perlu menjelaskan penolakan." /></label>
      {payment.status === 'pending' && <div>
        <button className={styles.primary} disabled={busy} onClick={() => setStatus('verified')}>Verifikasi & aktifkan premium</button>
        <button className={styles.primary} disabled={busy} onClick={() => setStatus('rejected')}>Tolak pembayaran</button>
      </div>}
      {payment.status === 'verified' && <button className={styles.primary} disabled={busy} onClick={() => setStatus('refunded')}>Tandai refunded</button>}
      {message && <div className={styles.message}>{message}</div>}
    </article>
  )
}

function MethodEditor({ method }: { method?: Method }) {
  const router = useRouter()
  const [label, setLabel] = useState(method?.label || 'Transfer bank')
  const [bankName, setBankName] = useState(method?.bank_name || '')
  const [accountName, setAccountName] = useState(method?.account_name || '')
  const [accountNumber, setAccountNumber] = useState(method?.account_number || '')
  const [instructions, setInstructions] = useState(method?.instructions || '')
  const [active, setActive] = useState(method?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function save() {
    setBusy(true)
    setMessage('Menyimpan...')
    try {
      await post({ action: 'save_method', id: method?.id || null, label, bankName, accountName, accountNumber, instructions, active })
      setMessage('Metode pembayaran tersimpan.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan.')
    } finally {
      setBusy(false)
    }
  }

  return <div className={styles.methodBox}>
    <label>Nama metode<input value={label} onChange={(e) => setLabel(e.target.value)} /></label>
    <label>Nama bank<input value={bankName} onChange={(e) => setBankName(e.target.value)} /></label>
    <label>Nama rekening<input value={accountName} onChange={(e) => setAccountName(e.target.value)} /></label>
    <label>Nomor rekening<input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></label>
    <label>Instruksi<input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Contoh: cantumkan nama siswa pada catatan transfer." /></label>
    <label><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktif</label>
    <button className={styles.primary} disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : method ? 'Simpan metode' : 'Tambah metode'}</button>
    {message && <div className={styles.message}>{message}</div>}
  </div>
}

export default function AdminPaymentsClient({ payments, methods }: { payments: PaymentRow[]; methods: Method[] }) {
  const pending = payments.filter((payment) => payment.status === 'pending')
  const others = payments.filter((payment) => payment.status !== 'pending')

  return <div className={styles.grid}>
    <section className={styles.panel}>
      <h2>Menunggu verifikasi</h2>
      {pending.length === 0 ? <div className={styles.empty}>Tidak ada pembayaran yang menunggu.</div> : pending.map((payment) => <PaymentCard payment={payment} key={payment.id} />)}
      <h2>Riwayat terbaru</h2>
      {others.slice(0, 30).map((payment) => <PaymentCard payment={payment} key={payment.id} />)}
    </section>
    <section className={styles.panel}>
      <h2>Metode transfer</h2>
      <p className={styles.hint}>Detail ini ditampilkan kepada siswa. Isi hanya rekening resmi Takumi.</p>
      {methods.map((method) => <MethodEditor method={method} key={method.id} />)}
      <h3>Tambah metode</h3>
      <MethodEditor />
    </section>
  </div>
}

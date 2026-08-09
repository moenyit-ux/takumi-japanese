'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Device = {
  id: string
  device_name: string | null
  last_seen_at: string
  revoked_at: string | null
}

type DeletionRequest = {
  id: string
  reason: string | null
  status: string
  requested_at: string
  completed_at: string | null
} | null

const deletionLabels: Record<string, string> = {
  requested: 'Permintaan diterima',
  confirmed: 'Dikonfirmasi admin',
  processing: 'Sedang diproses',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default function SettingsClient({ devices, deletionRequest }: { devices: Device[]; deletionRequest: DeletionRequest }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const activeDevices = devices.filter((device) => !device.revoked_at)

  async function revoke(deviceId: string) {
    if (!window.confirm('Cabut akses perangkat ini? Perangkat tersebut harus didaftarkan ulang sebelum dapat membuka portal.')) return
    setBusy(true)
    const response = await fetch('/api/account/device', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    setMessage(response.ok ? 'Akses perangkat dicabut.' : data.error || 'Gagal mencabut perangkat.')
    setBusy(false)
    router.refresh()
  }

  async function resetBrowser() {
    setBusy(true)
    const response = await fetch('/api/account/device', { method: 'DELETE' })
    if (response.ok) window.location.href = '/portal/settings'
    else {
      setMessage('Gagal mengatur ulang identitas perangkat ini.')
      setBusy(false)
    }
  }

  async function requestDeletion() {
    if (confirmation !== 'HAPUS') {
      setMessage('Ketik HAPUS untuk mengonfirmasi permintaan penghapusan akun.')
      return
    }
    setBusy(true)
    const response = await fetch('/api/account/deletion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    setMessage(response.ok ? 'Permintaan penghapusan akun telah dikirim.' : data.error || 'Gagal mengirim permintaan.')
    setBusy(false)
    router.refresh()
  }

  async function cancelDeletion() {
    if (!deletionRequest) return
    setBusy(true)
    const response = await fetch('/api/account/deletion', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: deletionRequest.id }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    setMessage(response.ok ? 'Permintaan penghapusan dibatalkan.' : data.error || 'Permintaan tidak dapat dibatalkan.')
    setBusy(false)
    router.refresh()
  }

  return (
    <>
      <section className="panel">
        <h2>Perangkat aktif</h2>
        <p>Akun Takumi dapat dipakai pada maksimal <b>2 perangkat aktif</b> pada saat bersamaan.</p>
        <div className="stats">
          <article><span>Aktif</span><b>{activeDevices.length}/2</b></article>
          <article><span>Total tercatat</span><b>{devices.length}</b></article>
        </div>
        {devices.length === 0 ? <p>Belum ada perangkat tercatat.</p> : devices.map((device) => (
          <div className="row" key={device.id}>
            <div><b>{device.device_name || 'Perangkat'}</b><small style={{ display: 'block' }}>Terakhir aktif {new Date(device.last_seen_at).toLocaleString('id-ID')} · {device.revoked_at ? 'Dicabut' : 'Aktif'}</small></div>
            {!device.revoked_at && <button className="btn ghost" disabled={busy} onClick={() => revoke(device.id)}>Cabut akses</button>}
          </div>
        ))}
        <p><button className="btn ghost" disabled={busy} onClick={resetBrowser}>Daftarkan ulang browser ini</button></p>
        <small>Gunakan tombol ini hanya bila identitas browser ini pernah dicabut. Jika sudah ada 2 perangkat aktif, Anda tetap harus mencabut salah satunya terlebih dahulu.</small>
      </section>

      <section className="panel">
        <h2>Penghapusan akun</h2>
        {deletionRequest && deletionRequest.status !== 'cancelled' ? (
          <>
            <p>Status: <b>{deletionLabels[deletionRequest.status] || deletionRequest.status}</b></p>
            <p>Diajukan {new Date(deletionRequest.requested_at).toLocaleString('id-ID')}</p>
            {deletionRequest.reason && <p>Alasan: {deletionRequest.reason}</p>}
            {['requested', 'confirmed'].includes(deletionRequest.status) && <button className="btn ghost" disabled={busy} onClick={cancelDeletion}>Batalkan permintaan</button>}
          </>
        ) : (
          <>
            <p>Anda dapat meminta profil belajar dan data akun dihapus. Catatan transaksi yang wajib disimpan untuk kebutuhan hukum/akuntansi dapat dipertahankan secara terbatas.</p>
            <label>Alasan (opsional)<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Alasan penghapusan akun" /></label>
            <label>Konfirmasi<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Ketik HAPUS" /></label>
            <button className="btn ghost" disabled={busy} onClick={requestDeletion}>Minta penghapusan akun</button>
          </>
        )}
        <p className="message" aria-live="polite">{message}</p>
      </section>
    </>
  )
}

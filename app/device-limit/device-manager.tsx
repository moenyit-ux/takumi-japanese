'use client'

import { useState } from 'react'

type Device = { id: string; device_name: string | null; last_seen_at: string; revoked_at: string | null }

export default function DeviceManager({ devices, reason }: { devices: Device[]; reason?: string }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const active = devices.filter((item) => !item.revoked_at)

  async function revoke(deviceId: string) {
    setBusy(true)
    const response = await fetch('/api/account/device', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) {
      setMessage(data.error || 'Gagal mencabut perangkat.')
      setBusy(false)
      return
    }
    window.location.href = '/portal/dashboard'
  }

  async function resetCurrent() {
    setBusy(true)
    const response = await fetch('/api/account/device', { method: 'DELETE' })
    if (!response.ok) {
      setMessage('Gagal mengatur ulang browser ini.')
      setBusy(false)
      return
    }
    window.location.href = '/portal/dashboard'
  }

  return (
    <>
      <section className="panel">
        <h2>{reason === 'revoked' ? 'Perangkat ini pernah dicabut' : 'Maksimal 2 perangkat aktif'}</h2>
        <p>{reason === 'revoked'
          ? 'Identitas browser ini sudah dicabut. Daftarkan ulang browser ini untuk membuat identitas perangkat baru.'
          : 'Akun Anda sudah mempunyai dua perangkat aktif. Cabut salah satu perangkat lama sebelum melanjutkan di perangkat ini.'}</p>

        {active.map((device) => (
          <div className="row" key={device.id}>
            <div><b>{device.device_name || 'Perangkat Takumi'}</b><small style={{ display: 'block' }}>Terakhir aktif {new Date(device.last_seen_at).toLocaleString('id-ID')}</small></div>
            <button className="btn ghost" disabled={busy} onClick={() => revoke(device.id)}>Cabut & gunakan perangkat ini</button>
          </div>
        ))}

        {reason === 'revoked' && <button className="btn primary" disabled={busy} onClick={resetCurrent}>Daftarkan ulang browser ini</button>}
        <p className="message" aria-live="polite">{message}</p>
      </section>
    </>
  )
}

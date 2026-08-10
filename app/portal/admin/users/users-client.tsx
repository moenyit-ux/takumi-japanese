'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../admin.module.css'

type Device = { id: string; device_name: string | null; last_seen_at: string; revoked_at: string | null }
type Entitlement = { level: string; active: boolean; starts_at: string; ends_at: string | null; source: string }
type Deletion = { id: string; status: string; reason: string | null; requested_at: string; completed_at: string | null } | null
export type AdminUser = {
  id: string
  email: string | null
  email_confirmed_at: string | null
  created_at: string
  last_sign_in_at: string | null
  full_name: string | null
  birth_year: number | null
  role: string
  devices: Device[]
  entitlements: Entitlement[]
  deletion_request: Deletion
}

async function adminAction(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Aksi admin gagal.')
}

export default function UsersClient({ users }: { users: AdminUser[] }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(payload: Record<string, unknown>, success: string) {
    setBusy(true)
    setMessage('Memproses...')
    try {
      await adminAction(payload)
      setMessage(success)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Aksi gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function finalizeDeletion(user: AdminUser) {
    if (!user.deletion_request) return
    const confirmed = window.confirm(`Hapus akun ${user.full_name || user.email} secara permanen? Profil, progres, perangkat, bookmark, dan identitas Auth akan dihapus. Catatan transaksi akan dianonimkan.`)
    if (!confirmed) return
    await run({ action: 'finalize_deletion', requestId: user.deletion_request.id, userId: user.id }, 'Akun telah dihapus dan transaksi yang wajib dipertahankan sudah dianonimkan.')
  }

  return (
    <>
      <div className={styles.message}>{message}</div>
      <div className={styles.stack}>
        {users.map((user) => {
          const activeDevices = user.devices.filter((device) => !device.revoked_at)
          const activePremium = user.entitlements.filter((item) => item.active && (!item.ends_at || new Date(item.ends_at).getTime() > Date.now()))
          return (
            <section className={styles.panel} key={user.id}>
              <div className={styles.cardHead}>
                <div>
                  <div className={styles.eyebrow}>{user.email_confirmed_at ? 'EMAIL TERVERIFIKASI' : 'EMAIL BELUM TERVERIFIKASI'}</div>
                  <h2>{user.full_name || user.email || 'Pengguna Takumi'}</h2>
                  <p className={styles.note}>{user.email} · dibuat {new Date(user.created_at).toLocaleDateString('id-ID')} · terakhir masuk {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('id-ID') : '—'}</p>
                </div>
                <span className={styles.roleBadge}>{user.role}</span>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.label}>Role
                  <select className={styles.select} value={user.role} disabled={busy} onChange={(event) => run({ action: 'set_role', userId: user.id, role: event.target.value }, 'Role pengguna diperbarui.')}>
                    <option value="student">Student</option>
                    <option value="content_admin">Content Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </label>
                <div><b>Premium aktif</b><p className={styles.note}>{activePremium.length ? activePremium.map((item) => `${item.level}${item.ends_at ? ` sampai ${new Date(item.ends_at).toLocaleDateString('id-ID')}` : ''}`).join(' · ') : 'Tidak ada'}</p></div>
              </div>

              <div className={styles.divider} />
              <h3>Perangkat ({activeDevices.length}/2 aktif)</h3>
              {user.devices.length === 0 ? <p className={styles.note}>Belum ada perangkat.</p> : user.devices.map((device) => (
                <div className={styles.optionRow} key={device.id}>
                  <div style={{ flex: 1 }}><b>{device.device_name || 'Perangkat'}</b><small style={{ display: 'block' }}>{device.revoked_at ? 'Dicabut' : 'Aktif'} · {new Date(device.last_seen_at).toLocaleString('id-ID')}</small></div>
                  {!device.revoked_at && <button className={styles.danger} disabled={busy} onClick={() => run({ action: 'revoke_device', deviceId: device.id }, 'Akses perangkat dicabut.')}>Cabut</button>}
                </div>
              ))}

              {user.deletion_request && user.deletion_request.status !== 'cancelled' && (
                <>
                  <div className={styles.divider} />
                  <h3>Permintaan penghapusan akun</h3>
                  <p>Status: <b>{user.deletion_request.status}</b> · {new Date(user.deletion_request.requested_at).toLocaleString('id-ID')}</p>
                  {user.deletion_request.reason && <p className={styles.note}>{user.deletion_request.reason}</p>}
                  <div className={styles.actions}>
                    <button className={styles.secondary} disabled={busy} onClick={() => run({ action: 'deletion_status', requestId: user.deletion_request?.id, status: 'confirmed' }, 'Permintaan dikonfirmasi.')}>Konfirmasi</button>
                    <button className={styles.secondary} disabled={busy} onClick={() => run({ action: 'deletion_status', requestId: user.deletion_request?.id, status: 'processing' }, 'Permintaan ditandai sedang diproses.')}>Proses</button>
                    <button className={styles.danger} disabled={busy} onClick={() => run({ action: 'deletion_status', requestId: user.deletion_request?.id, status: 'cancelled' }, 'Permintaan dibatalkan.')}>Batalkan</button>
                    {user.role === 'student' && ['confirmed', 'processing'].includes(user.deletion_request.status) && <button className={styles.danger} disabled={busy} onClick={() => finalizeDeletion(user)}>Hapus akun permanen</button>}
                  </div>
                  <p className={styles.note}>Penghapusan permanen menghapus identitas Auth dan data belajar. Bukti pembayaran di Storage dihapus lebih dulu; catatan transaksi yang perlu dipertahankan dibuat anonim. Akun admin harus memindahkan tanggung jawab/aset sebelum dapat dihapus.</p>
                </>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}

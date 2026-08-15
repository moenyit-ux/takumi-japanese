'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../admin.module.css'
import userStyles from './admin-users.module.css'

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

const roleLabel: Record<string, string> = {
  student: 'Student',
  content_admin: 'Content Admin',
  super_admin: 'Super Admin',
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
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})

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

  function toggleUser(userId: string) {
    setExpandedUsers((current) => ({ ...current, [userId]: !current[userId] }))
  }

  function toggleHistory(userId: string) {
    setExpandedHistory((current) => ({ ...current, [userId]: !current[userId] }))
  }

  return (
    <>
      <div className={styles.message} aria-live="polite">{message}</div>
      <div className={userStyles.userList}>
        {users.map((user) => {
          const activeDevices = user.devices.filter((device) => !device.revoked_at)
          const revokedDevices = user.devices.filter((device) => Boolean(device.revoked_at))
          const activePremium = user.entitlements.filter((item) => item.active && (!item.ends_at || new Date(item.ends_at).getTime() > Date.now()))
          const isExpanded = Boolean(expandedUsers[user.id])
          const showHistory = Boolean(expandedHistory[user.id])
          const premiumSummary = activePremium.length
            ? activePremium.map((item) => item.level).join(', ')
            : 'Tidak ada'
          const deletionActive = Boolean(user.deletion_request && user.deletion_request.status !== 'cancelled')

          return (
            <section className={`${userStyles.userCard} ${isExpanded ? userStyles.userCardExpanded : ''}`} key={user.id}>
              <button
                type="button"
                className={userStyles.userSummaryButton}
                onClick={() => toggleUser(user.id)}
                aria-expanded={isExpanded}
                aria-controls={`user-detail-${user.id}`}
              >
                <div className={userStyles.userIdentity}>
                  <div className={styles.eyebrow}>{user.email_confirmed_at ? 'EMAIL TERVERIFIKASI' : 'EMAIL BELUM TERVERIFIKASI'}</div>
                  <h2>{user.full_name || user.email || 'Pengguna Takumi'}</h2>
                  <p className={userStyles.userEmail}>{user.email || 'Email tidak tersedia'}</p>
                  <div className={userStyles.summaryMeta}>
                    <span>{activeDevices.length}/2 perangkat aktif</span>
                    <span>Premium: {premiumSummary}</span>
                    {deletionActive && <span className={userStyles.alertMeta}>Ada permintaan hapus akun</span>}
                  </div>
                </div>
                <div className={userStyles.summaryAside}>
                  <span className={styles.roleBadge}>{roleLabel[user.role] || user.role}</span>
                  <span className={userStyles.chevron} aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className={userStyles.userDetails} id={`user-detail-${user.id}`}>
                  <p className={userStyles.userMeta}>Dibuat {new Date(user.created_at).toLocaleDateString('id-ID')} · terakhir masuk {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('id-ID') : '—'}</p>

                  <div className={userStyles.summaryGrid}>
                    <label className={styles.label}>Role
                      <select className={styles.select} value={user.role} disabled={busy} onChange={(event) => run({ action: 'set_role', userId: user.id, role: event.target.value }, 'Role pengguna diperbarui.')}>
                        <option value="student">Student</option>
                        <option value="content_admin">Content Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </label>
                    <div className={userStyles.premiumBox}>
                      <b>Premium aktif</b>
                      <p className={styles.note}>{activePremium.length ? activePremium.map((item) => `${item.level}${item.ends_at ? ` sampai ${new Date(item.ends_at).toLocaleDateString('id-ID')}` : ''}`).join(' · ') : 'Tidak ada'}</p>
                    </div>
                  </div>

                  <div className={styles.divider} />
                  <div className={userStyles.deviceSectionHead}>
                    <h3 className={userStyles.sectionTitle}>Perangkat aktif ({activeDevices.length}/2)</h3>
                    {revokedDevices.length > 0 && (
                      <button type="button" className={userStyles.historyToggle} onClick={() => toggleHistory(user.id)}>
                        {showHistory ? 'Sembunyikan perangkat lama' : `Tampilkan ${revokedDevices.length} perangkat lama`}
                      </button>
                    )}
                  </div>

                  {activeDevices.length === 0 ? (
                    <p className={styles.note}>Belum ada perangkat aktif.</p>
                  ) : (
                    <div className={userStyles.deviceList}>
                      {activeDevices.map((device) => (
                        <div className={userStyles.deviceRow} key={device.id}>
                          <div className={userStyles.deviceInfo}>
                            <b>{device.device_name || 'Perangkat'}</b>
                            <small>Aktif · {new Date(device.last_seen_at).toLocaleString('id-ID')}</small>
                          </div>
                          <button className={styles.danger} disabled={busy} onClick={() => run({ action: 'revoke_device', deviceId: device.id }, 'Akses perangkat dicabut.')}>Cabut</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showHistory && revokedDevices.length > 0 && (
                    <div className={userStyles.historyBlock}>
                      <h4>Perangkat lama</h4>
                      <div className={userStyles.deviceList}>
                        {revokedDevices.map((device) => (
                          <div className={`${userStyles.deviceRow} ${userStyles.deviceRowRevoked}`} key={device.id}>
                            <div className={userStyles.deviceInfo}>
                              <b>{device.device_name || 'Perangkat'}</b>
                              <small>Dicabut · {new Date(device.last_seen_at).toLocaleString('id-ID')}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {user.deletion_request && user.deletion_request.status !== 'cancelled' && (
                    <div className={userStyles.deleteBlock}>
                      <div className={styles.divider} />
                      <h3 className={userStyles.sectionTitle}>Permintaan penghapusan akun</h3>
                      <p>Status: <b>{user.deletion_request.status}</b> · {new Date(user.deletion_request.requested_at).toLocaleString('id-ID')}</p>
                      {user.deletion_request.reason && <p className={styles.note}>{user.deletion_request.reason}</p>}
                      <div className={userStyles.deleteActions}>
                        <button className={styles.secondary} disabled={busy} onClick={() => run({ action: 'deletion_status', requestId: user.deletion_request?.id, status: 'confirmed' }, 'Permintaan dikonfirmasi.')}>Konfirmasi</button>
                        <button className={styles.secondary} disabled={busy} onClick={() => run({ action: 'deletion_status', requestId: user.deletion_request?.id, status: 'processing' }, 'Permintaan ditandai sedang diproses.')}>Proses</button>
                        <button className={styles.danger} disabled={busy} onClick={() => run({ action: 'deletion_status', requestId: user.deletion_request?.id, status: 'cancelled' }, 'Permintaan dibatalkan.')}>Batalkan</button>
                        {user.role === 'student' && ['confirmed', 'processing'].includes(user.deletion_request.status) && <button className={styles.danger} disabled={busy} onClick={() => finalizeDeletion(user)}>Hapus akun permanen</button>}
                      </div>
                      <p className={styles.note}>Penghapusan permanen menghapus identitas Auth dan data belajar. Bukti pembayaran di Storage dihapus lebih dulu; catatan transaksi yang perlu dipertahankan dibuat anonim. Akun admin harus memindahkan tanggung jawab/aset sebelum dapat dihapus.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}

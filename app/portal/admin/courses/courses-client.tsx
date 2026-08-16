'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './courses.module.css'

type CourseEnrollment = {
  id: string
  course_level: string
  pace: 'regular' | 'accelerated'
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  starts_at: string
  ends_at: string | null
  premium_level: string | null
  premium_ready: boolean
  created_at: string
}

export type CourseAdminUser = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  course_enrollments: CourseEnrollment[]
}

type Draft = {
  level: 'DASAR' | 'N5' | 'N4' | 'N3'
  pace: 'regular' | 'accelerated'
  startsAt: string
  endsAt: string
}

const regularDuration: Record<Draft['level'], string> = {
  DASAR: 'Disesuaikan',
  N5: '6 bulan',
  N4: '9 bulan',
  N3: '12 bulan',
}

const statusLabel: Record<CourseEnrollment['status'], string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

function todayValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toStartTimestamp(value: string) {
  return `${value}T00:00:00+07:00`
}

function toEndTimestamp(value: string) {
  return value ? `${value}T23:59:59+07:00` : null
}

function formatDate(value: string | null) {
  if (!value) return 'tanpa batas tanggal'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function postCourse(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'Aksi kursus gagal.')
}

export default function CoursesClient({ users }: { users: CourseAdminUser[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return users
    return users.filter((user) => `${user.full_name || ''} ${user.email || ''}`.toLowerCase().includes(keyword))
  }, [query, users])

  function draftFor(userId: string): Draft {
    return drafts[userId] || { level: 'N4', pace: 'regular', startsAt: todayValue(), endsAt: '' }
  }

  function patchDraft(userId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [userId]: { ...draftFor(userId), ...patch } }))
  }

  async function enroll(event: FormEvent, user: CourseAdminUser) {
    event.preventDefault()
    const draft = draftFor(user.id)
    setBusy(user.id)
    setMessage('Memproses pendaftaran kursus...')
    try {
      await postCourse({
        action: 'upsert',
        enrollmentId: null,
        userId: user.id,
        courseLevel: draft.level,
        pace: draft.pace,
        status: 'active',
        startsAt: toStartTimestamp(draft.startsAt),
        endsAt: toEndTimestamp(draft.endsAt),
      })
      setMessage(`Kursus ${draft.level} untuk ${user.full_name || user.email} aktif. Premium disinkronkan otomatis.`)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Pendaftaran kursus gagal.')
    } finally {
      setBusy(null)
    }
  }

  async function setStatus(enrollment: CourseEnrollment, status: CourseEnrollment['status']) {
    setBusy(enrollment.id)
    setMessage('Memperbarui status kursus...')
    try {
      await postCourse({ action: 'set_status', enrollmentId: enrollment.id, status })
      setMessage(status === 'active' ? 'Kursus dan akses premium diaktifkan kembali.' : `Status kursus menjadi ${statusLabel[status].toLowerCase()}. Akses premium ikut disesuaikan.`)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Perubahan status gagal.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={styles.manager}>
      <div className={styles.toolbar}>
        <div>
          <h2>Daftarkan siswa</h2>
          <p>N4 dan N3 langsung mendapat premium level yang sama. Dasar dan N5 otomatis tersambung saat level tersebut tersedia di website premium.</p>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau email..." aria-label="Cari siswa" />
      </div>

      <div className={styles.message} aria-live="polite">{message}</div>

      <div className={styles.list}>
        {filteredUsers.map((user) => {
          const current = (user.course_enrollments || []).filter((item) => item.status === 'active' || item.status === 'paused')
          const history = (user.course_enrollments || []).filter((item) => item.status === 'completed' || item.status === 'cancelled')
          const draft = draftFor(user.id)
          return (
            <article className={styles.card} key={user.id}>
              <div className={styles.identity}>
                <div><h3>{user.full_name || 'Siswa Takumi'}</h3><p>{user.email || 'Email tidak tersedia'}</p></div>
                <span>{current.length ? `${current.length} kursus berjalan` : 'Belum ada kursus aktif'}</span>
              </div>

              {current.length > 0 && (
                <div className={styles.currentList}>
                  {current.map((enrollment) => (
                    <div className={styles.enrollment} key={enrollment.id}>
                      <div className={styles.enrollmentMain}>
                        <strong>{enrollment.course_level}</strong>
                        <div>
                          <b>{enrollment.pace === 'accelerated' ? 'Akselerasi' : 'Reguler'} · {statusLabel[enrollment.status]}</b>
                          <small>{formatDate(enrollment.starts_at)} – {formatDate(enrollment.ends_at)}</small>
                          <small className={enrollment.premium_ready ? styles.premiumReady : styles.premiumPending}>
                            {enrollment.premium_ready ? `✓ Premium ${enrollment.premium_level} tersambung otomatis` : 'Premium akan tersambung otomatis saat level web tersedia'}
                          </small>
                        </div>
                      </div>
                      <div className={styles.actions}>
                        {enrollment.status === 'active'
                          ? <button disabled={Boolean(busy)} onClick={() => setStatus(enrollment, 'paused')}>Jeda</button>
                          : <button disabled={Boolean(busy)} onClick={() => setStatus(enrollment, 'active')}>Aktifkan</button>}
                        <button disabled={Boolean(busy)} onClick={() => setStatus(enrollment, 'completed')}>Selesai</button>
                        <button className={styles.danger} disabled={Boolean(busy)} onClick={() => setStatus(enrollment, 'cancelled')}>Batalkan</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form className={styles.form} onSubmit={(event) => enroll(event, user)}>
                <label>Level kelas
                  <select value={draft.level} onChange={(event) => patchDraft(user.id, { level: event.target.value as Draft['level'] })}>
                    <option value="DASAR">Dasar</option>
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                  </select>
                </label>
                <label>Jalur
                  <select value={draft.pace} onChange={(event) => patchDraft(user.id, { pace: event.target.value as Draft['pace'] })}>
                    <option value="regular">Reguler · {regularDuration[draft.level]}</option>
                    <option value="accelerated">Akselerasi · sesuai konsultasi</option>
                  </select>
                </label>
                <label>Tanggal mulai
                  <input type="date" required value={draft.startsAt} onChange={(event) => patchDraft(user.id, { startsAt: event.target.value })} />
                </label>
                <label>Tanggal selesai <small>(opsional)</small>
                  <input type="date" value={draft.endsAt} onChange={(event) => patchDraft(user.id, { endsAt: event.target.value })} />
                </label>
                <button className={styles.primary} disabled={Boolean(busy)} type="submit">Aktifkan kursus + Premium</button>
              </form>

              {draft.pace === 'regular' && !draft.endsAt && draft.level !== 'DASAR' && <p className={styles.hint}>Tanggal selesai otomatis mengikuti program reguler {regularDuration[draft.level]}. Bisa diisi manual bila jadwal berbeda.</p>}
              {draft.level === 'DASAR' && !draft.endsAt && <p className={styles.hint}>Kelas Dasar belum memiliki durasi tetap; akses tetap aktif sampai status kursus diubah atau tanggal selesai ditentukan.</p>}

              {history.length > 0 && <details className={styles.history}><summary>Riwayat kursus ({history.length})</summary>{history.slice(0, 6).map((item) => <p key={item.id}><b>{item.course_level}</b> · {statusLabel[item.status]} · {formatDate(item.starts_at)} – {formatDate(item.ends_at)}</p>)}</details>}
            </article>
          )
        })}
        {filteredUsers.length === 0 && <div className={styles.empty}>Siswa tidak ditemukan.</div>}
      </div>
    </section>
  )
}

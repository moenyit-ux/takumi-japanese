'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  levelId: string
  levelCode: string
  className?: string
}

export default function CreateMaterialButton({ levelId, levelCode, className = '' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createMaterial() {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_material', levelId }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || 'Materi baru gagal dibuat.')
        return
      }

      const sessionId = payload?.data?.session_id
      if (!sessionId) {
        setError('Materi berhasil dibuat tetapi halaman edit tidak ditemukan.')
        return
      }

      router.push(`/portal/admin/session/${sessionId}`)
      router.refresh()
    } catch {
      setError('Koneksi terputus saat membuat materi baru.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button className={className} type="button" onClick={createMaterial} disabled={loading}>
        {loading ? 'Membuat…' : `+ Tambah Materi ${levelCode}`}
      </button>
      {error && <p role="alert" style={{ margin: '7px 0 0', fontSize: 12, color: '#a43e29' }}>{error}</p>}
    </div>
  )
}

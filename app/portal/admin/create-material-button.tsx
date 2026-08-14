'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  levelId: string
  levelCode: string
  className?: string
  label?: string
  destination?: 'material' | 'quiz'
  kind?: string
}

export default function CreateMaterialButton({ levelId, levelCode, className = '', label, destination = 'material', kind }: Props) {
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
        setError(payload?.error || 'Ruang kerja materi gagal dibuat.')
        return
      }

      const sessionId = payload?.data?.session_id
      if (!sessionId) {
        setError('Ruang kerja berhasil dibuat tetapi halaman editor tidak ditemukan.')
        return
      }

      const materialUrl = `/portal/admin/session/${sessionId}${kind ? `?kind=${encodeURIComponent(kind)}` : ''}#material-studio`
      router.push(destination === 'quiz' ? `/portal/admin/session/${sessionId}/quiz` : materialUrl)
      router.refresh()
    } catch {
      setError('Koneksi terputus saat menyiapkan ruang kerja materi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button className={className} type="button" onClick={createMaterial} disabled={loading}>
        {loading ? 'Menyiapkan…' : (label || `+ Tambah Materi ${levelCode}`)}
      </button>
      {error && <p role="alert" style={{ margin: '7px 0 0', fontSize: 12, color: '#a43e29' }}>{error}</p>}
    </div>
  )
}

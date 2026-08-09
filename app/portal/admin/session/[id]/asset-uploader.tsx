'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from '../../admin.module.css'

type Props = {
  sessionId: string
  nextPosition: number
}

export default function AssetUploader({ sessionId, nextPosition }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'image' | 'audio'>('image')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [asset, setAsset] = useState('')
  const [busy, setBusy] = useState(false)

  async function upload() {
    if (!file) {
      setMessage('Pilih file gambar atau audio terlebih dahulu.')
      return
    }

    setBusy(true)
    setMessage('Mengunggah aset...')
    try {
      const form = new FormData()
      form.append('sessionId', sessionId)
      form.append('file', file)

      const response = await fetch('/api/admin/assets', { method: 'POST', body: form })
      const uploaded = await response.json().catch(() => ({})) as { asset?: string; error?: string }
      if (!response.ok || !uploaded.asset) throw new Error(uploaded.error || 'Upload gagal.')

      setAsset(uploaded.asset)
      setMessage('File terunggah. Menambahkan ke materi...')

      const saveResponse = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_block',
          sessionId,
          blockId: null,
          position: nextPosition,
          kind,
          title: title.trim() || file.name,
          contentBody: { text: '' },
          audioUrl: kind === 'audio' ? uploaded.asset : '',
          imageUrl: kind === 'image' ? uploaded.asset : '',
        }),
      })
      const saved = await saveResponse.json().catch(() => ({})) as { error?: string }
      if (!saveResponse.ok || saved.error) throw new Error(saved.error || 'Aset terunggah tetapi gagal ditambahkan ke materi.')

      setMessage('Aset berhasil diunggah dan ditambahkan sebagai blok materi.')
      setFile(null)
      setTitle('')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function copyAsset() {
    if (!asset) return
    await navigator.clipboard.writeText(asset)
    setMessage('Path aset disalin. Bisa ditempel ke kolom audio soal jika diperlukan.')
  }

  return (
    <section className={styles.panel}>
      <div className={styles.cardHead}>
        <div><div className={styles.eyebrow}>ASET MATERI</div><h2>Upload gambar atau audio</h2></div>
        <span className={styles.smallMeta}>Privat · maks. 20 MB</span>
      </div>
      <p className={styles.note}>File disimpan di Supabase Storage privat. Siswa hanya memperoleh URL sementara saat sesi mereka memang boleh dibuka.</p>
      <div className={styles.formGrid}>
        <label className={styles.label}>Jenis aset
          <select className={styles.select} value={kind} onChange={(event) => setKind(event.target.value as 'image' | 'audio')}>
            <option value="image">Gambar materi</option>
            <option value="audio">Audio materi / 聴解</option>
          </select>
        </label>
        <label className={styles.label}>Judul blok
          <input className={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Audio contoh percakapan" />
        </label>
        <label className={`${styles.label} ${styles.full}`}>File
          <input
            className={styles.input}
            type="file"
            accept={kind === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg'}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
      </div>
      <div className={styles.actions}>
        <button className={styles.primary} disabled={busy || !file} onClick={upload}>{busy ? 'Mengunggah…' : 'Upload & tambahkan ke materi'}</button>
        {asset && <button className={styles.subtle} disabled={busy} onClick={copyAsset}>Salin path aset</button>}
      </div>
      <div className={styles.message}>{message}</div>
    </section>
  )
}

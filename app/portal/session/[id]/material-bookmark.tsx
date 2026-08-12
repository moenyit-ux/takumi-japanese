'use client'

import { useState } from 'react'

type Props = {
  blockId: string
  initialBookmarked: boolean
}

export default function MaterialBookmark({ blockId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function toggle() {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/bookmarks/content', {
        method: bookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId }),
      })
      const payload = await response.json().catch(() => null) as { bookmarked?: boolean } | null
      if (!response.ok || typeof payload?.bookmarked !== 'boolean') {
        setMessage('Bookmark belum dapat diperbarui.')
        return
      }
      setBookmarked(payload.bookmarked)
      setMessage(payload.bookmarked ? 'Ditandai untuk dipelajari lagi.' : 'Tanda dihapus.')
    } catch {
      setMessage('Bookmark belum dapat diperbarui.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button className={bookmarked ? 'saved' : ''} disabled={busy} onClick={toggle} type="button">
        {bookmarked ? '♡ Sudah ditandai' : '♡ Tandai untuk dipelajari lagi'}
      </button>
      {message && <p className="tm-inline-message" aria-live="polite">{message}</p>}
    </div>
  )
}

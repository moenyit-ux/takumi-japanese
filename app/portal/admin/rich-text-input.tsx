'use client'

import { useRef, type CSSProperties, type RefObject } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  multiline?: boolean
}

const formats: Array<{ label: string; title: string; marker: string; style: CSSProperties }> = [
  { label: 'B', title: 'Bold / tebal', marker: '**', style: { fontWeight: 800 } },
  { label: 'I', title: 'Italic / miring', marker: '*', style: { fontStyle: 'italic' } },
  { label: 'U', title: 'Underline / garis bawah', marker: '++', style: { textDecoration: 'underline' } },
]

export default function RichTextInput({ value, onChange, className, placeholder, disabled = false, multiline = true }: Props) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  function applyFormat(marker: string) {
    const input = inputRef.current
    if (!input || disabled) return
    const start = input.selectionStart ?? value.length
    const end = input.selectionEnd ?? start
    const selected = value.slice(start, end)
    const fallback = 'teks'
    const replacement = `${marker}${selected || fallback}${marker}`
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`)
    window.requestAnimationFrame(() => {
      input.focus()
      const selectionStart = start + marker.length
      input.setSelectionRange(selectionStart, selectionStart + (selected || fallback).length)
    })
  }

  const field = multiline
    ? <textarea ref={inputRef as RefObject<HTMLTextAreaElement>} className={className} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    : <input ref={inputRef as RefObject<HTMLInputElement>} className={className} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />

  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <div role="toolbar" aria-label="Format teks" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {formats.map((format) => (
          <button key={format.title} type="button" title={format.title} aria-label={format.title} disabled={disabled} onClick={() => applyFormat(format.marker)} style={{ ...format.style, width: 34, height: 30, border: '1px solid #bfd8ea', borderRadius: 7, background: '#f7fbfe', color: '#153f5d', cursor: disabled ? 'not-allowed' : 'pointer' }}>{format.label}</button>
        ))}
        <small style={{ alignSelf: 'center', color: '#5c7180' }}>Sorot teks, lalu pilih format.</small>
      </div>
      {field}
    </div>
  )
}

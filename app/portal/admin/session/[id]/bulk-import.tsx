'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import admin from '../../admin.module.css'
import styles from './bulk-import.module.css'

type Bundle = {
  blocks: Array<Record<string, unknown>>
  questions: Array<Record<string, unknown>>
}

type ValidationResult = {
  ok?: boolean
  dry_run?: boolean
  blocks?: number
  questions?: number
  block_start_position?: number
  question_start_position?: number
}

type Props = { sessionId: string }

const JSON_TEMPLATE = `{
  "blocks": [
    {
      "kind": "vocabulary",
      "title": "...",
      "body": {
        "term": "...",
        "reading": "...",
        "meaning": "...",
        "part_of_speech": "...",
        "description": "...",
        "examples": [
          {
            "sentence": "...",
            "translation": "...",
            "segments": [
              { "text": "...", "reading": "...", "type": "noun" }
            ]
          }
        ]
      }
    }
  ],
  "questions": [
    {
      "kind": "multiple_choice",
      "prompt": "...",
      "explanation_text": "...",
      "points": 1,
      "options": [
        { "label": "A", "option_text": "...", "is_correct": true },
        { "label": "B", "option_text": "...", "is_correct": false }
      ]
    }
  ]
}`

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')
}

function parseDelimited(input: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    const next = input[i + 1]
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"'
        i += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (!quoted && char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }
    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += char
  }
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function compactObject(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return Boolean(value.trim())
    if (Array.isArray(value)) return value.length > 0
    return true
  }))
}

function splitList(value: string) {
  return value.split(/[|;、]/).map((item) => item.trim()).filter(Boolean)
}

function blockFromRow(row: Record<string, string>) {
  const rawKind = (row.kind || row.type || row.jenis || '').trim().toLowerCase()
  const kind = rawKind === 'kosakata' ? 'vocabulary'
    : rawKind === 'bunpou' || rawKind === 'tata_bahasa' ? 'grammar'
      : rawKind === 'dokkai' ? 'reading'
        : rawKind === 'choukai' ? 'listening'
          : rawKind
  const title = row.title || row.judul || ''

  if (kind === 'vocabulary') {
    const examples = row.example_sentence || row.contoh
      ? [{ sentence: row.example_sentence || row.contoh, translation: row.example_translation || row.arti_contoh || '' }]
      : []
    return compactObject({
      kind,
      title,
      body: compactObject({
        term: row.term || row.word || row.kata || '',
        reading: row.reading || row.furigana || '',
        meaning: row.meaning || row.translation || row.arti || '',
        part_of_speech: row.part_of_speech || row.pos || row.kelas_kata || '',
        description: row.description || row.penjelasan || '',
        examples,
      }),
      audio_url: row.audio_url || '',
      image_url: row.image_url || '',
    })
  }

  if (kind === 'kanji') {
    const examples = row.example_sentence || row.contoh
      ? [{ sentence: row.example_sentence || row.contoh, translation: row.example_translation || row.arti_contoh || '' }]
      : []
    return compactObject({
      kind,
      title,
      body: compactObject({
        kanji: row.kanji || row.character || '',
        meaning: row.meaning || row.translation || row.arti || '',
        onyomi: splitList(row.onyomi || ''),
        kunyomi: splitList(row.kunyomi || ''),
        description: row.description || row.penjelasan || '',
        examples,
      }),
      image_url: row.image_url || '',
    })
  }

  if (kind === 'grammar') {
    return compactObject({
      kind,
      title,
      body: compactObject({
        pattern: row.pattern || row.pola || title,
        target: row.target || '',
        core_meaning: row.core_meaning || row.meaning || row.arti || '',
        explanation: row.explanation || row.penjelasan || '',
        important: row.important || row.penting || '',
      }),
    })
  }

  if (kind === 'reading') {
    return compactObject({
      kind,
      title,
      body: compactObject({
        target: row.target || '',
        preparation: row.preparation || row.persiapan || '',
        passage: row.passage || row.text || row.bacaan || '',
        takeaway: row.takeaway || row.inti || '',
      }),
    })
  }

  if (kind === 'listening') {
    return compactObject({
      kind,
      title,
      body: compactObject({
        target: row.target || '',
        preparation: row.preparation || row.persiapan || '',
        script: row.script || row.transcript || row.skrip || '',
        takeaway: row.takeaway || row.inti || '',
      }),
      audio_url: row.audio_url || '',
    })
  }

  throw new Error(`Jenis materi CSV tidak dikenal: ${rawKind || '(kosong)'}`)
}

function bundleFromCsv(input: string): Bundle {
  const firstLine = input.split(/\r?\n/, 1)[0] || ''
  const delimiter = firstLine.includes('\t') ? '\t' : ','
  const rows = parseDelimited(input, delimiter)
  if (rows.length < 2) throw new Error('CSV/TSV harus memiliki header dan minimal satu baris data.')
  const headers = rows[0].map(normalizeHeader)
  const blocks = rows.slice(1).map((values) => {
    const row: Record<string, string> = {}
    headers.forEach((header, index) => { row[header] = (values[index] || '').trim() })
    return blockFromRow(row)
  })
  return { blocks, questions: [] }
}

function bundleFromJson(input: string): Bundle {
  const parsed = JSON.parse(input) as unknown
  if (Array.isArray(parsed)) return { blocks: parsed as Array<Record<string, unknown>>, questions: [] }
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON harus berupa object atau array blok materi.')
  const record = parsed as Record<string, unknown>
  return {
    blocks: Array.isArray(record.blocks) ? record.blocks as Array<Record<string, unknown>> : [],
    questions: Array.isArray(record.questions) ? record.questions as Array<Record<string, unknown>> : [],
  }
}

function previewName(item: Record<string, unknown>, index: number) {
  const body = item.body && typeof item.body === 'object' && !Array.isArray(item.body) ? item.body as Record<string, unknown> : {}
  const candidate = item.title || body.term || body.kanji || body.pattern || body.passage || item.prompt
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim().slice(0, 70) : `Item ${index + 1}`
}

export default function BulkImport({ sessionId }: Props) {
  const router = useRouter()
  const [source, setSource] = useState('')
  const [format, setFormat] = useState<'auto' | 'json' | 'csv'>('auto')
  const [fileName, setFileName] = useState('')
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [validatedSource, setValidatedSource] = useState('')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => {
    if (!bundle) return []
    return [...bundle.blocks.map((item, index) => ({ kind: String(item.kind || 'materi'), name: previewName(item, index) })),
      ...bundle.questions.map((item, index) => ({ kind: 'soal', name: previewName(item, index) }))].slice(0, 8)
  }, [bundle])

  function resetValidation(nextSource = source) {
    setSource(nextSource)
    setBundle(null)
    setValidation(null)
    setValidatedSource('')
    setMessage('')
  }

  async function loadFile(file: File) {
    const text = await file.text()
    setFileName(file.name)
    if (/\.json$/i.test(file.name)) setFormat('json')
    else if (/\.(csv|tsv)$/i.test(file.name)) setFormat('csv')
    resetValidation(text)
  }

  function parseSource() {
    if (!source.trim()) throw new Error('Tempel data atau pilih file terlebih dahulu.')
    const resolved = format === 'auto'
      ? (fileName.match(/\.(csv|tsv)$/i) || (!source.trimStart().startsWith('{') && !source.trimStart().startsWith('[')) ? 'csv' : 'json')
      : format
    const nextBundle = resolved === 'csv' ? bundleFromCsv(source) : bundleFromJson(source)
    if (nextBundle.blocks.length === 0 && nextBundle.questions.length === 0) throw new Error('Tidak ada data yang dapat diimpor.')
    return nextBundle
  }

  async function validate() {
    setBusy(true)
    setMessage('Memeriksa format dan aturan database...')
    try {
      const nextBundle = parseSource()
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, bundle: nextBundle, dryRun: true }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string; result?: ValidationResult }
      if (!response.ok || !payload.result) throw new Error(payload.error || 'Validasi gagal.')
      setBundle(nextBundle)
      setValidation(payload.result)
      setValidatedSource(source)
      setMessage('Validasi lulus. Tidak ada data yang ditulis saat dry-run.')
    } catch (error) {
      setBundle(null)
      setValidation(null)
      setValidatedSource('')
      setMessage(error instanceof Error ? error.message : 'Validasi gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function commit() {
    if (!bundle || !validation || validatedSource !== source) {
      setMessage('Data berubah setelah validasi. Jalankan Validasi lagi.')
      return
    }
    if (!window.confirm(`Tambahkan ${validation.blocks || 0} materi dan ${validation.questions || 0} soal ke sesi ini? Data lama tidak akan dihapus.`)) return
    setBusy(true)
    setMessage('Mengimpor data secara atomik...')
    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, bundle, dryRun: false }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string; result?: ValidationResult }
      if (!response.ok || !payload.result) throw new Error(payload.error || 'Impor gagal.')
      setMessage(`Berhasil menambahkan ${payload.result.blocks || 0} materi dan ${payload.result.questions || 0} soal.`)
      setSource('')
      setFileName('')
      setBundle(null)
      setValidation(null)
      setValidatedSource('')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impor gagal.')
    } finally {
      setBusy(false)
    }
  }

  const validNow = Boolean(validation && bundle && validatedSource === source)

  return (
    <section className={`${admin.panel} ${styles.importer}`}>
      <div className={styles.head}>
        <div><div className={admin.eyebrow}>BULK IMPORT</div><h2>Masukkan banyak materi / soal sekaligus</h2><p>Import selalu menambahkan data ke urutan terakhir. Data lama tidak ditimpa. Validasi database wajib lulus sebelum commit.</p></div>
        <span className={styles.safeBadge}>Dry-run wajib</span>
      </div>

      <div className={styles.dropGrid}>
        <label className={admin.label}>Data JSON / CSV / TSV
          <textarea className={`${admin.textarea} ${styles.textarea}`} value={source} onChange={(event) => resetValidation(event.target.value)} placeholder="Tempel JSON atau CSV di sini..." />
        </label>
        <div>
          <label className={admin.label}>Format
            <select className={admin.select} value={format} onChange={(event) => { setFormat(event.target.value as 'auto' | 'json' | 'csv'); setValidation(null); setValidatedSource('') }}>
              <option value="auto">Deteksi otomatis</option>
              <option value="json">JSON</option>
              <option value="csv">CSV / TSV</option>
            </select>
          </label>
          <label className={admin.label} style={{ marginTop: 10 }}>Pilih file
            <input className={admin.input} type="file" accept=".json,.csv,.tsv,application/json,text/csv,text/tab-separated-values" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file) }} />
          </label>
          <button className={admin.subtle} type="button" style={{ marginTop: 10 }} onClick={() => { setFormat('json'); setFileName('template.json'); resetValidation(JSON_TEMPLATE) }}>Isi template JSON</button>
          <p className={styles.warning}>CSV/TSV mendukung materi. Untuk soal dengan pilihan jawaban gunakan JSON.</p>
        </div>
      </div>

      <div className={styles.fileRow}>
        <button className={admin.secondary} type="button" disabled={busy || !source.trim()} onClick={validate}>{busy ? 'Memeriksa…' : '1. Validasi dry-run'}</button>
        <button className={admin.primary} type="button" disabled={busy || !validNow} onClick={commit}>2. Import ke sesi</button>
        {fileName && <span className={admin.smallMeta}>{fileName}</span>}
      </div>

      {validation && (
        <div className={`${styles.result} ${styles.good}`}>
          <b>✓ Data siap diimpor</b>
          <div className={styles.resultGrid}>
            <div><b>{validation.blocks || 0}</b><span>materi</span></div>
            <div><b>{validation.questions || 0}</b><span>soal</span></div>
            <div><b>{validation.block_start_position || '—'}</b><span>mulai urutan materi</span></div>
            <div><b>{validation.question_start_position || '—'}</b><span>mulai urutan soal</span></div>
          </div>
          {preview.length > 0 && <div className={styles.previewList}>{preview.map((item, index) => <div key={`${item.kind}-${index}`}><b>{item.kind}</b><span>{item.name}</span></div>)}</div>}
        </div>
      )}

      {message && <div className={admin.message}>{message}</div>}

      <details className={styles.docs}>
        <summary>Format yang didukung</summary>
        <p className={admin.note}>JSON: object dengan array <code>blocks</code> dan/atau <code>questions</code>. Array JSON tunggal dianggap sebagai daftar blok materi.</p>
        <p className={admin.note}>CSV/TSV: kolom pertama sebaiknya <code>kind</code> atau <code>type</code>. Nilai yang didukung: vocabulary/kosakata, kanji, grammar/bunpou, reading/dokkai, listening/choukai.</p>
        <pre>{'kind,term,reading,meaning,part_of_speech,description\nvocabulary,...,...,...,...,...\n\nkind,kanji,meaning,onyomi,kunyomi,description\nkanji,...,...,...,...,...'}</pre>
      </details>
    </section>
  )
}

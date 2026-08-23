'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChevronIcon from '../../../../components/chevron-icon'
import admin from '../../admin.module.css'
import styles from './material-workflow-studio.module.css'

type StructuredKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'
type ReviewStatus = 'saved' | 'needs_revision' | 'approved'
type WorkflowTab = 'new' | ReviewStatus
type RecordValue = Record<string, unknown>

type ContentBlock = {
  id: string
  position: number
  kind: string
  title: string | null
  body: unknown
  audio_url: string | null
  image_url: string | null
  review_status?: ReviewStatus
  review_note?: string | null
  reviewed_at?: string | null
}

type Props = {
  sessionId: string
  levelCode: string
  role: 'content_admin' | 'super_admin'
  kind: StructuredKind
  blocks: ContentBlock[]
}

const meta: Record<StructuredKind, { label: string; jp: string; newLabel: string }> = {
  vocabulary: { label: 'Kosakata', jp: '単語', newLabel: 'Tambah Kosakata' },
  kanji: { label: 'Kanji', jp: '漢字', newLabel: 'Tambah Kanji' },
  grammar: { label: 'Bunpou', jp: '文法', newLabel: 'Tambah Bunpou' },
  reading: { label: 'Dokkai', jp: '読解', newLabel: 'Tambah Dokkai' },
  listening: { label: 'Choukai', jp: '聴解', newLabel: 'Tambah Choukai' },
}

function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
}

function field(body: RecordValue, key: string) {
  return typeof body[key] === 'string' ? body[key] as string : ''
}

function numberField(body: RecordValue, key: string, fallback = 1) {
  const value = body[key]
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback
}

function chapterOf(block: ContentBlock) {
  return numberField(asRecord(block.body), 'chapter_number', 1)
}

function chapterTitleOf(block: ContentBlock) {
  return field(asRecord(block.body), 'chapter_title').trim()
}

function isChapteredKind(kind: StructuredKind) {
  return kind === 'vocabulary' || kind === 'kanji' || kind === 'grammar'
}

function readingList(body: RecordValue, key: 'onyomi' | 'kunyomi') {
  const value = body[key]
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string')
    return items.length ? items : ['']
  }
  if (typeof value === 'string' && value.trim()) {
    const items = value.split(/[、,]/).map((item) => item.trim()).filter(Boolean)
    return items.length ? items : ['']
  }
  return ['']
}

function KanjiReadingGroup({ body, setBody, readingKey, label, placeholder }: {
  body: RecordValue
  setBody: (body: RecordValue) => void
  readingKey: 'onyomi' | 'kunyomi'
  label: string
  placeholder: string
}) {
  const values = readingList(body, readingKey)

  function update(index: number, value: string) {
    const next = [...values]
    next[index] = value
    setBody({ ...body, [readingKey]: next })
  }

  function add() {
    setBody({ ...body, [readingKey]: [...values, ''] })
  }

  function remove(index: number) {
    const next = values.filter((_, itemIndex) => itemIndex !== index)
    setBody({ ...body, [readingKey]: next.length ? next : [''] })
  }

  return (
    <div className={styles.readingGroup}>
      <div className={styles.readingGroupHead}>
        <div>
          <b>{label}</b>
          <small>Tambahkan bacaan lain jika kanji memiliki lebih dari satu {label.toLowerCase()}.</small>
        </div>
        <button className={styles.readingAdd} type="button" onClick={add}>+ Tambah {label}</button>
      </div>
      <div className={styles.readingRows}>
        {values.map((value, index) => (
          <div className={styles.readingRow} key={`${readingKey}-${index}`}>
            <span className={styles.readingIndex}>{index + 1}</span>
            <input
              className={admin.input}
              value={value}
              onChange={(event) => update(index, event.target.value)}
              placeholder={index === 0 ? placeholder : `${label} ${index + 1}`}
            />
            {values.length > 1 && (
              <button className={styles.readingRemove} type="button" onClick={() => remove(index)} aria-label={`Hapus ${label} ${index + 1}`}>Hapus</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function KanjiReadingFields({ body, setBody }: { body: RecordValue; setBody: (body: RecordValue) => void }) {
  return (
    <div className={styles.readingEditorGrid}>
      <KanjiReadingGroup body={body} setBody={setBody} readingKey="onyomi" label="Onyomi" placeholder="Contoh: カ" />
      <KanjiReadingGroup body={body} setBody={setBody} readingKey="kunyomi" label="Kunyomi" placeholder="Contoh: いえ" />
    </div>
  )
}

function exampleRecords(body: RecordValue) {
  const source = Array.isArray(body.examples) ? body.examples : []
  return [0, 1].map((index) => asRecord(source[index]))
}

function TwoExampleFields({ body, setBody }: { body: RecordValue; setBody: (body: RecordValue) => void }) {
  const examples = exampleRecords(body)

  function update(index: number, key: 'example' | 'example_reading' | 'example_translation', value: string) {
    const next = exampleRecords(body)
    next[index] = { ...next[index], [key]: value }
    setBody({ ...body, examples: next })
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className={admin.eyebrow}>2 CONTOH KALIMAT</div>
      <div className={admin.formGrid} style={{ marginTop: 10 }}>
        {examples.map((item, index) => {
          const sentence = field(item, 'example') || field(item, 'sentence') || field(item, 'japanese')
          const reading = field(item, 'example_reading') || field(item, 'reading') || field(item, 'furigana')
          const translation = field(item, 'example_translation') || field(item, 'translation') || field(item, 'indonesian')
          return (
            <div className={admin.full} key={index} style={{ padding: 14, border: '1px solid #b9deef', borderRadius: 0, background: '#fbfdfe' }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Contoh {index + 1}</div>
              <div className={admin.formGrid}>
                <label className={`${admin.label} ${admin.full}`}>Kalimat Jepang
                  <input className={admin.input} value={sentence} onChange={(e) => update(index, 'example', e.target.value)} placeholder={index === 0 ? '例：先生に会ったら、きちんと挨拶しましょう。' : '例：毎朝、会社の人に挨拶します。'} />
                </label>
                <label className={`${admin.label} ${admin.full}`}>Furigana / cara baca
                  <input className={admin.input} value={reading} onChange={(e) => update(index, 'example_reading', e.target.value)} placeholder={index === 0 ? 'せんせいにあったら、きちんとあいさつしましょう。' : 'まいあさ、かいしゃのひとにあいさつします。'} />
                </label>
                <label className={`${admin.label} ${admin.full}`}>Arti Indonesia
                  <input className={admin.input} value={translation} onChange={(e) => update(index, 'example_translation', e.target.value)} placeholder={index === 0 ? 'Kalau bertemu guru, mari menyapa dengan baik.' : 'Setiap pagi, saya menyapa orang-orang di kantor.'} />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

async function callAdmin(payload: Record<string, unknown>) {
  const response = await fetch('/api/admin/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok || data.error) throw new Error(data.error || 'Perubahan gagal disimpan.')
}

async function uploadAsset(sessionId: string, file: File) {
  const form = new FormData()
  form.append('sessionId', sessionId)
  form.append('file', file)
  const response = await fetch('/api/admin/assets', { method: 'POST', body: form })
  const data = await response.json().catch(() => ({})) as { asset?: string; error?: string }
  if (!response.ok || !data.asset) throw new Error(data.error || 'Upload aset gagal.')
  return data.asset
}

function ChapterFields({ kind, body, setBody, position, setPosition }: {
  kind: 'vocabulary' | 'kanji' | 'grammar'
  body: RecordValue
  setBody: (body: RecordValue) => void
  position: string
  setPosition: (value: string) => void
}) {
  const label = kind === 'vocabulary' ? 'kosakata' : kind === 'kanji' ? 'kanji' : 'bunpou'
  return (
    <div className={styles.chapterInput}>
      <div>
        <div className={admin.eyebrow}>PENGELOMPOKAN MATERI</div>
        <b>Masukkan {label} ini ke bab berapa?</b>
        <small>Tentukan nomor bab, nama bab, dan nomor materi. Semua {label} dengan nomor bab yang sama akan tampil sebagai satu kelompok.</small>
      </div>
      <div className={styles.chapterControls}>
        <label className={admin.label}>Bab
          <input className={admin.input} type="number" min={1} value={numberField(body, 'chapter_number', 1)} onChange={(e) => setBody({ ...body, chapter_number: Math.max(1, Number(e.target.value) || 1) })} />
        </label>
        <label className={admin.label}>Nama bab
          <input className={admin.input} value={field(body, 'chapter_title')} onChange={(e) => setBody({ ...body, chapter_title: e.target.value })} placeholder="Contoh: Dasar Partikel" />
        </label>
        <label className={admin.label}>Nomor materi
          <input className={admin.input} type="number" min={1} value={position} onChange={(e) => setPosition(e.target.value)} />
        </label>
      </div>
    </div>
  )
}

function SequenceFields({ kind, position, setPosition }: {
  kind: 'reading' | 'listening'
  position: string
  setPosition: (value: string) => void
}) {
  const label = kind === 'reading' ? 'Dokkai' : 'Choukai'
  return (
    <div className={styles.chapterInput}>
      <div>
        <div className={admin.eyebrow}>URUTAN MATERI</div>
        <b>Nomor {label}</b>
        <small>Tentukan nomor materi agar siswa mudah melihat urutan dan progres belajarnya.</small>
      </div>
      <div className={styles.chapterControls}>
        <label className={admin.label}>Nomor materi
          <input className={admin.input} type="number" min={1} value={position} onChange={(e) => setPosition(e.target.value)} />
        </label>
      </div>
    </div>
  )
}

function CoreFields({ kind, body, setBody, position, setPosition }: { kind: StructuredKind; body: RecordValue; setBody: (body: RecordValue) => void; position: string; setPosition: (value: string) => void }) {
  const set = (key: string, value: unknown) => setBody({ ...body, [key]: value })

  if (kind === 'vocabulary') return <>
    <ChapterFields kind="vocabulary" body={body} setBody={setBody} position={position} setPosition={setPosition} />
    <div className={admin.formGrid}>
      <label className={admin.label}>Kosakata<input className={admin.input} value={field(body, 'term')} onChange={(e) => set('term', e.target.value)} placeholder="予定" /></label>
      <label className={admin.label}>Furigana<input className={admin.input} value={field(body, 'reading')} onChange={(e) => set('reading', e.target.value)} placeholder="よてい" /></label>
      <label className={`${admin.label} ${admin.full}`}>Arti Indonesia<input className={admin.input} value={field(body, 'meaning')} onChange={(e) => set('meaning', e.target.value)} placeholder="rencana / jadwal" /></label>
      <label className={`${admin.label} ${admin.full}`}>Penjelasan<textarea className={admin.textarea} value={field(body, 'description')} onChange={(e) => set('description', e.target.value)} /></label>
    </div>
    <TwoExampleFields body={body} setBody={setBody} />
  </>

  if (kind === 'kanji') return <>
    <ChapterFields kind="kanji" body={body} setBody={setBody} position={position} setPosition={setPosition} />
    <div className={admin.formGrid}>
      <label className={admin.label}>Kanji<input className={admin.input} value={field(body, 'kanji')} onChange={(e) => set('kanji', e.target.value)} placeholder="家" /></label>
      <label className={admin.label}>Arti<input className={admin.input} value={field(body, 'meaning')} onChange={(e) => set('meaning', e.target.value)} placeholder="rumah, keluarga" /></label>
      <div className={admin.full}><KanjiReadingFields body={body} setBody={setBody} /></div>
      <label className={`${admin.label} ${admin.full}`}>Catatan pemakaian<textarea className={admin.textarea} value={field(body, 'description')} onChange={(e) => set('description', e.target.value)} /></label>
    </div>
    <TwoExampleFields body={body} setBody={setBody} />
  </>

  if (kind === 'grammar') return <>
    <ChapterFields kind="grammar" body={body} setBody={setBody} position={position} setPosition={setPosition} />
    <div className={admin.formGrid}>
      <label className={`${admin.label} ${admin.full}`}>Pola Bunpou<input className={admin.input} value={field(body, 'pattern')} onChange={(e) => set('pattern', e.target.value)} placeholder="〜なさい" /></label>
      <label className={`${admin.label} ${admin.full}`}>Makna<input className={admin.input} value={field(body, 'core_meaning')} onChange={(e) => set('core_meaning', e.target.value)} /></label>
      <label className={`${admin.label} ${admin.full}`}>Penjelasan<textarea className={admin.textarea} value={field(body, 'explanation')} onChange={(e) => set('explanation', e.target.value)} /></label>
      <label className={admin.label}>Target belajar<input className={admin.input} value={field(body, 'target')} onChange={(e) => set('target', e.target.value)} /></label>
      <label className={admin.label}>Catatan penting<input className={admin.input} value={field(body, 'important')} onChange={(e) => set('important', e.target.value)} /></label>
    </div>
    <TwoExampleFields body={body} setBody={setBody} />
  </>

  if (kind === 'reading') return <div className={admin.formGrid}>
    <label className={`${admin.label} ${admin.full}`}>Bacaan<textarea className={`${admin.textarea} ${styles.longText}`} value={field(body, 'passage')} onChange={(e) => set('passage', e.target.value)} /></label>
    <label className={`${admin.label} ${admin.full}`}>Target belajar<input className={admin.input} value={field(body, 'target')} onChange={(e) => set('target', e.target.value)} /></label>
    <label className={`${admin.label} ${admin.full}`}>Persiapan membaca<textarea className={admin.textarea} value={field(body, 'preparation')} onChange={(e) => set('preparation', e.target.value)} /></label>
    <label className={`${admin.label} ${admin.full}`}>Inti pemahaman<textarea className={admin.textarea} value={field(body, 'takeaway')} onChange={(e) => set('takeaway', e.target.value)} /></label>
  </div>

  return <div className={admin.formGrid}>
    <label className={`${admin.label} ${admin.full}`}>Skrip audio<textarea className={`${admin.textarea} ${styles.longText}`} value={field(body, 'script')} onChange={(e) => set('script', e.target.value)} /></label>
    <label className={`${admin.label} ${admin.full}`}>Target belajar<input className={admin.input} value={field(body, 'target')} onChange={(e) => set('target', e.target.value)} /></label>
    <label className={`${admin.label} ${admin.full}`}>Persiapan mendengar<textarea className={admin.textarea} value={field(body, 'preparation')} onChange={(e) => set('preparation', e.target.value)} /></label>
    <label className={`${admin.label} ${admin.full}`}>Inti pemahaman<textarea className={admin.textarea} value={field(body, 'takeaway')} onChange={(e) => set('takeaway', e.target.value)} /></label>
  </div>
}

function MaterialEditor({ sessionId, kind, block, defaultPosition, role }: { sessionId: string; kind: StructuredKind; block?: ContentBlock; defaultPosition: number; role: Props['role'] }) {
  const router = useRouter()
  const [position, setPosition] = useState(String(block?.position || defaultPosition))
  const [title, setTitle] = useState(block?.title || '')
  const [body, setBody] = useState<RecordValue>(() => asRecord(block?.body))
  const [audioUrl, setAudioUrl] = useState(block?.audio_url || '')
  const [imageUrl, setImageUrl] = useState(block?.image_url || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const info = meta[kind]
  const manualTitle = kind === 'reading' || kind === 'listening'
  const chaptered = isChapteredKind(kind)

  const automaticTitle = kind === 'vocabulary' ? field(body, 'term') : kind === 'kanji' ? field(body, 'kanji') : kind === 'grammar' ? field(body, 'pattern') : ''

  async function save() {
    const finalTitle = (title || automaticTitle).trim()
    if (!finalTitle) {
      setMessage(manualTitle ? 'Isi judul materi terlebih dahulu.' : `Isi ${info.label.toLowerCase()} terlebih dahulu.`)
      return
    }
    const parsedPosition = Number(position)
    if (!Number.isInteger(parsedPosition) || parsedPosition < 1) {
      setMessage('Nomor materi harus diisi dengan angka 1 atau lebih.')
      return
    }
    setBusy(true)
    setMessage('Menyimpan...')
    try {
      await callAdmin({ action: 'upsert_block', sessionId, blockId: block?.id || null, position: parsedPosition, kind, title: finalTitle, contentBody: body, audioUrl, imageUrl })
      setMessage(block ? 'Perubahan tersimpan. Status kembali ke Materi tersimpan untuk pengecekan ulang.' : `${info.label} berhasil ditambahkan.`)
      router.refresh()
      if (!block) {
        const currentChapter = numberField(body, 'chapter_number', 1)
        const currentChapterTitle = field(body, 'chapter_title')
        setTitle('')
        setBody(chaptered ? { chapter_number: currentChapter, chapter_title: currentChapterTitle } : {})
        setAudioUrl('')
        setImageUrl('')
        setPosition(String(parsedPosition + 1))
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan materi.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!block || !window.confirm(`Hapus materi “${block.title || info.label}”?`)) return
    setBusy(true)
    try {
      await callAdmin({ action: 'delete_block', sessionId, blockId: block.id })
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menghapus materi.')
    } finally {
      setBusy(false)
    }
  }

  async function setReviewStatus(status: ReviewStatus) {
    if (!block) return
    let note = ''
    if (status === 'needs_revision') {
      note = window.prompt('Tuliskan bagian yang perlu direvisi:')?.trim() || ''
      if (!note) return
    }
    setBusy(true)
    try {
      await callAdmin({ action: 'set_block_review_status', sessionId, blockId: block.id, status, note })
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Status materi gagal diubah.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpload(file: File, target: 'audio' | 'image') {
    setBusy(true)
    setMessage('Mengunggah aset...')
    try {
      const path = await uploadAsset(sessionId, file)
      if (target === 'audio') setAudioUrl(path); else setImageUrl(path)
      setMessage('Upload selesai. Klik Simpan untuk menyimpan perubahan.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload gagal.')
    } finally {
      setBusy(false)
    }
  }

  const status = block?.review_status || 'saved'
  const statusLabel = status === 'needs_revision' ? 'Perlu direvisi' : status === 'approved' ? 'Disetujui' : 'Tersimpan'
  const chapterTitle = field(body, 'chapter_title').trim()
  const chapterLabel = chaptered ? `Bab ${numberField(body, 'chapter_number', 1)}${chapterTitle ? ` · ${chapterTitle}` : ''} · ` : ''

  return <details className={styles.itemCard} open={!block}>
    <summary>
      <div className={styles.itemTitle}><span className={`${styles.statusDot} ${styles[status]}`} /><div><b>{block?.title || info.newLabel}</b><small>{block ? `${chapterLabel}${statusLabel}` : 'Penambahan materi baru'}</small></div></div>
      <span className={styles.chevron}><ChevronIcon /></span>
    </summary>
    <div className={styles.itemBody}>
      {block?.review_note && <div className={styles.revisionNote}><b>Catatan revisi</b><span>{block.review_note}</span></div>}
      {manualTitle && <SequenceFields kind={kind as 'reading' | 'listening'} position={position} setPosition={setPosition} />}
      {manualTitle && <label className={`${admin.label} ${admin.full}`}>Judul materi<input className={admin.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'reading' ? 'Contoh: Jadwal kereta' : 'Contoh: Percakapan di tempat kerja'} /></label>}
      <CoreFields kind={kind} body={body} setBody={setBody} position={position} setPosition={setPosition} />

      <details className={styles.extra}>
        <summary>Media & pengaturan</summary>
        <div className={admin.formGrid}>
          {!manualTitle && <label className={admin.label}>Judul tampilan (opsional)<input className={admin.input} value={title} onChange={(e) => setTitle(e.target.value)} /></label>}
          <label className={admin.label}>Gambar<input className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, 'image') }} /></label>
          <label className={admin.label}>Audio<input className={styles.fileInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, 'audio') }} /></label>
          <label className={`${admin.label} ${admin.full}`}>URL/path gambar<input className={admin.input} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></label>
          <label className={`${admin.label} ${admin.full}`}>URL/path audio<input className={admin.input} value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} /></label>
        </div>
      </details>

      <div className={styles.actions}>
        <button className={admin.primary} type="button" disabled={busy} onClick={save}>{busy ? 'Memproses…' : block ? 'Simpan perubahan' : `Simpan ${info.label}`}</button>
        {block && role === 'super_admin' && status !== 'needs_revision' && <button className={styles.reviewButton} type="button" disabled={busy} onClick={() => void setReviewStatus('needs_revision')}>Perlu revisi</button>}
        {block && role === 'super_admin' && status !== 'approved' && <button className={styles.approveButton} type="button" disabled={busy} onClick={() => void setReviewStatus('approved')}>Setujui</button>}
        {block && role === 'super_admin' && status === 'approved' && <button className={styles.reviewButton} type="button" disabled={busy} onClick={() => void setReviewStatus('saved')}>Batalkan persetujuan</button>}
        {block && <button className={admin.danger} type="button" disabled={busy} onClick={remove}>Hapus</button>}
      </div>
      {message && <div className={admin.message}>{message}</div>}
    </div>
  </details>
}

export default function MaterialWorkflowStudio({ sessionId, levelCode, role, kind, blocks }: Props) {
  const info = meta[kind]
  const relevant = useMemo(() => blocks.filter((block) => block.kind === kind), [blocks, kind])
  const groups = {
    saved: relevant.filter((block) => (block.review_status || 'saved') === 'saved'),
    needs_revision: relevant.filter((block) => block.review_status === 'needs_revision'),
    approved: relevant.filter((block) => block.review_status === 'approved'),
  }
  const [tab, setTab] = useState<WorkflowTab>(relevant.length ? 'saved' : 'new')
  const nextPosition = blocks.reduce((max, block) => Math.max(max, block.position), 0) + 1
  const visible = tab === 'new' ? [] : groups[tab]
  const tabs: Array<{ key: WorkflowTab; label: string; count?: number }> = [
    { key: 'new', label: 'Penambahan materi' },
    { key: 'saved', label: 'Materi tersimpan', count: groups.saved.length },
    { key: 'needs_revision', label: 'Perlu direvisi', count: groups.needs_revision.length },
    { key: 'approved', label: 'Sudah disetujui', count: groups.approved.length },
  ]

  const chapterGroups = useMemo(() => {
    if (!isChapteredKind(kind)) return [] as Array<[number, ContentBlock[]]>
    const map = new Map<number, ContentBlock[]>()
    visible.forEach((block) => {
      const chapter = chapterOf(block)
      const current = map.get(chapter) || []
      current.push(block)
      map.set(chapter, current)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([chapter, chapterBlocks]) => [chapter, chapterBlocks.sort((a, b) => a.position - b.position)] as [number, ContentBlock[]])
  }, [kind, visible])

  const chapterItemLabel = kind === 'vocabulary' ? 'kosakata' : kind === 'kanji' ? 'kanji' : 'bunpou'

  return <section className={`${admin.panel} ${styles.workspace}`}>
    <div className={styles.head}>
      <div><div className={admin.eyebrow}>{info.jp} · {levelCode}</div><h2>{info.label} {levelCode}</h2><p>Kelola satu jenis materi saja. Materi dipisahkan berdasarkan status kerja agar proses review dan persetujuan akhir tidak bercampur.</p></div>
      <div className={styles.total}><b>{relevant.length}</b><span>total {info.label.toLowerCase()}</span></div>
    </div>

    <div className={styles.workflowTabs} role="tablist" aria-label={`Status ${info.label}`}>
      {tabs.map((item) => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? styles.active : ''} onClick={() => setTab(item.key)}><span>{item.label}</span>{typeof item.count === 'number' && <b>{item.count}</b>}</button>)}
    </div>

    <div className={styles.sectionHead}>
      <div><small>{tabs.find((item) => item.key === tab)?.label.toUpperCase()}</small><h3>{tab === 'new' ? info.newLabel : `${visible.length} ${info.label.toLowerCase()}`}</h3></div>
      {tab !== 'new' && <button className={styles.addShortcut} type="button" onClick={() => setTab('new')}>+ {info.newLabel}</button>}
    </div>

    {tab === 'new' ? (
      <MaterialEditor sessionId={sessionId} kind={kind} defaultPosition={nextPosition} role={role} />
    ) : visible.length ? (
      isChapteredKind(kind) ? (
        <div className={styles.chapterList}>
          {chapterGroups.map(([chapter, chapterBlocks]) => {
            const chapterTitle = chapterBlocks.map(chapterTitleOf).find(Boolean) || ''
            return (
              <details className={styles.chapterGroup} key={chapter}>
                <summary>
                  <div><small>BAB {String(chapter).padStart(2, '0')}</small><b>Bab {chapter}{chapterTitle ? ` · ${chapterTitle}` : ''}</b></div>
                  <span>{chapterBlocks.length} {chapterItemLabel}</span>
                  <i><ChevronIcon /></i>
                </summary>
                <div className={styles.chapterBody}>
                  {chapterBlocks.map((block) => <MaterialEditor key={block.id} sessionId={sessionId} kind={kind} block={block} defaultPosition={block.position} role={role} />)}
                </div>
              </details>
            )
          })}
        </div>
      ) : (
        <div className={styles.list}>{visible.map((block) => <MaterialEditor key={block.id} sessionId={sessionId} kind={kind} block={block} defaultPosition={block.position} role={role} />)}</div>
      )
    ) : (
      <div className={styles.empty}>Belum ada materi pada kelompok ini.</div>
    )}
  </section>
}

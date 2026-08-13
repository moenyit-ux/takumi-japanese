'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import admin from '../../admin.module.css'
import styles from './structured-material-studio.module.css'

type ContentBlock = {
  id: string
  position: number
  kind: string
  title: string | null
  body: unknown
  audio_url: string | null
  image_url: string | null
}

type Props = { sessionId: string; blocks: ContentBlock[] }
type StructuredKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'
type RecordValue = Record<string, unknown>
type Example = { example: string; example_translation: string; segments?: unknown }
type HelperWord = { term: string; meaning: string }
type GrammarGroup = { label: string; from: string; to: string }

const structuredKinds = [
  ['vocabulary', 'Kosakata'],
  ['kanji', 'Kanji'],
  ['grammar', 'Bunpou'],
  ['reading', 'Dokkai'],
  ['listening', 'Choukai'],
] as const

const kindLabel: Record<string, string> = Object.fromEntries(structuredKinds)

function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
}

function stringField(body: RecordValue, key: string) {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

function stringsField(body: RecordValue, key: string) {
  const value = body[key]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') return value.split(/[、,;\n]/).map((item) => item.trim()).filter(Boolean)
  return []
}

function normalizeExamples(body: RecordValue): Example[] {
  const source = Array.isArray(body.examples) ? body.examples : []
  return source.map((raw) => {
    const item = asRecord(raw)
    return {
      example: stringField(item, 'example') || stringField(item, 'sentence') || stringField(item, 'japanese'),
      example_translation: stringField(item, 'example_translation') || stringField(item, 'translation') || stringField(item, 'indonesian'),
      segments: item.segments,
    }
  })
}

function normalizeHelpers(body: RecordValue): HelperWord[] {
  const source = Array.isArray(body.helper_vocabulary) ? body.helper_vocabulary : []
  return source.map((raw) => {
    const item = asRecord(raw)
    return {
      term: stringField(item, 'term') || stringField(item, 'word'),
      meaning: stringField(item, 'meaning') || stringField(item, 'translation'),
    }
  })
}

function normalizeGroups(body: RecordValue): GrammarGroup[] {
  const source = Array.isArray(body.groups) ? body.groups : []
  return source.map((raw) => {
    const item = asRecord(raw)
    return {
      label: stringField(item, 'label') || stringField(item, 'group'),
      from: stringField(item, 'from') || stringField(item, 'base'),
      to: stringField(item, 'to') || stringField(item, 'result'),
    }
  })
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

function SimpleExamples({ value, onChange }: { value: Example[]; onChange: (value: Example[]) => void }) {
  return (
    <details className={styles.segmentDetails} open={value.length > 0}>
      <summary>Contoh kalimat (opsional)</summary>
      <div className={styles.collection} style={{ marginTop: 10 }}>
        {value.length === 0 && <div className={styles.emptyMini}>Belum ada contoh kalimat.</div>}
        {value.map((item, index) => (
          <div className={styles.nestedCard} key={index}>
            <div className={styles.rowHead}>
              <b>Contoh {index + 1}</b>
              <button className={admin.danger} type="button" onClick={() => onChange(value.filter((_, i) => i !== index))}>Hapus</button>
            </div>
            <div className={admin.formGrid}>
              <label className={`${admin.label} ${admin.full}`}>Kalimat Jepang
                <textarea className={admin.textarea} value={item.example} onChange={(e) => onChange(value.map((row, i) => i === index ? { ...row, example: e.target.value } : row))} placeholder="例：友達と東京へ行く予定です。" />
              </label>
              <label className={`${admin.label} ${admin.full}`}>Arti Indonesia
                <input className={admin.input} value={item.example_translation} onChange={(e) => onChange(value.map((row, i) => i === index ? { ...row, example_translation: e.target.value } : row))} placeholder="Saya berencana pergi ke Tokyo bersama teman." />
              </label>
            </div>
          </div>
        ))}
        <button className={admin.subtle} type="button" onClick={() => onChange([...value, { example: '', example_translation: '' }])}>+ Tambah contoh</button>
      </div>
    </details>
  )
}

function HelperWords({ value, onChange }: { value: HelperWord[]; onChange: (value: HelperWord[]) => void }) {
  return (
    <div className={styles.collection}>
      <div className={styles.collectionHead}>
        <div><b>Kosakata bantu</b><small>Tambahkan hanya bila diperlukan.</small></div>
        <button className={admin.subtle} type="button" onClick={() => onChange([...value, { term: '', meaning: '' }])}>+ Kosakata</button>
      </div>
      {value.length === 0 && <div className={styles.emptyMini}>Belum ada kosakata bantu.</div>}
      {value.map((item, index) => (
        <div className={styles.helperRow} key={index}>
          <input className={admin.input} value={item.term} onChange={(e) => onChange(value.map((row, i) => i === index ? { ...row, term: e.target.value } : row))} placeholder="点検" />
          <input className={admin.input} value={item.meaning} onChange={(e) => onChange(value.map((row, i) => i === index ? { ...row, meaning: e.target.value } : row))} placeholder="pemeriksaan" />
          <button className={admin.danger} type="button" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
    </div>
  )
}

function SimpleFields({ kind, body, setBody }: { kind: StructuredKind; body: RecordValue; setBody: (value: RecordValue) => void }) {
  const set = (key: string, value: unknown) => setBody({ ...body, [key]: value })
  const examples = normalizeExamples(body)

  if (kind === 'vocabulary') return <>
    <div className={admin.formGrid}>
      <label className={admin.label}>Kosakata<input className={admin.input} value={stringField(body, 'term')} onChange={(e) => set('term', e.target.value)} placeholder="予定" /></label>
      <label className={admin.label}>Furigana<input className={admin.input} value={stringField(body, 'reading')} onChange={(e) => set('reading', e.target.value)} placeholder="よてい" /></label>
      <label className={`${admin.label} ${admin.full}`}>Arti Indonesia<input className={admin.input} value={stringField(body, 'meaning')} onChange={(e) => set('meaning', e.target.value)} placeholder="rencana / jadwal" /></label>
      <label className={`${admin.label} ${admin.full}`}>Penjelasan singkat<textarea className={admin.textarea} value={stringField(body, 'description')} onChange={(e) => set('description', e.target.value)} placeholder="Kapan dan bagaimana kosakata ini digunakan." /></label>
    </div>
    <SimpleExamples value={examples} onChange={(value) => set('examples', value)} />
    <details className={styles.segmentDetails}>
      <summary>Tambahan (opsional)</summary>
      <div className={admin.formGrid} style={{ marginTop: 10 }}>
        <label className={`${admin.label} ${admin.full}`}>Kelas kata<input className={admin.input} value={stringField(body, 'part_of_speech')} onChange={(e) => set('part_of_speech', e.target.value)} placeholder="名詞 · Kata Benda" /></label>
      </div>
    </details>
  </>

  if (kind === 'kanji') return <>
    <div className={admin.formGrid}>
      <label className={admin.label}>Kanji<input className={admin.input} value={stringField(body, 'kanji')} onChange={(e) => set('kanji', e.target.value)} placeholder="家" /></label>
      <label className={admin.label}>Arti<input className={admin.input} value={stringField(body, 'meaning')} onChange={(e) => set('meaning', e.target.value)} placeholder="rumah, keluarga" /></label>
      <label className={admin.label}>Onyomi<input className={admin.input} value={stringsField(body, 'onyomi').join('、')} onChange={(e) => set('onyomi', e.target.value.split(/[、,]/).map((v) => v.trim()).filter(Boolean))} placeholder="カ、ケ" /></label>
      <label className={admin.label}>Kunyomi<input className={admin.input} value={stringsField(body, 'kunyomi').join('、')} onChange={(e) => set('kunyomi', e.target.value.split(/[、,]/).map((v) => v.trim()).filter(Boolean))} placeholder="いえ、や" /></label>
    </div>
    <SimpleExamples value={examples} onChange={(value) => set('examples', value)} />
    <details className={styles.segmentDetails}>
      <summary>Tambahan (opsional)</summary>
      <div className={admin.formGrid} style={{ marginTop: 10 }}>
        <label className={`${admin.label} ${admin.full}`}>Catatan pemakaian<textarea className={admin.textarea} value={stringField(body, 'description')} onChange={(e) => set('description', e.target.value)} /></label>
      </div>
    </details>
  </>

  if (kind === 'grammar') return <>
    <div className={admin.formGrid}>
      <label className={`${admin.label} ${admin.full}`}>Pola Bunpou<input className={admin.input} value={stringField(body, 'pattern')} onChange={(e) => set('pattern', e.target.value)} placeholder="Kata Kerja ます tanpa ます ＋ なさい" /></label>
      <label className={`${admin.label} ${admin.full}`}>Makna<input className={admin.input} value={stringField(body, 'core_meaning')} onChange={(e) => set('core_meaning', e.target.value)} placeholder="...lah / lakukanlah..." /></label>
      <label className={`${admin.label} ${admin.full}`}>Penjelasan<textarea className={admin.textarea} value={stringField(body, 'explanation')} onChange={(e) => set('explanation', e.target.value)} placeholder="Jelaskan pola dengan singkat dan mudah dipahami." /></label>
    </div>
    <SimpleExamples value={examples} onChange={(value) => set('examples', value)} />
    <details className={styles.segmentDetails}>
      <summary>Tambahan (opsional)</summary>
      <div className={admin.formGrid} style={{ marginTop: 10 }}>
        <label className={`${admin.label} ${admin.full}`}>Target belajar<input className={admin.input} value={stringField(body, 'target')} onChange={(e) => set('target', e.target.value)} /></label>
        <label className={`${admin.label} ${admin.full}`}>Catatan penting<textarea className={admin.textarea} value={stringField(body, 'important')} onChange={(e) => set('important', e.target.value)} /></label>
      </div>
      <div className={styles.collection} style={{ marginTop: 10 }}>
        <div className={styles.collectionHead}><div><b>Perubahan bentuk</b><small>Isi hanya jika pola memerlukannya.</small></div><button className={admin.subtle} type="button" onClick={() => set('groups', [...normalizeGroups(body), { label: '', from: '', to: '' }])}>+ Grup</button></div>
        {normalizeGroups(body).map((item, index) => (
          <div className={styles.groupRow} key={index}>
            <input className={admin.input} value={item.label} onChange={(e) => set('groups', normalizeGroups(body).map((row, i) => i === index ? { ...row, label: e.target.value } : row))} placeholder="Grup 1" />
            <input className={admin.input} value={item.from} onChange={(e) => set('groups', normalizeGroups(body).map((row, i) => i === index ? { ...row, from: e.target.value } : row))} placeholder="読みます" />
            <input className={admin.input} value={item.to} onChange={(e) => set('groups', normalizeGroups(body).map((row, i) => i === index ? { ...row, to: e.target.value } : row))} placeholder="読みなさい" />
            <button className={admin.danger} type="button" onClick={() => set('groups', normalizeGroups(body).filter((_, i) => i !== index))}>×</button>
          </div>
        ))}
      </div>
    </details>
  </>

  if (kind === 'reading') return <>
    <div className={admin.formGrid}>
      <label className={`${admin.label} ${admin.full}`}>Bacaan<textarea className={`${admin.textarea} ${styles.longText}`} value={stringField(body, 'passage')} onChange={(e) => set('passage', e.target.value)} placeholder="Masukkan teks 読解 yang sudah direview." /></label>
    </div>
    <details className={styles.segmentDetails}>
      <summary>Tambahan (opsional)</summary>
      <div className={admin.formGrid} style={{ marginTop: 10 }}>
        <label className={`${admin.label} ${admin.full}`}>Target belajar<input className={admin.input} value={stringField(body, 'target')} onChange={(e) => set('target', e.target.value)} /></label>
        <label className={`${admin.label} ${admin.full}`}>Persiapan membaca<textarea className={admin.textarea} value={stringField(body, 'preparation')} onChange={(e) => set('preparation', e.target.value)} /></label>
        <label className={`${admin.label} ${admin.full}`}>Inti pemahaman<textarea className={admin.textarea} value={stringField(body, 'takeaway')} onChange={(e) => set('takeaway', e.target.value)} /></label>
      </div>
      <div style={{ marginTop: 10 }}><HelperWords value={normalizeHelpers(body)} onChange={(value) => set('helper_vocabulary', value)} /></div>
    </details>
  </>

  return <>
    <div className={admin.formGrid}>
      <label className={`${admin.label} ${admin.full}`}>Skrip audio<textarea className={`${admin.textarea} ${styles.longText}`} value={stringField(body, 'script')} onChange={(e) => set('script', e.target.value)} placeholder="Masukkan skrip 聴解 yang sudah direview." /></label>
    </div>
    <details className={styles.segmentDetails}>
      <summary>Tambahan (opsional)</summary>
      <div className={admin.formGrid} style={{ marginTop: 10 }}>
        <label className={`${admin.label} ${admin.full}`}>Target belajar<input className={admin.input} value={stringField(body, 'target')} onChange={(e) => set('target', e.target.value)} /></label>
        <label className={`${admin.label} ${admin.full}`}>Persiapan mendengar<textarea className={admin.textarea} value={stringField(body, 'preparation')} onChange={(e) => set('preparation', e.target.value)} /></label>
        <label className={`${admin.label} ${admin.full}`}>Inti pemahaman<textarea className={admin.textarea} value={stringField(body, 'takeaway')} onChange={(e) => set('takeaway', e.target.value)} /></label>
      </div>
      <div style={{ marginTop: 10 }}><HelperWords value={normalizeHelpers(body)} onChange={(value) => set('helper_vocabulary', value)} /></div>
    </details>
  </>
}

function MaterialCard({ sessionId, block, defaultPosition, initialKind }: { sessionId: string; block?: ContentBlock; defaultPosition: number; initialKind: StructuredKind }) {
  const router = useRouter()
  const initialBody = useMemo(() => asRecord(block?.body), [block?.body])
  const kind: StructuredKind = block?.kind && kindLabel[block.kind] ? block.kind as StructuredKind : initialKind
  const [position, setPosition] = useState(block?.position || defaultPosition)
  const [title, setTitle] = useState(block?.title || '')
  const [body, setBody] = useState<RecordValue>(initialBody)
  const [audioUrl, setAudioUrl] = useState(block?.audio_url || '')
  const [imageUrl, setImageUrl] = useState(block?.image_url || '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const autoTitle = kind === 'vocabulary' ? stringField(body, 'term') : kind === 'kanji' ? stringField(body, 'kanji') : kind === 'grammar' ? stringField(body, 'pattern') : ''
  const needsManualTitle = kind === 'reading' || kind === 'listening'

  async function handleUpload(file: File, target: 'audio' | 'image') {
    setBusy(true)
    setMessage(`Mengunggah ${target === 'audio' ? 'audio' : 'gambar'}...`)
    try {
      const path = await uploadAsset(sessionId, file)
      if (target === 'audio') setAudioUrl(path); else setImageUrl(path)
      setMessage('Upload selesai. Klik Simpan materi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    const finalTitle = (needsManualTitle ? title : (title || autoTitle)).trim()
    if (!finalTitle) {
      setMessage(needsManualTitle ? 'Isi judul materi terlebih dahulu.' : kind === 'kanji' ? 'Isi kanji terlebih dahulu.' : kind === 'vocabulary' ? 'Isi kosakata terlebih dahulu.' : 'Isi pola Bunpou terlebih dahulu.')
      return
    }
    setBusy(true)
    setMessage('Menyimpan materi...')
    try {
      await callAdmin({ action: 'upsert_block', sessionId, blockId: block?.id || null, position, kind, title: finalTitle, contentBody: body, audioUrl, imageUrl })
      setMessage(block ? 'Materi diperbarui.' : `${kindLabel[kind]} berhasil ditambahkan.`)
      router.refresh()
      if (!block) {
        setTitle('')
        setBody({})
        setAudioUrl('')
        setImageUrl('')
        setPosition((value) => value + 1)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan materi.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!block || !window.confirm(`Hapus materi “${block.title || kindLabel[kind]}”?`)) return
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

  return (
    <details className={styles.materialCard} open={!block}>
      <summary>
        <span className={styles.kindBadge}>{kindLabel[kind]}</span>
        <div><b>{block?.title || title || autoTitle || `Tambah ${kindLabel[kind]}`}</b><small>{block ? 'Klik untuk edit' : 'Form baru'}</small></div>
        <span className={styles.chevron}>⌄</span>
      </summary>
      <div className={styles.cardBody}>
        {needsManualTitle && <label className={`${admin.label} ${admin.full}`}>Judul materi<input className={admin.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'reading' ? 'Contoh: Jadwal kereta' : 'Contoh: Percakapan di tempat kerja'} /></label>}

        <SimpleFields kind={kind} body={body} setBody={setBody} />

        {kind === 'listening' && <div className={styles.mediaBox}>
          <div className={styles.collectionHead}><div><b>Audio Choukai</b><small>Upload file audio untuk materi ini.</small></div></div>
          <input className={styles.fileInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, 'audio') }} />
          {audioUrl && <small style={{ color: '#557184' }}>Audio sudah tersedia ✓</small>}
        </div>}

        <details className={styles.segmentDetails}>
          <summary>Pengaturan & media tambahan</summary>
          <div className={admin.formGrid} style={{ marginTop: 10 }}>
            <label className={admin.label}>Urutan<input className={admin.input} type="number" min={1} value={position} onChange={(e) => setPosition(Math.max(1, Number(e.target.value) || 1))} /></label>
            {!needsManualTitle && <label className={admin.label}>Judul tampilan (opsional)<input className={admin.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kosongkan untuk judul otomatis" /></label>}
            <label className={admin.label}>Gambar
              <input className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, 'image') }} />
            </label>
            {kind !== 'listening' && <label className={admin.label}>Audio
              <input className={styles.fileInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, 'audio') }} />
            </label>}
            <label className={`${admin.label} ${admin.full}`}>URL/path gambar (opsional)<input className={admin.input} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="storage://..." /></label>
            <label className={`${admin.label} ${admin.full}`}>URL/path audio (opsional)<input className={admin.input} value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="storage://..." /></label>
          </div>
        </details>

        <div className={admin.actions}>
          <button className={admin.primary} type="button" disabled={busy} onClick={save}>{busy ? 'Memproses…' : block ? 'Simpan perubahan' : `Simpan ${kindLabel[kind]}`}</button>
          {block && <button className={admin.danger} type="button" disabled={busy} onClick={remove}>Hapus materi</button>}
        </div>
        <div className={admin.message}>{message}</div>
      </div>
    </details>
  )
}

export default function SimpleMaterialStudio({ sessionId, blocks }: Props) {
  const structured = blocks.filter((block) => kindLabel[block.kind])
  const [activeKind, setActiveKind] = useState<StructuredKind>('vocabulary')
  const counts = structuredKinds.map(([kind, label]) => ({ kind, label, count: structured.filter((block) => block.kind === kind).length }))
  const activeBlocks = structured.filter((block) => block.kind === activeKind)
  const nextPosition = blocks.reduce((max, block) => Math.max(max, block.position), 0) + 1
  const activeLabel = kindLabel[activeKind]

  return (
    <section className={`${admin.panel} ${styles.studio}`}>
      <div className={styles.studioHead}>
        <div>
          <div className={admin.eyebrow}>EDITOR MATERI</div>
          <h2>Isi materi dengan mudah</h2>
          <p>Pilih jenis materi, isi kolom utama, lalu simpan. Bagian tambahan hanya perlu dibuka bila memang dibutuhkan.</p>
        </div>
        <div className={styles.total}>{structured.length}<small>materi tersimpan</small></div>
      </div>

      <div className={styles.counts} role="tablist" aria-label="Jenis materi">
        {counts.map((item) => (
          <button className={activeKind === item.kind ? styles.activeTab : ''} type="button" role="tab" aria-selected={activeKind === item.kind} onClick={() => setActiveKind(item.kind)} key={item.kind}>
            <b>{item.count}</b><span>{item.label}</span><small>Klik untuk isi</small>
          </button>
        ))}
      </div>

      <div className={styles.guide}>
        <b>Sedang mengisi: {activeLabel}</b>
        <span>1. Isi yang utama</span><span>2. Tambahan bila perlu</span><span>3. Simpan</span>
      </div>

      <div className={styles.activeKindHead}>
        <div>
          <small>{activeLabel.toUpperCase()}</small>
          <h3>{activeBlocks.length > 0 ? `${activeBlocks.length} materi tersimpan` : `Belum ada ${activeLabel}`}</h3>
          <p>Form baru selalu tersedia di bawah. Klik materi yang sudah ada untuk mengedit.</p>
        </div>
        <span>+ Tambah {activeLabel}</span>
      </div>

      <div className={styles.list}>
        {activeBlocks.map((block) => <MaterialCard key={block.id} sessionId={sessionId} block={block} defaultPosition={block.position} initialKind={activeKind} />)}
        <MaterialCard key={`new-${activeKind}-${nextPosition}`} sessionId={sessionId} defaultPosition={nextPosition} initialKind={activeKind} />
      </div>
    </section>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
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

type Props = {
  sessionId: string
  blocks: ContentBlock[]
}

type StructuredKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'
type RecordValue = Record<string, unknown>
type SegmentType = 'verb' | 'noun' | 'adjective' | 'time' | 'grammar' | 'neutral'
type Segment = { text: string; reading: string; type: SegmentType }
type Example = { example: string; example_translation: string; segments: Segment[] }
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

function normalizeSegments(value: unknown): Segment[] {
  if (!Array.isArray(value)) return []
  return value.map((raw) => {
    const item = asRecord(raw)
    const rawType = stringField(item, 'type') as SegmentType
    const type: SegmentType = ['verb', 'noun', 'adjective', 'time', 'grammar', 'neutral'].includes(rawType) ? rawType : 'neutral'
    return { text: stringField(item, 'text'), reading: stringField(item, 'reading'), type }
  }).filter((item) => item.text || item.reading)
}

function normalizeExamples(body: RecordValue): Example[] {
  const source = Array.isArray(body.examples) ? body.examples : []
  return source.map((raw) => {
    const item = asRecord(raw)
    return {
      example: stringField(item, 'example') || stringField(item, 'sentence') || stringField(item, 'japanese'),
      example_translation: stringField(item, 'example_translation') || stringField(item, 'translation') || stringField(item, 'indonesian'),
      segments: normalizeSegments(item.segments),
    }
  })
}

function normalizeHelpers(body: RecordValue): HelperWord[] {
  const source = Array.isArray(body.helper_vocabulary) ? body.helper_vocabulary : []
  return source.map((raw) => {
    const item = asRecord(raw)
    return { term: stringField(item, 'term') || stringField(item, 'word'), meaning: stringField(item, 'meaning') || stringField(item, 'translation') }
  })
}

function normalizeGroups(body: RecordValue): GrammarGroup[] {
  const source = Array.isArray(body.groups) ? body.groups : []
  return source.map((raw) => {
    const item = asRecord(raw)
    return { label: stringField(item, 'label') || stringField(item, 'group'), from: stringField(item, 'from') || stringField(item, 'base'), to: stringField(item, 'to') || stringField(item, 'result') }
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

function ExamplesEditor({ value, onChange }: { value: Example[]; onChange: (value: Example[]) => void }) {
  function update(index: number, patch: Partial<Example>) {
    onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  function updateSegment(exampleIndex: number, segmentIndex: number, patch: Partial<Segment>) {
    const segments = value[exampleIndex]?.segments || []
    update(exampleIndex, { segments: segments.map((item, itemIndex) => itemIndex === segmentIndex ? { ...item, ...patch } : item) })
  }

  return (
    <div className={styles.collection}>
      <div className={styles.collectionHead}>
        <div><b>Contoh kalimat</b><small>Kalimat biasa boleh langsung diisi. Pecahan warna bersifat opsional.</small></div>
        <button className={admin.subtle} type="button" onClick={() => onChange([...value, { example: '', example_translation: '', segments: [] }])}>+ Contoh</button>
      </div>
      {value.length === 0 && <div className={styles.emptyMini}>Belum ada contoh.</div>}
      {value.map((item, index) => (
        <div className={styles.nestedCard} key={index}>
          <div className={styles.rowHead}><b>Contoh {index + 1}</b><button className={admin.danger} type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>Hapus</button></div>
          <div className={admin.formGrid}>
            <label className={`${admin.label} ${admin.full}`}>Kalimat Jepang
              <textarea className={admin.textarea} value={item.example} onChange={(event) => update(index, { example: event.target.value })} placeholder="例：友達と東京へ行く予定です。" />
            </label>
            <label className={`${admin.label} ${admin.full}`}>Arti Indonesia
              <input className={admin.input} value={item.example_translation} onChange={(event) => update(index, { example_translation: event.target.value })} placeholder="Berencana pergi ke Tokyo bersama teman." />
            </label>
          </div>
          <details className={styles.segmentDetails}>
            <summary>Pecahan warna kata (opsional)</summary>
            <p>Pakai ini bila ingin kata kerja, kata benda, kata sifat, waktu, dan pola kalimat tampil dengan warna berbeda seperti desain Takumi.</p>
            {item.segments.map((segment, segmentIndex) => (
              <div className={styles.segmentRow} key={segmentIndex}>
                <input className={admin.input} value={segment.text} onChange={(event) => updateSegment(index, segmentIndex, { text: event.target.value })} placeholder="Teks" />
                <input className={admin.input} value={segment.reading} onChange={(event) => updateSegment(index, segmentIndex, { reading: event.target.value })} placeholder="Furigana" />
                <select className={admin.select} value={segment.type} onChange={(event) => updateSegment(index, segmentIndex, { type: event.target.value as SegmentType })}>
                  <option value="neutral">Netral</option>
                  <option value="verb">Kata Kerja</option>
                  <option value="noun">Kata Benda</option>
                  <option value="adjective">Kata Sifat</option>
                  <option value="time">Waktu</option>
                  <option value="grammar">Pola Kalimat</option>
                </select>
                <button className={admin.danger} type="button" onClick={() => update(index, { segments: item.segments.filter((_, i) => i !== segmentIndex) })}>×</button>
              </div>
            ))}
            <button className={admin.subtle} type="button" onClick={() => update(index, { segments: [...item.segments, { text: '', reading: '', type: 'neutral' }] })}>+ Pecahan kata</button>
          </details>
        </div>
      ))}
    </div>
  )
}

function HelperVocabularyEditor({ value, onChange }: { value: HelperWord[]; onChange: (value: HelperWord[]) => void }) {
  return (
    <div className={styles.collection}>
      <div className={styles.collectionHead}><div><b>Kosakata bantu</b><small>Untuk Dokkai/Choukai.</small></div><button className={admin.subtle} type="button" onClick={() => onChange([...value, { term: '', meaning: '' }])}>+ Kosakata</button></div>
      {value.map((item, index) => (
        <div className={styles.helperRow} key={index}>
          <input className={admin.input} value={item.term} onChange={(event) => onChange(value.map((row, i) => i === index ? { ...row, term: event.target.value } : row))} placeholder="点検" />
          <input className={admin.input} value={item.meaning} onChange={(event) => onChange(value.map((row, i) => i === index ? { ...row, meaning: event.target.value } : row))} placeholder="Perawatan" />
          <button className={admin.danger} type="button" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
    </div>
  )
}

function GrammarGroupsEditor({ value, onChange }: { value: GrammarGroup[]; onChange: (value: GrammarGroup[]) => void }) {
  return (
    <div className={styles.collection}>
      <div className={styles.collectionHead}><div><b>Perubahan bentuk / grup</b><small>Contoh Grup 1, Grup 2, Grup 3.</small></div><button className={admin.subtle} type="button" onClick={() => onChange([...value, { label: '', from: '', to: '' }])}>+ Grup</button></div>
      {value.map((item, index) => (
        <div className={styles.groupRow} key={index}>
          <input className={admin.input} value={item.label} onChange={(event) => onChange(value.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} placeholder="Grup 1" />
          <input className={admin.input} value={item.from} onChange={(event) => onChange(value.map((row, i) => i === index ? { ...row, from: event.target.value } : row))} placeholder="読みます" />
          <input className={admin.input} value={item.to} onChange={(event) => onChange(value.map((row, i) => i === index ? { ...row, to: event.target.value } : row))} placeholder="読みなさい" />
          <button className={admin.danger} type="button" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
    </div>
  )
}

function StructuredFields({ kind, body, setBody }: { kind: string; body: RecordValue; setBody: (body: RecordValue) => void }) {
  const set = (key: string, value: unknown) => setBody({ ...body, [key]: value })
  const examples = normalizeExamples(body)

  if (kind === 'vocabulary') {
    return <>
      <div className={admin.formGrid}>
        <label className={admin.label}>Kosakata<input className={admin.input} value={stringField(body, 'term')} onChange={(e) => set('term', e.target.value)} placeholder="予定" /></label>
        <label className={admin.label}>Furigana<input className={admin.input} value={stringField(body, 'reading')} onChange={(e) => set('reading', e.target.value)} placeholder="よてい" /></label>
        <label className={admin.label}>Arti Indonesia<input className={admin.input} value={stringField(body, 'meaning')} onChange={(e) => set('meaning', e.target.value)} placeholder="rencana / jadwal" /></label>
        <label className={admin.label}>Kelas kata<input className={admin.input} value={stringField(body, 'part_of_speech')} onChange={(e) => set('part_of_speech', e.target.value)} placeholder="名詞 · Kata Benda" /></label>
        <label className={`${admin.label} ${admin.full}`}>Penjelasan<textarea className={admin.textarea} value={stringField(body, 'description')} onChange={(e) => set('description', e.target.value)} placeholder="Kapan dan bagaimana kosakata ini digunakan." /></label>
      </div>
      <ExamplesEditor value={examples} onChange={(value) => set('examples', value)} />
    </>
  }

  if (kind === 'kanji') {
    return <>
      <div className={admin.formGrid}>
        <label className={admin.label}>Kanji<input className={admin.input} value={stringField(body, 'kanji')} onChange={(e) => set('kanji', e.target.value)} placeholder="家" /></label>
        <label className={admin.label}>Arti<input className={admin.input} value={stringField(body, 'meaning')} onChange={(e) => set('meaning', e.target.value)} placeholder="rumah, keluarga, tempat tinggal" /></label>
        <label className={admin.label}>Onyomi<input className={admin.input} value={stringsField(body, 'onyomi').join('、')} onChange={(e) => set('onyomi', e.target.value.split(/[、,]/).map((v) => v.trim()).filter(Boolean))} placeholder="カ、ケ" /></label>
        <label className={admin.label}>Kunyomi<input className={admin.input} value={stringsField(body, 'kunyomi').join('、')} onChange={(e) => set('kunyomi', e.target.value.split(/[、,]/).map((v) => v.trim()).filter(Boolean))} placeholder="いえ、や" /></label>
        <label className={`${admin.label} ${admin.full}`}>Catatan makna/pemakaian<textarea className={admin.textarea} value={stringField(body, 'description')} onChange={(e) => set('description', e.target.value)} /></label>
      </div>
      <ExamplesEditor value={examples} onChange={(value) => set('examples', value)} />
    </>
  }

  if (kind === 'grammar') {
    return <>
      <div className={admin.formGrid}>
        <label className={admin.label}>Pola Bunpou<input className={admin.input} value={stringField(body, 'pattern')} onChange={(e) => set('pattern', e.target.value)} placeholder="Kata Kerja ます tanpa ます ＋ なさい" /></label>
        <label className={admin.label}>Target<input className={admin.input} value={stringField(body, 'target')} onChange={(e) => set('target', e.target.value)} placeholder="Memahami perintah / instruksi" /></label>
        <label className={`${admin.label} ${admin.full}`}>Makna inti<input className={admin.input} value={stringField(body, 'core_meaning')} onChange={(e) => set('core_meaning', e.target.value)} placeholder="...lah / lakukanlah..." /></label>
        <label className={`${admin.label} ${admin.full}`}>Penjelasan inti<textarea className={admin.textarea} value={stringField(body, 'explanation')} onChange={(e) => set('explanation', e.target.value)} /></label>
        <label className={`${admin.label} ${admin.full}`}>Penting / batas penggunaan<textarea className={admin.textarea} value={stringField(body, 'important')} onChange={(e) => set('important', e.target.value)} /></label>
      </div>
      <GrammarGroupsEditor value={normalizeGroups(body)} onChange={(value) => set('groups', value)} />
      <ExamplesEditor value={examples} onChange={(value) => set('examples', value)} />
    </>
  }

  if (kind === 'reading') {
    return <>
      <div className={admin.formGrid}>
        <label className={`${admin.label} ${admin.full}`}>Target<input className={admin.input} value={stringField(body, 'target')} onChange={(e) => set('target', e.target.value)} placeholder="Memahami isi bacaan pendek dan informasi penting." /></label>
        <label className={`${admin.label} ${admin.full}`}>Persiapan Membaca<textarea className={admin.textarea} value={stringField(body, 'preparation')} onChange={(e) => set('preparation', e.target.value)} /></label>
      </div>
      <HelperVocabularyEditor value={normalizeHelpers(body)} onChange={(value) => set('helper_vocabulary', value)} />
      <div className={admin.formGrid}>
        <label className={`${admin.label} ${admin.full}`}>Bacaan<textarea className={`${admin.textarea} ${styles.longText}`} value={stringField(body, 'passage')} onChange={(e) => set('passage', e.target.value)} placeholder="Masukkan teks 読解 yang sudah direview." /></label>
        <label className={`${admin.label} ${admin.full}`}>Inti Pemahaman<textarea className={admin.textarea} value={stringField(body, 'takeaway')} onChange={(e) => set('takeaway', e.target.value)} placeholder="Ringkas poin penting bacaan." /></label>
      </div>
    </>
  }

  if (kind === 'listening') {
    return <>
      <div className={admin.formGrid}>
        <label className={`${admin.label} ${admin.full}`}>Target<input className={admin.input} value={stringField(body, 'target')} onChange={(e) => set('target', e.target.value)} placeholder="Memahami informasi penting dari audio pendek." /></label>
        <label className={`${admin.label} ${admin.full}`}>Persiapan Mendengar<textarea className={admin.textarea} value={stringField(body, 'preparation')} onChange={(e) => set('preparation', e.target.value)} /></label>
      </div>
      <HelperVocabularyEditor value={normalizeHelpers(body)} onChange={(value) => set('helper_vocabulary', value)} />
      <div className={admin.formGrid}>
        <label className={`${admin.label} ${admin.full}`}>Skrip audio<textarea className={`${admin.textarea} ${styles.longText}`} value={stringField(body, 'script')} onChange={(e) => set('script', e.target.value)} placeholder="Skrip 聴解 yang sudah direview." /></label>
        <label className={`${admin.label} ${admin.full}`}>Inti Pemahaman<textarea className={admin.textarea} value={stringField(body, 'takeaway')} onChange={(e) => set('takeaway', e.target.value)} /></label>
      </div>
    </>
  }

  return null
}

function MaterialCard({ sessionId, block, defaultPosition, initialKind = 'vocabulary' }: { sessionId: string; block?: ContentBlock; defaultPosition: number; initialKind?: StructuredKind }) {
  const router = useRouter()
  const initialBody = useMemo(() => asRecord(block?.body), [block?.body])
  const [position, setPosition] = useState(block?.position || defaultPosition)
  const [kind, setKind] = useState<StructuredKind>(block?.kind && kindLabel[block.kind] ? block.kind as StructuredKind : initialKind)
  const [title, setTitle] = useState(block?.title || '')
  const [body, setBody] = useState<RecordValue>(initialBody)
  const [audioUrl, setAudioUrl] = useState(block?.audio_url || '')
  const [imageUrl, setImageUrl] = useState(block?.image_url || '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const fallbackTitle = kind === 'vocabulary'
      ? stringField(body, 'term')
      : kind === 'kanji'
        ? stringField(body, 'kanji')
        : kind === 'grammar'
          ? stringField(body, 'pattern')
          : ''
    const finalTitle = title.trim() || fallbackTitle.trim()
    if (!finalTitle) {
      setMessage(kind === 'kanji' ? 'Isi kanji terlebih dahulu.' : kind === 'vocabulary' ? 'Isi kosakata terlebih dahulu.' : 'Isi judul materi terlebih dahulu.')
      return
    }
    setBusy(true)
    setMessage('Menyimpan materi...')
    try {
      await callAdmin({ action: 'upsert_block', sessionId, blockId: block?.id || null, position, kind, title: finalTitle, contentBody: body, audioUrl, imageUrl })
      setMessage(block ? 'Materi diperbarui.' : `${kindLabel[kind]} baru berhasil ditambahkan.`)
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
    if (!block || !window.confirm(`Hapus materi “${block.title || kindLabel[block.kind] || 'ini'}”?`)) return
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

  async function handleUpload(file: File, target: 'audio' | 'image') {
    setBusy(true)
    setMessage(`Mengunggah ${target === 'audio' ? 'audio' : 'gambar'}...`)
    try {
      const path = await uploadAsset(sessionId, file)
      if (target === 'audio') setAudioUrl(path); else setImageUrl(path)
      setMessage('Aset terunggah. Klik Simpan materi untuk menyimpan referensinya.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload gagal.')
    } finally {
      setBusy(false)
    }
  }

  const bodyLabel = kindLabel[kind] || 'Materi'
  const titleMayBeAutomatic = kind === 'vocabulary' || kind === 'kanji' || kind === 'grammar'

  return (
    <details className={styles.materialCard} open={!block}>
      <summary>
        <span className={styles.kindBadge}>{bodyLabel}</span>
        <div><b>{block?.title || title || `Tambah ${bodyLabel}`}</b><small>{block ? `Urutan ${block.position}` : 'Materi baru'}</small></div>
        <span className={styles.chevron}>⌄</span>
      </summary>
      <div className={styles.cardBody}>
        <div className={admin.formGrid}>
          <label className={admin.label}>Urutan<input className={admin.input} type="number" min={1} value={position} onChange={(e) => setPosition(Math.max(1, Number(e.target.value) || 1))} /></label>
          <label className={admin.label}>Jenis materi<select className={admin.select} value={kind} onChange={(e) => setKind(e.target.value as StructuredKind)}>{structuredKinds.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className={`${admin.label} ${admin.full}`}>{titleMayBeAutomatic ? 'Judul materi (opsional)' : 'Judul materi'}<input className={admin.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'vocabulary' ? 'Kosongkan untuk memakai kosakata sebagai judul' : kind === 'kanji' ? 'Kosongkan untuk memakai kanji sebagai judul' : kind === 'grammar' ? 'Kosongkan untuk memakai pola sebagai judul' : 'Judul materi'} /></label>
        </div>

        <StructuredFields kind={kind} body={body} setBody={setBody} />

        <div className={styles.mediaBox}>
          <div className={styles.collectionHead}><div><b>Media</b><small>Path Supabase Storage atau URL eksternal. Untuk Choukai, unggah audio di sini.</small></div></div>
          <div className={admin.formGrid}>
            <label className={admin.label}>Audio
              <input className={admin.input} value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="storage://learning-assets/…" />
              <input className={styles.fileInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, 'audio') }} />
            </label>
            <label className={admin.label}>Gambar
              <input className={admin.input} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="storage://learning-assets/…" />
              <input className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, 'image') }} />
            </label>
          </div>
        </div>

        <div className={admin.actions}>
          <button className={admin.primary} type="button" disabled={busy} onClick={save}>{busy ? 'Memproses…' : block ? 'Simpan perubahan' : `Tambah ${bodyLabel}`}</button>
          {block && <button className={admin.danger} type="button" disabled={busy} onClick={remove}>Hapus materi</button>}
        </div>
        <div className={admin.message}>{message}</div>
      </div>
    </details>
  )
}

export default function StructuredMaterialStudio({ sessionId, blocks }: Props) {
  const structured = blocks.filter((block) => kindLabel[block.kind])
  const [activeKind, setActiveKind] = useState<StructuredKind>('vocabulary')
  const nextPosition = blocks.reduce((max, block) => Math.max(max, block.position), 0) + 1
  const counts = structuredKinds.map(([kind, label]) => ({ kind, label, count: structured.filter((block) => block.kind === kind).length }))
  const activeBlocks = structured.filter((block) => block.kind === activeKind)
  const activeLabel = kindLabel[activeKind]

  return (
    <section className={`${admin.panel} ${styles.studio}`}>
      <div className={styles.studioHead}>
        <div><div className={admin.eyebrow}>EDITOR MATERI TERSTRUKTUR</div><h2>Isi materi tanpa JSON</h2><p>Pilih tab Kosakata, Kanji, Bunpou, Dokkai, atau Choukai. Form di bawah akan langsung berubah sesuai materi yang ingin diisi.</p></div>
        <div className={styles.total}>{structured.length}<small>materi terstruktur</small></div>
      </div>

      <div className={styles.counts} role="tablist" aria-label="Jenis materi">
        {counts.map((item) => (
          <button
            className={activeKind === item.kind ? styles.activeTab : ''}
            type="button"
            role="tab"
            aria-selected={activeKind === item.kind}
            onClick={() => setActiveKind(item.kind)}
            key={item.kind}
          >
            <b>{item.count}</b><span>{item.label}</span><small>Klik untuk isi</small>
          </button>
        ))}
      </div>

      <div className={styles.guide}>
        <b>Sedang mengisi: {activeLabel}</b>
        <span>1. Isi field utama</span><span>2. Tambahkan contoh/media</span><span>3. Simpan</span><span>4. Cek Preview siswa</span>
      </div>

      <div className={styles.activeKindHead}>
        <div><small>{activeLabel.toUpperCase()}</small><h3>{activeBlocks.length > 0 ? `${activeBlocks.length} materi tersimpan` : `Belum ada ${activeLabel}`}</h3><p>Form “Tambah {activeLabel}” selalu tersedia di bawah. Materi yang sudah tersimpan dapat dibuka untuk diedit.</p></div>
        <span>+ Tambah {activeLabel}</span>
      </div>

      <div className={styles.list}>
        {activeBlocks.map((block) => <MaterialCard key={block.id} sessionId={sessionId} block={block} defaultPosition={block.position} initialKind={activeKind} />)}
        <MaterialCard key={`new-${activeKind}-${nextPosition}`} sessionId={sessionId} defaultPosition={nextPosition} initialKind={activeKind} />
      </div>

      <p className={styles.legacyNote}>Editor blok generik di bagian bawah tetap tersedia sebagai mode lanjutan untuk catatan, gambar/audio standalone, atau struktur lama. Untuk Kosakata, Kanji, Bunpou, Dokkai, dan Choukai gunakan tab editor di atas.</p>
    </section>
  )
}

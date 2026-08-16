import MaterialBookmark from './material-bookmark'
import BlockLearningStatusControl, { type BlockLearningStatus } from './block-learning-status-control'
import CollapsibleVocabularyCard from './collapsible-vocabulary-card'

export type ContentBlock = {
  id: string
  position: number
  kind: string
  title: string | null
  body: unknown
  audio_url: string | null
  image_url: string | null
}

type RecordValue = Record<string, unknown>

type Props = {
  blocks: ContentBlock[]
  bookmarkedIds: Set<string>
  learningStatuses?: Record<string, BlockLearningStatus>
  preview?: boolean
}

const kindMeta: Record<string, { label: string; icon: string }> = {
  vocabulary: { label: 'Kosakata', icon: '▤' },
  kanji: { label: 'Kanji', icon: '字' },
  grammar: { label: 'Bunpou', icon: '▧' },
  reading: { label: 'Dokkai', icon: '▥' },
  listening: { label: 'Choukai', icon: '◉' },
  note: { label: 'Catatan', icon: '✦' },
  image: { label: 'Gambar', icon: '▣' },
  audio: { label: 'Audio', icon: '♪' },
}

function recordOf(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
}

function textOf(value: RecordValue, ...keys: string[]) {
  for (const key of keys) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return null
}

function numberOf(value: RecordValue, key: string, fallback = 1) {
  const candidate = value[key]
  const parsed = typeof candidate === 'number' ? candidate : typeof candidate === 'string' ? Number(candidate) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback
}

function chapterOf(block: ContentBlock) {
  return numberOf(recordOf(block.body), 'chapter_number', 1)
}

function listOf(value: RecordValue, ...keys: string[]): unknown[] {
  for (const key of keys) {
    const candidate = value[key]
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function stringsOf(value: RecordValue, ...keys: string[]) {
  for (const key of keys) {
    const candidate = value[key]
    if (Array.isArray(candidate)) return candidate.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    if (typeof candidate === 'string' && candidate.trim()) return candidate.split(/[、,;\n]/).map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function examplesOf(body: RecordValue) {
  const explicit = listOf(body, 'examples', 'example_items')
  if (explicit.length > 0) return explicit
  return listOf(body, 'items').filter((item) => {
    const record = recordOf(item)
    return Boolean(textOf(record, 'example', 'sentence', 'japanese'))
  })
}

function meaningfulSegmentsOf(value: RecordValue) {
  return listOf(value, 'segments').filter((segmentRaw) => {
    const segment = recordOf(segmentRaw)
    return Boolean(textOf(segment, 'text', 'word'))
  })
}

function usesSegmentColors(body: RecordValue) {
  return examplesOf(body).some((exampleRaw) => {
    const example = recordOf(exampleRaw)
    return meaningfulSegmentsOf(example).some((segmentRaw) => {
      const segment = recordOf(segmentRaw)
      const type = textOf(segment, 'type', 'kind')
      return Boolean(type && type !== 'neutral')
    })
  })
}

function posBadgeClass(pos: string) {
  const value = pos.toLowerCase()
  if (value.includes('動詞') || value.includes('kata kerja')) return 'tm-badge-blue'
  if (value.includes('形容詞') || value.includes('kata sifat')) return 'tm-badge-yellow'
  if (value.includes('時間') || value.includes('waktu')) return 'tm-badge-purple'
  return 'tm-badge-green'
}

function SegmentLine({ raw }: { raw: unknown }) {
  const value = recordOf(raw)
  const segments = meaningfulSegmentsOf(value)
  const sentence = textOf(value, 'example', 'sentence', 'japanese')
  const reading = textOf(value, 'example_reading', 'reading', 'furigana')
  const translation = textOf(value, 'example_translation', 'translation', 'indonesian')

  if (segments.length === 0) {
    return <><div className="tm-example-jp">{sentence || 'Contoh belum diisi.'}</div>{reading && <div className="tm-example-reading">{reading}</div>}{translation && <div className="tm-example-id">{translation}</div>}</>
  }

  return (
    <>
      <div className="tm-segments">
        {segments.map((segmentRaw, index) => {
          const segment = recordOf(segmentRaw)
          const text = textOf(segment, 'text', 'word') || ''
          const reading = textOf(segment, 'reading', 'furigana')
          const type = textOf(segment, 'type', 'kind') || 'neutral'
          const className = type === 'verb' ? 'tm-seg-verb' : type === 'noun' ? 'tm-seg-noun' : type === 'adjective' ? 'tm-seg-adj' : type === 'time' ? 'tm-seg-time' : type === 'grammar' ? 'tm-seg-grammar' : 'tm-seg-neutral'
          return <span className={`tm-segment ${className}`} key={`${text}-${index}`}>{reading && <small>{reading}</small>}{text}</span>
        })}
      </div>
      {translation && <div className="tm-example-id">{translation}</div>}
    </>
  )
}

function Examples({ body }: { body: RecordValue }) {
  const examples = examplesOf(body).slice(0, 2)
  if (examples.length === 0) return null
  return (
    <div className="tm-examples">
      <div className="tm-examples-title">Contoh</div>
      {examples.map((example, index) => (
        <div className="tm-example" key={index}>
          <div className="tm-example-num">{index + 1}</div>
          <div><SegmentLine raw={example} /></div>
        </div>
      ))}
    </div>
  )
}

function TagStrip() {
  return (
    <div className="tm-tag-strip" aria-label="Legenda kategori kata">
      <div className="tm-tag tm-seg-verb">動詞 · Kata Kerja</div>
      <div className="tm-tag tm-seg-noun">名詞 · Kata Benda</div>
      <div className="tm-tag tm-seg-adj">形容詞 · Kata Sifat</div>
      <div className="tm-tag tm-seg-time">時間 · Waktu</div>
    </div>
  )
}

function VocabularyCard({ block }: { block: ContentBlock }) {
  const body = recordOf(block.body)
  const term = textOf(body, 'term', 'word', 'japanese') || block.title || 'Kosakata'
  const reading = textOf(body, 'reading', 'furigana')
  const meaning = textOf(body, 'meaning', 'translation', 'indonesian')
  const description = textOf(body, 'description', 'text', 'explanation')
  const pos = textOf(body, 'part_of_speech', 'pos', 'word_class')
  const total = textOf(body, 'count_label')

  return (
    <>
      <div className="tm-hero-grid">
        <span className="tm-count-pill">{total || String(block.position).padStart(2, '0')}</span>
        <div>
          <div className="tm-word-hero">
            <div><div className="tm-word-main">{term}</div>{reading && <div className="tm-word-reading">{reading}</div>}</div>
            {pos && <span className={`tm-inline-badge ${posBadgeClass(pos)}`}>{pos}</span>}
          </div>
          {meaning && <div className="tm-meaning">{meaning}</div>}
          {description && <p className="tm-description">{description}</p>}
          {block.audio_url && <div className="tm-audio-panel tm-audio-compact"><audio controls preload="none" src={block.audio_url}>Browser Anda tidak mendukung audio.</audio></div>}
        </div>
      </div>
      {usesSegmentColors(body) && <TagStrip />}
      <Examples body={body} />
    </>
  )
}

function KanjiCard({ block }: { block: ContentBlock }) {
  const body = recordOf(block.body)
  const kanji = textOf(body, 'kanji', 'character') || block.title || '字'
  const meaning = textOf(body, 'meaning', 'translation', 'indonesian')
  const description = textOf(body, 'description', 'text', 'explanation')
  const onyomi = stringsOf(body, 'onyomi', 'on_reading')
  const kunyomi = stringsOf(body, 'kunyomi', 'kun_reading')
  const total = textOf(body, 'count_label')

  return (
    <>
      <div className="tm-kanji-hero">
        <div>
          <span className="tm-count-pill">{total || String(block.position).padStart(2, '0')}</span>
          <div className="tm-kanji-character">{kanji}</div>
        </div>
        <div>{meaning && <div className="tm-meaning">{meaning}</div>}{description && <p className="tm-description">{description}</p>}{block.audio_url && <div className="tm-audio-panel tm-audio-compact"><audio controls preload="none" src={block.audio_url}>Browser Anda tidak mendukung audio.</audio></div>}</div>
      </div>
      {(onyomi.length > 0 || kunyomi.length > 0) && <div className="tm-reading-grid">
        <div className="tm-reading-box"><small>Onyomi</small><b>{onyomi.length ? onyomi.join('\n') : '—'}</b></div>
        <div className="tm-reading-box"><small>Kunyomi</small><b>{kunyomi.length ? kunyomi.join('\n') : '—'}</b></div>
      </div>}
      {usesSegmentColors(body) && <TagStrip />}
      <Examples body={body} />
    </>
  )
}

function GrammarCard({ block }: { block: ContentBlock }) {
  const body = recordOf(block.body)
  const title = block.title || textOf(body, 'pattern', 'title') || 'Bunpou'
  const target = textOf(body, 'target')
  const meaning = textOf(body, 'core_meaning', 'meaning', 'translation')
  const explanation = textOf(body, 'explanation', 'text', 'description')
  const important = textOf(body, 'important', 'note', 'warning')
  const pattern = textOf(body, 'pattern', 'formula') || title
  const groups = listOf(body, 'groups', 'conjugation_groups')

  return (
    <>
      <div className="tm-card-header">
        <div className="tm-icon-box">▧</div>
        <div className="tm-card-title"><h2>{title}</h2>{target && <small>Target belajar: {target}</small>}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginTop: 14 }}>
        <div className="tm-callout" style={{ margin: 0 }}>
          <div className="tm-callout-head"><div className="tm-icon-box">◇</div><b>Makna</b></div>
          <div style={{ marginTop: 10, padding: '14px 16px', border: '1px solid #d6e7fb', borderRadius: 10, background: '#f6faff', fontSize: 18, fontWeight: 900, lineHeight: 1.5 }}>
            {meaning || 'Makna belum diisi.'}
          </div>
        </div>

        <div className="tm-callout" style={{ margin: 0 }}>
          <div className="tm-callout-head"><div className="tm-icon-box">≡</div><b>Pola Kalimat</b></div>
          <div style={{ marginTop: 10, padding: '14px 16px', border: '1px solid #d6e7fb', borderRadius: 10, background: '#f6faff', fontSize: 18, fontWeight: 900, lineHeight: 1.55 }}>
            {pattern}
          </div>
        </div>
      </div>

      {explanation && (
        <div className="tm-callout" style={{ marginTop: 14 }}>
          <div className="tm-callout-head"><div className="tm-icon-box">▤</div><b>Penjelasan</b></div>
          <p style={{ marginTop: 10, whiteSpace: 'pre-line' }}>{explanation}</p>
        </div>
      )}

      {important && (
        <div className="tm-callout" style={{ marginTop: 14 }}>
          <div className="tm-callout-head"><div className="tm-icon-box">☆</div><b>Catatan Penting</b></div>
          <p>{important}</p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="tm-grammar-pattern">
          <h3>Perubahan Bentuk</h3>
          {groups.map((raw, index) => {
            const group = recordOf(raw)
            const label = textOf(group, 'label', 'group') || `Grup ${index + 1}`
            const from = textOf(group, 'from', 'base', 'example')
            const to = textOf(group, 'to', 'result')
            return <div className="tm-pattern-row" key={index}><span>{label}</span><b>{from || '—'}{to ? ` → ${to}` : ''}</b></div>
          })}
        </div>
      )}

      {usesSegmentColors(body) && <TagStrip />}
      <Examples body={body} />
    </>
  )
}

function HelperItems({ body }: { body: RecordValue }) {
  const items = listOf(body, 'helper_vocabulary', 'vocabulary', 'helper_items', 'items')
  if (items.length === 0) return null
  return <div className="tm-helper-grid">{items.slice(0, 10).map((raw, index) => { const item = recordOf(raw); const word = textOf(item, 'term', 'word', 'kanji') || `Item ${index + 1}`; const meaning = textOf(item, 'meaning', 'translation'); return <div className="tm-helper-item" key={index}><b>{word}</b>{meaning && <small>{meaning}</small>}</div> })}</div>
}

function ReadingCard({ block }: { block: ContentBlock }) {
  const body = recordOf(block.body)
  const target = textOf(body, 'target')
  const prep = textOf(body, 'preparation', 'tip', 'intro')
  const passage = textOf(body, 'passage', 'text')
  const takeaway = textOf(body, 'takeaway', 'summary', 'key_points')

  return (
    <>
      <div className="tm-card-header"><div className="tm-icon-box">▥</div><div className="tm-card-title"><h2>{block.title || 'Dokkai'}</h2>{target && <small>Target: {target}</small>}</div></div>
      {prep && <div className="tm-callout" style={{ marginTop: 12 }}><div className="tm-callout-head"><div className="tm-icon-box">☼</div><b>Persiapan Membaca</b></div><p>{prep}</p></div>}
      <div className="tm-callout" style={{ marginTop: 12 }}><div className="tm-callout-head"><div className="tm-icon-box">i</div><b>Kosakata Bantu</b></div><HelperItems body={body} /></div>
      {passage && <div className="tm-passage">{passage}</div>}
      {takeaway && <div className="tm-callout" style={{ marginTop: 12 }}><div className="tm-callout-head"><div className="tm-icon-box">☆</div><b>Inti Pemahaman</b></div><p className="tm-generic-text">{takeaway}</p></div>}
    </>
  )
}

function ListeningCard({ block }: { block: ContentBlock }) {
  const body = recordOf(block.body)
  const target = textOf(body, 'target')
  const prep = textOf(body, 'preparation', 'tip', 'intro')
  const script = textOf(body, 'script', 'transcript')
  const takeaway = textOf(body, 'takeaway', 'summary', 'key_points')

  return (
    <>
      <div className="tm-card-header"><div className="tm-icon-box">◉</div><div className="tm-card-title"><h2>{block.title || 'Choukai'}</h2>{target && <small>Target: {target}</small>}</div></div>
      {prep && <div className="tm-callout" style={{ marginTop: 12 }}><div className="tm-callout-head"><div className="tm-icon-box">☼</div><b>Persiapan Mendengar</b></div><p>{prep}</p></div>}
      <div className="tm-callout" style={{ marginTop: 12 }}><div className="tm-callout-head"><div className="tm-icon-box">i</div><b>Kosakata Bantu</b></div><HelperItems body={body} /></div>
      {block.audio_url && <div className="tm-audio-panel"><p className="tm-audio-note">Dengarkan audio sesuai petunjuk materi.</p><audio controls preload="none" src={block.audio_url}>Browser Anda tidak mendukung audio.</audio>{script && <details><summary>Lihat skrip</summary><p className="tm-generic-text">{script}</p></details>}</div>}
      {takeaway && <div className="tm-callout" style={{ marginTop: 12 }}><div className="tm-callout-head"><div className="tm-icon-box">☆</div><b>Inti Pemahaman</b></div><p className="tm-generic-text">{takeaway}</p></div>}
    </>
  )
}

function GenericCard({ block }: { block: ContentBlock }) {
  const body = recordOf(block.body)
  const text = textOf(body, 'text', 'description', 'explanation', 'passage')
  return <>{text && <p className="tm-generic-text">{text}</p>}{block.image_url && <img className="tm-material-image" src={block.image_url} alt={block.title || 'Materi Takumi'} loading="lazy" />}{block.audio_url && <div className="tm-audio-panel"><audio controls preload="none" src={block.audio_url}>Browser Anda tidak mendukung audio.</audio></div>}{!text && !block.image_url && !block.audio_url && <p className="tm-generic-text">Isi blok ini belum tersedia.</p>}</>
}

function BlockContent({ block }: { block: ContentBlock }) {
  if (block.kind === 'vocabulary') return <VocabularyCard block={block} />
  if (block.kind === 'kanji') return <KanjiCard block={block} />
  if (block.kind === 'grammar') return <GrammarCard block={block} />
  if (block.kind === 'reading') return <ReadingCard block={block} />
  if (block.kind === 'listening') return <ListeningCard block={block} />
  return <GenericCard block={block} />
}

export default function MaterialView({ blocks, bookmarkedIds, learningStatuses = {}, preview = false }: Props) {
  const firstByKind = new Set<string>()
  const anchorFor = new Map<string, string>()
  blocks.forEach((block) => {
    if (!firstByKind.has(block.kind)) {
      firstByKind.add(block.kind)
      anchorFor.set(block.id, block.kind)
    }
  })

  function renderVocabularyBlock(block: ContentBlock, anchorId: string) {
    const body = recordOf(block.body)
    const term = textOf(body, 'term', 'word', 'japanese') || block.title || 'Kosakata'
    const reading = textOf(body, 'reading', 'furigana')
    const positionLabel = textOf(body, 'count_label') || String(block.position).padStart(2, '0')
    const initialStatus = learningStatuses[block.id] || 'not_started'

    return (
      <CollapsibleVocabularyCard
        key={block.id}
        blockId={block.id}
        anchorId={anchorId}
        positionLabel={positionLabel}
        term={term}
        reading={reading}
        initialStatus={initialStatus}
        bookmarked={bookmarkedIds.has(block.id)}
        preview={preview}
      >
        <BlockContent block={block} />
      </CollapsibleVocabularyCard>
    )
  }

  function renderMaterialBlock(block: ContentBlock, anchorId: string) {
    const initialStatus = learningStatuses[block.id] || 'not_started'
    return (
      <article className="tm-material-card" data-block-id={block.id} id={anchorId} key={block.id}>
        <BlockContent block={block} />
        <div className={`tm-material-actions tm-material-actions-status${preview ? ' preview' : ''}`}>
          {!preview && <MaterialBookmark blockId={block.id} initialBookmarked={bookmarkedIds.has(block.id)} />}
          <BlockLearningStatusControl blockId={block.id} initialStatus={initialStatus} preview={preview} />
        </div>
      </article>
    )
  }

  const vocabularyOnly = blocks.length > 0 && blocks.every((block) => block.kind === 'vocabulary')
  const kanjiOnly = blocks.length > 0 && blocks.every((block) => block.kind === 'kanji')
  const grammarOnly = blocks.length > 0 && blocks.every((block) => block.kind === 'grammar')

  if (vocabularyOnly || kanjiOnly || grammarOnly) {
    const chapterMap = new Map<number, ContentBlock[]>()
    blocks.forEach((block) => {
      const chapter = chapterOf(block)
      const current = chapterMap.get(chapter) || []
      current.push(block)
      chapterMap.set(chapter, current)
    })
    const chapters = Array.from(chapterMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([chapter, chapterBlocks]) => [chapter, chapterBlocks.sort((a, b) => a.position - b.position)] as [number, ContentBlock[]])
    const kind = vocabularyOnly ? 'vocabulary' : kanjiOnly ? 'kanji' : 'grammar'
    const itemLabel = vocabularyOnly ? 'kosakata' : kanjiOnly ? 'kanji' : 'bunpou'

    return (
      <div className="tm-vocab-chapter-list">
        {chapters.map(([chapter, chapterBlocks], index) => {
          const learnedCount = chapterBlocks.filter((block) => learningStatuses[block.id] === 'learned').length
          const reviewCount = chapterBlocks.filter((block) => learningStatuses[block.id] === 'review').length
          return (
            <details className="tm-vocab-chapter" id={index === 0 ? kind : `${kind}-bab-${chapter}`} key={chapter}>
              <summary className="tm-vocab-chapter-summary">
                <div className="tm-vocab-chapter-heading">
                  <span>BAB {String(chapter).padStart(2, '0')}</span>
                  <b>Bab {chapter}</b>
                  <small>{chapterBlocks.length} {itemLabel}</small>
                </div>
                <div className="tm-vocab-chapter-stats">
                  {learnedCount > 0 && <span className="learned">✓ {learnedCount} dipelajari</span>}
                  {reviewCount > 0 && <span className="review">↻ {reviewCount} ulang</span>}
                  <i>⌄</i>
                </div>
              </summary>
              <div className="tm-vocab-chapter-items">
                {chapterBlocks.map((block) => vocabularyOnly
                  ? renderVocabularyBlock(block, `block-${block.id}`)
                  : renderMaterialBlock(block, `block-${block.id}`))}
              </div>
            </details>
          )
        })}
      </div>
    )
  }

  return (
    <div className="tm-section-stack">
      {blocks.map((block) => {
        const meta = kindMeta[block.kind] || { label: 'Materi', icon: '✦' }
        const anchorId = anchorFor.get(block.id) || `block-${block.id}`
        const initialStatus = learningStatuses[block.id] || 'not_started'

        if (block.kind === 'vocabulary') return renderVocabularyBlock(block, anchorId)
        if (block.kind === 'kanji' || block.kind === 'grammar') return renderMaterialBlock(block, anchorId)

        return (
          <article className="tm-material-card" data-block-id={block.id} id={anchorId} key={block.id}>
            {block.kind !== 'grammar' && block.kind !== 'reading' && block.kind !== 'listening' && (
              <div className="tm-card-header"><div className="tm-icon-box">{meta.icon}</div><div className="tm-card-title"><small>{meta.label}</small>{block.title && <h2>{block.title}</h2>}</div></div>
            )}
            <BlockContent block={block} />
            <div className={`tm-material-actions tm-material-actions-status${preview ? ' preview' : ''}`}>
              {!preview && <MaterialBookmark blockId={block.id} initialBookmarked={bookmarkedIds.has(block.id)} />}
              <BlockLearningStatusControl blockId={block.id} initialStatus={initialStatus} preview={preview} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
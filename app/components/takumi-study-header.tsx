import Link from 'next/link'

type StudyKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening' | 'quiz'

type Props = {
  backHref: string
  active: StudyKind
  progressPercent?: number | null
  learningStatus?: string | null
  anchors?: Partial<Record<Exclude<StudyKind, 'quiz'>, string>>
  quizHref?: string | null
  compact?: boolean
}

const navItems: Array<{ key: StudyKind; label: string; icon: string }> = [
  { key: 'vocabulary', label: 'Kosakata', icon: '▤' },
  { key: 'kanji', label: 'Kanji', icon: '字' },
  { key: 'grammar', label: 'Bunpou', icon: '▧' },
  { key: 'reading', label: 'Dokkai', icon: '▥' },
  { key: 'listening', label: 'Choukai', icon: '◉' },
  { key: 'quiz', label: 'Kuis', icon: '◌' },
]

export default function TakumiStudyHeader({ backHref, active, progressPercent = 0, learningStatus = 'Belum dipelajari', anchors = {}, quizHref, compact = false }: Props) {
  const safePercent = Math.min(100, Math.max(0, Math.round(progressPercent || 0)))

  return (
    <header className={`tm-study-header${compact ? ' tm-study-header-compact' : ''}`}>
      <div className="tm-brand-row">
        <Link className="tm-back" href={backHref} aria-label="Kembali">←</Link>
        <Link className="tm-wordmark" href="/portal/dashboard"><b>Takumi</b> <span>Japanese</span></Link>
        <Link className="tm-header-bookmark" href="/portal/bookmark" aria-label="Buka bookmark">♡</Link>
      </div>

      <nav className="tm-study-nav" aria-label="Navigasi materi">
        {navItems.map((item) => {
          let href: string | null = null
          if (item.key === 'quiz') href = quizHref || null
          else href = anchors[item.key] || null
          const className = `tm-study-tab${active === item.key ? ' active' : ''}${!href ? ' disabled' : ''}`
          return href
            ? <Link className={className} href={href} key={item.key}><i>{item.icon}</i><span>{item.label}</span></Link>
            : <span className={className} key={item.key}><i>{item.icon}</i><span>{item.label}</span></span>
        })}
      </nav>

      {!compact && (
        <div className="tm-progress-characters">
          <div className="tm-mascot tm-mascot-boy">
            <img src="/mascots/takumi-kun.webp" alt="Takumi kun" width="160" height="153" />
            <span>Takumi kun</span>
          </div>

          <div className="tm-session-progress">
            <b>Progres materi {safePercent}%</b>
            <div className="tm-session-track"><i style={{ width: `${safePercent}%` }} /></div>
            <div className="tm-progress-legend" aria-label={`Status belajar: ${learningStatus}`}>
              <span><i className={learningStatus === 'Sudah dipelajari' ? 'done' : 'todo'} />Sudah dipelajari</span>
              <span><i className={learningStatus === 'Perlu dipelajari lagi' ? 'current' : 'todo'} />Perlu dipelajari lagi</span>
              <span><i className={learningStatus === 'Belum dipelajari' ? 'current' : 'todo'} />Belum dipelajari</span>
            </div>
          </div>

          <div className="tm-mascot tm-mascot-girl">
            <img src="/mascots/hana-chan.webp" alt="Hana chan" width="160" height="153" />
            <span>Hana chan</span>
          </div>
        </div>
      )}
    </header>
  )
}

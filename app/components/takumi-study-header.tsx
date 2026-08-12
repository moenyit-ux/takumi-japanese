import Link from 'next/link'

type StudyKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening' | 'quiz'

type Props = {
  backHref: string
  active: StudyKind
  sessionNo?: number | null
  totalSessions?: number | null
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

export default function TakumiStudyHeader({ backHref, active, sessionNo, totalSessions, anchors = {}, quizHref, compact = false }: Props) {
  const safeTotal = totalSessions && totalSessions > 0 ? totalSessions : null
  const percent = safeTotal && sessionNo ? Math.min(100, Math.max(0, Math.round((sessionNo / safeTotal) * 100))) : 0

  return (
    <header className={`tm-study-header${compact ? ' tm-study-header-compact' : ''}`}>
      <div className="tm-brand-row">
        <Link className="tm-back" href={backHref} aria-label="Kembali">←</Link>
        <Link className="tm-wordmark" href="/portal/dashboard"><b>Takumi</b> <span>Japanese</span></Link>
        <Link className="tm-header-bookmark" href="/portal/bookmark" aria-label="Buka bookmark">♡</Link>
      </div>

      <nav className="tm-study-nav" aria-label="Navigasi materi sesi">
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
            <b>{safeTotal && sessionNo ? `Progres Sesi ${sessionNo}/${safeTotal}` : 'Progres Belajar'}</b>
            <div className="tm-session-track"><i style={{ width: `${percent}%` }} /></div>
            <div className="tm-progress-legend"><span><i className="done" />Selesai</span><span><i className="current" />Sedang dipelajari</span><span><i className="todo" />Belum</span></div>
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

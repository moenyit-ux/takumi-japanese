import Link from 'next/link'
import PortalNavIcon from './portal-nav-icon'

type StudyKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening' | 'quiz'

type Props = {
  backHref: string
  active: StudyKind
  title?: string
  meta?: string
  progressPercent?: number | null
  learningStatus?: string | null
  anchors?: Partial<Record<Exclude<StudyKind, 'quiz'>, string>>
  quizHref?: string | null
  compact?: boolean
}

const navItems: Array<{ key: StudyKind; label: string; mark: string }> = [
  { key: 'vocabulary', label: 'Kosakata', mark: '語' },
  { key: 'kanji', label: 'Kanji', mark: '漢' },
  { key: 'grammar', label: 'Bunpou', mark: '文' },
  { key: 'reading', label: 'Dokkai', mark: '読' },
  { key: 'listening', label: 'Choukai', mark: '聴' },
  { key: 'quiz', label: 'Kuis', mark: '問' },
]

function formatStudyTitle(title: string) {
  const legacySession = /^Sesi\s+(N\d+)\s+\d+$/i.exec(title.trim())
  if (!legacySession) return title
  return `Materi ${legacySession[1].toUpperCase()}`
}

export default function TakumiStudyHeader({ backHref, active, title = 'Ruang belajar Takumi', meta = 'Materi bahasa Jepang', progressPercent = 0, learningStatus = 'Belum dipelajari', anchors = {}, quizHref, compact = false }: Props) {
  const safePercent = Math.min(100, Math.max(0, Math.round(progressPercent || 0)))
  const displayTitle = formatStudyTitle(title)
  const isLearned = learningStatus === 'Sudah dipelajari'
  const isReview = learningStatus === 'Perlu dipelajari lagi' || learningStatus === 'Ingin dipelajari lagi'
  const isNotStarted = learningStatus === 'Belum dipelajari'

  return (
    <header className={`tm-study-header${compact ? ' tm-study-header-compact' : ''}`}>
      <div className="tm-study-hero">
        <div className="tm-brand-row">
          <Link className="tm-back" href={backHref} aria-label="Kembali"><span aria-hidden="true">←</span></Link>
          <Link className="tm-wordmark" href="/portal/dashboard"><b>Takumi</b><span>Japanese</span></Link>
          <Link className="tm-header-bookmark" href="/portal/bookmark" aria-label="Buka halaman bookmark"><PortalNavIcon name="bookmark" /></Link>
        </div>

        <div className="tm-study-hero-content">
          <div className="tm-study-heading">
            <small>TAKUMI · RUANG BELAJAR</small>
            <h1>{displayTitle}</h1>
            <p>{meta}</p>
          </div>

          {!compact && (
            <div className="tm-session-progress">
              <div className="tm-session-progress-head"><span>Progres materi</span><b>{safePercent}%</b></div>
              <div className="tm-session-track"><i style={{ width: `${safePercent}%` }} /></div>
              <div className="tm-progress-legend" aria-label={`Status belajar: ${learningStatus}`}>
                <span aria-current={isLearned ? 'true' : undefined}><i className="tm-legend-learned" />Sudah dipelajari</span>
                <span aria-current={isReview ? 'true' : undefined}><i className="tm-legend-review" />Pelajari lagi</span>
                <span aria-current={isNotStarted ? 'true' : undefined}><i className="tm-legend-not-started" />Belum dipelajari</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="tm-study-nav" aria-label="Navigasi materi">
        {navItems.map((item) => {
          let href: string | null = null
          if (item.key === 'quiz') href = quizHref || null
          else href = anchors[item.key] || null
          const className = `tm-study-tab${active === item.key ? ' active' : ''}${!href ? ' disabled' : ''}`
          return href
            ? <Link className={className} href={href} key={item.key}><i>{item.mark}</i><span>{item.label}</span></Link>
            : <span className={className} key={item.key}><i>{item.mark}</i><span>{item.label}</span></span>
        })}
      </nav>
    </header>
  )
}

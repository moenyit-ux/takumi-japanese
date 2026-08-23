import Link from 'next/link'
import styles from './public-shell.module.css'

export function PublicBrand() {
  return (
    <span className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true">匠</span>
      <span className={styles.brandName}>
        <strong>Takumi</strong>
        <small>Japanese</small>
      </span>
    </span>
  )
}

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brandLink} href="/" aria-label="Takumi Japanese — Beranda">
        <PublicBrand />
      </Link>

      <nav className={styles.nav} aria-label="Navigasi utama">
        <details className={styles.courseMenu}>
          <summary>
            Kursus <span aria-hidden="true">⌄</span>
          </summary>
          <div className={styles.courseDropdown} aria-label="Level kursus">
            <Link href="/#kursus-dasar"><strong>Dasar</strong><small>Fondasi</small></Link>
            <Link href="/#kursus-n5"><strong>N5</strong><small>Pemula</small></Link>
            <Link href="/#kursus-n4"><strong>N4</strong><small>Dasar lanjut</small></Link>
            <Link href="/#kursus-n3"><strong>N3</strong><small>Menengah</small></Link>
            <span className={styles.courseSoon}><strong>N2</strong><small>Segera</small></span>
            <span className={styles.courseSoon}><strong>N1</strong><small>Segera</small></span>
          </div>
        </details>
        <details className={styles.courseMenu}>
          <summary>
            Belajar mandiri <span aria-hidden="true">⌄</span>
          </summary>
          <div className={styles.courseDropdown} aria-label="Level belajar mandiri">
            <span className={styles.courseSoon}><strong>Dasar</strong><small>Segera</small></span>
            <span className={styles.courseSoon}><strong>N5</strong><small>Segera</small></span>
            <Link href="/#belajar-mandiri-n4"><strong>N4</strong><small>Tersedia</small></Link>
            <Link href="/#belajar-mandiri-n3"><strong>N3</strong><small>Tersedia</small></Link>
            <span className={styles.courseSoon}><strong>N2</strong><small>Segera</small></span>
            <span className={styles.courseSoon}><strong>N1</strong><small>Segera</small></span>
          </div>
        </details>
        <details className={styles.courseMenu}>
          <summary>
            SSW <span aria-hidden="true">⌄</span>
          </summary>
          <div className={styles.courseDropdown} aria-label="Program SSW">
            <span className={styles.courseSoon}>
              <strong>Program SSW</strong>
              <small>Segera hadir</small>
            </span>
          </div>
        </details>
        <details className={styles.courseMenu}>
          <summary>
            Cerita Takumi <span aria-hidden="true">⌄</span>
          </summary>
          <div className={styles.courseDropdown} aria-label="Tentang Takumi">
            <Link href="/profil/visi-misi">
              <strong>Visi &amp; Misi</strong>
              <small>Arah</small>
            </Link>
            <Link href="/profil/profil-pendiri">
              <strong>Profil Pendiri</strong>
              <small>Cerita</small>
            </Link>
            <Link href="/profil/pengajar">
              <strong>Pengajar</strong>
              <small>Tim</small>
            </Link>
            <Link href="/profil/testimoni">
              <strong>Testimoni</strong>
              <small>Siswa</small>
            </Link>
          </div>
        </details>
      </nav>

      <Link className={styles.login} href="/login">
        Masuk <span aria-hidden="true">↗</span>
      </Link>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLead}>
        <PublicBrand />
        <p>Bahasa Jepang untuk hidup yang sedang kamu bangun.</p>
      </div>

      <div className={styles.footerLinks}>
        <div>
          <small>PROGRAM</small>
          <Link href="/#kursus">Kursus tatap muka</Link>
          <Link href="/#belajar-mandiri">Belajar mandiri</Link>
          <Link href="/login">Masuk siswa</Link>
        </div>
        <div>
          <small>TAKUMI</small>
          <Link href="/profil/visi-misi">Visi &amp; misi</Link>
          <Link href="/profil/profil-pendiri">Profil pendiri</Link>
          <Link href="/profil/pengajar">Pengajar</Link>
          <Link href="/profil/testimoni">Testimoni</Link>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span>© 2026 Takumi Japanese</span>
        <span>人生は一生の勉強</span>
      </div>
    </footer>
  )
}

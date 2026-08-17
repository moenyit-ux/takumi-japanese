import Link from 'next/link'
import styles from './pengajar.module.css'

function Brand() {
  return (
    <div className="brand">
      <span>匠</span>
      <div>
        <b>Takumi</b>
        <small>Japanese</small>
      </div>
    </div>
  )
}

const teachers = [
  {
    name: 'Wahyu Imamuddin',
    role: 'Pendiri / JLPT N1',
    initials: 'WI',
    level: 'JLPT N1',
  },
  {
    name: 'Agus Dwi Priambodo',
    role: 'Pengajar / JLPT N3',
    initials: 'ADP',
    level: 'JLPT N3',
  },
]

export default function TeachersPage() {
  return (
    <main>
      <header>
        <Link href="/" aria-label="Kembali ke beranda"><Brand /></Link>
        <nav>
          <Link href="/profil/visi-misi">Visi &amp; Misi</Link>
          <Link href="/profil/profil-pendiri">Profil Pendiri</Link>
          <Link href="/profil/pengajar">Pengajar</Link>
          <Link href="/profil#testimoni">Testimoni</Link>
        </nav>
        <Link className="btn ghost" href="/">Beranda</Link>
      </header>

      <section className={styles.hero}>
        <div className="eyebrow">PROFIL TAKUMI</div>
        <h1>Pengajar</h1>
        <p>Kenali orang-orang yang mendampingi proses belajar di Takumi Japanese.</p>
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Pengajar</span>
        </div>
      </section>

      <section className={styles.teacherSection}>
        <div className={styles.teacherGrid}>
          {teachers.map((teacher) => (
            <article className={styles.teacherCard} key={teacher.name}>
              <div className={styles.photoFrame}>
                <div className={styles.photoPlaceholder} aria-label={`Area foto ${teacher.name}`}>
                  <span>{teacher.initials}</span>
                  <small>Foto pengajar</small>
                </div>
                <div className={styles.levelBadge}>{teacher.level}</div>
              </div>
              <div className={styles.teacherInfo}>
                <h2>{teacher.name}</h2>
                <p>{teacher.role}</p>
              </div>
            </article>
          ))}
        </div>

        <p className={styles.photoNote}>Foto asli pengajar dapat dipasang di area ini tanpa mengubah struktur halaman.</p>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

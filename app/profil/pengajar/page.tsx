import Link from 'next/link'
import styles from './pengajar.module.css'
import { PublicFooter, PublicHeader } from '../../components/public-shell'

const teachers = [
  {
    name: 'Wahyu Imamuddin',
    role: 'Pendiri / JLPT N1',
    initials: 'WI',
    level: 'JLPT N1',
    focus: 'Strategi belajar · JLPT · Pengalaman hidup dan kerja di Jepang',
  },
  {
    name: 'Agus Dwi Priambodo',
    role: 'Pengajar / JLPT N3',
    initials: 'ADP',
    level: 'JLPT N3',
    focus: 'Materi dasar · Latihan terarah · Pendampingan siswa',
  },
]

export default function TeachersPage() {
  return (
    <main className="publicPage">
      <PublicHeader />

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
              <div className={styles.profileMark} aria-hidden="true">
                <span>{teacher.initials}</span>
                <strong>講師</strong>
              </div>
              <div className={styles.teacherInfo}>
                <div className={styles.levelBadge}>{teacher.level}</div>
                <h2>{teacher.name}</h2>
                <p>{teacher.role}</p>
                <small>{teacher.focus}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}

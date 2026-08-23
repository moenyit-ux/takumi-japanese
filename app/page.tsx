import Link from 'next/link'
import { PublicFooter, PublicHeader } from './components/public-shell'
import styles from './home.module.css'

const classroomPrograms = [
  {
    level: 'D', label: 'Kelas Dasar', title: 'Mulai dari fondasi',
    description: 'Pelafalan, hiragana, katakana, percakapan sehari-hari, dan pola kalimat dasar untuk pemula yang benar-benar mulai dari nol.',
    curriculum: ['あ・ア huruf Jepang', '±300 kosakata', '30 kanji dasar'],
    duration: '3 bulan', meetings: '24 pertemuan', pace: '8× / bulan', price: 'Rp250.000', slug: 'dasar',
  },
  {
    level: 'N5', label: 'Kursus JLPT N5', title: 'Kuatkan level pemula',
    description: 'Program terarah untuk memahami kemampuan dasar JLPT dan membangun kebiasaan belajar yang konsisten.',
    curriculum: ['750 kosakata', '120 kanji', '75 tata bahasa'],
    duration: '6 bulan', meetings: '48 pertemuan', pace: '8× / bulan', price: 'Rp350.000', slug: 'n5',
  },
  {
    level: 'N4', label: 'Kursus JLPT N4', title: 'Bangun pondasi yang kuat',
    description: 'Pendampingan langsung untuk menguasai materi N4 melalui penjelasan, latihan, dan evaluasi yang terukur.',
    curriculum: ['1.000 kosakata', '200 kanji', '100 tata bahasa'],
    duration: '9 bulan', meetings: '72 pertemuan', pace: '8× / bulan', price: 'Rp450.000', slug: 'n4',
  },
  {
    level: 'N3', label: 'Kursus JLPT N3', title: 'Lanjut ke level menengah',
    description: 'Perkuat kemampuan N3 melalui pembelajaran langsung, latihan intensif, dan evaluasi bersama pengajar.',
    curriculum: ['2.000 kosakata', '350 kanji', '130 tata bahasa'],
    duration: '12 bulan', meetings: '96 pertemuan', pace: '8× / bulan', price: 'Rp550.000', slug: 'n3',
  },
]

const selfStudyPrograms = [
  {
    level: 'N4', price: 'Rp299.000', summary: '1.000 kosakata · 200 kanji', grammar: '100 tata bahasa',
    details: ['25 latihan membaca', '25 latihan mendengarkan', '5 simulasi JLPT', 'Kuis, bookmark, dan statistik belajar'],
  },
  {
    level: 'N3', price: 'Rp399.000', summary: '2.000 kosakata · 350 kanji', grammar: '130 tata bahasa',
    details: ['25 latihan membaca', '25 latihan mendengarkan', '5 simulasi JLPT', 'Kuis, bookmark, dan statistik belajar'],
  },
]

export default function Home() {
  return (
    <main className={styles.homepage}>
      <PublicHeader />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>INDONESIA × JEPANG · SEJAK 2024</div>
          <h1>Bahasa Jepang untuk hidup yang <em>sedang kamu bangun.</em></h1>
          <p className={styles.heroLead}>Belajar dengan arah yang jelas—dibangun dari pengalaman nyata bekerja, mengajar, dan menata karier di Jepang. Tersedia kelas langsung dan belajar mandiri untuk JLPT N4–N3.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="#kursus">Lihat program <span aria-hidden="true">→</span></Link>
            <Link className={styles.secondaryAction} href="/login">Coba 15% materi gratis</Link>
          </div>
        </div>
      </section>

      <section id="kursus" className={styles.programs}>
        <div className={styles.sectionHeading}>
          <div><div className={styles.sectionLabel}>KURSUS TATAP MUKA</div><h2>Belajar langsung.<br />Tumbuh bersama.</h2></div>
          <p>Program reguler dengan ritme konsisten dan pendampingan pengajar. Setiap siswa kursus mendapat akses Website Premium Takumi tanpa biaya tambahan.</p>
        </div>

        <div className={styles.programGrid}>
          {classroomPrograms.map((program, index) => (
            <article className={styles.programCard} id={`kursus-${program.slug}`} key={program.level}>
              <div className={styles.programNumber}>{String(index + 1).padStart(2, '0')}</div>
              <div className={styles.programHead}>
                <small>{program.label}</small>
                <div className={styles.levelOrnament}><span className={styles.level}>{program.level}</span></div>
                <h3>{program.title}</h3>
              </div>
              <p className={styles.programDescription}>{program.description}</p>
              <ul className={styles.curriculum}>{program.curriculum.map((item) => <li key={item}>{item}</li>)}</ul>
              <dl className={styles.programFacts}>
                <div><dt>Durasi</dt><dd>{program.duration}<small>{program.meetings}</small></dd></div>
                <div><dt>Ritme</dt><dd>{program.pace}<small>80 menit / pertemuan</small></dd></div>
              </dl>
              <div className={styles.programPrice}><span>Biaya kelas</span><strong>{program.price}<small>/ bulan</small></strong></div>
              <div className={styles.programActions}>
                <Link href={`/portal/support?kelas=${program.slug}&program=reguler`}>Konsultasi reguler <span aria-hidden="true">→</span></Link>
                <Link href={`/portal/support?kelas=${program.slug}&program=akselerasi`}>Jalur akselerasi <span aria-hidden="true">→</span></Link>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.accelerationNote}>
          <span>急</span>
          <div><small>KELAS AKSELERASI</small><strong>Punya target yang lebih dekat?</strong></div>
          <p>Kelas akselerasi ditujukan untuk siswa dengan tenggat JLPT, studi, atau kebutuhan kerja yang lebih dekat. Setelah konsultasi awal, pengajar menyusun fokus materi, jumlah pertemuan, ritme latihan, dan evaluasi berdasarkan kemampuan awal, waktu belajar yang tersedia, serta target tanggal siswa.</p>
        </div>
      </section>

      <section id="belajar-mandiri" className={styles.selfStudy}>
        <div className={styles.selfStudyIntro}>
          <div className={styles.sectionLabel}>WEBSITE PREMIUM</div>
          <h2>Belajar mandiri,<br />tanpa berjalan sendiri.</h2>
          <p>Pelajari materi sesuai ritmemu, simpan bagian yang ingin diulang, dan pantau progres dari satu tempat.</p>
          <div className={styles.selfStudyNote}><span>15%</span> materi bisa dicoba sebelum membeli.</div>
        </div>

        <div className={styles.planList}>
          {selfStudyPrograms.map((program) => (
            <article className={styles.plan} key={program.level} id={`belajar-mandiri-${program.level.toLowerCase()}`}>
              <div className={styles.planTop}><span className={styles.planLevel}>{program.level}</span><div><small>SEKALI BAYAR</small><strong>{program.price}</strong></div></div>
              <p>{program.summary}<span>{program.grammar}</span></p>
              <ul>{program.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
              <Link href="/login">Mulai belajar {program.level} <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}

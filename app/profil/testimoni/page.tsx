import Link from 'next/link'
import styles from './testimoni.module.css'
import { PublicFooter, PublicHeader } from '../../components/public-shell'

type Testimonial = {
  name: string
  initials: string
  program: string
  level: 'N3' | 'N4'
  quote: string
}

const testimonials: Testimonial[] = [
  {
    name: 'Satata',
    initials: 'SA',
    program: 'SSW',
    level: 'N3',
    quote: 'Materinya jelas banget. Dari nol sampai paham pola kalimat!',
  },
  {
    name: 'Sendhy',
    initials: 'SE',
    program: 'SSW',
    level: 'N3',
    quote: 'Senang bisa mendapatkan bimbingan dari senseinya,karena berkat pengalaman dan materi yang di ajarkan saya bisa lolos tes N3 dengan nilai memuaskan tanpa kesulitan.',
  },
  {
    name: 'Tri',
    initials: 'TR',
    program: 'SSW',
    level: 'N3',
    quote: 'Senseinya baik, sabar, santai. cara penyampaiannya simple, jelas dan mudah dipahami.',
  },
  {
    name: 'Prima',
    initials: 'PR',
    program: 'Jisshuusei',
    level: 'N3',
    quote: 'Worth it. Karena bikin saya ngerti.',
  },
  {
    name: 'Wisnu',
    initials: 'WI',
    program: 'Jisshuusei',
    level: 'N4',
    quote: 'Instruktur di LPK Takumi ramah dan profesional, materi yang diberikan jelas dan mudah dipahami. Saya merasa banyak berkembang setelah mengikuti belajar di sini.',
  },
  {
    name: 'Hafidz',
    initials: 'HA',
    program: 'Jisshuusei',
    level: 'N4',
    quote: 'Pembelajaranya dari Imam sensei sangat mudah dimengerti.',
  },
  {
    name: 'Deky',
    initials: 'DE',
    program: 'Jisshuusei',
    level: 'N4',
    quote: 'Kesuksesan datang di orang yang mau berusaha .1% skill 99% tekad dan kemauan !!',
  },
  {
    name: 'Hasta',
    initials: 'HT',
    program: 'Jisshuusei',
    level: 'N4',
    quote: 'Padi yg di panen hari ini ,tidak di tanam kemarin sore .Konsistensi adalah kunci untuk mencapai hasil luar biasa,dan Siswa hebat tentunya lahir dari didikan pembimbing yg hebat.',
  },
  {
    name: 'Nur',
    initials: 'NU',
    program: 'Jisshuusei',
    level: 'N4',
    quote: 'Langkah kecil menuju mimpi besar di Jepang!',
  },
]

export default function TestimonialsPage() {
  return (
    <main className="publicPage">
      <PublicHeader />

      <section className={styles.hero}>
        <div className="eyebrow">PROFIL TAKUMI</div>
        <h1>Cerita dari perjalanan belajar mereka.</h1>
        <p>Pengalaman nyata dari siswa yang pernah belajar bersama Takumi. Kami menampilkan cerita mereka apa adanya agar calon siswa dapat melihat proses belajar dari sudut pandang peserta sendiri.</p>
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Testimoni</span>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.label}>CERITA SISWA</div>
            <h2>Pengalaman nyata selama belajar bersama Takumi.</h2>
          </div>
          <div className={styles.verifiedNote}>
            <span>✓</span>
            <p>Testimoni siswa Takumi yang sudah pernah dipublikasikan.</p>
          </div>
        </div>

        <div className={styles.testimonialGrid}>
          {testimonials.map((testimonial, index) => (
            <article className={styles.testimonialCard} key={`${testimonial.name}-${testimonial.level}`}>
              <div className={styles.cardMeta}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.levelBadge}>{testimonial.level}</span>
              </div>
              <div className={styles.cardBody}>
                <blockquote>“{testimonial.quote}”</blockquote>
                <div className={styles.studentRow}>
                  <span className={styles.initials} aria-hidden="true">{testimonial.initials}</span>
                  <strong>{testimonial.name}<small>{testimonial.program}</small></strong>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className={styles.principles}>
          <article>
            <span>01</span>
            <h3>Pengalaman nyata</h3>
            <p>Testimoni berasal dari siswa yang benar-benar pernah mengikuti proses belajar bersama Takumi.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Konteks yang jelas</h3>
            <p>Status peserta dan level belajar ditampilkan agar setiap cerita tetap memiliki konteks.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Tidak dibuat-buat</h3>
            <p>Isi testimoni dipertahankan sesuai cerita yang sebelumnya sudah diberikan oleh siswa.</p>
          </article>
        </section>
      </section>

      <PublicFooter />
    </main>
  )
}

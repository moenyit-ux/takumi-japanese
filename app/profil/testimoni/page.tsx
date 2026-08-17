import Link from 'next/link'
import styles from './testimoni.module.css'

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

type Testimonial = {
  name: string
  initials: string
  program: string
  detail?: string
  quote: string
}

const testimonials: Testimonial[] = []

export default function TestimonialsPage() {
  return (
    <main>
      <header>
        <Link href="/" aria-label="Kembali ke beranda"><Brand /></Link>
        <nav>
          <Link href="/profil/visi-misi">Visi &amp; Misi</Link>
          <Link href="/profil/profil-pendiri">Profil Pendiri</Link>
          <Link href="/profil/pengajar">Pengajar</Link>
          <Link href="/profil/testimoni">Testimoni</Link>
        </nav>
        <Link className="btn ghost" href="/">Beranda</Link>
      </header>

      <section className={styles.hero}>
        <div className="eyebrow">PROFIL TAKUMI</div>
        <h1>Cerita dari perjalanan belajar mereka.</h1>
        <p>Pengalaman siswa membantu kami melihat apa yang benar-benar bermanfaat dalam proses belajar. Testimoni yang tampil di halaman ini hanya akan dipublikasikan setelah mendapat izin dari siswa.</p>
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
            <p>Dipublikasikan dengan persetujuan siswa.</p>
          </div>
        </div>

        {testimonials.length > 0 ? (
          <div className={styles.testimonialGrid}>
            {testimonials.map((testimonial) => (
              <article className={styles.testimonialCard} key={`${testimonial.name}-${testimonial.program}`}>
                <div className={styles.quoteMark}>“</div>
                <blockquote>{testimonial.quote}</blockquote>
                <div className={styles.studentInfo}>
                  <div className={styles.avatar}>{testimonial.initials}</div>
                  <div>
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.program}</span>
                    {testimonial.detail ? <small>{testimonial.detail}</small> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>声</div>
            <div>
              <div className={styles.label}>TESTIMONI SEGERA HADIR</div>
              <h2>Belum ada testimoni yang dipublikasikan.</h2>
              <p>Kami memilih menunggu cerita nyata dari siswa dan meminta izin terlebih dahulu sebelum menampilkannya di website.</p>
            </div>
          </div>
        )}

        <section className={styles.principles}>
          <article>
            <span>01</span>
            <h3>Pengalaman nyata</h3>
            <p>Testimoni berasal dari siswa yang benar-benar mengikuti proses belajar di Takumi.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Konteks yang jelas</h3>
            <p>Level atau program belajar ditampilkan agar pengalaman siswa tidak terlepas dari konteksnya.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Dengan persetujuan</h3>
            <p>Nama, foto, maupun cerita siswa tidak dipublikasikan tanpa izin.</p>
          </article>
        </section>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

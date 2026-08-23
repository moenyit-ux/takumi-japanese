import Link from 'next/link'
import { PublicFooter, PublicHeader } from '../components/public-shell'
import styles from './profil.module.css'

export default function ProfilePage() {
  return (
    <main className="publicPage">
      <PublicHeader />

      <section className={styles.profile}>
        <div className={styles.intro}>
          <div className="eyebrow">PROFIL TAKUMI</div>
          <h1>Mengenal Takumi Japanese lebih dekat.</h1>
          <p>Takumi Japanese dibangun untuk membantu pelajar Indonesia belajar secara bertahap dengan sistem yang tetap realistis dijalankan di tengah pekerjaan dan kehidupan sehari-hari.</p>
        </div>

        <div className={styles.profileGrid}>
          <article>
            <span>01</span>
            <h3>Visi &amp; Misi</h3>
            <p>Takumi ingin membuka akses pendidikan bahasa Jepang yang terjangkau, terpercaya, profesional, dan berdampak nyata bagi masa depan siswa.</p>
            <Link href="/profil/visi-misi">Baca Visi &amp; Misi →</Link>
          </article>

          <article>
            <span>02</span>
            <h3>Profil Pendiri</h3>
            <p>Kisah Wahyu Imamuddin membentuk arah Takumi: dari kegagalan, perjuangan belajar mandiri, pengalaman mengajar, hingga bekerja dan membangun karier di Jepang.</p>
            <Link href="/profil/profil-pendiri">Baca Profil Pendiri →</Link>
          </article>

          <article id="pengajar">
            <span>03</span>
            <h3>Pengajar</h3>
            <p>Kenali pengajar Takumi yang mendampingi proses belajar dengan fokus pada pemahaman materi, latihan yang terarah, serta kebutuhan siswa pada setiap level.</p>
            <Link href="/profil/pengajar">Lihat Pengajar →</Link>
          </article>

          <article id="testimoni">
            <span>04</span>
            <h3>Testimoni</h3>
            <p>Cerita dan pengalaman siswa akan ditampilkan setelah mendapat izin untuk dipublikasikan, sehingga testimoni yang tampil benar-benar berasal dari pengalaman belajar nyata.</p>
            <Link href="/profil/testimoni">Lihat Testimoni →</Link>
          </article>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}

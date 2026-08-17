import Link from 'next/link'
import styles from './visi-misi.module.css'

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

const missions = [
  'Membuka akses pendidikan bahasa Jepang bagi seluruh anak muda Indonesia, dengan biaya terjangkau namun kualitas pengajaran tetap unggul.',
  'Mempersiapkan siswa menghadapi ujian bahasa Jepang (JLPT & SSW) melalui kurikulum yang terstruktur, praktis, dan mudah dipahami.',
  'Memberikan pelatihan keterampilan kerja sesuai bidang yang dibutuhkan di Jepang (pertanian, perikanan, keperawatan, manufaktur, dll).',
  'Mendampingi siswa hingga berangkat ke Jepang, bukan hanya sebagai pekerja, tetapi juga sebagai pembelajar yang mampu mengembangkan diri dan mengumpulkan modal untuk masa depan.',
  'Membangun komunitas positif yang saling mendukung, agar siswa tidak hanya belajar bahasa, tetapi juga menumbuhkan mentalitas disiplin, kerja keras, dan semangat pantang menyerah khas Jepang.',
]

const values = [
  { title: 'Terjangkau', text: 'Semua anak muda berhak mendapat kesempatan.' },
  { title: 'Terpercaya', text: 'Transparan, jujur, dan bertanggung jawab dalam setiap langkah.' },
  { title: 'Profesional', text: 'Mengedepankan kualitas pengajaran dan bimbingan kerja.' },
  { title: 'Berkelanjutan', text: 'Membantu siswa tidak hanya untuk berangkat, tapi juga menata masa depan.' },
]

export default function VisionMissionPage() {
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
        <h1>Visi, misi, dan nilai yang kami pegang.</h1>
        <p>Takumi Japanese dibangun bukan hanya untuk membantu siswa belajar bahasa Jepang, tetapi juga untuk membuka jalan menuju ilmu, karier, dan masa depan yang lebih baik.</p>
      </section>

      <section className={styles.content}>
        <article className={styles.visionCard}>
          <div className={styles.sectionNumber}>01</div>
          <div>
            <div className={styles.label}>VISI</div>
            <h2>Arah yang ingin kami tuju.</h2>
            <blockquote>“Menjadi lembaga kursus bahasa Jepang yang terjangkau, terpercaya, dan berdampak nyata bagi generasi muda Indonesia untuk meraih ilmu, karier, dan masa depan gemilang di Jepang maupun di tanah air.”</blockquote>
          </div>
        </article>

        <article className={styles.missionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionNumber}>02</div>
            <div>
              <div className={styles.label}>MISI</div>
              <h2>Langkah yang kami jalankan.</h2>
            </div>
          </div>
          <ol className={styles.missionList}>
            {missions.map((mission, index) => (
              <li key={mission}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{mission}</p>
              </li>
            ))}
          </ol>
        </article>

        <section className={styles.valuesSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionNumber}>03</div>
            <div>
              <div className={styles.label}>NILAI UTAMA · CORE VALUES</div>
              <h2>Prinsip yang menjadi dasar Takumi.</h2>
            </div>
          </div>
          <div className={styles.valuesGrid}>
            {values.map((value) => (
              <article key={value.title}>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

import Link from 'next/link'
import styles from './profil-pendiri.module.css'

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

const milestones = [
  { year: '2012', text: 'Berangkat ke Jepang sebagai jisshuusei di usia 19 tahun.' },
  { year: '2012–2015', text: 'Belajar secara autodidak dan berhasil meraih JLPT N2 serta lulus 留学試験.' },
  { year: '2018–2020', text: 'Kembali bekerja di Jepang dan terus belajar di tengah pekerjaan yang padat.' },
  { year: '2023', text: 'Berhasil meraih JLPT N1 dan ダクト板金試験 1級.' },
  { year: '2024', text: 'Memperoleh SSW No.2 dan melanjutkan perjalanan profesional di Jepang.' },
]

export default function FounderProfilePage() {
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
        <div className="eyebrow">PROFIL PENDIRI</div>
        <h1>Perjalanan yang membentuk Takumi.</h1>
        <p>Dari kegagalan, belajar mandiri, mengajar, hingga kembali membangun karier di Jepang — pengalaman inilah yang menjadi dasar lahirnya Takumi Japanese.</p>
      </section>

      <section className={styles.profileSection}>
        <aside className={styles.identityCard}>
          <div className={styles.photoPlaceholder} aria-label="Foto Wahyu Imamuddin">
            <span>匠</span>
            <small>Foto Pendiri</small>
          </div>
          <div className={styles.identityText}>
            <div className={styles.label}>FOUNDER &amp; INSTRUCTOR</div>
            <h2>Wahyu Imamuddin</h2>
            <p>Belajar, bekerja, dan bertumbuh bersama pengalaman nyata di Indonesia dan Jepang.</p>
          </div>
        </aside>

        <article className={styles.storyCard}>
          <div className={styles.label}>CERITA PERJALANAN</div>
          <h2>Berawal dari kegagalan, kemudian memilih untuk terus belajar.</h2>

          <p>Saya, <strong>Wahyu Imamuddin</strong>, memulai perjalanan ini dari sebuah kegagalan. Saat SMA, saya <strong>tidak lulus Ujian Nasional</strong>. Pada masa itu, kegagalan tersebut dianggap sebagai akhir dari masa depan — kesempatan melanjutkan pendidikan tinggi maupun mendapatkan pekerjaan terasa hampir tertutup. Namun, saya tidak menyerah.</p>

          <p>Saya sempat masuk ke perguruan tinggi swasta jurusan <strong>Teknik Informatika</strong>, tetapi setelah tiga bulan saya memutuskan untuk berhenti demi mengejar kesempatan lain: <strong>bekerja di Jepang</strong>.</p>

          <p>Pada tahun <strong>2012</strong>, di usia <strong>19 tahun</strong>, saya berangkat ke Jepang sebagai <strong>jisshuusei (pemagang teknis)</strong>. Selama tiga tahun (2012–2015), saya belajar secara autodidak hingga berhasil lulus <strong>JLPT N2</strong> dan <strong>留学試験 (ujian masuk universitas Jepang)</strong>. Awalnya, saya berencana melanjutkan kuliah di Jepang, namun karena kendala pribadi, rencana tersebut harus saya tunda.</p>

          <p>Sepulang ke Indonesia, saya menjadi <strong>pengajar bahasa Jepang</strong> di salah satu LPK ternama di Jawa Tengah. Kesempatan kembali ke Jepang datang ketika saya mengikuti <strong>tes magang ke-3</strong> dan dinyatakan lolos. Pada periode <strong>2018–2020</strong>, saya kembali bekerja di Jepang. Saat itu Jepang tengah sibuk mempersiapkan Olimpiade 2020, sehingga pekerjaan sangat padat dan hampir setiap hari lembur. Waktu belajar terbatas, dan saya gagal meraih <strong>JLPT N1</strong>.</p>

          <p>Pandemi COVID-19 mengubah banyak hal. Kepulangan saya ke Indonesia pada <strong>2020</strong> yang semula hanya direncanakan enam bulan, akhirnya tertunda hingga dua tahun karena <strong>larangan masuk ke Jepang</strong>. Selama masa tersebut, saya mengajar <strong>bahasa Jepang di perguruan tinggi keperawatan</strong> di Yogyakarta.</p>

          <p>Pada tahun <strong>2022</strong>, Jepang kembali membuka akses, dan saya berangkat lagi dengan <strong>visa SSW No.1</strong>. Setahun kemudian, pada <strong>2023</strong>, saya berhasil meraih <strong>JLPT N1</strong> serta <strong>ダクト板金試験 1級 (Ujian Duct Sheet Metal Grade 1)</strong>. Pencapaian ini mengantarkan saya memperoleh <strong>SSW No.2</strong> pada tahun <strong>2024</strong>. Kini, saya bekerja sebagai <strong>manajer pekerja Indonesia</strong> di perusahaan Jepang yang dulu pernah menampung saya sebagai pemagang.</p>

          <p>Setelah perjalanan panjang ini, saya merasa sudah saatnya <strong>memberikan kembali kepada masyarakat</strong>. Saya menyadari betapa <strong>mahalnya biaya belajar bahasa Jepang</strong> saat ini, sehingga banyak anak muda yang kurang beruntung terhalang untuk mengejar mimpi ke Jepang.</p>

          <div className={styles.founderStatement}>
            <small>MENGAPA TAKUMI DIDIRIKAN</small>
            <p>Karena itulah saya mendirikan <strong>Takumi Japanese Class</strong> — sebuah lembaga kursus bahasa Jepang dengan <strong>biaya terjangkau, kualitas terjaga, dan waktu belajar yang fleksibel</strong>.</p>
          </div>
        </article>
      </section>

      <section className={styles.timelineSection}>
        <div className={styles.sectionHead}>
          <div className="eyebrow">PERJALANAN</div>
          <h2>Beberapa titik penting dalam perjalanan.</h2>
        </div>
        <div className={styles.timelineGrid}>
          {milestones.map((item) => (
            <article key={`${item.year}-${item.text}`}>
              <strong>{item.year}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.valuesSection}>
        <article>
          <small>NILAI YANG DIPEGANG</small>
          <h3>Belajar harus tetap terjangkau dan realistis.</h3>
          <p>Kesempatan belajar bahasa Jepang seharusnya dapat dijangkau lebih banyak orang tanpa mengorbankan kualitas pembelajaran.</p>
        </article>
        <article>
          <small>ARAH TAKUMI</small>
          <h3>Bukan hanya belajar bahasa, tetapi menata masa depan.</h3>
          <p>Bahasa Jepang adalah bekal. Tujuan akhirnya adalah membantu siswa membuka lebih banyak kesempatan untuk ilmu, karier, dan kehidupan yang lebih baik.</p>
        </article>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

import Link from 'next/link'

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

export default function ProfilePage() {
  return (
    <main>
      <header>
        <Link href="/" aria-label="Kembali ke beranda"><Brand /></Link>
        <nav>
          <a href="#visi-misi">Visi &amp; Misi</a>
          <a href="#profil-pendiri">Profil Pendiri</a>
          <a href="#pengajar">Pengajar</a>
          <a href="#testimoni">Testimoni</a>
        </nav>
        <Link className="btn ghost" href="/">Beranda</Link>
      </header>

      <section className="section publicProfile">
        <div className="publicSectionHeading">
          <div className="eyebrow">PROFIL TAKUMI</div>
          <h1 style={{ margin: '10px 0 12px', fontSize: 'clamp(38px, 5vw, 58px)', lineHeight: 1.08, letterSpacing: '-0.045em' }}>Mengenal Takumi Japanese lebih dekat.</h1>
          <p>Takumi Japanese dibangun untuk membantu pelajar Indonesia belajar secara bertahap dengan sistem yang tetap realistis dijalankan di tengah pekerjaan dan kehidupan sehari-hari.</p>
        </div>

        <div className="profileGrid">
          <article id="visi-misi">
            <span>01</span>
            <h3>Visi &amp; Misi</h3>
            <p>Membantu pelajar Indonesia meningkatkan kemampuan bahasa Jepang secara terarah, fleksibel, dan relevan dengan target JLPT maupun kehidupan nyata di Jepang.</p>
          </article>
          <article id="profil-pendiri">
            <span>02</span>
            <h3>Profil Pendiri</h3>
            <p>Takumi lahir dari pengalaman belajar bahasa Jepang secara mandiri dan dari pemahaman bahwa pekerja membutuhkan pola belajar yang ringkas, masuk akal, dan dapat dijalankan secara konsisten.</p>
          </article>
          <article id="pengajar">
            <span>03</span>
            <h3>Pengajar</h3>
            <p>Tim pengajar Takumi mendampingi proses belajar dengan fokus pada pemahaman materi, latihan yang terarah, serta kebutuhan siswa pada setiap level.</p>
          </article>
          <article id="testimoni">
            <span>04</span>
            <h3>Testimoni</h3>
            <p>Cerita dan pengalaman siswa akan ditampilkan di bagian ini setelah mendapat izin untuk dipublikasikan, sehingga testimoni yang tampil benar-benar berasal dari pengalaman belajar nyata.</p>
          </article>
        </div>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

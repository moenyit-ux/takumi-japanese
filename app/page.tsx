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

export default function Home() {
  return (
    <main>
      <header>
        <Brand />
        <nav>
          <a href="#program">Program</a>
          <a href="#cara">Cara belajar</a>
          <a href="#harga">Harga</a>
        </nav>
        <Link className="btn ghost" href="/login">Masuk</Link>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">JLPT N4 & N3 • UNTUK PEKERJA DI JEPANG</div>
          <h1>Naik level bahasa Jepang, <em>selangkah demi selangkah.</em></h1>
          <p>Materi ringkas, latihan terarah, dan simulasi JLPT yang dibuat agar tetap realistis dipelajari setelah bekerja.</p>
          <div className="actions">
            <Link className="btn primary" href="/login">Mulai gratis →</Link>
            <a className="btn ghost" href="#program">Lihat program</a>
          </div>
          <div className="trust">
            <span>✓ 15% materi gratis</span>
            <span>✓ ±60 menit per sesi</span>
          </div>
        </div>

        <div className="heroCard">
          <div className="sun">匠</div>
          <div>
            <div className="eyebrow">FILOSOFI TAKUMI</div>
            <h2>Belajar dari orang yang pernah melewati jalan yang sama.</h2>
            <p>Fokus pada JLPT, bahasa kerja, dan pola belajar yang tetap masuk akal ketika badan sudah lelah.</p>
            <div className="levelrow"><b>N4</b><span>48 sesi</span><b>N3</b><span>60 sesi</span></div>
          </div>
        </div>
      </section>

      <section id="program" className="section">
        <div className="eyebrow">PROGRAM UTAMA</div>
        <h2>Satu jalur belajar yang jelas</h2>
        <div className="three">
          <article><i>語</i><h3>Kosakata & Kanji</h3><p>Bangun fondasi yang dipakai kembali pada tata bahasa, bacaan, dan percakapan.</p></article>
          <article><i>文</i><h3>Tata Bahasa & 読解</h3><p>Penjelasan Indonesia yang ringkas, contoh praktis, serta latihan bertahap.</p></article>
          <article><i>聴</i><h3>聴解 & Simulasi</h3><p>Latihan mendengar bertahap hingga 5 paket simulasi untuk setiap level.</p></article>
        </div>
      </section>

      <section id="cara" className="band">
        <div className="split">
          <div>
            <div className="eyebrow">CARA BELAJAR</div>
            <h2>Bukan sekadar membuka materi.</h2>
            <p>Sesi selesai setelah materi dibaca dan nilai latihan minimal 70. Evaluasi setiap lima sesi dan simulasi membutuhkan nilai minimal 75.</p>
          </div>
          <ol>
            <li><b>01</b> Pelajari materi</li>
            <li><b>02</b> Kerjakan latihan</li>
            <li><b>03</b> Ulangi bagian lemah</li>
            <li><b>04</b> Ukur kesiapan dengan simulasi</li>
          </ol>
        </div>
      </section>

      <section id="harga" className="section">
        <div className="price">
          <div className="eyebrow">HARGA PELUNCURAN</div>
          <h2>¥980 / bulan</h2>
          <p>Akses penuh N4 & N3, evaluasi, bookmark, statistik, dan simulasi JLPT.</p>
          <Link className="btn primary" href="/login">Coba 15% materi gratis</Link>
        </div>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

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
            <a className="btn ghost" href="#cara">Cara belajar</a>
          </div>
          <div className="trust">
            <span>✓ 15% materi gratis</span>
            <span>✓ Belajar sesuai ritme sendiri</span>
          </div>
        </div>

        <div className="heroCard">
          <div className="sun">匠</div>
          <div>
            <div className="eyebrow">FILOSOFI TAKUMI</div>
            <h2>Belajar dari orang yang pernah melewati jalan yang sama.</h2>
            <p>Fokus pada JLPT, bahasa kerja, dan pola belajar yang tetap masuk akal ketika badan sudah lelah.</p>
            <div className="levelrow"><b>N4</b><span>Materi fleksibel</span><b>N3</b><span>Materi fleksibel</span></div>
          </div>
        </div>
      </section>

      <section id="cara" className="band">
        <div className="split">
          <div>
            <div className="eyebrow">CARA BELAJAR</div>
            <h2>Belajar tanpa dikejar jumlah sesi.</h2>
            <p>Pilih materi yang kamu butuhkan, belajar sesuai ritmemu, lalu tandai statusnya sebagai belum dipelajari, perlu dipelajari lagi, atau sudah dipelajari. Progres membaca dan hasil latihan tetap tersimpan terpisah.</p>
          </div>
          <ol>
            <li><b>01</b> Pilih materi yang ingin dipelajari</li>
            <li><b>02</b> Pelajari materi dan kerjakan latihan</li>
            <li><b>03</b> Tandai status belajarmu</li>
            <li><b>04</b> Ulangi bagian lemah dan ukur kesiapan dengan simulasi</li>
          </ol>
        </div>
      </section>

      <section id="harga" className="section">
        <div className="price">
          <div className="eyebrow">HARGA PELUNCURAN</div>
          <h2>Pilih level yang kamu butuhkan</h2>
          <p className="priceLead">Sekali bayar untuk satu level. Tidak ada biaya bulanan.</p>

          <div className="priceGrid">
            <article className="priceCard">
              <div className="priceCardHead">
                <span>N4</span>
                <div>
                  <h3>JLPT N4</h3>
                  <p>Akses materi N4</p>
                </div>
              </div>
              <div className="priceAmount">Rp299.000</div>
              <div className="priceOnce">Sekali bayar</div>
              <p className="priceDesc">Materi N4, latihan per materi, evaluasi berkala, bookmark, statistik belajar, dan 5 simulasi JLPT.</p>
              <Link className="btn primary full" href="/login">Mulai N4</Link>
            </article>

            <article className="priceCard">
              <div className="priceCardHead">
                <span>N3</span>
                <div>
                  <h3>JLPT N3</h3>
                  <p>Akses materi N3</p>
                </div>
              </div>
              <div className="priceAmount">Rp399.000</div>
              <div className="priceOnce">Sekali bayar</div>
              <p className="priceDesc">Materi N3, latihan per materi, evaluasi berkala, bookmark, statistik belajar, dan 5 simulasi JLPT.</p>
              <Link className="btn primary full" href="/login">Mulai N3</Link>
            </article>
          </div>

          <p className="priceNote">15% materi dapat dicoba gratis sebelum membeli.</p>
        </div>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

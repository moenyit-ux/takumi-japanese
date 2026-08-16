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
          <details className="profileNav">
            <summary>
              <span>Profil</span>
              <i aria-hidden="true">⌄</i>
            </summary>
            <div className="profileDropdown">
              <a href="#visi-misi">Visi &amp; Misi</a>
              <a href="#profil-pendiri">Profil Pendiri</a>
              <a href="#pengajar">Pengajar</a>
              <a href="#testimoni">Testimoni</a>
            </div>
          </details>
          <a href="#kursus">Kursus</a>
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
            <div className="levelrow">
              <b>N4</b>
              <span style={{ display: 'grid', gap: '2px', lineHeight: 1.25 }}>
                <span>1.000 kosakata</span>
                <span>200 kanji</span>
                <span>100 bunpou</span>
              </span>
              <b>N3</b>
              <span style={{ display: 'grid', gap: '2px', lineHeight: 1.25 }}>
                <span>2.000 kosakata</span>
                <span>350 kanji</span>
                <span>130 bunpou</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="profil" className="section publicProfile">
        <div className="publicSectionHeading">
          <div className="eyebrow">PROFIL TAKUMI</div>
          <h2>Mengenal Takumi Japanese lebih dekat.</h2>
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

      <section id="kursus" className="band publicCourses">
        <div className="courseSectionInner">
          <div className="publicSectionHeading">
            <div className="eyebrow">KURSUS</div>
            <h2>Pilih level yang memang kamu butuhkan.</h2>
            <p>N4 dan N3 berdiri sebagai kursus terpisah. Kamu tidak perlu membeli level yang tidak sedang kamu pelajari.</p>
          </div>

          <div className="coursePublicGrid">
            <article className="coursePublicCard">
              <div className="coursePublicHead"><b>N4</b><div><small>JLPT N4</small><h3>Bangun pondasi yang kuat</h3></div></div>
              <div className="coursePublicStats">
                <span><b>1.000</b> kosakata</span>
                <span><b>200</b> kanji</span>
                <span><b>100</b> bunpou</span>
              </div>
              <p>Termasuk 25 dokkai, 25 choukai, 5 simulasi JLPT, latihan, kuis, bookmark, dan progres belajar.</p>
              <a className="btn ghost full" href="#harga">Lihat kursus N4</a>
            </article>

            <article className="coursePublicCard">
              <div className="coursePublicHead"><b>N3</b><div><small>JLPT N3</small><h3>Lanjut ke level menengah</h3></div></div>
              <div className="coursePublicStats">
                <span><b>2.000</b> kosakata</span>
                <span><b>350</b> kanji</span>
                <span><b>130</b> bunpou</span>
              </div>
              <p>Termasuk 25 dokkai, 25 choukai, 5 simulasi JLPT, latihan, kuis, bookmark, dan progres belajar.</p>
              <a className="btn ghost full" href="#harga">Lihat kursus N3</a>
            </article>
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
                  <p>1.000 kosakata · 200 kanji · 100 bunpou</p>
                </div>
              </div>
              <div className="priceAmount">Rp299.000</div>
              <div className="priceOnce">Sekali bayar</div>
              <p className="priceDesc">Termasuk 25 dokkai, 25 choukai, 5 simulasi JLPT, latihan dan kuis yang terus di-update, bookmark, serta statistik belajar.</p>
              <Link className="btn primary full" href="/login">Mulai N4</Link>
            </article>

            <article className="priceCard">
              <div className="priceCardHead">
                <span>N3</span>
                <div>
                  <h3>JLPT N3</h3>
                  <p>2.000 kosakata · 350 kanji · 130 bunpou</p>
                </div>
              </div>
              <div className="priceAmount">Rp399.000</div>
              <div className="priceOnce">Sekali bayar</div>
              <p className="priceDesc">Termasuk 25 dokkai, 25 choukai, 5 simulasi JLPT, latihan dan kuis yang terus di-update, bookmark, serta statistik belajar.</p>
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

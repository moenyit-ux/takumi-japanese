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
              <Link href="/profil#visi-misi">Visi &amp; Misi</Link>
              <Link href="/profil#profil-pendiri">Profil Pendiri</Link>
              <Link href="/profil#pengajar">Pengajar</Link>
              <Link href="/profil#testimoni">Testimoni</Link>
            </div>
          </details>
          <details className="courseNav">
            <summary>
              <span>Kursus</span>
              <i aria-hidden="true">⌄</i>
            </summary>
            <div className="courseDropdown">
              <a href="#kursus-dasar">Dasar</a>
              <a href="#kursus-n5">N5</a>
              <a href="#kursus-n4">N4</a>
              <a href="#kursus-n3">N3</a>
              <a href="#kursus">N2</a>
              <a href="#kursus">N1</a>
            </div>
          </details>
          <details className="selfStudyNav">
            <summary>
              <span>Belajar mandiri</span>
              <i aria-hidden="true">⌄</i>
            </summary>
            <div className="selfStudyDropdown">
              <div className="comingSoonItem"><span>Dasar</span><small>Segera hadir</small></div>
              <div className="comingSoonItem"><span>N5</span><small>Segera hadir</small></div>
              <a href="#belajar-mandiri-n4">N4</a>
              <a href="#belajar-mandiri-n3">N3</a>
              <div className="comingSoonItem"><span>N2</span><small>Segera hadir</small></div>
              <div className="comingSoonItem"><span>N1</span><small>Segera hadir</small></div>
            </div>
          </details>
        </nav>
        <Link className="btn ghost" href="/login">Masuk</Link>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">BAHASA JEPANG • JLPT • UNTUK PELAJAR INDONESIA</div>
          <h1>Naik level bahasa Jepang, <em>selangkah demi selangkah.</em></h1>
          <p>Pilih belajar langsung melalui kursus tatap muka atau belajar mandiri melalui website premium Takumi sesuai ritme dan kebutuhanmu.</p>
          <div className="actions">
            <Link className="btn primary" href="/login">Mulai gratis →</Link>
          </div>
          <div className="trust">
            <span>✓ Kursus tatap muka bertahap</span>
            <span>✓ Website premium untuk belajar mandiri</span>
          </div>
        </div>

        <div className="heroCard">
          <div className="sun">匠</div>
          <div>
            <div className="eyebrow">FILOSOFI TAKUMI</div>
            <h2>Belajar dari orang yang pernah melewati jalan yang sama.</h2>
            <p>Pilih pendampingan langsung melalui kelas atau belajar fleksibel secara mandiri tanpa kehilangan arah dan progres.</p>
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

      <section id="kursus" className="band publicCourses">
        <div className="courseSectionInner">
          <div className="publicSectionHeading">
            <div className="eyebrow">KURSUS TATAP MUKA</div>
            <h2>Belajar langsung bersama pengajar.</h2>
            <p>Informasi materi, ritme program reguler, durasi, dan biaya ditampilkan langsung pada setiap kelas agar pilihan belajarmu lebih jelas.</p>
          </div>

          <div className="coursePublicGrid coursePublicGridFour">
            <article className="coursePublicCard" id="kursus-dasar">
              <div className="coursePublicHead"><b>D</b><div><small>KELAS DASAR</small><h3>Mulai dari fondasi</h3></div></div>
              <p>Kelas untuk siswa yang ingin membangun dasar bahasa Jepang secara bertahap sebelum melanjutkan ke level JLPT.</p>
              <div className="courseProgramInfo">
                <div className="courseProgramLabel">PROGRAM REGULER</div>
                <div className="courseProgramFacts">
                  <span><b>Disesuaikan</b><small>durasi sesuai kemampuan awal</small></span>
                  <span><b>8× / bulan</b><small>80 menit / pertemuan</small></span>
                </div>
                <div className="courseTuition">
                  <div><small>Biaya kelas</small><strong>Rp250.000 <span>/bulan</span></strong></div>
                  <p>Pembayaran seluruh program sekaligus di awal mendapat potongan harga.</p>
                </div>
              </div>
            </article>

            <article className="coursePublicCard" id="kursus-n5">
              <div className="coursePublicHead"><b>N5</b><div><small>KURSUS JLPT N5</small><h3>Mulai level pemula</h3></div></div>
              <div className="coursePublicStats">
                <span><b>±770</b> kosakata</span>
                <span><b>119</b> kanji</span>
                <span><b>75</b> bunpou</span>
              </div>
              <p>Kelas N5 untuk membangun kemampuan dasar JLPT dengan ritme belajar yang terarah dan cukup waktu untuk review.</p>
              <div className="courseProgramInfo">
                <div className="courseProgramLabel">PROGRAM REGULER</div>
                <div className="courseProgramFacts">
                  <span><b>6 bulan</b><small>48 pertemuan</small></span>
                  <span><b>8× / bulan</b><small>80 menit / pertemuan</small></span>
                </div>
                <div className="courseTuition">
                  <div><small>Biaya kelas</small><strong>Rp350.000 <span>/bulan</span></strong></div>
                  <p>Pembayaran seluruh program sekaligus di awal mendapat potongan harga.</p>
                </div>
              </div>
            </article>

            <article className="coursePublicCard" id="kursus-n4">
              <div className="coursePublicHead"><b>N4</b><div><small>KURSUS JLPT N4</small><h3>Bangun pondasi yang kuat</h3></div></div>
              <div className="coursePublicStats">
                <span><b>1.000</b> kosakata</span>
                <span><b>200</b> kanji</span>
                <span><b>100</b> bunpou</span>
              </div>
              <p>Kelas tatap muka untuk siswa yang ingin mempelajari materi N4 secara terarah dengan pendampingan pengajar.</p>
              <div className="courseProgramInfo">
                <div className="courseProgramLabel">PROGRAM REGULER</div>
                <div className="courseProgramFacts">
                  <span><b>9 bulan</b><small>72 pertemuan</small></span>
                  <span><b>8× / bulan</b><small>80 menit / pertemuan</small></span>
                </div>
                <div className="courseTuition">
                  <div><small>Biaya kelas</small><strong>Rp450.000 <span>/bulan</span></strong></div>
                  <p>Pembayaran seluruh program sekaligus di awal mendapat potongan harga.</p>
                </div>
              </div>
            </article>

            <article className="coursePublicCard" id="kursus-n3">
              <div className="coursePublicHead"><b>N3</b><div><small>KURSUS JLPT N3</small><h3>Lanjut ke level menengah</h3></div></div>
              <div className="coursePublicStats">
                <span><b>2.000</b> kosakata</span>
                <span><b>350</b> kanji</span>
                <span><b>130</b> bunpou</span>
              </div>
              <p>Kelas tatap muka untuk siswa yang ingin memperkuat kemampuan N3 melalui pembelajaran langsung, latihan, dan evaluasi bersama pengajar.</p>
              <div className="courseProgramInfo">
                <div className="courseProgramLabel">PROGRAM REGULER</div>
                <div className="courseProgramFacts">
                  <span><b>12 bulan</b><small>96 pertemuan</small></span>
                  <span><b>8× / bulan</b><small>80 menit / pertemuan</small></span>
                </div>
                <div className="courseTuition">
                  <div><small>Biaya kelas</small><strong>Rp550.000 <span>/bulan</span></strong></div>
                  <p>Pembayaran seluruh program sekaligus di awal mendapat potongan harga.</p>
                </div>
              </div>
            </article>
          </div>

          <div className="courseOptionNote">
            <div><small>KELAS AKSELERASI</small><strong>Butuh jalur belajar lebih cepat?</strong></div>
            <p>Kelas akselerasi tersedia melalui konsultasi. Durasi dan ritme ditentukan berdasarkan kemampuan awal, waktu belajar mandiri, frekuensi pertemuan, dan target JLPT siswa.</p>
          </div>
        </div>
      </section>

      <section id="belajar-mandiri" className="section">
        <div className="price">
          <div className="eyebrow">BELAJAR MANDIRI • WEBSITE PREMIUM</div>
          <h2>Belajar sesuai ritmemu sendiri.</h2>
          <p className="priceLead">Saat ini tersedia level N4 dan N3. Ke depannya Belajar Mandiri Takumi juga akan tersedia untuk Dasar, N5, N2, dan N1. Akses satu level dengan sekali bayar tanpa biaya bulanan.</p>

          <div className="priceGrid">
            <article className="priceCard" id="belajar-mandiri-n4">
              <div className="priceCardHead">
                <span>N4</span>
                <div>
                  <h3>Belajar Mandiri N4</h3>
                  <p>1.000 kosakata · 200 kanji · 100 bunpou</p>
                </div>
              </div>
              <div className="priceAmount">Rp299.000</div>
              <div className="priceOnce">Sekali bayar</div>
              <p className="priceDesc">Termasuk 25 dokkai, 25 choukai, 5 simulasi JLPT, latihan dan kuis yang terus di-update, bookmark, serta statistik belajar.</p>
              <Link className="btn primary full" href="/login">Mulai belajar N4</Link>
            </article>

            <article className="priceCard" id="belajar-mandiri-n3">
              <div className="priceCardHead">
                <span>N3</span>
                <div>
                  <h3>Belajar Mandiri N3</h3>
                  <p>2.000 kosakata · 350 kanji · 130 bunpou</p>
                </div>
              </div>
              <div className="priceAmount">Rp399.000</div>
              <div className="priceOnce">Sekali bayar</div>
              <p className="priceDesc">Termasuk 25 dokkai, 25 choukai, 5 simulasi JLPT, latihan dan kuis yang terus di-update, bookmark, serta statistik belajar.</p>
              <Link className="btn primary full" href="/login">Mulai belajar N3</Link>
            </article>
          </div>

          <p className="priceNote">15% materi dapat dicoba gratis sebelum membeli.</p>
        </div>
      </section>

      <footer><Brand /><p>Takumi Japanese · 人生は一生の勉強</p></footer>
    </main>
  )
}

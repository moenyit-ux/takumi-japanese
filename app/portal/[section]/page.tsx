import Link from 'next/link'

const nav = [
  ['dashboard', 'Beranda', '⌂'],
  ['materi', 'Materi', '文'],
  ['bookmark', 'Bookmark', '☆'],
  ['hasil', 'Hasil', '↗'],
  ['pembayaran', 'Premium', '¥'],
  ['admin', 'Admin', '⚙'],
]

function Shell({ section, children }: { section: string; children: React.ReactNode }) {
  return (
    <div className="portal">
      <aside className="side">
        <div className="brand"><span>匠</span><div><b>Takumi</b><small>Japanese</small></div></div>
        <nav>
          {nav.map(([slug, label, icon]) => (
            <Link className={section === slug ? 'active' : ''} href={`/portal/${slug}`} key={slug}>
              <i>{icon}</i>{label}
            </Link>
          ))}
        </nav>
        <div className="quote">人生は一生の勉強<small>Belajar adalah perjalanan seumur hidup.</small></div>
      </aside>
      <main className="content">{children}</main>
      <nav className="bottom">
        {nav.slice(0, 4).map(([slug, label, icon]) => (
          <Link href={`/portal/${slug}`} key={slug}><i>{icon}</i><small>{label}</small></Link>
        ))}
      </nav>
    </div>
  )
}

function Dashboard() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">DASHBOARD</div><h1>Selamat datang di Takumi</h1><p>Lanjutkan langkah belajar Anda dari posisi terakhir.</p></div><div className="streak">🔥 7 hari</div></div>
      <section className="resume">
        <div><div className="eyebrow">LANJUTKAN BELAJAR</div><h2>JLPT N4 · Sesi 8</h2><p>Tata bahasa & latihan terpadu</p><div className="bar"><i style={{ width: '42%' }} /></div><Link className="btn primary" href="/portal/materi">Lanjutkan →</Link></div>
        <div>匠</div>
      </section>
      <div className="stats"><article><span>Sesi selesai</span><b>12</b></article><article><span>Nilai tertinggi</span><b>96</b></article><article><span>Perlu diulang</span><b>7</b></article></div>
      <div className="twocol">
        <section><h2>Program Anda</h2><div className="course"><b>N4</b><div><h3>JLPT N4</h3><p>48 sesi · 7 gratis</p><div className="bar"><i style={{ width: '25%' }} /></div></div><strong>25%</strong></div><div className="course"><b>N3</b><div><h3>JLPT N3</h3><p>60 sesi · 9 gratis</p><div className="bar"><i style={{ width: '6%' }} /></div></div><strong>6%</strong></div></section>
        <section className="panel"><h2>Target kelulusan</h2><div className="row"><b>Latihan sesi</b><span>≥70</span></div><div className="row"><b>Evaluasi 5 sesi</b><span>≥75</span></div><div className="row"><b>Simulasi JLPT</b><span>≥75</span></div></section>
      </div>
    </>
  )
}

function Materi() {
  const sessions = Array.from({ length: 12 }, (_, i) => i + 1)
  return (
    <>
      <div className="head"><div><div className="eyebrow">MATERI</div><h1>JLPT N4</h1><p>48 sesi · target ±60 menit per sesi</p></div><div className="tabs"><button className="on">N4</button><button>N3</button></div></div>
      <div className="chips"><button className="on">Semua</button><button>Kosakata</button><button>Kanji</button><button>Tata Bahasa</button><button>読解</button><button>聴解</button></div>
      <div className="sessiongrid">{sessions.map((n) => <article key={n}><b className="num">{String(n).padStart(2, '0')}</b><div><small>SESI {n}</small><h3>{n < 4 ? 'Kosakata & Kanji Dasar' : n < 7 ? 'Tata Bahasa Dasar' : 'Latihan Terpadu'}</h3><p>±60 menit · minimal 70</p></div><strong>{n <= 7 ? '▶' : '🔒'}</strong></article>)}</div>
    </>
  )
}

function Bookmark() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">BOOKMARK</div><h1>Dipelajari Lagi</h1><p>Soal salah masuk otomatis dan dapat disimpan manual.</p></div></div>
      <div className="chips"><button className="on">Ingin dipelajari lagi</button><button>Masih ragu</button><button>Sudah dikuasai</button></div>
      <div className="review">{['〜ようになる', '受ける・受かる', '読解：お知らせ'].map((item, i) => <article key={item}><span>#{i + 1}</span><div><b>{item}</b><p>Terakhir salah pada latihan sesi {i + 5}</p></div><button className="btn ghost">Ulangi</button></article>)}</div>
    </>
  )
}

function Hasil() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">HASIL BELAJAR</div><h1>Perkembangan Anda</h1><p>Seluruh percobaan disimpan; nilai tertinggi menentukan kelulusan.</p></div></div>
      <div className="stats"><article><span>Nilai terbaru</span><b>82</b></article><article><span>Nilai tertinggi</span><b>96</b></article><article><span>Total percobaan</span><b>28</b></article></div>
      <section className="panel"><h2>Riwayat nilai</h2><div className="row"><b>Evaluasi N4 Sesi 1–5</b><span>88 · Lulus</span></div><div className="row"><b>Latihan Sesi 7</b><span>74 · Lulus</span></div><div className="row"><b>Latihan Sesi 8</b><span>62 · Belum lulus</span></div></section>
    </>
  )
}

function Pembayaran() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">AKSES PREMIUM</div><h1>Pilih paket belajar</h1><p>Aktivasi manual maksimal 1×24 jam setelah pembayaran diverifikasi admin.</p></div></div>
      <div className="plans"><article><small>BULANAN</small><h2>¥980</h2><p>/ bulan</p><button className="btn ghost full">Pilih bulanan</button></article><article className="featured"><small>3 BULAN</small><h2>¥2.700</h2><p>lebih hemat</p><button className="btn primary full">Pilih 3 bulan</button></article></div>
    </>
  )
}

function Admin() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">ADMIN</div><h1>Panel Operasional</h1><p>Fondasi peran Super Admin dan Admin Materi.</p></div></div>
      <div className="four"><article><span>Pengguna</span><b>0</b></article><article><span>Sesi</span><b>108</b></article><article><span>Kuis</span><b>140</b></article><article><span>Pembayaran pending</span><b>0</b></article></div>
      <section className="panel"><h2>Alur konten</h2><div className="flow"><span>Draft</span>→<span>Review</span>→<span>Perlu diperbaiki</span>→<span>Disetujui</span>→<span>Published</span></div></section>
    </>
  )
}

export default async function Portal({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  let content: React.ReactNode
  if (section === 'materi') content = <Materi />
  else if (section === 'bookmark') content = <Bookmark />
  else if (section === 'hasil') content = <Hasil />
  else if (section === 'pembayaran') content = <Pembayaran />
  else if (section === 'admin') content = <Admin />
  else content = <Dashboard />
  return <Shell section={section}>{content}</Shell>
}

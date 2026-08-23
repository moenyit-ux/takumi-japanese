import type { Metadata, Viewport } from 'next'
import MaterialNavigationGuard from './components/material-navigation-guard'
import './globals.css'
import './global-interactions.css'
import './home-interactions.css'
import './course-nav.css'
import './course-cards.css'
import './learning.css'
import './takumi-material.css'
import './takumi-material-fixes.css'
import './takumi-vocabulary-compact.css'
import './portal-user.css'
import './public-page.css'
import './takumi-app-refresh.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://takumi-japanese-rho.vercel.app'),
  title: {
    default: 'Takumi Japanese — Belajar Bahasa Jepang dengan Arah',
    template: '%s | Takumi Japanese',
  },
  description: 'Kursus bahasa Jepang dan belajar mandiri JLPT N4–N3 untuk pelajar Indonesia, dibangun dari pengalaman nyata belajar dan bekerja di Jepang.',
  openGraph: {
    title: 'Takumi Japanese',
    description: 'Bahasa Jepang untuk hidup yang sedang kamu bangun.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Takumi Japanese — Bahasa Jepang untuk hidup yang sedang kamu bangun.' }],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Takumi Japanese',
    description: 'Bahasa Jepang untuk hidup yang sedang kamu bangun.',
    images: ['/og.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#eaf7fc',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body><MaterialNavigationGuard />{children}</body>
    </html>
  )
}

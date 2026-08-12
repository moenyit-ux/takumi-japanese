import type { Metadata } from 'next'
import './globals.css'
import './learning.css'
import './takumi-material.css'
import './takumi-material-fixes.css'

export const metadata: Metadata = {
  title: 'Takumi Japanese',
  description: 'Belajar JLPT N4 & N3 untuk pekerja Indonesia di Jepang.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Анализатор рынка золота',
  description: 'Технический и фундаментальный анализ золота и других активов',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}

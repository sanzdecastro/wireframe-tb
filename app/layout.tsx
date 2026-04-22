import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tibidabo — City Operating System',
  description: 'Gestión de espacio urbano y mobiliario mediante datos, sensores y IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}

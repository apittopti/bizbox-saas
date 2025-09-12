import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BizBox Admin',
  description: 'BizBox Admin Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-surface-500 text-white antialiased`}>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e1e2e',
                color: '#f8f8f8',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
              },
              success: {
                iconTheme: {
                  primary: '#7c3aed',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}

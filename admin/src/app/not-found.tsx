'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-white">404</h1>
        <p className="text-[#737373] text-lg">Page not found</p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2.5 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your platform' },
  '/users': { title: 'Users', subtitle: 'Manage all registered users' },
  '/rooms': { title: 'Voice Rooms', subtitle: 'Manage live and past rooms' },
  '/families': { title: 'Families', subtitle: 'Manage family groups' },
  '/couples': { title: 'Couples', subtitle: 'Manage couple relationships' },
  '/gifts': { title: 'Gifts', subtitle: 'Manage virtual gifts' },
  '/gifts/new': { title: 'Create Gift', subtitle: 'Add a new virtual gift' },
  '/wallets': { title: 'Wallets', subtitle: 'Monitor in-app currency' },
  '/withdrawals': { title: 'Withdrawals', subtitle: 'Process withdrawal requests' },
  '/vip': { title: 'VIP Plans', subtitle: 'Manage VIP tiers and benefits' },
  '/agencies': { title: 'Agencies', subtitle: 'Manage talent agencies' },
  '/events': { title: 'Events', subtitle: 'Manage platform events' },
  '/banners': { title: 'Banners', subtitle: 'Manage promotional banners' },
  '/reports': { title: 'Moderation', subtitle: 'Review and resolve reports' },
  '/notifications': { title: 'Notifications', subtitle: 'Send push notifications' },
  '/settings': { title: 'Settings', subtitle: 'Configure platform settings' },
  '/revenue': { title: 'Revenue', subtitle: 'Financial analytics' },
}

function getPageInfo(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname]

  // Check dynamic routes
  if (pathname.startsWith('/users/')) return { title: 'User Details', subtitle: 'View and manage user account' }
  if (pathname.startsWith('/rooms/')) return { title: 'Room Details', subtitle: 'View room information' }
  if (pathname.startsWith('/gifts/')) return { title: 'Gift Details', subtitle: 'Manage gift item' }
  if (pathname.startsWith('/events/')) return { title: 'Event Details', subtitle: 'Manage event' }
  if (pathname.startsWith('/families/')) return { title: 'Family Details', subtitle: 'View family group' }

  return { title: 'VOXO Admin', subtitle: undefined }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pageInfo = getPageInfo(pathname)

  return (
    <div className="flex h-screen bg-surface-500 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

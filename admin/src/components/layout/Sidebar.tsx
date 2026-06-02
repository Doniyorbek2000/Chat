'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn, hasPermission } from '@/lib/utils'
import {
  ChartBarIcon,
  UsersIcon,
  MicrophoneIcon,
  UserGroupIcon,
  HeartIcon,
  GiftIcon,
  WalletIcon,
  BuildingLibraryIcon,
  StarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  PhotoIcon,
  ShieldExclamationIcon,
  BellIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiredRole?: string
  badge?: number
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: ChartBarIcon,
  },
  {
    label: 'Users',
    href: '/users',
    icon: UsersIcon,
  },
  {
    label: 'Voice Rooms',
    href: '/rooms',
    icon: MicrophoneIcon,
  },
  {
    label: 'Families',
    href: '/families',
    icon: UserGroupIcon,
  },
  {
    label: 'Couples',
    href: '/couples',
    icon: HeartIcon,
  },
  {
    label: 'Gifts',
    href: '/gifts',
    icon: GiftIcon,
  },
  {
    label: 'Wallets',
    href: '/wallets',
    icon: WalletIcon,
  },
  {
    label: 'Withdrawals',
    href: '/withdrawals',
    icon: BuildingLibraryIcon,
  },
  {
    label: 'VIP Plans',
    href: '/vip',
    icon: StarIcon,
  },
  {
    label: 'Agencies',
    href: '/agencies',
    icon: BuildingOfficeIcon,
  },
  {
    label: 'Events',
    href: '/events',
    icon: CalendarIcon,
  },
  {
    label: 'Banners',
    href: '/banners',
    icon: PhotoIcon,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: ShieldExclamationIcon,
    requiredRole: 'moderator',
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: BellIcon,
  },
  {
    label: 'Revenue',
    href: '/revenue',
    icon: CurrencyDollarIcon,
    requiredRole: 'admin',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    requiredRole: 'super_admin',
  },
]

interface SidebarProps {
  pendingReports?: number
  pendingWithdrawals?: number
}

export default function Sidebar({ pendingReports = 0, pendingWithdrawals = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  const userRole = session?.user?.role || 'support'

  const enrichedNavItems = navItems.map((item) => {
    if (item.href === '/reports') return { ...item, badge: pendingReports }
    if (item.href === '/withdrawals') return { ...item, badge: pendingWithdrawals }
    return item
  })

  const visibleItems = enrichedNavItems.filter(
    (item) => !item.requiredRole || hasPermission(userRole, item.requiredRole)
  )

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-surface-200 border-r border-white/5 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-white/5 px-4',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex items-center justify-center w-8 h-8 bg-primary-600/20 rounded-lg border border-primary-500/30 shrink-0">
          <span className="text-lg font-black text-primary-400">V</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <span className="text-lg font-black text-white tracking-tight">
              VOX<span className="text-primary-400">O</span>
            </span>
            <p className="text-xs text-dark-400 -mt-0.5">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 no-scrollbar">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium group',
                isActive
                  ? 'text-white bg-primary-600/20 border border-primary-500/20'
                  : 'text-dark-300 hover:text-white hover:bg-white/5 border border-transparent',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-dark-200'
                )}
              />
              {!collapsed && (
                <span className="truncate animate-fade-in">{item.label}</span>
              )}
              {!collapsed && item.badge && item.badge > 0 ? (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
              {collapsed && item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              ) : null}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-400 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all duration-200',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeftIcon className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

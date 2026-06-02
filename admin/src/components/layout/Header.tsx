'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  BellIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { cn, getInitials } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const user = session?.user
  const roleColors: Record<string, string> = {
    super_admin: 'text-amber-400 bg-amber-500/20',
    admin: 'text-primary-400 bg-primary-500/20',
    moderator: 'text-blue-400 bg-blue-500/20',
    support: 'text-green-400 bg-green-500/20',
  }

  return (
    <header className="h-16 bg-surface-200 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
      {/* Title */}
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-dark-400">{subtitle}</p>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-dark-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-surface-100 rounded-xl border border-white/10 shadow-card overflow-hidden z-50 animate-slide-up">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Notifications</span>
                <button className="text-xs text-primary-400 hover:text-primary-300">Mark all read</button>
              </div>
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                {[
                  { title: 'New withdrawal request', desc: 'User @john requested $500 withdrawal', time: '2m ago', unread: true },
                  { title: 'Report filed', desc: 'Room "Music Lounge" reported for spam', time: '15m ago', unread: true },
                  { title: 'VIP purchase', desc: 'New VIP Level 5 purchase — $49.99', time: '1h ago', unread: false },
                ].map((notif, i) => (
                  <div
                    key={i}
                    className={cn(
                      'px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors',
                      notif.unread && 'bg-primary-500/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {notif.unread && (
                        <div className="w-2 h-2 bg-primary-400 rounded-full mt-1.5 shrink-0" />
                      )}
                      <div className={cn(!notif.unread && 'ml-5')}>
                        <p className="text-sm font-medium text-white">{notif.title}</p>
                        <p className="text-xs text-dark-400 mt-0.5">{notif.desc}</p>
                        <p className="text-xs text-dark-500 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-white/5">
                <button className="text-xs text-primary-400 hover:text-primary-300 w-full text-center">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/30 flex items-center justify-center text-sm font-bold text-primary-300">
              {user?.name ? getInitials(user.name) : 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white leading-tight">{user?.name || 'Admin'}</p>
              <p className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium w-fit',
                roleColors[user?.role || 'admin']
              )}>
                {(user?.role || 'admin').replace('_', ' ')}
              </p>
            </div>
            <ChevronDownIcon className={cn(
              'w-4 h-4 text-dark-400 transition-transform',
              dropdownOpen && 'rotate-180'
            )} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-surface-100 rounded-xl border border-white/10 shadow-card overflow-hidden z-50 animate-slide-up">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-dark-400 truncate">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { router.push('/settings'); setDropdownOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-dark-300 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => { router.push('/profile'); setDropdownOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-dark-300 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  <UserCircleIcon className="w-4 h-4" />
                  Profile
                </button>
              </div>
              <div className="p-1 border-t border-white/5">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

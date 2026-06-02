'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  UsersIcon,
  MicrophoneIcon,
  CurrencyDollarIcon,
  StarIcon,
  ArrowPathIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import StatsCard from '@/components/ui/StatsCard'
import { ChartCard, VoxoAreaChart, VoxoBarChart } from '@/components/ui/Chart'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { formatCurrency, formatNumber, formatDateTime, timeAgo } from '@/lib/utils'
import type { DashboardStats, RevenueDataPoint, UserGrowthDataPoint, Room, WalletTransaction } from '@/types'

// Mock data for demo
const mockStats: DashboardStats = {
  totalUsers: 248593,
  usersChangePercent: 12.3,
  activeRooms: 1847,
  roomsChangePercent: 5.7,
  todayRevenue: 18420,
  revenueChangePercent: 23.1,
  activeVIPs: 12830,
  vipChangePercent: 8.2,
  totalOnlineUsers: 45231,
  newUsersToday: 1243,
  pendingWithdrawals: 34,
  pendingReports: 17,
}

const mockRevenue: RevenueDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  revenue: Math.floor(Math.random() * 20000) + 8000,
  transactions: Math.floor(Math.random() * 500) + 200,
}))

const mockUserGrowth: UserGrowthDataPoint[] = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
  newUsers: Math.floor(Math.random() * 2000) + 500,
  totalUsers: 240000 + i * 1200,
}))

const mockTopRooms: Room[] = Array.from({ length: 8 }, (_, i) => ({
  id: `room-${i}`,
  title: ['Music Lounge', 'Chat Night', 'Game Talk', 'Study Group', 'Comedy Hour', 'News Room', 'Tech Talk', 'Art Corner'][i],
  type: 'public' as const,
  hostId: `user-${i}`,
  host: { id: `user-${i}`, username: `host${i}`, displayName: `Host User ${i}`, uid: `U${1000 + i}`, level: 20 + i, vipLevel: Math.floor(Math.random() * 5) } as never,
  maxSeats: 16,
  currentSeats: Math.floor(Math.random() * 16) + 1,
  totalViewers: Math.floor(Math.random() * 500) + 50,
  totalGiftsValue: Math.floor(Math.random() * 50000) + 1000,
  status: 'live' as const,
  isLocked: false,
  createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  onlineCount: Math.floor(Math.random() * 100) + 10,
}))

const mockTransactions: WalletTransaction[] = Array.from({ length: 10 }, (_, i) => ({
  id: `tx-${i}`,
  userId: `user-${i}`,
  user: { id: `user-${i}`, username: `user${i}`, displayName: `User ${i}`, uid: `U${2000 + i}`, avatar: undefined } as never,
  type: ['recharge', 'gift_sent', 'withdrawal', 'vip_purchase'][Math.floor(Math.random() * 4)] as never,
  amount: Math.floor(Math.random() * 500) + 10,
  currency: 'usd' as const,
  description: ['Coin recharge', 'Gift sent', 'Withdrawal request', 'VIP purchase'][Math.floor(Math.random() * 4)],
  balanceBefore: 1000,
  balanceAfter: 1500,
  status: 'completed' as const,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}))

export default function DashboardPage() {
  const [liveUsers] = useState(45231)
  const [liveRooms] = useState(1847)
  const [refreshKey, setRefreshKey] = useState(0)

  // In production, use actual API calls:
  // const { data: stats } = useSWR('dashboard-stats', api.getDashboardStats, { refreshInterval: 30000 })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-medium">Live</span>
          </div>
          <div className="flex items-center gap-2 text-dark-400 text-sm">
            <SignalIcon className="w-4 h-4" />
            <span>{formatNumber(liveUsers)} users online</span>
            <span className="text-dark-600">•</span>
            <span>{formatNumber(liveRooms)} active rooms</span>
          </div>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="btn-secondary text-sm"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={formatNumber(mockStats.totalUsers)}
          change={mockStats.usersChangePercent}
          icon={UsersIcon}
          iconColor="text-blue-400"
          iconBg="bg-blue-600/20"
          description={`${formatNumber(mockStats.newUsersToday)} new today`}
        />
        <StatsCard
          title="Active Rooms"
          value={formatNumber(mockStats.activeRooms)}
          change={mockStats.roomsChangePercent}
          icon={MicrophoneIcon}
          iconColor="text-primary-400"
          iconBg="bg-primary-600/20"
          description="Currently live"
        />
        <StatsCard
          title="Today's Revenue"
          value={formatCurrency(mockStats.todayRevenue)}
          change={mockStats.revenueChangePercent}
          icon={CurrencyDollarIcon}
          iconColor="text-green-400"
          iconBg="bg-green-600/20"
          description="Across all methods"
        />
        <StatsCard
          title="Active VIPs"
          value={formatNumber(mockStats.activeVIPs)}
          change={mockStats.vipChangePercent}
          icon={StarIcon}
          iconColor="text-amber-400"
          iconBg="bg-amber-600/20"
          description="Subscribed users"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Online Now', value: formatNumber(mockStats.totalOnlineUsers), color: 'text-green-400' },
          { label: 'New Today', value: formatNumber(mockStats.newUsersToday), color: 'text-blue-400' },
          { label: 'Pending Withdrawals', value: mockStats.pendingWithdrawals, color: 'text-yellow-400' },
          { label: 'Open Reports', value: mockStats.pendingReports, color: 'text-red-400' },
        ].map((item) => (
          <div key={item.label} className="card py-4 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-dark-400 text-xs mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue (Last 30 Days)"
          subtitle="Daily revenue in USD"
          height={260}
          actions={
            <select className="bg-white/5 border border-white/10 text-dark-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last year</option>
            </select>
          }
        >
          <VoxoAreaChart
            data={mockRevenue}
            xKey="date"
            areas={[
              { key: 'revenue', label: 'Revenue ($)', color: '#7c3aed' },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="New Users (Last 7 Days)"
          subtitle="Daily user registrations"
          height={260}
        >
          <VoxoBarChart
            data={mockUserGrowth}
            xKey="date"
            bars={[
              { key: 'newUsers', label: 'New Users', color: '#3b82f6' },
            ]}
          />
        </ChartCard>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Rooms */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Top Live Rooms</h3>
            <a href="/rooms" className="text-primary-400 text-sm hover:text-primary-300 transition-colors">
              View all →
            </a>
          </div>
          <div className="space-y-2">
            {mockTopRooms.map((room, i) => (
              <div
                key={room.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/3 transition-colors"
              >
                <span className="text-dark-500 text-sm w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">{room.title}</p>
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shrink-0" />
                  </div>
                  <p className="text-dark-400 text-xs truncate">
                    Host: {room.host?.displayName} • {room.currentSeats}/{room.maxSeats} seats
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-medium">{formatNumber(room.totalViewers)}</p>
                  <p className="text-dark-500 text-xs">viewers</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-amber-400 text-sm font-medium">{formatNumber(room.totalGiftsValue)}</p>
                  <p className="text-dark-500 text-xs">💎</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Transactions</h3>
            <a href="/wallets" className="text-primary-400 text-sm hover:text-primary-300 transition-colors">
              View all →
            </a>
          </div>
          <div className="space-y-2">
            {mockTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/3 transition-colors"
              >
                <Avatar
                  name={tx.user?.displayName || 'User'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {tx.user?.displayName}
                  </p>
                  <p className="text-dark-400 text-xs">{tx.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${
                    tx.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount}
                  </p>
                  <p className="text-dark-500 text-xs">{timeAgo(tx.createdAt)}</p>
                </div>
                <Badge status={tx.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-white font-semibold">User Activity Heatmap</h3>
            <p className="text-dark-400 text-sm mt-0.5">Hourly active users over the past week</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Heatmap grid */}
            <div className="flex gap-2 mb-2 ml-10">
              {['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'].map((h) => (
                <div key={h} className="flex-1 text-center text-xs text-dark-500">{h}</div>
              ))}
            </div>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-dark-500 w-8 shrink-0">{day}</span>
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: 24 }, (_, h) => {
                    const intensity = Math.random()
                    const opacity = intensity > 0.7 ? 'opacity-100' : intensity > 0.4 ? 'opacity-60' : intensity > 0.2 ? 'opacity-30' : 'opacity-10'
                    return (
                      <div
                        key={h}
                        className={`flex-1 h-6 rounded bg-primary-500 ${opacity} hover:opacity-100 transition-opacity cursor-pointer`}
                        title={`${day} ${h}:00 — ${Math.floor(intensity * 5000) + 100} users`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-3 ml-10">
              <span className="text-xs text-dark-500">Less</span>
              {[10, 30, 60, 100].map((o) => (
                <div key={o} className={`w-4 h-4 rounded bg-primary-500 opacity-${o}`} />
              ))}
              <span className="text-xs text-dark-500">More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

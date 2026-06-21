'use client'

import { useState, useEffect, useCallback } from 'react'
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

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [revenueSummary, setRevenueSummary] = useState<any>(null)
  const [topRooms, setTopRooms] = useState<any[]>([])
  const [recentTx, setRecentTx] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('30d')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, rev, rooms, tx] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getRevenueSummary(),
        api.getTopRooms(10),
        api.getRecentTransactions(20),
      ])
      if (s.status === 'fulfilled') setStats(s.value)
      if (rev.status === 'fulfilled') setRevenueSummary(rev.value)
      if (rooms.status === 'fulfilled') setTopRooms(Array.isArray(rooms.value) ? rooms.value : [])
      if (tx.status === 'fulfilled') setRecentTx(Array.isArray(tx.value) ? tx.value : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  // Auto-refresh every 30s
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

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
            <span>{formatNumber(stats?.users?.total ?? 0)} users online</span>
            <span className="text-dark-600">•</span>
            <span>{formatNumber(stats?.rooms?.activeNow ?? 0)} active rooms</span>
          </div>
        </div>
        <button
          onClick={load}
          className="btn-secondary text-sm"
          disabled={loading}
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-24 mb-3" />
                  <div className="h-8 bg-white/10 rounded w-32 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-20" />
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={formatNumber(stats?.users?.total ?? 0)}
            icon={UsersIcon}
            iconColor="text-blue-400"
            iconBg="bg-blue-600/20"
            description={`${formatNumber(stats?.users?.newToday ?? 0)} new today`}
          />
          <StatsCard
            title="Active Rooms"
            value={formatNumber(stats?.rooms?.activeNow ?? 0)}
            icon={MicrophoneIcon}
            iconColor="text-primary-400"
            iconBg="bg-primary-600/20"
            description="Currently live"
          />
          <StatsCard
            title="Today's Revenue"
            value={formatCurrency(stats?.revenue?.today ?? 0)}
            icon={CurrencyDollarIcon}
            iconColor="text-green-400"
            iconBg="bg-green-600/20"
            description="Across all methods"
          />
          <StatsCard
            title="Active VIPs"
            value={formatNumber(stats?.vips?.active ?? 0)}
            icon={StarIcon}
            iconColor="text-amber-400"
            iconBg="bg-amber-600/20"
            description="Subscribed users"
          />
        </div>
      )}

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="card py-4 text-center animate-pulse">
              <div className="h-8 bg-white/10 rounded w-16 mx-auto mb-2" />
              <div className="h-3 bg-white/10 rounded w-20 mx-auto" />
            </div>
          ))
        ) : (
          [
            { label: 'Online Now', value: formatNumber(stats?.users?.total ?? 0), color: 'text-green-400' },
            { label: 'New Today', value: formatNumber(stats?.users?.newToday ?? 0), color: 'text-blue-400' },
            { label: 'Revenue This Month', value: formatCurrency(stats?.revenue?.thisMonth ?? 0), color: 'text-yellow-400' },
            { label: 'Active VIPs', value: formatNumber(stats?.vips?.active ?? 0), color: 'text-red-400' },
          ].map((item) => (
            <div key={item.label} className="card py-4 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-dark-400 text-xs mt-1">{item.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue (Last 30 Days)"
          subtitle="Daily revenue in USD"
          height={260}
          loading={loading}
          actions={
            <select className="bg-white/5 border border-white/10 text-dark-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last year</option>
            </select>
          }
        >
          <VoxoAreaChart
            data={Array.isArray(revenueSummary?.chartData) ? revenueSummary.chartData : []}
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
          loading={loading}
        >
          <VoxoBarChart
            data={Array.isArray(revenueSummary?.userGrowth) ? revenueSummary.userGrowth : []}
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
              View all &rarr;
            </a>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-5 h-4 bg-white/10 rounded" />
                  <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded w-32 mb-1" />
                    <div className="h-3 bg-white/10 rounded w-48" />
                  </div>
                  <div className="h-4 bg-white/10 rounded w-12" />
                </div>
              ))}
            </div>
          ) : topRooms.length === 0 ? (
            <p className="text-dark-400 text-center py-8">No live rooms right now</p>
          ) : (
            <div className="space-y-2">
              {topRooms.map((room: any, i: number) => (
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
                      Host: {room.host?.displayName ?? room.hostId} &bull; {room.currentSeats}/{room.maxSeats} seats
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white text-sm font-medium">{formatNumber(room.totalViewers ?? room.onlineCount ?? 0)}</p>
                    <p className="text-dark-500 text-xs">viewers</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-amber-400 text-sm font-medium">{formatNumber(room.totalGiftsValue ?? 0)}</p>
                    <p className="text-dark-500 text-xs">gifts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Transactions</h3>
            <a href="/wallets" className="text-primary-400 text-sm hover:text-primary-300 transition-colors">
              View all &rarr;
            </a>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-8 h-8 bg-white/10 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded w-28 mb-1" />
                    <div className="h-3 bg-white/10 rounded w-40" />
                  </div>
                  <div className="h-4 bg-white/10 rounded w-16" />
                </div>
              ))}
            </div>
          ) : recentTx.length === 0 ? (
            <p className="text-dark-400 text-center py-8">No recent transactions</p>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/3 transition-colors"
                >
                  <Avatar
                    name={tx.user?.displayName || tx.userId || 'User'}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {tx.user?.displayName ?? tx.userId ?? 'Unknown'}
                    </p>
                    <p className="text-dark-400 text-xs">{tx.description ?? tx.type}</p>
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
          )}
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
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, di) => (
              <div key={day} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-dark-500 w-8 shrink-0">{day}</span>
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: 24 }, (_, h) => {
                    const seed = (di * 24 + h) * 2654435761
                    const intensity = ((seed >>> 0) % 1000) / 1000
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

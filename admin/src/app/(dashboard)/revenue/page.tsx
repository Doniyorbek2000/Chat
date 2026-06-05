'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CurrencyDollarIcon,
  ArrowDownCircleIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import StatsCard from '@/components/ui/StatsCard'
import { ChartCard, VoxoAreaChart } from '@/components/ui/Chart'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'

interface RevenueSummary {
  totalRevenue?: number
  total?: number
  totalTransactions?: number
  todayRevenue?: number
  today?: number
  weekRevenue?: number
  thisWeek?: number
  monthRevenue?: number
  thisMonth?: number
  pendingWithdrawals?: number
  pendingWithdrawalCount?: number
  paymentBreakdown?: { provider: string; total: number; count: number }[]
}

interface TopUser {
  userId?: string
  displayName?: string
  uid?: string
  totalRecharge?: number
  _sum?: { amount?: number }
  user?: {
    id?: string
    uid?: string
    username?: string
    displayName?: string
    avatar?: string
    vipLevel?: number
  }
  transactionCount?: number
}

type PeriodKey = 'today' | '7' | '30'

const periodOptions: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7', label: '7 Days' },
  { key: '30', label: '30 Days' },
]

const vipColors = ['#7c3aed', '#3b82f6', '#f59e0b', '#10b981', '#ec4899']

export default function RevenuePage() {
  const [period, setPeriod] = useState<PeriodKey>('30')

  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [topUsers, setTopUsers] = useState<TopUser[]>([])

  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [usersError, setUsersError] = useState<string | null>(null)

  const getPeriodDates = () => {
    const now = new Date()
    const end = now.toISOString().split('T')[0]
    if (period === 'today') {
      return { startDate: end, endDate: end }
    }
    const days = Number(period)
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    return { startDate: start, endDate: end }
  }

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    setSummaryError(null)
    try {
      const dates = getPeriodDates()
      const data = await api.getRevenueSummary(dates)
      setSummary(data as RevenueSummary)
    } catch {
      setSummaryError('Failed to load revenue summary')
      setSummary(null)
    } finally {
      setLoadingSummary(false)
    }
  }, [period])

  const fetchTopUsers = useCallback(async () => {
    setLoadingUsers(true)
    setUsersError(null)
    try {
      const data = await api.getTopRechargedUsers(20)
      setTopUsers(Array.isArray(data) ? data : [])
    } catch {
      setUsersError('Failed to load top users')
      setTopUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    fetchTopUsers()
  }, [fetchTopUsers])

  const handleExportCSV = () => {
    const rows = [
      ['Rank', 'Display Name', 'UID', 'Total Recharge'],
      ...topUsers.map((u, i) => [
        i + 1,
        u.displayName || u.user?.displayName || '—',
        u.uid || u.user?.uid || '—',
        u.totalRecharge ?? u._sum?.amount ?? 0,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `revenue_top_users_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalRevenue = summary?.totalRevenue ?? summary?.total ?? 0
  const todayRevenue = summary?.todayRevenue ?? summary?.today ?? 0
  const weekRevenue = summary?.weekRevenue ?? summary?.thisWeek ?? 0
  const monthRevenue = summary?.monthRevenue ?? summary?.thisMonth ?? 0
  const totalTx = summary?.totalTransactions ?? 0
  const pendingWd = summary?.pendingWithdrawals ?? 0
  const pendingWdCount = summary?.pendingWithdrawalCount ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Analytics</h1>
          <p className="text-[#737373] text-sm mt-0.5">Track earnings, payment methods and top users</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            {periodOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === opt.key
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#737373] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => { fetchSummary(); fetchTopUsers() }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white transition-all"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 border border-[#7C3AED]/30 text-[#A78BFA] text-sm font-medium rounded-lg transition-all"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error banner */}
      {summaryError && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <span className="text-red-400 text-sm">{summaryError}</span>
          <button onClick={fetchSummary} className="text-red-400 hover:text-red-300 text-sm underline">Retry</button>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={`${formatNumber(totalRevenue)} so'm`}
          icon={CurrencyDollarIcon}
          iconColor="text-purple-400"
          iconBg="bg-purple-600/20"
          description={`${formatNumber(totalTx)} transactions`}
          loading={loadingSummary}
        />
        <StatsCard
          title="Today Revenue"
          value={`${formatNumber(todayRevenue)} so'm`}
          icon={CalendarDaysIcon}
          iconColor="text-blue-400"
          iconBg="bg-blue-600/20"
          loading={loadingSummary}
        />
        <StatsCard
          title="This Month"
          value={`${formatNumber(monthRevenue)} so'm`}
          icon={ChartBarIcon}
          iconColor="text-green-400"
          iconBg="bg-green-600/20"
          description={`Week: ${formatNumber(weekRevenue)} so'm`}
          loading={loadingSummary}
        />
        <StatsCard
          title="Pending Withdrawals"
          value={`${formatNumber(pendingWd)} so'm`}
          icon={ArrowDownCircleIcon}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-600/20"
          description={`${pendingWdCount} pending requests`}
          loading={loadingSummary}
        />
      </div>

      {/* Revenue trend chart — chart endpoint not available, show empty */}
      <ChartCard
        title="Revenue Trend"
        subtitle="Daily revenue chart (chart endpoint not yet available)"
        loading={false}
        height={280}
      >
        <VoxoAreaChart
          data={[]}
          areas={[{ key: 'revenue', label: "Revenue (so'm)", color: '#7c3aed' }]}
          xKey="date"
        />
      </ChartCard>

      {/* Top recharged users */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Top Recharged Users</h3>
            <p className="text-[#737373] text-sm mt-0.5">Users with highest total recharge amounts</p>
          </div>
          {usersError && (
            <button onClick={fetchTopUsers} className="text-red-400 hover:text-red-300 text-sm underline">Retry</button>
          )}
        </div>

        {loadingUsers ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded w-32" />
                  <div className="h-2.5 bg-white/10 rounded w-20" />
                </div>
                <div className="h-4 bg-white/10 rounded w-24" />
              </div>
            ))}
          </div>
        ) : usersError ? (
          <div className="text-center py-10 text-red-400 text-sm">{usersError}</div>
        ) : topUsers.length === 0 ? (
          <div className="text-center py-10 text-[#737373] text-sm">No data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">#</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">UID</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[#737373] uppercase tracking-wider">Total Recharge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topUsers.map((row, i) => {
                  const displayName = row.displayName || row.user?.displayName || '—'
                  const uid = row.uid || row.user?.uid || '—'
                  const recharge = row.totalRecharge ?? row._sum?.amount ?? 0
                  const vipLevel = row.user?.vipLevel ?? 0
                  return (
                    <tr key={row.userId || row.user?.id || i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-[#737373] text-sm font-medium">#{i + 1}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-white text-sm font-medium">{displayName}</p>
                            {vipLevel > 0 && (
                              <span
                                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${vipColors[(vipLevel - 1) % vipColors.length]}20`,
                                  color: vipColors[(vipLevel - 1) % vipColors.length],
                                }}
                              >
                                VIP {vipLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[#737373] text-xs font-mono">{uid}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-green-400 font-semibold text-sm">
                          {formatNumber(recharge)} so&apos;m
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

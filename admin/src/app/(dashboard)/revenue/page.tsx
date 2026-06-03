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
import { ChartCard, VoxoAreaChart, VoxoBarChart } from '@/components/ui/Chart'
import { api } from '@/lib/api'
import { formatNumber, formatDateTime } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueSummary {
  total: number
  totalTransactions: number
  today: number
  thisWeek: number
  thisMonth: number
  pendingWithdrawals: number
  pendingWithdrawalCount: number
  paymentBreakdown: { provider: string; total: number; count: number }[]
}

interface RevenueChartPoint {
  date: string
  revenue: number
  count: number
}

interface TopUser {
  user: {
    id: string
    uid: string
    username?: string
    displayName?: string
    avatar?: string
    vipLevel?: number
  }
  totalRecharge: number
  transactionCount: number
}

// ---------------------------------------------------------------------------
// Mock data (fallback when API is unavailable)
// ---------------------------------------------------------------------------

const mockSummary: RevenueSummary = {
  total: 45820000,
  totalTransactions: 1842,
  today: 1250000,
  thisWeek: 8750000,
  thisMonth: 18500000,
  pendingWithdrawals: 3200000,
  pendingWithdrawalCount: 14,
  paymentBreakdown: [
    { provider: 'click', total: 18500000, count: 742 },
    { provider: 'payme', total: 14200000, count: 569 },
    { provider: 'uzum', total: 8100000, count: 324 },
    { provider: 'google', total: 5020000, count: 207 },
  ],
}

const mockChart: RevenueChartPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
  }),
  revenue: Math.floor(Math.random() * 2000000) + 500000,
  count: Math.floor(Math.random() * 50) + 10,
}))

const mockTopUsers: TopUser[] = Array.from({ length: 10 }, (_, i) => ({
  user: {
    id: `user-${i}`,
    uid: `VOXO${String(10000 + i).padStart(6, '0')}`,
    username: `topuser_${i + 1}`,
    displayName: `Top User ${i + 1}`,
    vipLevel: Math.min(5, 5 - i),
  },
  totalRecharge: Math.floor(Math.random() * 5000000) + 500000,
  transactionCount: Math.floor(Math.random() * 50) + 5,
})).sort((a, b) => b.totalRecharge - a.totalRecharge)

const mockVipSales = [
  { level: 1, name: 'Bronze VIP', count: 480, revenue: 143520 },
  { level: 2, name: 'Silver VIP', count: 310, revenue: 216690 },
  { level: 3, name: 'Gold VIP', count: 195, revenue: 292305 },
  { level: 4, name: 'Platinum VIP', count: 88, revenue: 263912 },
  { level: 5, name: 'Diamond VIP', count: 42, revenue: 251958 },
]

// ---------------------------------------------------------------------------
// Period options
// ---------------------------------------------------------------------------

type PeriodKey = '7' | '30' | '90' | 'custom'

const periodOptions: { key: PeriodKey; label: string }[] = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: 'custom', label: 'Custom' },
]

const vipColors = ['#7c3aed', '#3b82f6', '#f59e0b', '#10b981', '#ec4899']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RevenuePage() {
  const [period, setPeriod] = useState<PeriodKey>('30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [chartData, setChartData] = useState<RevenueChartPoint[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])

  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingChart, setLoadingChart] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const days = period === 'custom' ? 30 : Number(period)

  const fetchData = useCallback(async () => {
    setLoadingSummary(true)
    setLoadingChart(true)
    setLoadingUsers(true)
    setError(null)

    const startDate = period === 'custom' && customStart ? customStart : undefined
    const endDate = period === 'custom' && customEnd ? customEnd : undefined

    try {
      // Try to fetch from real API — fall back to mock data on any error
      const [summaryRes, chartRes, usersRes] = await Promise.allSettled([
        (api as unknown as {
          getRevenueSummary: (p: { startDate?: string; endDate?: string }) => Promise<RevenueSummary>
        }).getRevenueSummary({ startDate, endDate }),
        (api as unknown as {
          getRevenueChart: (p: { period: string; days: number }) => Promise<RevenueChartPoint[]>
        }).getRevenueChart({ period: 'daily', days }),
        (api as unknown as {
          getTopRechargedUsers: (limit: number) => Promise<TopUser[]>
        }).getTopRechargedUsers(10),
      ])

      setSummary(summaryRes.status === 'fulfilled' ? summaryRes.value : mockSummary)
      setChartData(chartRes.status === 'fulfilled' ? chartRes.value : mockChart)
      setTopUsers(usersRes.status === 'fulfilled' ? usersRes.value : mockTopUsers)
    } catch {
      setSummary(mockSummary)
      setChartData(mockChart)
      setTopUsers(mockTopUsers)
      setError('Using demo data — API unavailable')
    } finally {
      setLoadingSummary(false)
      setLoadingChart(false)
      setLoadingUsers(false)
    }
  }, [period, customStart, customEnd, days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // CSV export
  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Revenue (UZS)', 'Transactions'],
      ...chartData.map((p) => [p.date, p.revenue, p.count]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `revenue_${period}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const paymentBarData = (summary ?? mockSummary).paymentBreakdown.map((p) => ({
    provider: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
    revenue: p.total,
    transactions: p.count,
  }))

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

          {/* Custom date inputs */}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <span className="text-[#737373] text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={fetchData}
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
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={`${formatNumber(summary?.total ?? mockSummary.total)} so'm`}
          icon={CurrencyDollarIcon}
          iconColor="text-purple-400"
          iconBg="bg-purple-600/20"
          description={`${formatNumber(summary?.totalTransactions ?? mockSummary.totalTransactions)} transactions`}
          loading={loadingSummary}
        />
        <StatsCard
          title="Today Revenue"
          value={`${formatNumber(summary?.today ?? mockSummary.today)} so'm`}
          icon={CalendarDaysIcon}
          iconColor="text-blue-400"
          iconBg="bg-blue-600/20"
          loading={loadingSummary}
        />
        <StatsCard
          title="This Month"
          value={`${formatNumber(summary?.thisMonth ?? mockSummary.thisMonth)} so'm`}
          icon={ChartBarIcon}
          iconColor="text-green-400"
          iconBg="bg-green-600/20"
          description={`Week: ${formatNumber(summary?.thisWeek ?? mockSummary.thisWeek)} so'm`}
          loading={loadingSummary}
        />
        <StatsCard
          title="Pending Withdrawals"
          value={`${formatNumber(summary?.pendingWithdrawals ?? mockSummary.pendingWithdrawals)} so'm`}
          icon={ArrowDownCircleIcon}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-600/20"
          description={`${summary?.pendingWithdrawalCount ?? mockSummary.pendingWithdrawalCount} pending requests`}
          loading={loadingSummary}
        />
      </div>

      {/* Revenue trend chart */}
      <ChartCard
        title="Revenue Trend"
        subtitle={`Daily revenue over the last ${days} days`}
        loading={loadingChart}
        height={280}
      >
        <VoxoAreaChart
          data={chartData.map((p) => ({
            date: p.date,
            revenue: p.revenue,
            transactions: p.count,
          }))}
          areas={[{ key: 'revenue', label: 'Revenue (so\'m)', color: '#7c3aed' }]}
          xKey="date"
        />
      </ChartCard>

      {/* Bottom row: payment methods + VIP sales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Payment method breakdown */}
        <ChartCard
          title="Payment Method Breakdown"
          subtitle="Revenue by payment provider"
          loading={loadingSummary}
          height={260}
        >
          <VoxoBarChart
            data={paymentBarData}
            bars={[{ key: 'revenue', label: 'Revenue (so\'m)', color: '#3b82f6' }]}
            xKey="provider"
          />
        </ChartCard>

        {/* VIP sales table */}
        <div className="card">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-white font-semibold">VIP Sales</h3>
              <p className="text-[#737373] text-sm mt-0.5">Revenue by VIP tier</p>
            </div>
          </div>

          <div className="space-y-2">
            {mockVipSales.map((vip, i) => (
              <div
                key={vip.level}
                className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: vipColors[i % vipColors.length] }}
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{vip.name}</p>
                    <p className="text-[#737373] text-xs">{vip.count} subscriptions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-semibold">
                    {formatNumber(vip.revenue)} so&apos;m
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top recharged users */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-white font-semibold">Top Recharged Users</h3>
          <p className="text-[#737373] text-sm mt-0.5">Users with highest total recharge amounts</p>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                    VIP
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[#737373] uppercase tracking-wider">
                    Total Recharge
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[#737373] uppercase tracking-wider">
                    Transactions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(topUsers.length ? topUsers : mockTopUsers).map((row, i) => (
                  <tr key={row.user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[#737373] text-sm font-medium">#{i + 1}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {row.user.displayName || row.user.username || row.user.uid}
                        </p>
                        <p className="text-[#737373] text-xs">
                          @{row.user.username || row.user.uid}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {row.user.vipLevel && row.user.vipLevel > 0 ? (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${vipColors[(row.user.vipLevel - 1) % vipColors.length]}20`,
                            color: vipColors[(row.user.vipLevel - 1) % vipColors.length],
                          }}
                        >
                          VIP {row.user.vipLevel}
                        </span>
                      ) : (
                        <span className="text-[#737373] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-green-400 font-semibold text-sm">
                        {formatNumber(row.totalRecharge)} so&apos;m
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[#A0A0B0] text-sm">{row.transactionCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

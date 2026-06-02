'use client'

import { useState, useEffect } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  CurrencyDollarIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import StatsCard from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { ChartCard, VoxoAreaChart } from '@/components/ui/Chart'
import { api } from '@/lib/api'
import { formatNumber, formatDateTime } from '@/lib/utils'
import type { WalletTransaction } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<WalletTransaction>()

const mockStats = {
  totalCoins: 48_250_000,
  totalDiamonds: 3_940_000,
  todayRecharge: 18_420,
  weekRecharge: 94_800,
  monthRecharge: 312_000,
}

const mockRevenueData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  revenue: Math.floor(Math.random() * 20000) + 6000,
  coins: Math.floor(Math.random() * 500000) + 100000,
}))

const mockTransactions: WalletTransaction[] = Array.from({ length: 80 }, (_, i) => ({
  id: `tx-${i}`,
  userId: `user-${i % 20}`,
  user: {
    id: `user-${i % 20}`,
    uid: `U${10000 + i}`,
    username: `user${i % 20}`,
    displayName: `User ${i % 20}`,
    avatar: undefined,
    level: 10,
    vipLevel: 0,
    exp: 0,
    coins: 0,
    diamonds: 0,
    status: 'active' as const,
    isOnline: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalRecharged: 0,
    totalWithdrawn: 0,
    followersCount: 0,
    followingCount: 0,
    totalGiftsSent: 0,
    totalGiftsReceived: 0,
  },
  type: (['recharge', 'gift_sent', 'gift_received', 'withdrawal', 'vip_purchase', 'coins_purchase', 'bonus'] as const)[i % 7],
  amount: Math.floor(Math.random() * 5000) + 10,
  currency: (['coins', 'diamonds', 'usd'] as const)[i % 3],
  description: ['Coin recharge via PayPal', 'Gift sent in room', 'Gift received', 'Withdrawal request', 'VIP subscription', 'Coin package purchase', 'Bonus coins'][i % 7],
  balanceBefore: Math.floor(Math.random() * 10000),
  balanceAfter: Math.floor(Math.random() * 15000),
  status: (['completed', 'completed', 'completed', 'pending', 'failed'] as const)[i % 5],
  createdAt: new Date(Date.now() - i * 3600000 * 2).toISOString(),
}))

const typeLabels: Record<string, string> = {
  recharge: 'Recharge',
  gift_sent: 'Gift Sent',
  gift_received: 'Gift Received',
  withdrawal: 'Withdrawal',
  vip_purchase: 'VIP Purchase',
  coins_purchase: 'Coin Purchase',
  exchange: 'Exchange',
  bonus: 'Bonus',
  refund: 'Refund',
  admin_adjustment: 'Adjustment',
}

const typeColors: Record<string, string> = {
  recharge: 'text-green-400 bg-green-500/20',
  gift_sent: 'text-pink-400 bg-pink-500/20',
  gift_received: 'text-purple-400 bg-purple-500/20',
  withdrawal: 'text-red-400 bg-red-500/20',
  vip_purchase: 'text-amber-400 bg-amber-500/20',
  coins_purchase: 'text-yellow-400 bg-yellow-500/20',
  exchange: 'text-blue-400 bg-blue-500/20',
  bonus: 'text-teal-400 bg-teal-500/20',
  refund: 'text-orange-400 bg-orange-500/20',
  admin_adjustment: 'text-dark-300 bg-dark-600',
}

export default function WalletsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [typeFilter, setTypeFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [loading] = useState(false)

  const filtered = mockTransactions.filter((tx) => {
    const matchType = !typeFilter || tx.type === typeFilter
    const matchCurrency = !currencyFilter || tx.currency === currencyFilter
    return matchType && matchCurrency
  })

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const columns = [
    columnHelper.accessor('user', {
      header: 'User',
      size: 200,
      cell: (info) => {
        const user = info.getValue()
        return (
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar} name={user?.displayName || 'User'} size="sm" />
            <div>
              <p className="text-white text-sm font-medium">{user?.displayName}</p>
              <p className="text-[#737373] text-xs font-mono">{user?.uid}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      size: 140,
      cell: (info) => {
        const type = info.getValue()
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[type] || 'text-[#737373] bg-[#2A2A3A]'}`}>
            {typeLabels[type] || type}
          </span>
        )
      },
    }),
    columnHelper.accessor('currency', {
      header: 'Currency',
      size: 100,
      cell: (info) => {
        const c = info.getValue()
        return (
          <span className={`text-sm font-medium ${c === 'coins' ? 'text-yellow-400' : c === 'diamonds' ? 'text-blue-400' : 'text-green-400'}`}>
            {c === 'coins' ? '🪙' : c === 'diamonds' ? '💎' : '$'} {c.toUpperCase()}
          </span>
        )
      },
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      size: 100,
      cell: (info) => {
        const tx = info.row.original
        const isDebit = ['gift_sent', 'withdrawal'].includes(tx.type)
        return (
          <span className={`text-sm font-semibold ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
            {isDebit ? '-' : '+'}{formatNumber(info.getValue())}
          </span>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: (info) => <Badge status={info.getValue()} size="sm" />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      size: 160,
      cell: (info) => (
        <span className="text-[#737373] text-sm">{formatDateTime(info.getValue())}</span>
      ),
    }),
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Coins in Circulation"
          value={formatNumber(mockStats.totalCoins)}
          icon={CubeIcon}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-600/20"
          description="Active coin supply"
        />
        <StatsCard
          title="Total Diamonds"
          value={formatNumber(mockStats.totalDiamonds)}
          icon={CubeIcon}
          iconColor="text-blue-400"
          iconBg="bg-blue-600/20"
          description="Active diamond supply"
        />
        <StatsCard
          title="Revenue Today"
          value={`$${formatNumber(mockStats.todayRecharge)}`}
          change={23.1}
          icon={CurrencyDollarIcon}
          iconColor="text-green-400"
          iconBg="bg-green-600/20"
          description="All payment methods"
        />
        <StatsCard
          title="Revenue This Month"
          value={`$${formatNumber(mockStats.monthRecharge)}`}
          change={8.4}
          icon={ArrowTrendingUpIcon}
          iconColor="text-purple-400"
          iconBg="bg-purple-600/20"
          description={`$${formatNumber(mockStats.weekRecharge)} this week`}
        />
      </div>

      {/* Revenue Chart */}
      <ChartCard
        title="Daily Revenue (Last 30 Days)"
        subtitle="Total USD collected per day across all payment methods"
        height={280}
        actions={
          <div className="flex items-center gap-2">
            <select className="bg-white/5 border border-white/10 text-[#A0A0B0] text-xs rounded-lg px-3 py-1.5 focus:outline-none">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last year</option>
            </select>
          </div>
        }
      >
        <VoxoAreaChart
          data={mockRevenueData}
          xKey="date"
          areas={[
            { key: 'revenue', label: 'Revenue ($)', color: '#7C3AED' },
          ]}
        />
      </ChartCard>

      {/* Filters + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-white/5">
          <h3 className="text-white font-semibold">Transactions</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
              className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              <option value="">All Types</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
              {(['', 'coins', 'diamonds', 'usd'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => { setCurrencyFilter(c); setPage(1) }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    currencyFilter === c
                      ? 'bg-[#7C3AED] text-white'
                      : 'text-[#737373] hover:text-white'
                  }`}
                >
                  {c === '' ? 'All' : c === 'coins' ? '🪙 Coins' : c === 'diamonds' ? '💎 Diamonds' : '$ USD'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DataTable
          data={paginated}
          columns={columns}
          loading={loading}
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyMessage="No transactions found"
          className="p-4"
        />
      </div>
    </div>
  )
}

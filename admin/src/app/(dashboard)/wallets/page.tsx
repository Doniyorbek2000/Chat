'use client'

import { useState, useEffect, useCallback } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  CurrencyDollarIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import StatsCard from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { ChartCard, VoxoAreaChart } from '@/components/ui/Chart'
import { api } from '@/lib/api'
import { formatNumber, formatDateTime } from '@/lib/utils'
import type { WalletTransaction } from '@/types'

const columnHelper = createColumnHelper<WalletTransaction>()

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
  const [stats, setStats] = useState<any>(null)
  const [txs, setTxs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [typeFilter, setTypeFilter] = useState('')
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingTxs, setLoadingTxs] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [txsError, setTxsError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    setStatsError(null)
    try {
      const data = await api.getWalletStats()
      setStats(data)
    } catch {
      setStatsError('Failed to load wallet stats')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  const loadTxs = useCallback(async () => {
    setLoadingTxs(true)
    setTxsError(null)
    try {
      const res = await api.getTransactions({ type: typeFilter || undefined, page, limit: pageSize })
      setTxs((res as any).data ?? [])
      setTotal((res as any).total ?? 0)
    } catch {
      setTxsError('Failed to load transactions')
      setTxs([])
      setTotal(0)
    } finally {
      setLoadingTxs(false)
    }
  }, [typeFilter, page, pageSize])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadTxs()
  }, [loadTxs])

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
            {c === 'coins' ? '🪙' : c === 'diamonds' ? '💎' : '$'} {c?.toUpperCase()}
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
    columnHelper.accessor('description', {
      header: 'Description',
      size: 200,
      cell: (info) => (
        <span className="text-[#A0A0B0] text-sm truncate block max-w-[180px]">{info.getValue() || '—'}</span>
      ),
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
      {statsError ? (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <span className="text-red-400 text-sm">{statsError}</span>
          <button onClick={loadStats} className="text-red-400 hover:text-red-300 text-sm underline">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatsCard
            title="Total Coins"
            value={formatNumber(stats?.totalCoins ?? 0)}
            icon={CubeIcon}
            iconColor="text-yellow-400"
            iconBg="bg-yellow-600/20"
            description="Active coin supply"
            loading={loadingStats}
          />
          <StatsCard
            title="Total Diamonds"
            value={formatNumber(stats?.totalDiamonds ?? 0)}
            icon={CubeIcon}
            iconColor="text-blue-400"
            iconBg="bg-blue-600/20"
            description="Active diamond supply"
            loading={loadingStats}
          />
          <StatsCard
            title="Today Recharge"
            value={`$${formatNumber(stats?.todayRecharge ?? 0)}`}
            icon={CurrencyDollarIcon}
            iconColor="text-green-400"
            iconBg="bg-green-600/20"
            description="Today's total"
            loading={loadingStats}
          />
          <StatsCard
            title="Week Recharge"
            value={`$${formatNumber(stats?.weekRecharge ?? 0)}`}
            icon={ArrowTrendingUpIcon}
            iconColor="text-purple-400"
            iconBg="bg-purple-600/20"
            description="This week"
            loading={loadingStats}
          />
          <StatsCard
            title="Month Recharge"
            value={`$${formatNumber(stats?.monthRecharge ?? 0)}`}
            icon={ArrowTrendingUpIcon}
            iconColor="text-teal-400"
            iconBg="bg-teal-600/20"
            description="This month"
            loading={loadingStats}
          />
        </div>
      )}

      {/* Revenue Chart placeholder */}
      <ChartCard
        title="Daily Revenue (Last 30 Days)"
        subtitle="Total collected per day across all payment methods"
        height={280}
        actions={
          <button
            onClick={loadStats}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white transition-all"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        }
      >
        <VoxoAreaChart
          data={[]}
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
            <button
              onClick={loadTxs}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white transition-all"
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {txsError && (
          <div className="flex items-center justify-between mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <span className="text-red-400 text-sm">{txsError}</span>
            <button onClick={loadTxs} className="text-red-400 hover:text-red-300 text-sm underline">Retry</button>
          </div>
        )}

        <DataTable
          data={txs}
          columns={columns}
          loading={loadingTxs}
          total={total}
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

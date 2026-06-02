'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatNumber, formatDateTime } from '@/lib/utils'
import type { Withdrawal } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<Withdrawal>()

type WithdrawalTabStatus = 'pending' | 'processing' | 'approved' | 'rejected'

const methodLabels: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  paypal: 'PayPal',
  alipay: 'Alipay',
  wechat: 'WeChat Pay',
  crypto: 'Crypto',
}

const mockWithdrawals: Withdrawal[] = Array.from({ length: 60 }, (_, i) => ({
  id: `w-${i}`,
  userId: `user-${i % 15}`,
  user: {
    id: `user-${i % 15}`,
    uid: `U${10000 + i}`,
    username: `user${i % 15}`,
    displayName: `User ${i % 15}`,
    avatar: undefined,
    level: 20,
    vipLevel: (i % 5) as 0 | 1 | 2 | 3 | 4,
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
  amount: Math.floor(Math.random() * 50000) + 1000,
  currency: 'USD',
  method: (['bank_transfer', 'paypal', 'alipay', 'wechat', 'crypto'] as const)[i % 5],
  accountInfo: {
    account: i % 5 === 0 ? `****${String(1000 + i).slice(-4)}` : `user${i % 15}@example.com`,
    name: `User ${i % 15}`,
  },
  status: (['pending', 'pending', 'processing', 'approved', 'rejected'] as const)[i % 5],
  fee: Math.floor(Math.random() * 50) + 5,
  netAmount: Math.floor(Math.random() * 49000) + 950,
  requestedAt: new Date(Date.now() - i * 3600000 * 6).toISOString(),
  processedAt: i % 5 >= 2 ? new Date(Date.now() - i * 3600000 * 2).toISOString() : undefined,
}))

export default function WithdrawalsPage() {
  const [activeTab, setActiveTab] = useState<WithdrawalTabStatus>('pending')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [approveTarget, setApproveTarget] = useState<Withdrawal | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const tabCounts = {
    pending: mockWithdrawals.filter(w => w.status === 'pending').length,
    processing: mockWithdrawals.filter(w => w.status === 'processing').length,
    approved: mockWithdrawals.filter(w => w.status === 'approved').length,
    rejected: mockWithdrawals.filter(w => w.status === 'rejected').length,
  }

  const pendingAmount = mockWithdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0)

  const todayCompleted = mockWithdrawals.filter(w => w.status === 'approved').length
  const monthTotal = mockWithdrawals.filter(w => ['approved'].includes(w.status)).reduce((s, w) => s + w.netAmount, 0)

  const filtered = mockWithdrawals.filter(w => w.status === activeTab)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleApprove = async () => {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      await api.approveWithdrawal(approveTarget.id)
      toast.success('Withdrawal approved and set to Processing')
      setApproveTarget(null)
    } catch {
      toast.error('Failed to approve withdrawal')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      setRejectError('Reason is required')
      return
    }
    setActionLoading(true)
    try {
      await api.rejectWithdrawal(rejectTarget.id, rejectReason)
      toast.success('Withdrawal rejected')
      setRejectTarget(null)
      setRejectReason('')
      setRejectError('')
    } catch {
      toast.error('Failed to reject withdrawal')
    } finally {
      setActionLoading(false)
    }
  }

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
              <p className="text-[#737373] text-xs">@{user?.username}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('amount', {
      header: 'Amount (💎)',
      size: 120,
      cell: (info) => (
        <span className="text-blue-400 font-semibold text-sm">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('method', {
      header: 'Method',
      size: 130,
      cell: (info) => (
        <span className="text-white text-sm">{methodLabels[info.getValue()] || info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('accountInfo', {
      header: 'Account',
      size: 160,
      cell: (info) => {
        const info_ = info.getValue()
        return <span className="text-[#A0A0B0] text-sm font-mono">{info_?.account || '—'}</span>
      },
    }),
    columnHelper.accessor('requestedAt', {
      header: 'Requested',
      size: 150,
      cell: (info) => (
        <span className="text-[#737373] text-sm">{formatDateTime(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: (info) => <Badge status={info.getValue()} size="sm" />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 120,
      cell: ({ row }) => {
        const w = row.original
        return (
          <div className="flex items-center gap-1">
            {w.status === 'pending' && (
              <>
                <button
                  onClick={() => setApproveTarget(w)}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-green-400 hover:bg-green-500/10 transition-all"
                  title="Approve"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setRejectTarget(w); setRejectReason(''); setRejectError('') }}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Reject"
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              </>
            )}
            {w.status === 'processing' && (
              <button
                onClick={() => setApproveTarget(w)}
                className="p-1.5 rounded-lg text-[#737373] hover:text-green-400 hover:bg-green-500/10 transition-all"
                title="Mark Complete"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </button>
            )}
            {(w.status === 'approved' || w.status === 'rejected') && (
              <span className="text-[#737373] text-xs px-2">—</span>
            )}
          </div>
        )
      },
    }),
  ]

  const tabs: { key: WithdrawalTabStatus; label: string; color: string }[] = [
    { key: 'pending', label: 'Pending', color: 'text-yellow-400' },
    { key: 'processing', label: 'Processing', color: 'text-blue-400' },
    { key: 'approved', label: 'Completed', color: 'text-green-400' },
    { key: 'rejected', label: 'Rejected', color: 'text-red-400' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending Count', value: tabCounts.pending, color: 'text-yellow-400', icon: ClockIcon },
          { label: 'Pending Amount', value: `💎 ${formatNumber(pendingAmount)}`, color: 'text-blue-400', icon: BanknotesIcon },
          { label: 'Today Completed', value: todayCompleted, color: 'text-green-400', icon: CheckCircleIcon },
          { label: 'Month Total', value: `$${formatNumber(monthTotal)}`, color: 'text-purple-400', icon: BanknotesIcon },
        ].map((stat) => (
          <div key={stat.label} className="card py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[#737373] text-xs mt-0.5">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-white/5 px-5">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1) }}
                className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.key
                    ? `text-white border-[#7C3AED]`
                    : 'text-[#737373] border-transparent hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key ? 'bg-[#7C3AED]/20 text-[#A78BFA]' : 'bg-white/5 text-[#737373]'
                }`}>
                  {tabCounts[tab.key]}
                </span>
              </button>
            ))}
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
          emptyMessage="No withdrawals in this status"
          className="p-4"
        />
      </div>

      {/* Approve Modal */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve Withdrawal" size="sm">
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-green-400 text-sm font-medium">
              Approve withdrawal of 💎 {formatNumber(approveTarget?.amount || 0)} for{' '}
              <strong>{approveTarget?.user?.displayName}</strong>?
            </p>
            <p className="text-[#737373] text-xs mt-1">
              via {methodLabels[approveTarget?.method || ''] || approveTarget?.method} — This will set status to PROCESSING.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setApproveTarget(null)} className="btn-secondary" disabled={actionLoading}>
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-green-500/20 disabled:opacity-50"
            >
              {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
              Approve
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Withdrawal" size="sm">
        <div className="space-y-4">
          <p className="text-[#A0A0B0] text-sm">
            Reject withdrawal of 💎 {formatNumber(rejectTarget?.amount || 0)} for{' '}
            <strong className="text-white">{rejectTarget?.user?.displayName}</strong>?
          </p>
          <div>
            <label className="text-[#C0C0D0] text-sm font-medium block mb-1.5">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); setRejectError('') }}
              placeholder="Enter rejection reason..."
              rows={3}
              className="bg-white/5 border border-white/10 text-white placeholder-[#737373] rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
            />
            {rejectError && <p className="text-red-400 text-xs mt-1">{rejectError}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectTarget(null)} className="btn-secondary" disabled={actionLoading}>
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-red-500/20 disabled:opacity-50"
            >
              {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
              Reject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

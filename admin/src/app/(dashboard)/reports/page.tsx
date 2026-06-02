'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ShieldExclamationIcon,
  EyeIcon,
  NoSymbolIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatDateTime, timeAgo } from '@/lib/utils'
import type { Report } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<Report>()

type ReportTab = 'pending' | 'reviewing' | 'resolved'

const reportTypes = ['spam', 'harassment', 'nudity', 'hate_speech', 'scam', 'fake_account', 'violence', 'other']
const typeColors: Record<string, string> = {
  spam: 'text-yellow-400 bg-yellow-500/20',
  harassment: 'text-red-400 bg-red-500/20',
  nudity: 'text-pink-400 bg-pink-500/20',
  hate_speech: 'text-orange-400 bg-orange-500/20',
  scam: 'text-amber-400 bg-amber-500/20',
  fake_account: 'text-blue-400 bg-blue-500/20',
  violence: 'text-red-500 bg-red-600/20',
  other: 'text-[#737373] bg-white/5',
}

const mockReports: (Report & { previousReports: number })[] = Array.from({ length: 60 }, (_, i) => ({
  id: `report-${i}`,
  reporterId: `user-${i % 30}`,
  reporter: {
    id: `user-${i % 30}`,
    uid: `U${10000 + i}`,
    username: `reporter${i % 30}`,
    displayName: `Reporter ${i % 30}`,
    avatar: undefined,
    level: 5,
    vipLevel: 0 as const,
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
  targetId: `user-${(i + 5) % 30}`,
  targetType: (['user', 'room', 'message'] as const)[i % 3],
  targetUser: {
    id: `user-${(i + 5) % 30}`,
    uid: `U${20000 + i}`,
    username: `target${(i + 5) % 30}`,
    displayName: `Target User ${(i + 5) % 30}`,
    avatar: undefined,
    level: 15,
    vipLevel: (i % 4) as 0|1|2|3,
    exp: 0,
    coins: 0,
    diamonds: 0,
    status: 'active' as const,
    isOnline: i % 5 === 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalRecharged: 0,
    totalWithdrawn: 0,
    followersCount: 0,
    followingCount: 0,
    totalGiftsSent: 0,
    totalGiftsReceived: 0,
  },
  reason: reportTypes[i % reportTypes.length],
  description: 'This user is repeatedly sending unwanted messages and harassing other users in the room.',
  evidence: i % 3 === 0 ? ['https://picsum.photos/400/300?random=' + i, 'https://picsum.photos/400/300?random=' + (i + 1)] : [],
  status: (['pending', 'pending', 'reviewing', 'resolved', 'dismissed'] as const)[i % 5] as 'pending' | 'reviewing' | 'resolved' | 'dismissed',
  createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
  updatedAt: new Date(Date.now() - i * 3600000 * 2).toISOString(),
  previousReports: Math.floor(Math.random() * 8),
}))

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('pending')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading] = useState(false)
  const [viewTarget, setViewTarget] = useState<(typeof mockReports)[0] | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const tabCounts = {
    pending: mockReports.filter(r => r.status === 'pending').length,
    reviewing: mockReports.filter(r => r.status === 'reviewing').length,
    resolved: mockReports.filter(r => ['resolved', 'dismissed'].includes(r.status)).length,
  }

  const filtered = mockReports.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending'
    if (activeTab === 'reviewing') return r.status === 'reviewing'
    return ['resolved', 'dismissed'].includes(r.status)
  })
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleWarn = async (report: typeof mockReports[0]) => {
    setActionLoading(true)
    try {
      await api.resolveReport(report.id, { action: 'warn', adminNote: 'Warning issued by admin' })
      toast.success('User warned successfully')
      setViewTarget(null)
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBan = async (report: typeof mockReports[0]) => {
    setActionLoading(true)
    try {
      await api.resolveReport(report.id, { action: 'ban_user', adminNote: 'Banned after report review' })
      toast.success('User banned successfully')
      setViewTarget(null)
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDismiss = async (report: typeof mockReports[0]) => {
    setActionLoading(true)
    try {
      await api.dismissReport(report.id, 'Report dismissed after review')
      toast.success('Report dismissed')
      setViewTarget(null)
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    columnHelper.accessor('reporter', {
      header: 'Reporter',
      size: 160,
      cell: (info) => {
        const reporter = info.getValue()
        return (
          <div className="flex items-center gap-2">
            <Avatar src={reporter?.avatar} name={reporter?.displayName || 'User'} size="xs" />
            <span className="text-[#C0C0D0] text-sm">{reporter?.displayName}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('targetUser', {
      header: 'Target',
      size: 160,
      cell: (info) => {
        const target = info.getValue()
        const row = info.row.original
        return (
          <div className="flex items-center gap-2">
            <Avatar src={target?.avatar} name={target?.displayName || 'User'} size="xs" />
            <div>
              <p className="text-[#C0C0D0] text-sm">{target?.displayName}</p>
              <p className="text-[#737373] text-xs">{row.targetType}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('reason', {
      header: 'Type',
      size: 140,
      cell: (info) => {
        const reason = info.getValue()
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[reason] || 'text-[#737373] bg-white/5'}`}>
            {reason.replace(/_/g, ' ')}
          </span>
        )
      },
    }),
    columnHelper.accessor('description', {
      header: 'Reason',
      size: 200,
      cell: (info) => (
        <span className="text-[#A0A0B0] text-sm line-clamp-1">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      size: 120,
      cell: (info) => (
        <span className="text-[#737373] text-sm">{timeAgo(info.getValue())}</span>
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
      size: 130,
      cell: ({ row }) => {
        const report = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewTarget(report)}
              className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {(report.status === 'pending' || report.status === 'reviewing') && (
              <>
                <button
                  onClick={() => handleWarn(report)}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                  title="Warn User"
                >
                  <ShieldExclamationIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleBan(report)}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Ban User"
                >
                  <NoSymbolIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDismiss(report)}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-[#A0A0B0] hover:bg-white/5 transition-all"
                  title="Dismiss"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )
      },
    }),
  ]

  const tabs = [
    { key: 'pending' as ReportTab, label: 'Pending' },
    { key: 'reviewing' as ReportTab, label: 'In Review' },
    { key: 'resolved' as ReportTab, label: 'Resolved' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-white/5 px-5">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1) }}
                className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.key
                    ? 'text-white border-[#7C3AED]'
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
          emptyMessage="No reports in this category"
          className="p-4"
        />
      </div>

      {/* Detail Modal */}
      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Report Details" size="lg">
        {viewTarget && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/3 rounded-xl p-4">
                <p className="text-[#737373] text-xs mb-2">Reporter</p>
                <div className="flex items-center gap-2">
                  <Avatar src={viewTarget.reporter?.avatar} name={viewTarget.reporter?.displayName || 'User'} size="sm" />
                  <div>
                    <p className="text-white text-sm font-medium">{viewTarget.reporter?.displayName}</p>
                    <p className="text-[#737373] text-xs">@{viewTarget.reporter?.username}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/3 rounded-xl p-4">
                <p className="text-[#737373] text-xs mb-2">Target ({viewTarget.targetType})</p>
                <div className="flex items-center gap-2">
                  <Avatar src={viewTarget.targetUser?.avatar} name={viewTarget.targetUser?.displayName || 'User'} size="sm" />
                  <div>
                    <p className="text-white text-sm font-medium">{viewTarget.targetUser?.displayName}</p>
                    <p className="text-[#737373] text-xs">
                      {viewTarget.previousReports > 0 && (
                        <span className="text-red-400">{viewTarget.previousReports} previous reports</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/3 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[viewTarget.reason] || 'text-[#737373] bg-white/5'}`}>
                  {viewTarget.reason.replace(/_/g, ' ')}
                </span>
                <span className="text-[#737373] text-xs">{formatDateTime(viewTarget.createdAt)}</span>
                <Badge status={viewTarget.status} size="sm" className="ml-auto" />
              </div>
              <p className="text-[#C0C0D0] text-sm">{viewTarget.description}</p>
            </div>

            {viewTarget.evidence && viewTarget.evidence.length > 0 && (
              <div>
                <p className="text-[#737373] text-xs mb-3">Evidence ({viewTarget.evidence.length} items)</p>
                <div className="grid grid-cols-2 gap-3">
                  {viewTarget.evidence.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-xl border border-white/10"
                    />
                  ))}
                </div>
              </div>
            )}

            {viewTarget.previousReports > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-sm">
                  This user has been reported {viewTarget.previousReports} time{viewTarget.previousReports !== 1 ? 's' : ''} before.
                </p>
              </div>
            )}

            {(viewTarget.status === 'pending' || viewTarget.status === 'reviewing') && (
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleDismiss(viewTarget)}
                  disabled={actionLoading}
                  className="btn-secondary flex-1"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleWarn(viewTarget)}
                  disabled={actionLoading}
                  className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 font-medium px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 border border-yellow-500/20 disabled:opacity-50"
                >
                  {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
                  Warn User
                </button>
                <button
                  onClick={() => handleBan(viewTarget)}
                  disabled={actionLoading}
                  className="flex-1 btn-danger"
                >
                  {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
                  Ban User
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

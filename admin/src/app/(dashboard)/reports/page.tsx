'use client'

import { useState, useEffect, useCallback } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ShieldExclamationIcon,
  EyeIcon,
  NoSymbolIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatDateTime, timeAgo } from '@/lib/utils'
import type { Report } from '@/types'
import toast from 'react-hot-toast'

type ReportRow = Report & { previousReports?: number }
const columnHelper = createColumnHelper<ReportRow>()

type StatusFilter = '' | 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED'

const typeColors: Record<string, string> = {
  spam: 'text-yellow-400 bg-yellow-500/20',
  harassment: 'text-red-400 bg-red-500/20',
  nudity: 'text-pink-400 bg-pink-500/20',
  hate_speech: 'text-orange-400 bg-orange-500/20',
  scam: 'text-amber-400 bg-amber-500/20',
  fake_account: 'text-blue-400 bg-blue-500/20',
  violence: 'text-red-500 bg-red-600/20',
  other: 'text-[#737373] bg-white/5',
  USER: 'text-blue-400 bg-blue-500/20',
  ROOM: 'text-green-400 bg-green-500/20',
  MESSAGE: 'text-purple-400 bg-purple-500/20',
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWING', label: 'Reviewing' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
]

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [reports, setReports] = useState<ReportRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewTarget, setViewTarget] = useState<ReportRow | null>(null)
  const [resolveTarget, setResolveTarget] = useState<ReportRow | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [dismissTarget, setDismissTarget] = useState<ReportRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getReports({
        status: statusFilter || undefined,
        page,
        limit: pageSize,
      })
      setReports(((res as any).data ?? []) as ReportRow[])
      setTotal((res as any).total ?? 0)
    } catch {
      setError('Failed to load reports')
      setReports([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  const handleResolve = async () => {
    if (!resolveTarget) return
    setActionLoading(true)
    try {
      await api.resolveReport(resolveTarget.id, { action: 'resolved', adminNote: resolveNote })
      toast.success('Report resolved')
      setResolveTarget(null)
      setResolveNote('')
      setViewTarget(null)
      load()
    } catch {
      toast.error('Failed to resolve report')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!dismissTarget) return
    setActionLoading(true)
    try {
      await api.dismissReport(dismissTarget.id, 'Dismissed by admin')
      toast.success('Report dismissed')
      setDismissTarget(null)
      setViewTarget(null)
      load()
    } catch {
      toast.error('Failed to dismiss report')
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
            <div>
              <p className="text-[#C0C0D0] text-sm">{reporter?.displayName}</p>
              <p className="text-[#737373] text-xs font-mono">{reporter?.uid}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('targetType', {
      header: 'Target Type',
      size: 110,
      cell: (info) => {
        const t = (info.getValue() as string) || ''
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[t] || 'text-[#737373] bg-white/5'}`}>
            {t}
          </span>
        )
      },
    }),
    columnHelper.accessor('reason', {
      header: 'Reason',
      size: 140,
      cell: (info) => {
        const reason = info.getValue() || ''
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[reason] || 'text-[#737373] bg-white/5'}`}>
            {reason.replace(/_/g, ' ')}
          </span>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: (info) => <Badge status={(info.getValue() as string)?.toLowerCase()} size="sm" />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      size: 120,
      cell: (info) => (
        <span className="text-[#737373] text-sm">{timeAgo(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 130,
      cell: ({ row }) => {
        const report = row.original
        const status = (report.status as string)?.toUpperCase()
        const isActive = status === 'PENDING' || status === 'REVIEWING'
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewTarget(report)}
              className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {isActive && (
              <>
                <button
                  onClick={() => { setResolveTarget(report); setResolveNote('') }}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-green-400 hover:bg-green-500/10 transition-all"
                  title="Resolve"
                >
                  <ShieldExclamationIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDismissTarget(report)}
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === opt.value
                ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30'
                : 'text-[#737373] hover:text-white hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white transition-all"
          title="Refresh"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={load} className="text-red-400 hover:text-red-300 text-sm underline">Retry</button>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <DataTable
          data={reports}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyMessage="No reports found"
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
                <div>
                  <p className="text-white text-sm font-medium">{viewTarget.targetId}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/3 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[viewTarget.reason] || 'text-[#737373] bg-white/5'}`}>
                  {viewTarget.reason?.replace(/_/g, ' ')}
                </span>
                <span className="text-[#737373] text-xs">{formatDateTime(viewTarget.createdAt)}</span>
                <Badge status={(viewTarget.status as string)?.toLowerCase()} size="sm" className="ml-auto" />
              </div>
              {viewTarget.description && (
                <p className="text-[#C0C0D0] text-sm">{viewTarget.description}</p>
              )}
            </div>

            {(() => {
              const status = (viewTarget.status as string)?.toUpperCase()
              const isActive = status === 'PENDING' || status === 'REVIEWING'
              return isActive ? (
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <button
                    onClick={() => { setDismissTarget(viewTarget); setViewTarget(null) }}
                    disabled={actionLoading}
                    className="btn-secondary flex-1"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => { setResolveTarget(viewTarget); setResolveNote(''); setViewTarget(null) }}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 border border-green-500/20 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              ) : null
            })()}
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal open={!!resolveTarget} onClose={() => { setResolveTarget(null); setResolveNote('') }} title="Resolve Report" size="sm">
        <div className="space-y-4">
          <p className="text-[#A0A0B0] text-sm">Resolve this report with an admin note.</p>
          <div>
            <label className="text-[#C0C0D0] text-sm font-medium block mb-1.5">
              Admin Note
            </label>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Enter resolution note..."
              rows={3}
              className="bg-white/5 border border-white/10 text-white placeholder-[#737373] rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setResolveTarget(null); setResolveNote('') }} className="btn-secondary" disabled={actionLoading}>
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={actionLoading}
              className="bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-green-500/20 disabled:opacity-50"
            >
              {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
              Resolve
            </button>
          </div>
        </div>
      </Modal>

      {/* Dismiss Confirm */}
      <ConfirmModal
        open={!!dismissTarget}
        onClose={() => setDismissTarget(null)}
        onConfirm={handleDismiss}
        title="Dismiss Report"
        message="Are you sure you want to dismiss this report? It will be marked as dismissed."
        confirmLabel="Dismiss"
        loading={actionLoading}
      />
    </div>
  )
}

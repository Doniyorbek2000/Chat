'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<any>()

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<any | null>(null)
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getAgencies({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: pageSize,
      })
      setAgencies((res as any).data ?? [])
      setTotal((res as any).total ?? 0)
    } catch {
      setError('Failed to load agencies')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page, pageSize])

  useEffect(() => { load() }, [load])

  const handleSearchInput = (val: string) => {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 400)
  }

  const handleApprove = async (agency: any) => {
    setActionLoading(true)
    try {
      await api.approveAgency(agency.id)
      toast.success(`Agency "${agency.name}" approved`)
      load()
    } catch {
      toast.error('Failed to approve agency')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setActionLoading(true)
    try {
      await api.rejectAgency(rejectTarget.id, rejectReason || 'Does not meet requirements')
      toast.success(`Agency "${rejectTarget.name}" rejected`)
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch {
      toast.error('Failed to reject agency')
    } finally {
      setActionLoading(false)
    }
  }

  const activeCount = agencies.filter(a => a.status === 'active').length
  const pendingCount = agencies.filter(a => a.status === 'pending').length

  const columns = [
    columnHelper.accessor('name', {
      header: 'Agency',
      size: 220,
      cell: (info: any) => {
        const agency = info.row.original
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <BuildingOfficeIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{agency.name}</p>
              {agency.region && <p className="text-[#737373] text-xs">{agency.region}</p>}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('owner', {
      header: 'Owner',
      size: 160,
      cell: (info: any) => {
        const owner = info.getValue()
        const displayName = owner?.displayName ?? owner?.username ?? '—'
        return (
          <div className="flex items-center gap-2">
            <Avatar src={owner?.avatar} name={displayName} size="xs" />
            <span className="text-[#C0C0D0] text-sm">{displayName}</span>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'members',
      header: 'Members',
      size: 90,
      cell: ({ row }: any) => {
        const agency = row.original
        const count = agency.talentsCount ?? agency.memberCount ?? agency._count?.members ?? '—'
        return <span className="text-white text-sm font-medium">{count}</span>
      },
    }),
    columnHelper.display({
      id: 'verified',
      header: 'Verified',
      size: 90,
      cell: ({ row }: any) => {
        const agency = row.original
        const isVerified = agency.isVerified ?? agency.status === 'active'
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isVerified ? 'text-green-400 bg-green-500/20' : 'text-[#737373] bg-white/5'}`}>
            {isVerified ? 'Verified' : 'Unverified'}
          </span>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: (info: any) => <Badge status={info.getValue() ?? 'pending'} size="sm" />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      size: 120,
      cell: (info: any) => (
        <span className="text-[#737373] text-sm">{info.getValue() ? formatDate(info.getValue()) : '—'}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 130,
      cell: ({ row }: any) => {
        const agency = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewTarget(agency)}
              className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {agency.status === 'pending' && (
              <>
                <button
                  onClick={() => handleApprove(agency)}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-green-400 hover:bg-green-500/10 transition-all"
                  title="Approve"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setRejectTarget(agency); setRejectReason('') }}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Reject"
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )
      },
    }),
  ]

  if (error) {
    return (
      <div className="card text-center py-12 space-y-3">
        <p className="text-red-400">{error}</p>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Agencies', value: total, color: 'text-white' },
          { label: 'Active', value: activeCount, color: 'text-green-400' },
          { label: 'Pending Approval', value: pendingCount, color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="card py-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[#737373] text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 border-b border-white/5">
          <div className="flex-1 relative max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder="Search agencies..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="banned">Banned</option>
          </select>
        </div>
        <DataTable
          data={agencies}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyMessage="No agencies found"
          className="p-4"
        />
      </div>

      {/* View Modal */}
      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Agency Details" size="md">
        {viewTarget && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <BuildingOfficeIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white text-xl font-bold">{viewTarget.name}</h4>
                {viewTarget.region && <p className="text-[#737373]">Region: {viewTarget.region}</p>}
              </div>
              <Badge status={viewTarget.status ?? 'pending'} className="ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Owner', value: viewTarget.owner?.displayName ?? viewTarget.owner?.username ?? '—' },
                { label: 'Members', value: viewTarget.talentsCount ?? viewTarget.memberCount ?? viewTarget._count?.members ?? '—' },
                { label: 'Commission Rate', value: viewTarget.commissionRate != null ? `${viewTarget.commissionRate}%` : '—' },
                { label: 'Total Revenue', value: viewTarget.totalRevenue != null ? `${formatNumber(viewTarget.totalRevenue)} 💎` : '—' },
                { label: 'Total Withdrawn', value: viewTarget.totalWithdrawn != null ? `${formatNumber(viewTarget.totalWithdrawn)} 💎` : '—' },
                { label: 'Created', value: viewTarget.createdAt ? formatDate(viewTarget.createdAt) : '—' },
              ].map((item) => (
                <div key={item.label} className="bg-white/3 rounded-xl p-3">
                  <p className="text-[#737373] text-xs mb-1">{item.label}</p>
                  <p className="text-white text-sm font-medium">{String(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Agency" size="sm">
        {rejectTarget && (
          <div className="space-y-4">
            <p className="text-[#A0A0B0] text-sm">Reject <span className="text-white font-medium">"{rejectTarget.name}"</span>?</p>
            <FormField label="Reason">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Reason for rejection..."
              />
            </FormField>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectTarget(null)} className="btn-secondary" disabled={actionLoading}>Cancel</button>
              <button onClick={handleReject} className="btn-danger" disabled={actionLoading}>
                {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

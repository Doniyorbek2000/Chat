'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XCircleIcon,
  ArrowPathIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<any>()

export default function CouplesPage() {
  const [couples, setCouples] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<any | null>(null)
  const [viewDetail, setViewDetail] = useState<any | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [endTarget, setEndTarget] = useState<any | null>(null)
  const [endReason, setEndReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCouples({ search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, page, limit: pageSize } as any)
      setCouples((res as any).data ?? [])
      setTotal((res as any).total ?? 0)
    } catch {
      setError('Failed to load couples')
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

  const handleViewCouple = async (couple: any) => {
    setViewTarget(couple)
    setViewDetail(null)
    setViewLoading(true)
    try {
      const detail = await api.getCouple(couple.id)
      setViewDetail(detail)
    } catch {
      setViewDetail(couple)
    } finally {
      setViewLoading(false)
    }
  }

  const handleEnd = async () => {
    if (!endTarget) return
    setActionLoading(true)
    try {
      await api.endCouple(endTarget.id, endReason || 'Ended by admin')
      toast.success('Couple relationship ended')
      setEndTarget(null)
      setEndReason('')
      load()
    } catch {
      toast.error('Failed to end couple')
    } finally {
      setActionLoading(false)
    }
  }

  const activeCount = couples.filter(c => c.status === 'ACTIVE').length
  const endedCount = couples.filter(c => c.status === 'ENDED').length

  const columns = [
    columnHelper.display({
      id: 'couple',
      header: 'Couple',
      size: 280,
      cell: ({ row }: any) => {
        const c = row.original
        const u1 = c.user1 ?? {}
        const u2 = c.user2 ?? {}
        return (
          <div className="flex items-center gap-2">
            <Avatar src={u1.avatar} name={u1.displayName ?? '?'} size="xs" />
            <span className="text-white text-sm font-medium truncate max-w-[90px]">{u1.displayName ?? u1.uid ?? '?'}</span>
            <HeartIcon className="w-4 h-4 text-pink-400 shrink-0" />
            <Avatar src={u2.avatar} name={u2.displayName ?? '?'} size="xs" />
            <span className="text-white text-sm font-medium truncate max-w-[90px]">{u2.displayName ?? u2.uid ?? '?'}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('level', {
      header: 'Level',
      size: 80,
      cell: (info: any) => (
        <span className="text-pink-400 font-bold text-sm">Lv.{info.getValue() ?? 1}</span>
      ),
    }),
    columnHelper.accessor('xp', {
      header: 'XP',
      size: 100,
      cell: (info: any) => (
        <span className="text-[#C0C0D0] text-sm">{Number(info.getValue() ?? 0).toLocaleString()}</span>
      ),
    }),
    columnHelper.accessor('anniversaryDate', {
      header: 'Anniversary',
      size: 120,
      cell: (info: any) => {
        const val = info.getValue()
        if (!val) return <span className="text-[#737373] text-sm">-</span>
        const days = Math.floor((Date.now() - new Date(val).getTime()) / (1000 * 60 * 60 * 24))
        return (
          <div>
            <span className="text-[#C0C0D0] text-sm">{formatDate(val)}</span>
            <p className="text-[#737373] text-xs">{days} days</p>
          </div>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info: any) => {
        const val = info.getValue()
        return <Badge status={val === 'ACTIVE' ? 'active' : 'inactive'} label={val} size="sm" />
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      size: 120,
      cell: (info: any) => (
        <span className="text-[#737373] text-sm">{info.getValue() ? formatDate(info.getValue()) : '-'}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: ({ row }: any) => {
        const couple = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleViewCouple(couple)}
              className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {couple.status === 'ACTIVE' && (
              <button
                onClick={() => { setEndTarget(couple); setEndReason('') }}
                className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="End Couple"
              >
                <XCircleIcon className="w-4 h-4" />
              </button>
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
          { label: 'Total Couples', value: total, color: 'text-white' },
          { label: 'Active', value: activeCount, color: 'text-pink-400' },
          { label: 'Ended', value: endedCount, color: 'text-[#737373]' },
        ].map((stat) => (
          <div key={stat.label} className="card py-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[#737373] text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-4 p-5 border-b border-white/5">
          <div className="flex-1 relative max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder="Search by user name..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="input w-auto"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ENDED">Ended</option>
          </select>
          <span className="text-[#737373] text-sm">{total} couples</span>
        </div>
        <DataTable
          data={couples}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyMessage="No couples found"
          className="p-4"
        />
      </div>

      {/* View Modal */}
      <Modal open={!!viewTarget} onClose={() => { setViewTarget(null); setViewDetail(null) }} title="Couple Details" size="md">
        {viewTarget && (
          <div className="space-y-5">
            {viewLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-6 py-4">
                  <div className="text-center">
                    <Avatar src={(viewDetail ?? viewTarget).user1?.avatar} name={(viewDetail ?? viewTarget).user1?.displayName ?? '?'} size="lg" />
                    <p className="text-white text-sm font-medium mt-2">{(viewDetail ?? viewTarget).user1?.displayName ?? '?'}</p>
                    <p className="text-[#737373] text-xs">Lv.{(viewDetail ?? viewTarget).user1?.level ?? 1}</p>
                  </div>
                  <HeartIcon className="w-8 h-8 text-pink-400" />
                  <div className="text-center">
                    <Avatar src={(viewDetail ?? viewTarget).user2?.avatar} name={(viewDetail ?? viewTarget).user2?.displayName ?? '?'} size="lg" />
                    <p className="text-white text-sm font-medium mt-2">{(viewDetail ?? viewTarget).user2?.displayName ?? '?'}</p>
                    <p className="text-[#737373] text-xs">Lv.{(viewDetail ?? viewTarget).user2?.level ?? 1}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Level', value: `Lv.${(viewDetail ?? viewTarget).level ?? 1}` },
                    { label: 'XP', value: Number((viewDetail ?? viewTarget).xp ?? 0).toLocaleString() },
                    { label: 'Status', value: (viewDetail ?? viewTarget).status ?? '-' },
                    { label: 'Anniversary', value: (viewDetail ?? viewTarget).anniversaryDate ? formatDate((viewDetail ?? viewTarget).anniversaryDate) : '-' },
                    { label: 'Created', value: (viewDetail ?? viewTarget).createdAt ? formatDate((viewDetail ?? viewTarget).createdAt) : '-' },
                    ...(viewDetail ?? viewTarget).endReason ? [{ label: 'End Reason', value: (viewDetail ?? viewTarget).endReason }] : [],
                  ].map((item) => (
                    <div key={item.label} className="bg-white/3 rounded-xl p-3">
                      <p className="text-[#737373] text-xs mb-1">{item.label}</p>
                      <p className="text-white text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* End Couple Modal */}
      <Modal open={!!endTarget} onClose={() => setEndTarget(null)} title="End Couple" size="sm">
        {endTarget && (
          <div className="space-y-4">
            <p className="text-[#A0A0B0] text-sm">
              End the couple between <span className="text-white font-medium">{endTarget.user1?.displayName ?? '?'}</span> and <span className="text-white font-medium">{endTarget.user2?.displayName ?? '?'}</span>?
            </p>
            <FormField label="Reason">
              <textarea
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Reason for ending..."
              />
            </FormField>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEndTarget(null)} className="btn-secondary" disabled={actionLoading}>Cancel</button>
              <button onClick={handleEnd} className="btn-danger" disabled={actionLoading}>
                {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
                End Couple
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

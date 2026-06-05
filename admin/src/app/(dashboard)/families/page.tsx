'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  NoSymbolIcon,
  CheckCircleIcon,
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

export default function FamiliesPage() {
  const [families, setFamilies] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<any | null>(null)
  const [viewDetail, setViewDetail] = useState<any | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [banTarget, setBanTarget] = useState<any | null>(null)
  const [unbanTarget, setUnbanTarget] = useState<any | null>(null)
  const [banReason, setBanReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getFamilies({ search: search || undefined, page, limit: pageSize })
      setFamilies((res as any).data ?? [])
      setTotal((res as any).total ?? 0)
    } catch {
      setError('Failed to load families')
    } finally {
      setLoading(false)
    }
  }, [search, page, pageSize])

  useEffect(() => { load() }, [load])

  const handleSearchInput = (val: string) => {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 400)
  }

  const handleViewFamily = async (family: any) => {
    setViewTarget(family)
    setViewDetail(null)
    setViewLoading(true)
    try {
      const detail = await api.getFamily(family.id)
      setViewDetail(detail)
    } catch {
      setViewDetail(family)
    } finally {
      setViewLoading(false)
    }
  }

  const handleBan = async () => {
    if (!banTarget) return
    setActionLoading(true)
    try {
      await api.banFamily(banTarget.id, banReason || 'Banned by admin')
      toast.success(`Family "${banTarget.name}" has been banned`)
      setBanTarget(null)
      setBanReason('')
      load()
    } catch {
      toast.error('Failed to ban family')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async () => {
    if (!unbanTarget) return
    setActionLoading(true)
    try {
      await api.unbanFamily(unbanTarget.id)
      toast.success(`Family "${unbanTarget.name}" has been unbanned`)
      setUnbanTarget(null)
      load()
    } catch {
      toast.error('Failed to unban family')
    } finally {
      setActionLoading(false)
    }
  }

  const activeCount = families.filter(f => f.status === 'active').length
  const bannedCount = families.filter(f => f.status === 'banned').length

  const columns = [
    columnHelper.accessor('name', {
      header: 'Family',
      size: 220,
      cell: (info: any) => {
        const family = info.row.original
        const tag = family.tag || family.name?.slice(0, 2).toUpperCase() || '??'
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-sm font-bold text-[#A78BFA] shrink-0">
              {tag.slice(0, 2)}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{family.name}</p>
              {tag && <p className="text-[#737373] text-xs">[{tag}]</p>}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('owner', {
      header: 'Owner',
      size: 160,
      cell: (info: any) => {
        const family = info.row.original
        const owner = info.getValue() ?? family.user
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
      size: 100,
      cell: ({ row }: any) => {
        const family = row.original
        const count = family.membersCount ?? family._count?.members ?? family.memberCount ?? '—'
        const max = family.maxMembers ?? '—'
        return (
          <span className="text-white text-sm">
            {count}<span className="text-[#737373]">{max !== '—' ? `/${max}` : ''}</span>
          </span>
        )
      },
    }),
    columnHelper.accessor('level', {
      header: 'Level',
      size: 80,
      cell: (info: any) => (
        <span className="text-[#A78BFA] font-bold text-sm">Lv.{info.getValue() ?? 1}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info: any) => {
        const val = info.getValue() ?? 'active'
        return <Badge status={val} size="sm" />
      },
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
      size: 100,
      cell: ({ row }: any) => {
        const family = row.original
        const isBanned = family.status === 'banned'
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleViewFamily(family)}
              className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {!isBanned ? (
              <button
                onClick={() => { setBanTarget(family); setBanReason('') }}
                className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Ban"
              >
                <NoSymbolIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setUnbanTarget(family)}
                className="p-1.5 rounded-lg text-[#737373] hover:text-green-400 hover:bg-green-500/10 transition-all"
                title="Unban"
              >
                <CheckCircleIcon className="w-4 h-4" />
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
          { label: 'Total Families', value: total, color: 'text-white' },
          { label: 'Active', value: activeCount, color: 'text-green-400' },
          { label: 'Banned', value: bannedCount, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="card py-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[#737373] text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-4 p-5 border-b border-white/5">
          <div className="flex-1 relative max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="input pl-10"
            />
          </div>
          <span className="text-[#737373] text-sm">{total} families</span>
        </div>
        <DataTable
          data={families}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyMessage="No families found"
          className="p-4"
        />
      </div>

      {/* View Modal */}
      <Modal open={!!viewTarget} onClose={() => { setViewTarget(null); setViewDetail(null) }} title="Family Details" size="md">
        {viewTarget && (
          <div className="space-y-5">
            {viewLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center text-2xl font-bold text-[#A78BFA]">
                    {((viewDetail ?? viewTarget).tag ?? (viewDetail ?? viewTarget).name ?? '??').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-white text-xl font-bold">{(viewDetail ?? viewTarget).name}</h4>
                    <p className="text-[#737373]">Level {(viewDetail ?? viewTarget).level ?? 1}</p>
                  </div>
                  <Badge status={(viewDetail ?? viewTarget).status ?? 'active'} className="ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Owner', value: (viewDetail ?? viewTarget).owner?.displayName ?? (viewDetail ?? viewTarget).owner?.username ?? '—' },
                    { label: 'Members', value: `${(viewDetail ?? viewTarget).membersCount ?? (viewDetail ?? viewTarget)._count?.members ?? '—'}` },
                    { label: 'Region', value: (viewDetail ?? viewTarget).region || '—' },
                    { label: 'Visibility', value: (viewDetail ?? viewTarget).isPublic !== false ? 'Public' : 'Private' },
                    { label: 'Created', value: (viewDetail ?? viewTarget).createdAt ? formatDate((viewDetail ?? viewTarget).createdAt) : '—' },
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

      {/* Ban Confirm */}
      <Modal open={!!banTarget} onClose={() => setBanTarget(null)} title="Ban Family" size="sm">
        {banTarget && (
          <div className="space-y-4">
            <p className="text-[#A0A0B0] text-sm">Ban <span className="text-white font-medium">"{banTarget.name}"</span>? All members will lose access.</p>
            <FormField label="Reason">
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Reason for ban..."
              />
            </FormField>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBanTarget(null)} className="btn-secondary" disabled={actionLoading}>Cancel</button>
              <button onClick={handleBan} className="btn-danger" disabled={actionLoading}>
                {actionLoading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
                Ban Family
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Unban Confirm */}
      <ConfirmModal
        open={!!unbanTarget}
        onClose={() => setUnbanTarget(null)}
        onConfirm={handleUnban}
        title="Unban Family"
        message={`Unban "${unbanTarget?.name}"? Members will regain access.`}
        confirmLabel="Unban"
        confirmVariant="primary"
        loading={actionLoading}
      />
    </div>
  )
}

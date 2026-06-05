'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Avatar from '@/components/ui/Avatar'
import Badge, { VIPBadge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatDate, formatNumber, downloadBlob } from '@/lib/utils'
import type { User } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<User>()

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [vipFilter, setVipFilter] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [confirmBan, setConfirmBan] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchTimer = useRef<any>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getUsers({ search, status: statusFilter || undefined, page, limit: pageSize })
      const items = (res as any)?.data ?? (Array.isArray(res) ? res : [])
      const tot = (res as any)?.total ?? items.length
      setUsers(items)
      setTotal(tot)
    } catch (e) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page, pageSize])

  useEffect(() => { load() }, [load])

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 300)
  }

  const handleBan = async (user: User) => {
    setActionLoading(true)
    try {
      await api.banUser(user.id, { reason: 'Admin action', duration: undefined })
      toast.success(`User ${user.displayName} has been banned`)
      setConfirmBan(null)
      load()
    } catch {
      toast.error('Failed to ban user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async (user: User) => {
    try {
      await api.unbanUser(user.id)
      toast.success(`User ${user.displayName} has been unbanned`)
      load()
    } catch {
      toast.error('Failed to unban user')
    }
  }

  const handleDelete = async (user: User) => {
    setActionLoading(true)
    try {
      await api.deleteUser(user.id)
      toast.success('User deleted')
      setConfirmDelete(null)
      load()
    } catch {
      toast.error('Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await api.exportUsers({ search, status: statusFilter })
      downloadBlob(blob, `users-export-${new Date().toISOString().split('T')[0]}.csv`)
      toast.success('Export started')
    } catch {
      toast.error('Export failed')
    }
  }

  const columns = [
    columnHelper.display({
      id: 'select',
      size: 40,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="rounded border-white/20 bg-white/5"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-white/20 bg-white/5"
        />
      ),
    }),
    columnHelper.accessor('uid', {
      header: 'UID',
      size: 90,
      cell: (info) => (
        <span className="text-dark-400 font-mono text-xs">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('displayName', {
      header: 'User',
      size: 200,
      cell: (info) => {
        const user = info.row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar} name={user.displayName} size="sm" online={user.isOnline} />
            <div>
              <p className="text-white text-sm font-medium">{user.displayName}</p>
              <p className="text-dark-400 text-xs">@{user.username}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      size: 130,
      cell: (info) => <span className="text-dark-300 text-sm">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('vipLevel', {
      header: 'VIP',
      size: 90,
      cell: (info) => {
        const level = info.getValue()
        return level > 0 ? <VIPBadge level={level} /> : <span className="text-dark-500 text-sm">—</span>
      },
    }),
    columnHelper.accessor('level', {
      header: 'Level',
      size: 70,
      cell: (info) => (
        <span className="text-white font-medium text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('coins', {
      header: 'Coins',
      size: 90,
      cell: (info) => (
        <span className="text-yellow-400 text-sm">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('diamonds', {
      header: 'Diamonds',
      size: 100,
      cell: (info) => (
        <span className="text-blue-400 text-sm">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('country', {
      header: 'Country',
      size: 80,
      cell: (info) => <span className="text-dark-300 text-sm">{info.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <Badge status={info.getValue()} />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Joined',
      size: 110,
      cell: (info) => (
        <span className="text-dark-400 text-sm">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 140,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/users/${user.id}`)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push(`/users/${user.id}?edit=true`)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
              title="Edit"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>
            {user.status === 'banned' ? (
              <button
                onClick={() => handleUnban(user)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-all"
                title="Unban"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setConfirmBan(user)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                title="Ban"
              >
                <NoSymbolIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(user)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )
      },
    }),
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search by name, username, UID..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input pl-10 pr-4"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'border-primary-500/50 text-primary-400' : ''}`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card animate-slide-up py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="input"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="label">VIP Level</label>
              <select
                value={vipFilter}
                onChange={(e) => { setVipFilter(e.target.value); setPage(1) }}
                className="input"
              >
                <option value="">All levels</option>
                <option value="0">No VIP</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>VIP {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Country</label>
              <select className="input">
                <option value="">All countries</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="AE">UAE</option>
                <option value="SA">Saudi Arabia</option>
              </select>
            </div>
            <div>
              <label className="label">Sort By</label>
              <select className="input">
                <option value="createdAt">Registration Date</option>
                <option value="totalRecharged">Total Recharged</option>
                <option value="level">Level</option>
                <option value="coins">Coins</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setStatusFilter('')
                setVipFilter('')
                setSearch('')
                setSearchInput('')
                setPage(1)
              }}
              className="text-sm text-dark-400 hover:text-white transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl animate-slide-up">
          <span className="text-primary-300 text-sm font-medium">
            {selectedUsers.length} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button className="btn-secondary text-sm py-1.5">Ban Selected</button>
            <button className="btn-danger text-sm py-1.5">Delete Selected</button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="card py-3 text-center animate-pulse">
              <div className="h-6 bg-white/10 rounded w-12 mx-auto mb-1" />
              <div className="h-3 bg-white/10 rounded w-16 mx-auto" />
            </div>
          ))
        ) : (
          [
            { label: 'Total', value: total, color: 'text-white' },
            { label: 'Active', value: users.filter((u: any) => u.status === 'active').length, color: 'text-green-400' },
            { label: 'Banned', value: users.filter((u: any) => u.status === 'banned').length, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="card py-3 text-center">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-dark-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <DataTable
          data={users}
          columns={columns}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          onSelectionChange={setSelectedUsers}
          emptyMessage={loading ? 'Loading users...' : 'No users found matching your criteria'}
          className="p-4"
        />
      </div>

      {/* Modals */}
      <ConfirmModal
        open={!!confirmBan}
        onClose={() => setConfirmBan(null)}
        onConfirm={() => confirmBan && handleBan(confirmBan)}
        title="Ban User"
        message={`Are you sure you want to ban ${confirmBan?.displayName}? They will lose access to the platform.`}
        confirmLabel="Ban User"
        confirmVariant="danger"
        loading={actionLoading}
      />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete User"
        message={`This will permanently delete ${confirmDelete?.displayName}'s account and all associated data. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </div>
  )
}

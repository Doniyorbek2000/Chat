'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatNumber, timeAgo } from '@/lib/utils'
import type { Room } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<Room>()

export default function RoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState<Room | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getRooms({ search, status: statusFilter, type: typeFilter, page, limit: pageSize })
      setRooms((res as any).data ?? [])
      setTotal((res as any).total ?? 0)
    } catch {
      setError('Failed to load rooms')
      setRooms([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  const handleSearchChange = (value: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }

  const handleCloseRoom = async () => {
    if (!confirmClose) return
    setActionLoading(true)
    try {
      await api.closeRoom(confirmClose.id, 'Closed by admin')
      toast.success(`Room "${confirmClose.title}" has been closed`)
      setConfirmClose(null)
      load()
    } catch {
      toast.error('Failed to close room')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    columnHelper.accessor('title', {
      header: 'Room',
      size: 220,
      cell: (info) => {
        const room = info.row.original
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/20 flex items-center justify-center shrink-0">
              <span className="text-primary-400 text-xs">🎙</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium">{room.title}</p>
                {room.status === 'live' && (
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
              <p className="text-dark-400 text-xs">by {room.host?.displayName}</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('host', {
      header: 'Host',
      size: 160,
      cell: (info) => {
        const host = info.getValue() as any
        return host ? (
          <div className="flex items-center gap-2">
            <Avatar src={host.avatar} name={host.displayName || host.username} size="xs" />
            <div>
              <p className="text-white text-sm">{host.displayName || host.username}</p>
              <p className="text-dark-400 text-xs font-mono">{host.uid}</p>
            </div>
          </div>
        ) : <span className="text-dark-400 text-sm">—</span>
      },
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      size: 90,
      cell: (info) => (
        <span className="capitalize text-dark-300 text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('currentSeats', {
      header: 'Seats',
      size: 80,
      cell: (info) => {
        const room = info.row.original
        return (
          <span className="text-dark-300 text-sm">
            {info.getValue()}/{room.maxSeats}
          </span>
        )
      },
    }),
    columnHelper.accessor('totalGiftsValue', {
      header: 'Gifts 💎',
      size: 100,
      cell: (info) => (
        <span className="text-amber-400 font-medium text-sm">{formatNumber(info.getValue() ?? 0)}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 90,
      cell: (info) => <Badge status={info.getValue()} />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      size: 110,
      cell: (info) => (
        <span className="text-dark-400 text-sm">{timeAgo(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: ({ row }) => {
        const room = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push('/rooms/' + room.id)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {room.status === 'live' && (
              <button
                onClick={() => setConfirmClose(room)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                title="Force Close"
              >
                <XCircleIcon className="w-4 h-4" />
              </button>
            )}
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
            placeholder="Search rooms or hosts..."
            defaultValue={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className="input text-sm"
          >
            <option value="">All Types</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="family">Family</option>
          </select>
          <button
            onClick={load}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-dark-400 hover:text-white transition-all"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All', value: '' },
          { label: 'Live', value: 'live' },
          { label: 'Ended', value: 'ended' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/20'
                : 'text-dark-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={load} className="text-red-400 hover:text-red-300 text-sm underline">
            Retry
          </button>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <DataTable
          data={rooms}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          emptyMessage="No rooms found"
          className="p-4"
        />
      </div>

      <ConfirmModal
        open={!!confirmClose}
        onClose={() => setConfirmClose(null)}
        onConfirm={handleCloseRoom}
        title="Force Close Room"
        message={`Force close "${confirmClose?.title}"? All current users will be disconnected.`}
        confirmLabel="Force Close"
        loading={actionLoading}
      />
    </div>
  )
}

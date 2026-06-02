'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  XCircleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils'
import type { Room } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<Room>()

const mockRooms: Room[] = Array.from({ length: 40 }, (_, i) => ({
  id: `room-${i}`,
  title: ['Music Lounge', 'Chat Night', 'Game Talk', 'Study Group', 'Comedy Hour', 'News Room', 'Tech Talk', 'Art Corner', 'Sports Zone', 'Fashion Hub'][i % 10] + ` ${i}`,
  coverImage: undefined,
  hostId: `user-${i}`,
  host: { id: `user-${i}`, username: `host${i}`, displayName: `Host ${i}`, uid: `U${1000 + i}`, avatar: undefined, vipLevel: Math.floor(Math.random() * 5) } as never,
  type: ['public', 'private', 'family'][Math.floor(Math.random() * 3)] as Room['type'],
  maxSeats: [6, 8, 10, 16][Math.floor(Math.random() * 4)],
  currentSeats: Math.floor(Math.random() * 8) + 1,
  totalViewers: Math.floor(Math.random() * 1000) + 10,
  totalGiftsValue: Math.floor(Math.random() * 100000) + 100,
  status: i < 25 ? 'live' : 'ended' as Room['status'],
  isLocked: Math.random() > 0.7,
  createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
  startedAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
  onlineCount: Math.floor(Math.random() * 200) + 5,
  region: ['US', 'EU', 'ME', 'AS'][Math.floor(Math.random() * 4)],
}))

export default function RoomsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [confirmClose, setConfirmClose] = useState<Room | null>(null)
  const [confirmBan, setConfirmBan] = useState<Room | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const filtered = mockRooms.filter((r) => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.host?.displayName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || r.status === statusFilter
    const matchType = !typeFilter || r.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

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
                {room.isLocked && <span className="text-xs">🔒</span>}
              </div>
              <p className="text-dark-400 text-xs">by {room.host?.displayName}</p>
            </div>
          </div>
        )
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
    columnHelper.accessor('totalViewers', {
      header: 'Viewers',
      size: 90,
      cell: (info) => (
        <span className="text-dark-300 text-sm">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('onlineCount', {
      header: 'Online',
      size: 80,
      cell: (info) => (
        <span className="text-green-400 font-medium text-sm">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('totalGiftsValue', {
      header: 'Gifts 💎',
      size: 100,
      cell: (info) => (
        <span className="text-amber-400 font-medium text-sm">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('region', {
      header: 'Region',
      size: 80,
      cell: (info) => <span className="text-dark-400 text-sm">{info.getValue() || '—'}</span>,
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
      size: 120,
      cell: ({ row }) => {
        const room = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/rooms/${room.id}`)}
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
            <button
              onClick={() => setConfirmBan(room)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Ban Room"
            >
              <NoSymbolIcon className="w-4 h-4" />
            </button>
          </div>
        )
      },
    }),
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Live indicator */}
      <div className="flex items-center gap-4 p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 font-medium">
            {mockRooms.filter(r => r.status === 'live').length} Live Rooms
          </span>
        </div>
        <span className="text-dark-500">•</span>
        <span className="text-dark-400 text-sm">
          {formatNumber(mockRooms.filter(r => r.status === 'live').reduce((a, r) => a + r.onlineCount, 0))} users in rooms
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search rooms or hosts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary"
        >
          <FunnelIcon className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="card py-4 animate-slide-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="input"
              >
                <option value="">All statuses</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                className="input"
              >
                <option value="">All types</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="family">Family</option>
                <option value="agency">Agency</option>
              </select>
            </div>
            <div>
              <label className="label">Sort By</label>
              <select className="input">
                <option>Most Viewers</option>
                <option>Most Gifts</option>
                <option>Newest</option>
                <option>Oldest</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All', value: '', count: filtered.length },
          { label: 'Live', value: 'live', count: mockRooms.filter(r => r.status === 'live').length },
          { label: 'Ended', value: 'ended', count: mockRooms.filter(r => r.status === 'ended').length },
          { label: 'Banned', value: 'banned', count: 0 },
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
            <span className="ml-2 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          data={paginated}
          columns={columns}
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          emptyMessage="No rooms found"
          className="p-4"
        />
      </div>

      <ConfirmModal
        open={!!confirmClose}
        onClose={() => setConfirmClose(null)}
        onConfirm={() => {
          toast.success(`Room "${confirmClose?.title}" has been closed`)
          setConfirmClose(null)
        }}
        title="Force Close Room"
        message={`Force close "${confirmClose?.title}"? All current users will be disconnected.`}
        confirmLabel="Force Close"
        loading={actionLoading}
      />

      <ConfirmModal
        open={!!confirmBan}
        onClose={() => setConfirmBan(null)}
        onConfirm={() => {
          toast.success(`Room "${confirmBan?.title}" has been banned`)
          setConfirmBan(null)
        }}
        title="Ban Room"
        message={`Ban "${confirmBan?.title}"? The host will not be able to create rooms.`}
        confirmLabel="Ban Room"
        loading={actionLoading}
      />
    </div>
  )
}

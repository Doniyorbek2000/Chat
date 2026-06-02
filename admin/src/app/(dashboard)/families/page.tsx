'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  NoSymbolIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatNumber, formatDate, timeAgo } from '@/lib/utils'
import type { Family } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<Family>()

const mockFamilies: Family[] = Array.from({ length: 50 }, (_, i) => ({
  id: `family-${i}`,
  name: ['Phoenix Warriors', 'Dragon Squad', 'Night Owls', 'Golden Stars', 'Silver Wolves', 'Crystal Hearts', 'Shadow Hunters', 'Rainbow Elite', 'Iron Fists', 'Sky Kings'][i % 10] + (i >= 10 ? ` ${Math.floor(i / 10) + 1}` : ''),
  tag: ['PW', 'DS', 'NO', 'GS', 'SW', 'CH', 'SH', 'RE', 'IF', 'SK'][i % 10],
  ownerId: `user-${i % 20}`,
  owner: {
    id: `user-${i % 20}`,
    uid: `U${10000 + i}`,
    username: `owner${i % 20}`,
    displayName: `Owner ${i % 20}`,
    avatar: undefined,
    level: 30 + (i % 40),
    vipLevel: (i % 6) as 0 | 1 | 2 | 3 | 4 | 5,
    exp: 0,
    coins: 0,
    diamonds: 0,
    status: 'active' as const,
    isOnline: i % 3 === 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalRecharged: 0,
    totalWithdrawn: 0,
    followersCount: 0,
    followingCount: 0,
    totalGiftsSent: 0,
    totalGiftsReceived: 0,
  },
  level: Math.floor(Math.random() * 20) + 1,
  exp: Math.floor(Math.random() * 100000),
  membersCount: Math.floor(Math.random() * 90) + 10,
  maxMembers: 100,
  totalGiftsReceived: Math.floor(Math.random() * 500000) + 10000,
  isPublic: i % 4 !== 3,
  status: i % 8 === 7 ? 'banned' : 'active',
  createdAt: new Date(Date.now() - Math.random() * 86400000 * 365).toISOString(),
  region: ['US', 'UK', 'AE', 'SA', 'EG'][i % 5],
}))

export default function FamiliesPage() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading] = useState(false)
  const [viewTarget, setViewTarget] = useState<Family | null>(null)
  const [disbandTarget, setDisbandTarget] = useState<Family | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const filtered = mockFamilies.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.tag.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const newThisWeek = mockFamilies.filter(
    (f) => new Date(f.createdAt) > new Date(Date.now() - 7 * 86400000)
  ).length

  const handleDisband = async (family: Family) => {
    setActionLoading(true)
    try {
      await api.banFamily(family.id, 'Disbanded by admin')
      toast.success(`Family "${family.name}" has been disbanded`)
      setDisbandTarget(null)
    } catch {
      toast.error('Failed to disband family')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    columnHelper.accessor('name', {
      header: 'Family',
      size: 220,
      cell: (info) => {
        const family = info.row.original
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-sm font-bold text-[#A78BFA] shrink-0">
              {family.tag.slice(0, 2)}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{family.name}</p>
              <p className="text-[#737373] text-xs">[{family.tag}]</p>
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('owner', {
      header: 'Owner',
      size: 160,
      cell: (info) => {
        const owner = info.getValue()
        return (
          <div className="flex items-center gap-2">
            <Avatar src={owner?.avatar} name={owner?.displayName || 'Owner'} size="xs" online={owner?.isOnline} />
            <span className="text-[#C0C0D0] text-sm">{owner?.displayName}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('membersCount', {
      header: 'Members',
      size: 100,
      cell: (info) => {
        const family = info.row.original
        return (
          <span className="text-white text-sm">
            {info.getValue()}<span className="text-[#737373]">/{family.maxMembers}</span>
          </span>
        )
      },
    }),
    columnHelper.accessor('level', {
      header: 'Level',
      size: 80,
      cell: (info) => (
        <span className="text-[#A78BFA] font-bold text-sm">Lv.{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('totalGiftsReceived', {
      header: 'Treasury',
      size: 110,
      cell: (info) => (
        <span className="text-blue-400 text-sm font-medium">{formatNumber(info.getValue())} 💎</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <Badge status={info.getValue()} size="sm" />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      size: 120,
      cell: (info) => (
        <span className="text-[#737373] text-sm">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: ({ row }) => {
        const family = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewTarget(family)}
              className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all"
              title="View"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            {family.status === 'active' && (
              <button
                onClick={() => setDisbandTarget(family)}
                className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Disband"
              >
                <NoSymbolIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      },
    }),
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Families', value: mockFamilies.length, color: 'text-white' },
          { label: 'Active', value: mockFamilies.filter(f => f.status === 'active').length, color: 'text-green-400' },
          { label: 'New This Week', value: newThisWeek, color: 'text-blue-400' },
          { label: 'Banned', value: mockFamilies.filter(f => f.status === 'banned').length, color: 'text-red-400' },
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
          <form
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
            className="flex-1 relative max-w-sm"
          >
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder="Search by name or tag..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-10"
            />
          </form>
          <span className="text-[#737373] text-sm">{filtered.length} families</span>
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
          emptyMessage="No families found"
          className="p-4"
        />
      </div>

      {/* View Modal */}
      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Family Details" size="md">
        {viewTarget && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#7C3AED]/20 flex items-center justify-center text-2xl font-bold text-[#A78BFA]">
                {viewTarget.tag.slice(0, 2)}
              </div>
              <div>
                <h4 className="text-white text-xl font-bold">{viewTarget.name}</h4>
                <p className="text-[#737373]">[{viewTarget.tag}] — Level {viewTarget.level}</p>
              </div>
              <Badge status={viewTarget.status} className="ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Owner', value: viewTarget.owner?.displayName || '—' },
                { label: 'Members', value: `${viewTarget.membersCount}/${viewTarget.maxMembers}` },
                { label: 'Treasury', value: `${formatNumber(viewTarget.totalGiftsReceived)} 💎` },
                { label: 'Region', value: viewTarget.region || '—' },
                { label: 'Visibility', value: viewTarget.isPublic ? 'Public' : 'Private' },
                { label: 'Created', value: formatDate(viewTarget.createdAt) },
              ].map((item) => (
                <div key={item.label} className="bg-white/3 rounded-xl p-3">
                  <p className="text-[#737373] text-xs mb-1">{item.label}</p>
                  <p className="text-white text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Disband Confirm */}
      <ConfirmModal
        open={!!disbandTarget}
        onClose={() => setDisbandTarget(null)}
        onConfirm={() => disbandTarget && handleDisband(disbandTarget)}
        title="Disband Family"
        message={`Are you sure you want to disband "${disbandTarget?.name}"? All members will be removed and this action cannot be undone.`}
        confirmLabel="Disband"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </div>
  )
}

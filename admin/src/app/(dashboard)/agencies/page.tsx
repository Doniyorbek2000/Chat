'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'
import type { Agency } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<Agency>()

const mockAgencies: Agency[] = Array.from({ length: 40 }, (_, i) => ({
  id: `agency-${i}`,
  name: ['StarLight Agency', 'Nova Talents', 'Apex Stars', 'Golden Voice', 'Elite Creators', 'Horizon Media', 'Pulse Agency', 'Crown Talents'][i % 8] + (i >= 8 ? ` ${Math.floor(i / 8) + 1}` : ''),
  ownerId: `user-${i % 15}`,
  owner: {
    id: `user-${i % 15}`,
    uid: `U${20000 + i}`,
    username: `agent${i % 15}`,
    displayName: `Agent ${i % 15}`,
    avatar: undefined,
    level: 40 + (i % 30),
    vipLevel: Math.min((i % 8) as 0|1|2|3|4|5|6|7|8|9|10, 10) as 0|1|2|3|4|5|6|7|8|9|10,
    exp: 0,
    coins: 0,
    diamonds: 0,
    status: 'active' as const,
    isOnline: i % 4 === 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalRecharged: 0,
    totalWithdrawn: 0,
    followersCount: 0,
    followingCount: 0,
    totalGiftsSent: 0,
    totalGiftsReceived: 0,
  },
  talentsCount: Math.floor(Math.random() * 50) + 5,
  totalWithdrawn: Math.floor(Math.random() * 1000000) + 10000,
  totalRevenue: Math.floor(Math.random() * 2000000) + 50000,
  commissionRate: [5, 8, 10, 12, 15][i % 5],
  status: (['active', 'active', 'active', 'pending', 'banned'] as const)[i % 5],
  createdAt: new Date(Date.now() - Math.random() * 86400000 * 400).toISOString(),
  region: ['US', 'UK', 'AE', 'SA', 'EG', 'TR'][i % 6],
}))

export default function AgenciesPage() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading] = useState(false)
  const [viewTarget, setViewTarget] = useState<Agency | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const filtered = mockAgencies.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || a.status === statusFilter
    return matchSearch && matchStatus
  })
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const totalRevenue = mockAgencies.reduce((s, a) => s + a.totalRevenue, 0)

  const handleApprove = async (agency: Agency) => {
    setActionLoading(true)
    try {
      await api.approveAgency(agency.id)
      toast.success(`Agency "${agency.name}" approved`)
    } catch {
      toast.error('Failed to approve agency')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (agency: Agency) => {
    setActionLoading(true)
    try {
      await api.rejectAgency(agency.id, 'Does not meet requirements')
      toast.success(`Agency "${agency.name}" rejected`)
    } catch {
      toast.error('Failed to reject agency')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    columnHelper.accessor('name', {
      header: 'Agency',
      size: 220,
      cell: (info) => {
        const agency = info.row.original
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <BuildingOfficeIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{agency.name}</p>
              <p className="text-[#737373] text-xs">{agency.region}</p>
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
    columnHelper.accessor('talentsCount', {
      header: 'Talents',
      size: 90,
      cell: (info) => (
        <span className="text-white text-sm font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('commissionRate', {
      header: 'Commission %',
      size: 120,
      cell: (info) => (
        <span className="text-amber-400 font-medium text-sm">{info.getValue()}%</span>
      ),
    }),
    columnHelper.accessor('totalRevenue', {
      header: 'Total Earnings',
      size: 130,
      cell: (info) => (
        <span className="text-green-400 text-sm font-medium">{formatNumber(info.getValue())} 💎</span>
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
                  onClick={() => handleReject(agency)}
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Agencies', value: mockAgencies.length, color: 'text-white' },
          { label: 'Active', value: mockAgencies.filter(a => a.status === 'active').length, color: 'text-green-400' },
          { label: 'Pending Approval', value: mockAgencies.filter(a => a.status === 'pending').length, color: 'text-yellow-400' },
          { label: 'Total Revenue', value: `${formatNumber(totalRevenue)} 💎`, color: 'text-purple-400' },
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
          <form
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
            className="flex-1 relative max-w-sm"
          >
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder="Search agencies..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-10"
            />
          </form>
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
          data={paginated}
          columns={columns}
          loading={loading}
          total={filtered.length}
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
                <p className="text-[#737373]">Region: {viewTarget.region}</p>
              </div>
              <Badge status={viewTarget.status} className="ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Owner', value: viewTarget.owner?.displayName || '—' },
                { label: 'Talents', value: viewTarget.talentsCount },
                { label: 'Commission Rate', value: `${viewTarget.commissionRate}%` },
                { label: 'Total Revenue', value: `${formatNumber(viewTarget.totalRevenue)} 💎` },
                { label: 'Total Withdrawn', value: `${formatNumber(viewTarget.totalWithdrawn)} 💎` },
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
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  TrashIcon,
  WalletIcon,
  GiftIcon,
} from '@heroicons/react/24/outline'
import Avatar from '@/components/ui/Avatar'
import Badge, { VIPBadge } from '@/components/ui/Badge'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatDate, formatDateTime, formatNumber, timeAgo } from '@/lib/utils'
import type { User, WalletTransaction, UserBan } from '@/types'
import toast from 'react-hot-toast'

const TABS = ['Overview', 'Wallet', 'Transactions', 'Rooms', 'Reports', 'Bans']

export default function UserDetailPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('Overview')
  const [isEditing, setIsEditing] = useState(!!searchParams.get('edit'))
  const [confirmBan, setConfirmBan] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [banModal, setBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('24')
  const [actionLoading, setActionLoading] = useState(false)

  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [bans, setBans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editData, setEditData] = useState<any>({})

  useEffect(() => {
    Promise.allSettled([
      api.getUser(params.id),
      api.getUserTransactions(params.id),
      api.getUserBans(params.id),
    ]).then(([u, tx, b]) => {
      if (u.status === 'fulfilled') {
        setUser(u.value)
        setEditData({ ...(u.value as any) })
      }
      if (tx.status === 'fulfilled') setTransactions((tx.value as any)?.data ?? [])
      if (b.status === 'fulfilled') setBans(Array.isArray(b.value) ? b.value : [])
      setLoading(false)
    })
  }, [params.id])

  const handleBan = async () => {
    if (!banReason) { toast.error('Please provide a reason'); return }
    setActionLoading(true)
    try {
      await api.banUser(params.id, { reason: banReason, duration: banDuration ? Number(banDuration) : undefined })
      toast.success(`User ${user?.displayName} has been banned for ${banDuration || 'permanent'}`)
      setBanModal(false)
      setBanReason('')
      // Reload user and bans
      const [u, b] = await Promise.allSettled([api.getUser(params.id), api.getUserBans(params.id)])
      if (u.status === 'fulfilled') { setUser(u.value); setEditData({ ...(u.value as any) }) }
      if (b.status === 'fulfilled') setBans(Array.isArray(b.value) ? b.value : [])
    } catch {
      toast.error('Failed to ban user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async () => {
    setActionLoading(true)
    try {
      await api.unbanUser(params.id)
      toast.success(`User ${user?.displayName} has been unbanned`)
      const [u, b] = await Promise.allSettled([api.getUser(params.id), api.getUserBans(params.id)])
      if (u.status === 'fulfilled') { setUser(u.value); setEditData({ ...(u.value as any) }) }
      if (b.status === 'fulfilled') setBans(Array.isArray(b.value) ? b.value : [])
    } catch {
      toast.error('Failed to unban user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSave = async () => {
    setActionLoading(true)
    try {
      const updated = await api.updateUser(params.id, {
        displayName: editData.displayName,
        bio: editData.bio,
        username: editData.username,
        email: editData.email,
        phone: editData.phone,
        vipLevel: editData.vipLevel,
        status: editData.status,
      })
      setUser(updated)
      setEditData({ ...updated })
      toast.success('User updated successfully')
      setIsEditing(false)
    } catch {
      toast.error('Failed to update user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await api.deleteUser(params.id)
      toast.success('User deleted')
      router.push('/users')
    } catch {
      toast.error('Failed to delete user')
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-6 bg-white/10 rounded w-32 animate-pulse" />
        <div className="card animate-pulse">
          <div className="flex gap-6">
            <div className="w-20 h-20 bg-white/10 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-white/10 rounded w-48" />
              <div className="h-4 bg-white/10 rounded w-32" />
              <div className="grid grid-cols-4 gap-4 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-white/10 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-pulse h-48" />
          <div className="card animate-pulse h-48" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-dark-400">User not found</p>
        <button onClick={() => router.push('/users')} className="btn-secondary mt-4">
          Back to Users
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.push('/users')}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Users
      </button>

      {/* Profile card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar & basic info */}
          <div className="relative">
            <Avatar src={user.avatar} name={user.displayName} size="xl" online={user.isOnline} />
            {user.vipLevel > 0 && (
              <div className="absolute -bottom-2 -right-2">
                <VIPBadge level={user.vipLevel} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <div>
                <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
                <p className="text-dark-400">@{user.username} &bull; {user.uid}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge status={user.status} />
                {user.isOnline && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Online
                  </span>
                )}
              </div>
            </div>

            {user.bio && (
              <p className="text-dark-300 text-sm mb-4 italic">&ldquo;{user.bio}&rdquo;</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Level', value: user.level, icon: '⚡' },
                { label: 'Followers', value: formatNumber(user.followersCount), icon: '👥' },
                { label: 'Diamonds', value: formatNumber(user.diamonds), icon: '💎' },
                { label: 'Coins', value: formatNumber(user.coins), icon: '🪙' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{stat.icon} {stat.value}</p>
                  <p className="text-dark-500 text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary text-sm"
            >
              <PencilSquareIcon className="w-4 h-4" />
              {isEditing ? 'Cancel Edit' : 'Edit User'}
            </button>
            {user.status === 'banned' ? (
              <button onClick={handleUnban} disabled={actionLoading} className="btn-primary text-sm">
                <CheckCircleIcon className="w-4 h-4" />
                Unban User
              </button>
            ) : (
              <button
                onClick={() => setBanModal(true)}
                className="btn-danger text-sm"
              >
                <NoSymbolIcon className="w-4 h-4" />
                Ban User
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-danger text-sm"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          {[
            { label: 'Email', value: user.email || '—' },
            { label: 'Phone', value: user.phone || '—' },
            { label: 'Country', value: user.country || '—' },
            { label: 'Joined', value: formatDate(user.createdAt) },
            { label: 'Last Seen', value: user.lastSeen ? timeAgo(user.lastSeen) : '—' },
            { label: 'Total Recharged', value: `$${user.totalRecharged ?? 0}` },
            { label: 'VIP Expiry', value: user.vipExpiry ? formatDate(user.vipExpiry) : '—' },
            { label: 'Birthday', value: user.birthday ? formatDate(user.birthday) : '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-dark-500 text-xs">{item.label}</p>
              <p className="text-white text-sm font-medium mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-white border-primary-500'
                : 'text-dark-400 border-transparent hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Edit form */}
          {isEditing ? (
            <div className="card lg:col-span-2">
              <h3 className="text-white font-semibold mb-4">Edit User Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Display Name</label>
                  <input
                    value={editData.displayName ?? ''}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Username</label>
                  <input
                    value={editData.username ?? ''}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    value={editData.email ?? ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    type="email"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    value={editData.phone ?? ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">VIP Level</label>
                  <select
                    value={editData.vipLevel ?? 0}
                    onChange={(e) => setEditData({ ...editData, vipLevel: Number(e.target.value) })}
                    className="input"
                  >
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>{i === 0 ? 'No VIP' : `VIP ${i}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={editData.status ?? 'active'}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as User['status'] })}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Bio</label>
                  <textarea
                    value={editData.bio ?? ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    rows={3}
                    className="input resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="card">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <GiftIcon className="w-5 h-5 text-primary-400" />
                  Gift Statistics
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Gifts Sent', value: formatNumber(user.totalGiftsSent), color: 'text-red-400' },
                    { label: 'Total Gifts Received', value: formatNumber(user.totalGiftsReceived), color: 'text-green-400' },
                    { label: 'Total Diamonds Spent', value: formatNumber(user.diamonds), color: 'text-blue-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-dark-300 text-sm">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <WalletIcon className="w-5 h-5 text-primary-400" />
                  Wallet Summary
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Current Coins', value: formatNumber(user.coins) + ' 🪙', color: 'text-yellow-400' },
                    { label: 'Current Diamonds', value: formatNumber(user.diamonds) + ' 💎', color: 'text-blue-400' },
                    { label: 'Total Recharged', value: '$' + (user.totalRecharged ?? 0), color: 'text-green-400' },
                    { label: 'Total Withdrawn', value: '$' + (user.totalWithdrawn ?? 0), color: 'text-red-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-dark-300 text-sm">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'Transactions' && (
        <div className="card animate-fade-in">
          <h3 className="text-white font-semibold mb-4">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="text-dark-400 text-center py-8">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Date', 'Type', 'Description', 'Amount', 'Balance', 'Status'].map((h) => (
                      <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                      <td className="table-cell text-dark-400">{formatDateTime(tx.createdAt)}</td>
                      <td className="table-cell">
                        <span className="capitalize text-dark-200">{tx.type?.replace('_', ' ')}</span>
                      </td>
                      <td className="table-cell text-dark-300">{tx.description}</td>
                      <td className="table-cell">
                        <span className={`font-semibold ${
                          tx.type === 'gift_sent' || tx.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {tx.type === 'gift_sent' || tx.type === 'withdrawal' ? '-' : '+'}
                          {tx.amount} 💎
                        </span>
                      </td>
                      <td className="table-cell text-dark-400">{tx.balanceAfter} 💎</td>
                      <td className="table-cell"><Badge status={tx.status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Bans' && (
        <div className="card animate-fade-in">
          <h3 className="text-white font-semibold mb-4">Ban History</h3>
          {bans.length === 0 ? (
            <p className="text-dark-400 text-center py-8">No bans recorded</p>
          ) : (
            <div className="space-y-3">
              {bans.map((ban: any) => (
                <div key={ban.id} className="p-4 bg-white/3 rounded-xl border border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">Reason: {ban.reason}</p>
                      <p className="text-dark-400 text-xs mt-1">
                        Duration: {ban.duration ? `${ban.duration} hours` : 'Permanent'}
                      </p>
                      {ban.expiresAt && (
                        <p className="text-dark-400 text-xs">
                          Expires: {formatDateTime(ban.expiresAt)}
                        </p>
                      )}
                      <p className="text-dark-500 text-xs mt-1">
                        Issued: {formatDateTime(ban.createdAt)}
                      </p>
                    </div>
                    <Badge status={ban.isActive ? 'active' : 'inactive'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ban modal */}
      <Modal open={banModal} onClose={() => setBanModal(false)} title="Ban User" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Reason for Ban</label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Explain why this user is being banned..."
              rows={3}
              className="input resize-none"
            />
          </div>
          <div>
            <label className="label">Duration</label>
            <select
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value)}
              className="input"
            >
              <option value="1">1 hour</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">7 days</option>
              <option value="720">30 days</option>
              <option value="">Permanent</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setBanModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleBan} disabled={actionLoading} className="btn-danger">
              {actionLoading ? 'Banning...' : 'Ban User'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete User Account"
        message="This will permanently delete all user data including messages, gifts, transactions. This cannot be undone."
        confirmLabel="Delete Account"
        loading={actionLoading}
      />
    </div>
  )
}

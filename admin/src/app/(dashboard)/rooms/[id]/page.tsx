'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, XCircleIcon, UsersIcon, GiftIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatNumber, timeAgo } from '@/lib/utils'
import type { Room, RoomMember } from '@/types'
import toast from 'react-hot-toast'

const roleColors: Record<string, string> = {
  host: 'text-amber-400 bg-amber-500/20',
  co_host: 'text-blue-400 bg-blue-500/20',
  speaker: 'text-green-400 bg-green-500/20',
  audience: 'text-dark-400 bg-dark-600',
}

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('Members')
  const [confirmClose, setConfirmClose] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadRoom = useCallback(async () => {
    if (!id) return
    setLoadingRoom(true)
    setError(null)
    try {
      const data = await api.getRoom(id)
      setRoom(data)
    } catch {
      setError('Failed to load room details')
    } finally {
      setLoadingRoom(false)
    }
  }, [id])

  const loadMembers = useCallback(async () => {
    if (!id) return
    setLoadingMembers(true)
    try {
      const data = await api.getRoomMembers(id)
      setMembers(Array.isArray(data) ? data : [])
    } catch {
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }, [id])

  useEffect(() => {
    loadRoom()
    loadMembers()
  }, [loadRoom, loadMembers])

  const handleCloseRoom = async () => {
    if (!room) return
    setActionLoading(true)
    try {
      await api.closeRoom(room.id, 'Closed by admin')
      toast.success(`Room "${room.title}" has been closed`)
      setConfirmClose(false)
      loadRoom()
    } catch {
      toast.error('Failed to close room')
    } finally {
      setActionLoading(false)
    }
  }

  if (loadingRoom) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-32" />
          <div className="card">
            <div className="flex gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-white/10 rounded w-48" />
                <div className="h-4 bg-white/10 rounded w-32" />
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/10 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/rooms')}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Rooms
        </button>
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <span className="text-red-400 text-sm">{error || 'Room not found'}</span>
          <button onClick={loadRoom} className="text-red-400 hover:text-red-300 text-sm underline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/rooms')}
          className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Rooms
        </button>
        <button
          onClick={() => { loadRoom(); loadMembers() }}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-dark-400 hover:text-white transition-all"
          title="Refresh"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Room info card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-16 h-16 bg-primary-600/20 rounded-xl border border-primary-500/20 flex items-center justify-center text-3xl shrink-0">
            🎙
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {room.title}
                  {room.status === 'live' && (
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </h2>
                <p className="text-dark-400 mt-0.5">
                  Hosted by <span className="text-primary-400">{(room as any).host?.displayName || room.hostId}</span>
                </p>
              </div>
              <Badge status={room.status} />
            </div>

            {room.description && (
              <p className="text-dark-300 text-sm mb-4">{room.description}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Seats', value: `${room.currentSeats}/${room.maxSeats}`, icon: '💺' },
                { label: 'Viewers', value: formatNumber((room as any).viewerCount ?? room.totalViewers ?? 0), icon: '👁' },
                { label: 'Members', value: formatNumber((room as any)._count?.members ?? members.length), icon: '👥' },
                { label: 'Total Gifts', value: `${formatNumber(room.totalGiftsValue ?? 0)} 💎`, icon: '🎁' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{stat.icon} {stat.value}</p>
                  <p className="text-dark-500 text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {room.status === 'live' && (
              <button
                onClick={() => setConfirmClose(true)}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <XCircleIcon className="w-4 h-4" />
                Force Close
              </button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          {[
            { label: 'Type', value: room.type },
            { label: 'Region', value: room.region || '—' },
            { label: 'Started', value: room.startedAt ? timeAgo(room.startedAt) : '—' },
            { label: 'Tags', value: room.tags?.join(', ') || '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-dark-500 text-xs">{item.label}</p>
              <p className="text-white text-sm font-medium capitalize mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {['Members'].map((tab) => (
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

      {activeTab === 'Members' && (
        <div className="card animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-semibold">Room Members ({members.length})</h3>
          </div>

          {loadingMembers ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-white/10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-32" />
                    <div className="h-2.5 bg-white/10 rounded w-20" />
                  </div>
                  <div className="h-5 bg-white/10 rounded w-16" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-dark-400 py-8">No members found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['User', 'Role', 'Joined'].map((h) => (
                      <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-white/2 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar src={(member as any).user?.avatar} name={(member as any).user?.displayName || 'User'} size="sm" />
                          <div>
                            <p className="text-white text-sm font-medium">{(member as any).user?.displayName}</p>
                            <p className="text-dark-400 text-xs font-mono">{(member as any).user?.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[member.role] || 'text-dark-400 bg-dark-600'}`}>
                          {member.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell text-dark-400 text-sm">{timeAgo(member.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={handleCloseRoom}
        title="Force Close Room"
        message={`Force close "${room.title}"? All current users will be disconnected.`}
        confirmLabel="Force Close"
        loading={actionLoading}
      />
    </div>
  )
}

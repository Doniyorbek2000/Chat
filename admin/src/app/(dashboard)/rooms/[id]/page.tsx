'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, XCircleIcon, NoSymbolIcon, UsersIcon, GiftIcon } from '@heroicons/react/24/outline'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { formatDateTime, formatNumber, timeAgo } from '@/lib/utils'
import type { Room, RoomMember, GiftTransaction } from '@/types'
import toast from 'react-hot-toast'

const mockRoom: Room = {
  id: 'room-1',
  title: 'Music Lounge 🎵',
  description: 'A place for music lovers to gather and share their passion',
  hostId: 'user-1',
  host: { id: 'user-1', username: 'musiclover', displayName: 'Music Lover', uid: 'U10001', vipLevel: 5 } as never,
  type: 'public',
  maxSeats: 10,
  currentSeats: 7,
  totalViewers: 423,
  totalGiftsValue: 28450,
  status: 'live',
  isLocked: false,
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  startedAt: new Date(Date.now() - 7200000).toISOString(),
  onlineCount: 423,
  region: 'US',
  tags: ['music', 'chill', 'pop'],
}

const mockMembers = Array.from({ length: 10 }, (_, i) => ({
  id: `member-${i}`,
  roomId: 'room-1',
  userId: `user-${i}`,
  user: { displayName: `User ${i}`, username: `user${i}`, uid: `U${1000 + i}`, vipLevel: Math.floor(Math.random() * 5) },
  role: i === 0 ? 'host' : i < 3 ? 'co_host' : i < 8 ? 'speaker' : 'audience' as RoomMember['role'],
  seatIndex: i < 8 ? i : undefined,
  joinedAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
  totalGiftsSent: Math.floor(Math.random() * 5000),
}))

const mockGifts = Array.from({ length: 15 }, (_, i) => ({
  id: `gift-${i}`,
  giftId: `gift-${i % 5}`,
  gift: { name: ['Rose', 'Crown', 'Rocket', 'Diamond Ring', 'Super Car'][i % 5] },
  senderId: `user-${i}`,
  sender: { displayName: `User ${i}` },
  receiverId: 'user-1',
  receiver: { displayName: 'Music Lover' },
  roomId: 'room-1',
  quantity: Math.floor(Math.random() * 10) + 1,
  totalDiamonds: Math.floor(Math.random() * 5000) + 100,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}))

const roleColors: Record<string, string> = {
  host: 'text-amber-400 bg-amber-500/20',
  co_host: 'text-blue-400 bg-blue-500/20',
  speaker: 'text-green-400 bg-green-500/20',
  audience: 'text-dark-400 bg-dark-600',
}

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('Members')

  const room = mockRoom

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => router.push('/rooms')}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Rooms
      </button>

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
                  Hosted by <span className="text-primary-400">{room.host?.displayName}</span>
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
                { label: 'Viewers', value: formatNumber(room.totalViewers), icon: '👁' },
                { label: 'Online', value: formatNumber(room.onlineCount), icon: '🟢' },
                { label: 'Total Gifts', value: `${formatNumber(room.totalGiftsValue)} 💎`, icon: '🎁' },
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
                onClick={() => toast.success('Room closed')}
                className="btn-secondary text-sm"
              >
                <XCircleIcon className="w-4 h-4" />
                Force Close
              </button>
            )}
            <button
              onClick={() => toast.success('Room banned')}
              className="btn-danger text-sm"
            >
              <NoSymbolIcon className="w-4 h-4" />
              Ban Room
            </button>
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
        {['Members', 'Gift History', 'Moderation'].map((tab) => (
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
            <h3 className="text-white font-semibold">Room Members ({mockMembers.length})</h3>
          </div>

          {/* Seat visualization */}
          <div className="grid grid-cols-5 gap-3 mb-6 p-4 bg-white/3 rounded-xl">
            {Array.from({ length: room.maxSeats }, (_, i) => {
              const member = mockMembers.find(m => m.seatIndex === i)
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center p-2 border transition-all ${
                    member
                      ? 'bg-primary-500/10 border-primary-500/20'
                      : 'bg-white/2 border-white/5'
                  }`}
                >
                  {member ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center text-xs font-bold text-primary-300">
                        {member.user.displayName.charAt(0)}
                      </div>
                      <p className="text-xs text-dark-300 mt-1 truncate w-full text-center">{member.user.displayName.split(' ')[0]}</p>
                      <span className={`text-xs px-1 py-0.5 rounded font-medium mt-0.5 ${roleColors[member.role]}`}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </>
                  ) : (
                    <span className="text-dark-600 text-xs">#{i + 1}</span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['User', 'Role', 'Gifts Sent', 'Joined'].map((h) => (
                    <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-white/2 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar name={member.user.displayName} size="sm" />
                        <div>
                          <p className="text-white text-sm font-medium">{member.user.displayName}</p>
                          <p className="text-dark-400 text-xs">@{member.user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[member.role]}`}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell text-amber-400 font-medium">{formatNumber(member.totalGiftsSent)} 💎</td>
                    <td className="table-cell text-dark-400">{timeAgo(member.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Gift History' && (
        <div className="card animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <GiftIcon className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-semibold">Gift History in Room</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Gift', 'From', 'To', 'Qty', 'Diamonds', 'Time'].map((h) => (
                    <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockGifts.map((gift) => (
                  <tr key={gift.id} className="hover:bg-white/2 transition-colors">
                    <td className="table-cell font-medium text-white">{gift.gift.name}</td>
                    <td className="table-cell text-dark-300">{gift.sender.displayName}</td>
                    <td className="table-cell text-dark-300">{gift.receiver.displayName}</td>
                    <td className="table-cell text-white">x{gift.quantity}</td>
                    <td className="table-cell text-amber-400 font-medium">{formatNumber(gift.totalDiamonds)} 💎</td>
                    <td className="table-cell text-dark-400">{timeAgo(gift.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Moderation' && (
        <div className="card animate-fade-in">
          <h3 className="text-white font-semibold mb-4">Moderation Actions</h3>
          <div className="space-y-3">
            {[
              { action: 'Mute all microphones', icon: '🔇', color: 'btn-secondary' },
              { action: 'Remove all non-VIP users', icon: '👥', color: 'btn-secondary' },
              { action: 'Force close room', icon: '🚫', color: 'btn-danger' },
              { action: 'Ban host permanently', icon: '⛔', color: 'btn-danger' },
            ].map((item) => (
              <div key={item.action} className="flex items-center justify-between p-4 bg-white/3 rounded-xl">
                <span className="text-white text-sm">{item.icon} {item.action}</span>
                <button
                  onClick={() => toast.success(`Action: ${item.action}`)}
                  className={item.color + ' text-sm py-2'}
                >
                  Execute
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

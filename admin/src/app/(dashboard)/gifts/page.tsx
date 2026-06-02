'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { formatNumber } from '@/lib/utils'
import type { Gift } from '@/types'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

const mockGifts: Gift[] = Array.from({ length: 20 }, (_, i) => ({
  id: `gift-${i}`,
  name: ['Rose', 'Crown', 'Rocket', 'Diamond Ring', 'Super Car', 'Castle', 'Unicorn', 'Galaxy', 'Island', 'Universe'][i % 10] + (i >= 10 ? ' Pro' : ''),
  category: ['basic', 'premium', 'special', 'event'][Math.floor(Math.random() * 4)] as Gift['category'],
  type: ['static', 'lottie', 'svga', 'fullscreen'][Math.floor(Math.random() * 4)] as Gift['type'],
  imageUrl: '',
  priceDiamonds: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000][Math.floor(Math.random() * 9)],
  sortOrder: i + 1,
  isActive: Math.random() > 0.2,
  isSpecial: Math.random() > 0.7,
  totalUsage: Math.floor(Math.random() * 100000) + 100,
  totalRevenue: Math.floor(Math.random() * 500000) + 1000,
  createdAt: new Date(Date.now() - Math.random() * 86400000 * 365).toISOString(),
  updatedAt: new Date().toISOString(),
}))

export default function GiftsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Gift | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'gifts' | 'transactions'>('gifts')

  const filtered = mockGifts.filter((g) => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !categoryFilter || g.category === categoryFilter
    const matchType = !typeFilter || g.type === typeFilter
    return matchSearch && matchCategory && matchType
  })

  const handleToggle = async (gift: Gift) => {
    setToggling(gift.id)
    try {
      await api.toggleGift(gift.id, !gift.isActive)
      toast.success(`Gift ${gift.isActive ? 'deactivated' : 'activated'}`)
    } catch {
      toast.error('Failed to update gift')
    } finally {
      setToggling(null)
    }
  }

  const categoryColors: Record<string, string> = {
    basic: 'text-dark-300 bg-dark-600',
    premium: 'text-blue-400 bg-blue-500/20',
    special: 'text-purple-400 bg-purple-500/20',
    event: 'text-amber-400 bg-amber-500/20',
    seasonal: 'text-green-400 bg-green-500/20',
  }

  const typeColors: Record<string, string> = {
    static: 'text-dark-400',
    lottie: 'text-blue-400',
    svga: 'text-purple-400',
    fullscreen: 'text-amber-400',
  }

  const giftEmojis: Record<string, string> = {
    Rose: '🌹',
    Crown: '👑',
    Rocket: '🚀',
    'Diamond Ring': '💍',
    'Super Car': '🏎️',
    Castle: '🏰',
    Unicorn: '🦄',
    Galaxy: '🌌',
    Island: '🏝️',
    Universe: '🌌',
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-white/5 pb-0">
          {[
            { value: 'gifts', label: 'Gift Library' },
            { value: 'transactions', label: 'Transactions' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === tab.value
                  ? 'text-white border-primary-500'
                  : 'text-dark-400 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => router.push('/gifts/new')} className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          Add Gift
        </button>
      </div>

      {activeTab === 'gifts' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search gifts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input sm:w-40"
            >
              <option value="">All Categories</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="special">Special</option>
              <option value="event">Event</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input sm:w-40"
            >
              <option value="">All Types</option>
              <option value="static">Static</option>
              <option value="lottie">Lottie</option>
              <option value="svga">SVGA</option>
              <option value="fullscreen">Fullscreen</option>
            </select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Gifts', value: mockGifts.length },
              { label: 'Active', value: mockGifts.filter(g => g.isActive).length, color: 'text-green-400' },
              { label: 'Special', value: mockGifts.filter(g => g.isSpecial).length, color: 'text-amber-400' },
              { label: 'Total Usage', value: formatNumber(mockGifts.reduce((a, g) => a + g.totalUsage, 0)), color: 'text-primary-400' },
            ].map((stat) => (
              <div key={stat.label} className="card py-3 text-center">
                <p className={`text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                <p className="text-dark-500 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Gift grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((gift) => (
              <div
                key={gift.id}
                className={`card relative group hover:border-white/10 transition-all duration-200 ${!gift.isActive ? 'opacity-60' : ''}`}
              >
                {gift.isSpecial && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                      ★ Special
                    </span>
                  </div>
                )}

                {/* Gift image */}
                <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center text-5xl mb-4">
                  {giftEmojis[gift.name.replace(' Pro', '')] || '🎁'}
                </div>

                <h4 className="text-white font-semibold mb-1">{gift.name}</h4>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[gift.category]}`}>
                    {gift.category}
                  </span>
                  <span className={`text-xs font-medium uppercase ${typeColors[gift.type]}`}>
                    {gift.type}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-blue-400 font-bold">{formatNumber(gift.priceDiamonds)} 💎</p>
                  </div>
                  <div className="text-right">
                    <p className="text-dark-400 text-xs">Used</p>
                    <p className="text-white text-sm font-medium">{formatNumber(gift.totalUsage)}×</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/gifts/${gift.id}`)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/gifts/${gift.id}?edit=true`)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(gift)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggle(gift)}
                    disabled={toggling === gift.id}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      gift.isActive ? 'bg-primary-600' : 'bg-dark-600'
                    } ${toggling === gift.id ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200 ${
                        gift.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'transactions' && (
        <div className="card animate-fade-in">
          <h3 className="text-white font-semibold mb-4">Gift Transaction History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Gift', 'Sender', 'Receiver', 'Room', 'Qty', 'Diamonds', 'Time'].map((h) => (
                    <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Array.from({ length: 15 }, (_, i) => (
                  <tr key={i} className="hover:bg-white/2 transition-colors">
                    <td className="table-cell text-white font-medium">
                      {mockGifts[i % mockGifts.length].name}
                    </td>
                    <td className="table-cell text-dark-300">User {i}</td>
                    <td className="table-cell text-dark-300">Host {i % 5}</td>
                    <td className="table-cell text-dark-400">Music Lounge</td>
                    <td className="table-cell text-white">x{Math.floor(Math.random() * 10) + 1}</td>
                    <td className="table-cell text-amber-400 font-medium">
                      {formatNumber(Math.floor(Math.random() * 5000) + 50)} 💎
                    </td>
                    <td className="table-cell text-dark-400">
                      {new Date(Date.now() - i * 3600000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          toast.success(`Gift "${confirmDelete?.name}" deleted`)
          setConfirmDelete(null)
        }}
        title="Delete Gift"
        message={`Delete "${confirmDelete?.name}"? This will remove it from all gift menus.`}
        confirmLabel="Delete Gift"
      />
    </div>
  )
}

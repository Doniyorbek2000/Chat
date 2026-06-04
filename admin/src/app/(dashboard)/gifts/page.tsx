'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { formatNumber } from '@/lib/utils'
import type { Gift } from '@/types'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

const CATEGORY_COLORS: Record<string, string> = {
  NORMAL: 'text-dark-300 bg-dark-600',
  LUXURY: 'text-blue-400 bg-blue-500/20',
  VIP: 'text-purple-400 bg-purple-500/20',
  LUCKY: 'text-amber-400 bg-amber-500/20',
  LUCKY_FRUIT: 'text-green-400 bg-green-500/20',
  COUPLE: 'text-pink-400 bg-pink-500/20',
  RELATIONSHIP: 'text-rose-400 bg-rose-500/20',
  ARISTOCRACY: 'text-yellow-400 bg-yellow-500/20',
  FAMILY: 'text-cyan-400 bg-cyan-500/20',
  NATION: 'text-indigo-400 bg-indigo-500/20',
  CUSTOMIZE: 'text-teal-400 bg-teal-500/20',
}

const TYPE_COLORS: Record<string, string> = {
  STATIC: 'text-dark-400',
  LOTTIE: 'text-blue-400',
  SVGA: 'text-purple-400',
  FULLSCREEN: 'text-amber-400',
}

export default function GiftsPage() {
  const router = useRouter()
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Gift | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'gifts' | 'transactions'>('gifts')

  const loadGifts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getGifts({ limit: 200 })
      const items = (res as any)?.items ?? (res as any)?.data ?? res ?? []
      setGifts(Array.isArray(items) ? items : [])
    } catch {
      toast.error('Failed to load gifts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGifts() }, [loadGifts])

  const filtered = gifts.filter((g) => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !categoryFilter || g.category === categoryFilter
    const matchType = !typeFilter || g.type === typeFilter
    return matchSearch && matchCategory && matchType
  })

  const handleToggle = async (gift: Gift) => {
    setToggling(gift.id)
    try {
      await api.toggleGift(gift.id, !gift.isActive)
      setGifts(prev => prev.map(g => g.id === gift.id ? { ...g, isActive: !g.isActive } : g))
      toast.success(`Gift ${gift.isActive ? 'deactivated' : 'activated'}`)
    } catch {
      toast.error('Failed to update gift')
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (gift: Gift) => {
    setDeleting(gift.id)
    try {
      await api.deleteGift(gift.id)
      setGifts(prev => prev.filter(g => g.id !== gift.id))
      toast.success(`Gift "${gift.name}" deleted`)
    } catch {
      toast.error('Failed to delete gift')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const categories = Array.from(new Set(gifts.map(g => g.category))).sort()
  const types = Array.from(new Set(gifts.map(g => g.type))).sort()

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
        <div className="flex items-center gap-2">
          <button onClick={loadGifts} className="btn-ghost" disabled={loading}>
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => router.push('/gifts/new')} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Add Gift
          </button>
        </div>
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
              className="input sm:w-44"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input sm:w-40"
            >
              <option value="">All Types</option>
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Gifts', value: gifts.length },
              { label: 'Active', value: gifts.filter(g => g.isActive).length, color: 'text-green-400' },
              { label: 'Filtered', value: filtered.length, color: 'text-primary-400' },
              { label: 'Categories', value: categories.length, color: 'text-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="card py-3 text-center">
                <p className={`text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                <p className="text-dark-500 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-dark-400 text-sm">Loading gifts...</p>
              </div>
            </div>
          )}

          {/* Gift grid */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-12 text-dark-400">
                  {gifts.length === 0 ? 'No gifts found. Add your first gift!' : 'No gifts match your filters.'}
                </div>
              ) : filtered.map((gift) => (
                <div
                  key={gift.id}
                  className={`card relative group hover:border-white/10 transition-all duration-200 ${!gift.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Gift image */}
                  <div className="w-full aspect-square rounded-xl bg-white/5 flex items-center justify-center text-5xl mb-4 overflow-hidden">
                    {gift.imageUrl ? (
                      <img src={gift.imageUrl} alt={gift.name} className="w-full h-full object-contain" />
                    ) : (
                      '🎁'
                    )}
                  </div>

                  <h4 className="text-white font-semibold mb-1">{gift.name}</h4>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[gift.category] || 'text-dark-300 bg-dark-600'}`}>
                      {gift.category}
                    </span>
                    <span className={`text-xs font-medium uppercase ${TYPE_COLORS[gift.type] || 'text-dark-400'}`}>
                      {gift.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-amber-400 font-bold">{formatNumber((gift as any).coinPrice ?? 0)} 🪙</p>
                    </div>
                    <div className="text-right">
                      <p className="text-dark-400 text-xs">Sort</p>
                      <p className="text-white text-sm font-medium">#{(gift as any).sortOrder ?? 0}</p>
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
                        disabled={deleting === gift.id}
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
          )}
        </>
      )}

      {activeTab === 'transactions' && (
        <GiftTransactionsTab />
      )}

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Gift"
        message={`Delete "${confirmDelete?.name}"? This will remove it from all gift menus.`}
        confirmLabel="Delete Gift"
      />
    </div>
  )
}

function GiftTransactionsTab() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getGiftTransactions({ limit: 50 })
      .then((res: any) => {
        const items = res?.items ?? res?.data ?? res ?? []
        setTransactions(Array.isArray(items) ? items : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="card animate-fade-in">
      <h3 className="text-white font-semibold mb-4">Gift Transaction History</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {['Gift', 'Sender', 'Receiver', 'Room', 'Qty', 'Coins', 'Multiplier', 'Time'].map((h) => (
                <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-dark-400 py-8">No transactions yet</td>
              </tr>
            ) : transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                <td className="table-cell text-white font-medium">{tx.gift?.name ?? 'Gift'}</td>
                <td className="table-cell text-dark-300">{tx.sender?.displayName ?? tx.senderId}</td>
                <td className="table-cell text-dark-300">{tx.receiver?.displayName ?? tx.receiverId ?? '—'}</td>
                <td className="table-cell text-dark-400">{tx.room?.title ?? '—'}</td>
                <td className="table-cell text-white">x{tx.quantity}</td>
                <td className="table-cell text-amber-400 font-medium">
                  {formatNumber(Number(tx.totalCoins))} 🪙
                </td>
                <td className="table-cell">
                  {tx.multiplier > 1 ? (
                    <span className="text-green-400 font-bold">{tx.multiplier}x 🍀</span>
                  ) : (
                    <span className="text-dark-400">1x</span>
                  )}
                </td>
                <td className="table-cell text-dark-400">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

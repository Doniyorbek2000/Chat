'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Toggle from '@/components/ui/Toggle'
import Badge from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'FRAME', 'ENTRANCE_EFFECT', 'CHAT_BUBBLE', 'MIC_DECORATION',
  'VEHICLE', 'ROOM_THEME', 'PROFILE_BACKGROUND', 'NAMEPLATE',
  'NOBLE_BADGE', 'GIFT_SKIN',
]

const CATEGORY_LABELS: Record<string, string> = {
  FRAME: 'Frame',
  ENTRANCE_EFFECT: 'Entrance Effect',
  CHAT_BUBBLE: 'Chat Bubble',
  MIC_DECORATION: 'Mic Decoration',
  VEHICLE: 'Vehicle',
  ROOM_THEME: 'Room Theme',
  PROFILE_BACKGROUND: 'Profile BG',
  NAMEPLATE: 'Nameplate',
  NOBLE_BADGE: 'Noble Badge',
  GIFT_SKIN: 'Gift Skin',
}

const GRADES = ['SS', 'S', 'A', 'B', 'C']

const GRADE_COLORS: Record<string, string> = {
  SS: 'text-red-400 bg-red-500/20 border-red-500/30',
  S:  'text-orange-400 bg-orange-500/20 border-orange-500/30',
  A:  'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  B:  'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  C:  'text-dark-400 bg-dark-600 border-white/10',
}

interface ShopItem {
  id: string
  category: string
  title: string
  description?: string
  imageUrl: string
  animationUrl?: string
  grade: string
  priceCoins: number
  priceDiamonds: number
  durationDays?: number
  isPermanent: boolean
  vipRequired: number
  nobleRequired?: string
  levelRequired: number
  isActive: boolean
  sortOrder: number
}

interface ItemForm {
  category: string
  title: string
  description: string
  imageUrl: string
  grade: string
  priceCoins: string
  priceDiamonds: string
  durationDays: string
  isPermanent: boolean
  vipRequired: string
  levelRequired: string
  isActive: boolean
  sortOrder: string
}

const emptyForm = (): ItemForm => ({
  category: 'FRAME',
  title: '',
  description: '',
  imageUrl: '',
  grade: 'C',
  priceCoins: '0',
  priceDiamonds: '0',
  durationDays: '30',
  isPermanent: false,
  vipRequired: '0',
  levelRequired: '0',
  isActive: true,
  sortOrder: '0',
})

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ShopItem | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm())
  const [errors, setErrors] = useState<Partial<ItemForm>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ShopItem | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getShopItems({ limit: 500 })
      const rawItems = (res as any)?.items ?? (res as any)?.data ?? res ?? []
      setItems(Array.isArray(rawItems) ? rawItems : [])
    } catch {
      toast.error('Failed to load shop items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const filtered = items.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && item.category !== categoryFilter) return false
    if (gradeFilter && item.grade !== gradeFilter) return false
    return true
  })

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item: ShopItem) => {
    setEditTarget(item)
    setForm({
      category: item.category,
      title: item.title,
      description: item.description ?? '',
      imageUrl: item.imageUrl,
      grade: item.grade,
      priceCoins: String(item.priceCoins),
      priceDiamonds: String(item.priceDiamonds),
      durationDays: String(item.durationDays ?? 30),
      isPermanent: item.isPermanent,
      vipRequired: String(item.vipRequired),
      levelRequired: String(item.levelRequired),
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const e: Partial<ItemForm> = {}
    if (!form.title.trim()) e.title = 'Title required'
    if (!form.imageUrl.trim()) e.imageUrl = 'Image URL required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        grade: form.grade,
        priceCoins: Number(form.priceCoins),
        priceDiamonds: Number(form.priceDiamonds),
        durationDays: form.isPermanent ? null : Number(form.durationDays),
        isPermanent: form.isPermanent,
        vipRequired: Number(form.vipRequired),
        levelRequired: Number(form.levelRequired),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      }
      if (editTarget) {
        const updated = await api.updateShopItem(editTarget.id, payload)
        setItems(prev => prev.map(i => i.id === editTarget.id ? { ...i, ...(updated as any) } : i))
        toast.success('Item updated')
      } else {
        const created = await api.createShopItem(payload)
        setItems(prev => [...prev, created as ShopItem])
        toast.success('Item created')
      }
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: ShopItem) => {
    setDeleting(item.id)
    try {
      await api.deleteShopItem(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast.success(`"${item.title}" deleted`)
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const categoryStats = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Shop Items</h1>
          <p className="text-sm text-dark-400 mt-0.5">{items.length} items total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Category stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {CATEGORIES.slice(0, 5).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
            className={`bg-dark-800 border rounded-xl p-3 text-left transition-all ${
              categoryFilter === cat
                ? 'border-primary-500 bg-primary-500/5'
                : 'border-white/5 hover:border-white/10'
            }`}
          >
            <p className="text-xs text-dark-400 mb-1">{CATEGORY_LABELS[cat]}</p>
            <p className="text-lg font-bold text-white">{categoryStats[cat] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-dark-800 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-dark-800 border border-white/5 rounded-lg px-3 py-2 text-dark-300 text-sm focus:outline-none focus:border-primary-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="bg-dark-800 border border-white/5 rounded-lg px-3 py-2 text-dark-300 text-sm focus:outline-none focus:border-primary-500"
        >
          <option value="">All Grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <ShoppingBagIcon className="w-10 h-10 text-dark-600" />
            <p className="text-dark-400 text-sm">No items found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-dark-400 text-xs">
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Grade</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Requirements</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{item.title}</span>
                    {item.description && (
                      <p className="text-xs text-dark-400 truncate max-w-[160px]">{item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-dark-300 bg-dark-700 px-2 py-0.5 rounded">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[item.grade] ?? ''}`}>
                      {item.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.priceCoins > 0 && (
                      <span className="text-amber-400">{formatNumber(item.priceCoins)} 🪙</span>
                    )}
                    {item.priceDiamonds > 0 && (
                      <span className="text-cyan-400 ml-1">{formatNumber(item.priceDiamonds)} 💎</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-dark-300 text-xs">
                    {item.isPermanent ? 'Permanent' : `${item.durationDays ?? '—'}d`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.vipRequired > 0 && (
                        <span className="text-xs bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded">
                          VIP {item.vipRequired}+
                        </span>
                      )}
                      {item.levelRequired > 0 && (
                        <span className="text-xs bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded">
                          Lv.{item.levelRequired}+
                        </span>
                      )}
                      {item.nobleRequired && (
                        <span className="text-xs bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded">
                          {item.nobleRequired}+
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-dark-400'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-dark-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item)}
                        disabled={deleting === item.id}
                        className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Edit: ${editTarget.title}` : 'Create Shop Item'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category">
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Grade">
              <select
                value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              >
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Title" error={errors.title}>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Item name"
              className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </FormField>
          <FormField label="Description">
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </FormField>
          <FormField label="Image URL" error={errors.imageUrl}>
            <input
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price (Coins)">
              <input
                type="number"
                min="0"
                value={form.priceCoins}
                onChange={e => setForm(f => ({ ...f, priceCoins: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
            <FormField label="Price (Diamonds)">
              <input
                type="number"
                min="0"
                value={form.priceDiamonds}
                onChange={e => setForm(f => ({ ...f, priceDiamonds: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Duration (days)">
              <input
                type="number"
                min="1"
                value={form.durationDays}
                onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                disabled={form.isPermanent}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-40"
              />
            </FormField>
            <FormField label="VIP Required">
              <input
                type="number"
                min="0"
                max="10"
                value={form.vipRequired}
                onChange={e => setForm(f => ({ ...f, vipRequired: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
            <FormField label="Level Required">
              <input
                type="number"
                min="0"
                value={form.levelRequired}
                onChange={e => setForm(f => ({ ...f, levelRequired: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-dark-300">Permanent</span>
              <Toggle
                checked={form.isPermanent}
                onChange={v => setForm(f => ({ ...f, isPermanent: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-dark-300">Active</span>
              <Toggle
                checked={form.isActive}
                onChange={v => setForm(f => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-dark-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Shop Item"
        message={`Are you sure you want to delete "${confirmDelete?.title}"?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={!!deleting}
      />
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Toggle from '@/components/ui/Toggle'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

const GRADE_COLORS: Record<string, string> = {
  SS: 'text-red-400 bg-red-500/20 border-red-500/30',
  S:  'text-orange-400 bg-orange-500/20 border-orange-500/30',
  A:  'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  B:  'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  C:  'text-dark-400 bg-dark-600 border-white/10',
}

const GRADES = ['SS', 'S', 'A', 'B', 'C'] as const

interface RoomTheme {
  id: string
  name: string
  description?: string
  imageUrl: string
  previewUrl?: string
  grade: string
  priceCoins: number
  priceDiamonds: number
  durationDays: number | null
  isPermanent: boolean
  isActive: boolean
  sortOrder: number
}

interface ThemeForm {
  name: string
  description: string
  imageUrl: string
  previewUrl: string
  grade: string
  priceCoins: string
  priceDiamonds: string
  durationDays: string
  isPermanent: boolean
  isActive: boolean
  sortOrder: string
}

const emptyForm = (): ThemeForm => ({
  name: '',
  description: '',
  imageUrl: '',
  previewUrl: '',
  grade: 'C',
  priceCoins: '0',
  priceDiamonds: '0',
  durationDays: '30',
  isPermanent: false,
  isActive: true,
  sortOrder: '0',
})

export default function RoomThemesPage() {
  const [themes, setThemes] = useState<RoomTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RoomTheme | null>(null)
  const [form, setForm] = useState<ThemeForm>(emptyForm())
  const [errors, setErrors] = useState<Partial<ThemeForm>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<RoomTheme | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadThemes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getRoomThemes()
      const items = (res as any)?.items ?? (res as any)?.data ?? res ?? []
      setThemes(Array.isArray(items) ? items : [])
    } catch {
      toast.error('Failed to load room themes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadThemes() }, [loadThemes])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (theme: RoomTheme) => {
    setEditTarget(theme)
    setForm({
      name: theme.name,
      description: theme.description ?? '',
      imageUrl: theme.imageUrl,
      previewUrl: theme.previewUrl ?? '',
      grade: theme.grade,
      priceCoins: String(theme.priceCoins),
      priceDiamonds: String(theme.priceDiamonds),
      durationDays: theme.durationDays != null ? String(theme.durationDays) : '30',
      isPermanent: theme.isPermanent,
      isActive: theme.isActive,
      sortOrder: String(theme.sortOrder),
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const e: Partial<ThemeForm> = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.imageUrl.trim()) e.imageUrl = 'Image URL required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        previewUrl: form.previewUrl.trim() || undefined,
        grade: form.grade,
        priceCoins: Number(form.priceCoins),
        priceDiamonds: Number(form.priceDiamonds),
        durationDays: form.isPermanent ? null : Number(form.durationDays),
        isPermanent: form.isPermanent,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      }
      if (editTarget) {
        const updated = await api.updateRoomTheme(editTarget.id, payload)
        setThemes(prev => prev.map(t => t.id === editTarget.id ? { ...t, ...(updated as any) } : t))
        toast.success('Theme updated')
      } else {
        const created = await api.createRoomTheme(payload)
        setThemes(prev => [...prev, created as RoomTheme])
        toast.success('Theme created')
      }
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (theme: RoomTheme) => {
    setDeleting(theme.id)
    try {
      await api.deleteRoomTheme(theme.id)
      setThemes(prev => prev.filter(t => t.id !== theme.id))
      toast.success(`"${theme.name}" deleted`)
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const activeCount = themes.filter(t => t.isActive).length
  const gradeCounts = GRADES.reduce((acc, g) => {
    acc[g] = themes.filter(t => t.grade === g).length
    return acc
  }, {} as Record<string, number>)

  const inputCls = 'w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500'

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Room Themes</h1>
          <p className="text-sm text-dark-400 mt-0.5">{themes.length} theme(s) total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Theme
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-dark-400 mb-1">Total</p>
          <p className="text-lg font-bold text-white">{themes.length}</p>
          <p className="text-xs text-dark-400">themes</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-green-400 mb-1">Active</p>
          <p className="text-lg font-bold text-white">{activeCount}</p>
          <p className="text-xs text-dark-400">themes</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-red-400 mb-1">SS Grade</p>
          <p className="text-lg font-bold text-white">{gradeCounts.SS ?? 0}</p>
          <p className="text-xs text-dark-400">themes</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-orange-400 mb-1">S Grade</p>
          <p className="text-lg font-bold text-white">{gradeCounts.S ?? 0}</p>
          <p className="text-xs text-dark-400">themes</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : themes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <SwatchIcon className="w-10 h-10 text-dark-600" />
            <p className="text-dark-400 text-sm">No room themes yet</p>
            <button onClick={openCreate} className="text-primary-400 text-sm hover:underline">
              Create first theme
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-dark-400 text-xs">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Grade</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {themes.map(theme => (
                <tr key={theme.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {theme.imageUrl && (
                        <img src={theme.imageUrl} alt={theme.name} className="w-8 h-8 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="text-white font-medium">{theme.name}</p>
                        {theme.description && (
                          <p className="text-dark-400 text-xs truncate max-w-[200px]">{theme.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${GRADE_COLORS[theme.grade] ?? 'text-dark-400 bg-dark-600 border-white/10'}`}>
                      {theme.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {theme.priceCoins > 0 && (
                        <span className="text-amber-400 text-xs">{formatNumber(theme.priceCoins)} coins</span>
                      )}
                      {theme.priceDiamonds > 0 && (
                        <span className="text-blue-400 text-xs">{formatNumber(theme.priceDiamonds)} diamonds</span>
                      )}
                      {theme.priceCoins === 0 && theme.priceDiamonds === 0 && (
                        <span className="text-dark-400 text-xs">Free</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {theme.isPermanent ? (
                      <span className="text-purple-400 text-xs font-medium">Permanent</span>
                    ) : (
                      <span className="text-dark-300 text-xs">{theme.durationDays}d</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${theme.isActive ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-dark-400'}`}>
                      {theme.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(theme)}
                        className="p-1.5 text-dark-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(theme)}
                        disabled={deleting === theme.id}
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
        title={editTarget ? `Edit: ${editTarget.name}` : 'Create Room Theme'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" error={errors.name}>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ocean Breeze"
                className={inputCls}
              />
            </FormField>
            <FormField label="Grade">
              <select
                value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                className={inputCls}
              >
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Description">
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              className={inputCls}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Image URL" error={errors.imageUrl}>
              <input
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className={inputCls}
              />
            </FormField>
            <FormField label="Preview URL">
              <input
                value={form.previewUrl}
                onChange={e => setForm(f => ({ ...f, previewUrl: e.target.value }))}
                placeholder="https://..."
                className={inputCls}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price (Coins)">
              <input
                type="number"
                min="0"
                value={form.priceCoins}
                onChange={e => setForm(f => ({ ...f, priceCoins: e.target.value }))}
                className={inputCls}
              />
            </FormField>
            <FormField label="Price (Diamonds)">
              <input
                type="number"
                min="0"
                value={form.priceDiamonds}
                onChange={e => setForm(f => ({ ...f, priceDiamonds: e.target.value }))}
                className={inputCls}
              />
            </FormField>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-dark-300">Permanent (no expiry)</span>
            <Toggle
              checked={form.isPermanent}
              onChange={v => setForm(f => ({ ...f, isPermanent: v }))}
            />
          </div>
          {!form.isPermanent && (
            <FormField label="Duration (Days)">
              <input
                type="number"
                min="1"
                value={form.durationDays}
                onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                className={inputCls}
              />
            </FormField>
          )}
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Sort Order">
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                className={inputCls}
              />
            </FormField>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-sm text-dark-300">Active</span>
            <Toggle
              checked={form.isActive}
              onChange={v => setForm(f => ({ ...f, isActive: v }))}
            />
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
        title="Delete Room Theme"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={!!deleting}
      />
    </div>
  )
}

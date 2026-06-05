'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Toggle from '@/components/ui/Toggle'
import { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Banner, BannerPosition } from '@/types'
import toast from 'react-hot-toast'

const positionOptions: { value: BannerPosition; label: string; description: string }[] = [
  { value: 'home_top', label: 'HOME_TOP', description: 'Top of home feed' },
  { value: 'home_middle', label: 'HOME_BOTTOM', description: 'Middle of home feed' },
  { value: 'discovery', label: 'ROOM_LIST', description: 'Room discovery page' },
  { value: 'loading', label: 'LOADING', description: 'App loading screen' },
]

const positionColors: Record<string, string> = {
  home_top: 'text-blue-400 bg-blue-500/20',
  home_middle: 'text-green-400 bg-green-500/20',
  discovery: 'text-purple-400 bg-purple-500/20',
  loading: 'text-amber-400 bg-amber-500/20',
}

interface BannerForm {
  title: string
  imageUrl: string
  linkUrl: string
  position: BannerPosition
  startDate: string
  endDate: string
  isActive: boolean
  sortOrder: string
}

const emptyForm: BannerForm = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  position: 'home_top',
  startDate: '',
  endDate: '',
  isActive: true,
  sortOrder: '1',
}

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Banner | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<BannerForm>>({})
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getBanners()
      setBanners(Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [])
    } catch {
      setError('Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const setField = <K extends keyof BannerForm>(key: K, val: BannerForm[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm({ ...emptyForm, sortOrder: String(banners.length + 1) })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (banner: Banner) => {
    setEditTarget(banner)
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      position: banner.position,
      startDate: banner.startDate ? banner.startDate.split('T')[0] : '',
      endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
      isActive: banner.isActive,
      sortOrder: String(banner.sortOrder),
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e: Partial<BannerForm> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.imageUrl.trim()) e.imageUrl = 'Image URL is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const data: Record<string, any> = {
        title: form.title,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl || undefined,
        position: form.position,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }
      if (editTarget) {
        await api.updateBanner(editTarget.id, data)
        toast.success('Banner updated')
      } else {
        await api.createBanner(data as any)
        toast.success('Banner created')
      }
      setModalOpen(false)
      load()
    } catch {
      toast.error('Failed to save banner')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (banner: Banner) => {
    try {
      await api.deleteBanner(banner.id)
      setBanners(prev => prev.filter(b => b.id !== banner.id))
      toast.success('Banner deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete banner')
    }
  }

  const handleToggle = async (banner: Banner) => {
    setTogglingId(banner.id)
    try {
      await api.updateBanner(banner.id, { isActive: !banner.isActive })
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, isActive: !b.isActive } : b))
    } catch {
      toast.error('Failed to update banner')
    } finally {
      setTogglingId(null)
    }
  }

  const moveOrder = (banner: Banner, dir: 'up' | 'down') => {
    const sorted = [...banners].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(b => b.id === banner.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const newBanners = sorted.map(b => {
      if (b.id === sorted[idx].id) return { ...b, sortOrder: sorted[swapIdx].sortOrder }
      if (b.id === sorted[swapIdx].id) return { ...b, sortOrder: sorted[idx].sortOrder }
      return b
    })
    setBanners(newBanners)
    api.reorderBanners(newBanners.sort((a, b) => a.sortOrder - b.sortOrder).map(b => b.id)).catch(() => {})
  }

  const sorted = [...banners].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-12 space-y-3">
        <p className="text-red-400">{error}</p>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Banners</h2>
          <p className="text-[#737373] text-sm">{banners.length} banners total</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          Add Banner
        </button>
      </div>

      {/* Banner List */}
      <div className="space-y-3">
        {sorted.map((banner, idx) => (
          <div
            key={banner.id}
            className={`card p-4 flex items-center gap-4 transition-all ${!banner.isActive ? 'opacity-60' : ''}`}
          >
            {/* Preview */}
            <div className="w-32 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/10">
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-medium truncate">{banner.title}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${positionColors[banner.position] || 'text-[#737373] bg-white/5'}`}>
                  {positionOptions.find(p => p.value === banner.position)?.label || banner.position}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#737373]">
                <span>Order: #{banner.sortOrder}</span>
                {banner.startDate && <span>Starts: {formatDate(banner.startDate)}</span>}
                {banner.endDate && <span>Ends: {formatDate(banner.endDate)}</span>}
                {banner.viewCount != null && <span>{banner.viewCount.toLocaleString()} views</span>}
                {banner.clickCount != null && <span>{banner.clickCount.toLocaleString()} clicks</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Reorder */}
              <div className="flex flex-col">
                <button
                  onClick={() => moveOrder(banner, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-[#737373] hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronUpIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveOrder(banner, 'down')}
                  disabled={idx === sorted.length - 1}
                  className="p-1 text-[#737373] hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <Toggle
                checked={banner.isActive}
                onChange={() => handleToggle(banner)}
                disabled={togglingId === banner.id}
              />

              <button
                onClick={() => openEdit(banner)}
                className="p-1.5 rounded-lg text-[#737373] hover:text-blue-400 hover:bg-blue-500/10 transition-all"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(banner)}
                className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-[#737373]">No banners yet. Add your first banner.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Banner' : 'Add Banner'}
        size="lg"
      >
        <div className="space-y-5">
          <FormField label="Title" required error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              className="input"
              placeholder="Banner title..."
            />
          </FormField>

          <FormField label="Image URL" required error={errors.imageUrl} hint="Recommended: 1200×400px">
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setField('imageUrl', e.target.value)}
              className="input"
              placeholder="https://cdn.voxo.app/banners/..."
            />
            {form.imageUrl && (
              <div className="mt-2 w-full h-28 rounded-xl overflow-hidden border border-white/10">
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </FormField>

          <FormField label="Link URL" hint="Where to navigate on click">
            <input
              type="url"
              value={form.linkUrl}
              onChange={(e) => setField('linkUrl', e.target.value)}
              className="input"
              placeholder="https://..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Position" required>
              <select value={form.position} onChange={(e) => setField('position', e.target.value as BannerPosition)} className="input">
                {positionOptions.map(p => (
                  <option key={p.value} value={p.value}>{p.label} — {p.description}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Sort Order">
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setField('sortOrder', e.target.value)}
                className="input"
                min="1"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date">
              <input type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} className="input" />
            </FormField>
            <FormField label="End Date">
              <input type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} className="input" />
            </FormField>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Toggle checked={form.isActive} onChange={(val) => setField('isActive', val)} label="Active" />
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {editTarget ? 'Save Changes' : 'Create Banner'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Banner"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}

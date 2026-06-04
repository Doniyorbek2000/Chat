'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  TrophyIcon,
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
const CATEGORIES = ['ACHIEVEMENT', 'EVENT', 'GIFT'] as const

interface Medal {
  id: string
  name: string
  description?: string
  imageUrl: string
  category: string
  grade: string
  prestigeValue: number
  isPaid: boolean
  priceCoins: number
  isActive: boolean
  sortOrder: number
}

interface MedalForm {
  name: string
  description: string
  imageUrl: string
  category: string
  grade: string
  prestigeValue: string
  isPaid: boolean
  priceCoins: string
  isActive: boolean
  sortOrder: string
}

const emptyForm = (): MedalForm => ({
  name: '',
  description: '',
  imageUrl: '',
  category: 'ACHIEVEMENT',
  grade: 'C',
  prestigeValue: '0',
  isPaid: false,
  priceCoins: '0',
  isActive: true,
  sortOrder: '0',
})

export default function MedalsPage() {
  const [medals, setMedals] = useState<Medal[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [gradeFilter, setGradeFilter] = useState<string>('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Medal | null>(null)
  const [form, setForm] = useState<MedalForm>(emptyForm())
  const [errors, setErrors] = useState<Partial<MedalForm>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Medal | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadMedals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getMedals()
      const items = (res as any)?.items ?? (res as any)?.data ?? res ?? []
      setMedals(Array.isArray(items) ? items : [])
    } catch {
      toast.error('Failed to load medals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMedals() }, [loadMedals])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (medal: Medal) => {
    setEditTarget(medal)
    setForm({
      name: medal.name,
      description: medal.description ?? '',
      imageUrl: medal.imageUrl,
      category: medal.category,
      grade: medal.grade,
      prestigeValue: String(medal.prestigeValue),
      isPaid: medal.isPaid,
      priceCoins: String(medal.priceCoins),
      isActive: medal.isActive,
      sortOrder: String(medal.sortOrder),
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const e: Partial<MedalForm> = {}
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
        category: form.category,
        grade: form.grade,
        prestigeValue: Number(form.prestigeValue),
        isPaid: form.isPaid,
        priceCoins: form.isPaid ? Number(form.priceCoins) : 0,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      }
      if (editTarget) {
        const updated = await api.updateMedal(editTarget.id, payload)
        setMedals(prev => prev.map(m => m.id === editTarget.id ? { ...m, ...(updated as any) } : m))
        toast.success('Medal updated')
      } else {
        const created = await api.createMedal(payload)
        setMedals(prev => [...prev, created as Medal])
        toast.success('Medal created')
      }
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (medal: Medal) => {
    setDeleting(medal.id)
    try {
      await api.deleteMedal(medal.id)
      setMedals(prev => prev.filter(m => m.id !== medal.id))
      toast.success(`"${medal.name}" deleted`)
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const filtered = medals.filter(m => {
    if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false
    if (gradeFilter !== 'ALL' && m.grade !== gradeFilter) return false
    return true
  })

  const activeCount = medals.filter(m => m.isActive).length
  const gradeCounts = GRADES.reduce((acc, g) => {
    acc[g] = medals.filter(m => m.grade === g).length
    return acc
  }, {} as Record<string, number>)

  const inputCls = 'w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500'

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Medals</h1>
          <p className="text-sm text-dark-400 mt-0.5">{medals.length} medal(s) total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Medal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-dark-400 mb-1">Total</p>
          <p className="text-lg font-bold text-white">{medals.length}</p>
          <p className="text-xs text-dark-400">medals</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-green-400 mb-1">Active</p>
          <p className="text-lg font-bold text-white">{activeCount}</p>
          <p className="text-xs text-dark-400">medals</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-red-400 mb-1">SS Grade</p>
          <p className="text-lg font-bold text-white">{gradeCounts.SS ?? 0}</p>
          <p className="text-xs text-dark-400">medals</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-orange-400 mb-1">S Grade</p>
          <p className="text-lg font-bold text-white">{gradeCounts.S ?? 0}</p>
          <p className="text-xs text-dark-400">medals</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {(['ALL', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-400 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {(['ALL', ...GRADES] as const).map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                gradeFilter === g
                  ? 'bg-primary-600 text-white border-primary-500'
                  : `bg-dark-700 border-white/10 text-dark-400 hover:text-white ${g !== 'ALL' ? GRADE_COLORS[g] : ''}`
              }`}
            >
              {g === 'ALL' ? 'All Grades' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <TrophyIcon className="w-10 h-10 text-dark-600" />
            <p className="text-dark-400 text-sm">No medals found</p>
            <button onClick={openCreate} className="text-primary-400 text-sm hover:underline">
              Create first medal
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-dark-400 text-xs">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Grade</th>
                <th className="text-left px-4 py-3">Prestige</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(medal => (
                <tr key={medal.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {medal.imageUrl && (
                        <img src={medal.imageUrl} alt={medal.name} className="w-8 h-8 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="text-white font-medium">{medal.name}</p>
                        {medal.description && (
                          <p className="text-dark-400 text-xs truncate max-w-[200px]">{medal.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-dark-300 text-xs">{medal.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${GRADE_COLORS[medal.grade] ?? 'text-dark-400 bg-dark-600 border-white/10'}`}>
                      {medal.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-purple-400 font-medium">{formatNumber(medal.prestigeValue)}</td>
                  <td className="px-4 py-3">
                    {medal.isPaid ? (
                      <span className="text-amber-400 font-medium">{formatNumber(medal.priceCoins)} coins</span>
                    ) : (
                      <span className="text-dark-400 text-xs">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${medal.isActive ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-dark-400'}`}>
                      {medal.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(medal)}
                        className="p-1.5 text-dark-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(medal)}
                        disabled={deleting === medal.id}
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
        title={editTarget ? `Edit: ${editTarget.name}` : 'Create Medal'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" error={errors.name}>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Champion"
                className={inputCls}
              />
            </FormField>
            <FormField label="Image URL" error={errors.imageUrl}>
              <input
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className={inputCls}
              />
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
            <FormField label="Category">
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className={inputCls}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prestige Value">
              <input
                type="number"
                min="0"
                value={form.prestigeValue}
                onChange={e => setForm(f => ({ ...f, prestigeValue: e.target.value }))}
                className={inputCls}
              />
            </FormField>
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
            <span className="text-sm text-dark-300">Paid Medal</span>
            <Toggle
              checked={form.isPaid}
              onChange={v => setForm(f => ({ ...f, isPaid: v }))}
            />
          </div>
          {form.isPaid && (
            <FormField label="Price (Coins)">
              <input
                type="number"
                min="0"
                value={form.priceCoins}
                onChange={e => setForm(f => ({ ...f, priceCoins: e.target.value }))}
                className={inputCls}
              />
            </FormField>
          )}
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
        title="Delete Medal"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={!!deleting}
      />
    </div>
  )
}

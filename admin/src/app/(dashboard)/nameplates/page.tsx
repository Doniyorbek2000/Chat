'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  IdentificationIcon,
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

interface Nameplate {
  id: string
  name: string
  description?: string
  imageUrl: string
  grade: string
  priceCoins: number
  priceDiamonds: number
  durationDays: number | null
  isPermanent: boolean
  levelRequired: number
  isActive: boolean
  sortOrder: number
}

interface NameplateForm {
  name: string
  description: string
  imageUrl: string
  grade: string
  priceCoins: string
  priceDiamonds: string
  durationDays: string
  isPermanent: boolean
  levelRequired: string
  isActive: boolean
  sortOrder: string
}

const emptyForm = (): NameplateForm => ({
  name: '',
  description: '',
  imageUrl: '',
  grade: 'C',
  priceCoins: '0',
  priceDiamonds: '0',
  durationDays: '30',
  isPermanent: false,
  levelRequired: '0',
  isActive: true,
  sortOrder: '0',
})

export default function NameplatesPage() {
  const [nameplates, setNameplates] = useState<Nameplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Nameplate | null>(null)
  const [form, setForm] = useState<NameplateForm>(emptyForm())
  const [errors, setErrors] = useState<Partial<NameplateForm>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Nameplate | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadNameplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getNameplates()
      const items = (res as any)?.items ?? (res as any)?.data ?? res ?? []
      setNameplates(Array.isArray(items) ? items : [])
    } catch {
      toast.error('Failed to load nameplates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadNameplates() }, [loadNameplates])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (nameplate: Nameplate) => {
    setEditTarget(nameplate)
    setForm({
      name: nameplate.name,
      description: nameplate.description ?? '',
      imageUrl: nameplate.imageUrl,
      grade: nameplate.grade,
      priceCoins: String(nameplate.priceCoins),
      priceDiamonds: String(nameplate.priceDiamonds),
      durationDays: nameplate.durationDays != null ? String(nameplate.durationDays) : '30',
      isPermanent: nameplate.isPermanent,
      levelRequired: String(nameplate.levelRequired),
      isActive: nameplate.isActive,
      sortOrder: String(nameplate.sortOrder),
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const e: Partial<NameplateForm> = {}
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
        grade: form.grade,
        priceCoins: Number(form.priceCoins),
        priceDiamonds: Number(form.priceDiamonds),
        durationDays: form.isPermanent ? null : Number(form.durationDays),
        isPermanent: form.isPermanent,
        levelRequired: Number(form.levelRequired),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      }
      if (editTarget) {
        const updated = await api.updateNameplate(editTarget.id, payload)
        setNameplates(prev => prev.map(n => n.id === editTarget.id ? { ...n, ...(updated as any) } : n))
        toast.success('Nameplate updated')
      } else {
        const created = await api.createNameplate(payload)
        setNameplates(prev => [...prev, created as Nameplate])
        toast.success('Nameplate created')
      }
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (nameplate: Nameplate) => {
    setDeleting(nameplate.id)
    try {
      await api.deleteNameplate(nameplate.id)
      setNameplates(prev => prev.filter(n => n.id !== nameplate.id))
      toast.success(`"${nameplate.name}" deleted`)
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const activeCount = nameplates.filter(n => n.isActive).length

  const inputCls = 'w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500'

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Nameplates</h1>
          <p className="text-sm text-dark-400 mt-0.5">{nameplates.length} nameplate(s) total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Nameplate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-dark-400 mb-1">Total</p>
          <p className="text-lg font-bold text-white">{nameplates.length}</p>
          <p className="text-xs text-dark-400">nameplates</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-green-400 mb-1">Active</p>
          <p className="text-lg font-bold text-white">{activeCount}</p>
          <p className="text-xs text-dark-400">nameplates</p>
        </div>
        <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
          <p className="text-xs font-medium text-dark-400 mb-1">Inactive</p>
          <p className="text-lg font-bold text-white">{nameplates.length - activeCount}</p>
          <p className="text-xs text-dark-400">nameplates</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nameplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <IdentificationIcon className="w-10 h-10 text-dark-600" />
            <p className="text-dark-400 text-sm">No nameplates yet</p>
            <button onClick={openCreate} className="text-primary-400 text-sm hover:underline">
              Create first nameplate
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
                <th className="text-left px-4 py-3">Level Req.</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nameplates.map(nameplate => (
                <tr key={nameplate.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {nameplate.imageUrl && (
                        <img src={nameplate.imageUrl} alt={nameplate.name} className="w-8 h-8 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="text-white font-medium">{nameplate.name}</p>
                        {nameplate.description && (
                          <p className="text-dark-400 text-xs truncate max-w-[200px]">{nameplate.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${GRADE_COLORS[nameplate.grade] ?? 'text-dark-400 bg-dark-600 border-white/10'}`}>
                      {nameplate.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {nameplate.priceCoins > 0 && (
                        <span className="text-amber-400 text-xs">{formatNumber(nameplate.priceCoins)} coins</span>
                      )}
                      {nameplate.priceDiamonds > 0 && (
                        <span className="text-blue-400 text-xs">{formatNumber(nameplate.priceDiamonds)} diamonds</span>
                      )}
                      {nameplate.priceCoins === 0 && nameplate.priceDiamonds === 0 && (
                        <span className="text-dark-400 text-xs">Free</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {nameplate.isPermanent ? (
                      <span className="text-purple-400 text-xs font-medium">Permanent</span>
                    ) : (
                      <span className="text-dark-300 text-xs">{nameplate.durationDays}d</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {nameplate.levelRequired > 0 ? (
                      <span className="text-yellow-400 text-xs font-medium">Lv. {nameplate.levelRequired}+</span>
                    ) : (
                      <span className="text-dark-400 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${nameplate.isActive ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-dark-400'}`}>
                      {nameplate.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(nameplate)}
                        className="p-1.5 text-dark-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(nameplate)}
                        disabled={deleting === nameplate.id}
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
        title={editTarget ? `Edit: ${editTarget.name}` : 'Create Nameplate'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" error={errors.name}>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Golden Frame"
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
          <FormField label="Image URL" error={errors.imageUrl}>
            <input
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
              className={inputCls}
            />
          </FormField>
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
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Level Required (0 = none)">
              <input
                type="number"
                min="0"
                value={form.levelRequired}
                onChange={e => setForm(f => ({ ...f, levelRequired: e.target.value }))}
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
        title="Delete Nameplate"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={!!deleting}
      />
    </div>
  )
}

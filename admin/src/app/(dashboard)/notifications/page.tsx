'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ConfirmModal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

interface NotifCategory {
  id: string
  key: string
  label: string
  icon?: string
  isActive: boolean
  sortOrder: number
}

export default function NotificationsPage() {
  const [categories, setCategories] = useState<NotifCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<NotifCategory | null>(null)
  const [form, setForm] = useState({ key: '', label: '', icon: '', sortOrder: '0', isActive: true })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getNotificationCategories()
      const arr = data?.data ?? data
      setCategories(Array.isArray(arr) ? arr : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ key: '', label: '', icon: '', sortOrder: '0', isActive: true })
    setEditItem(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!form.key || !form.label) return
    setSaving(true)
    try {
      const payload = { key: form.key, label: form.label, icon: form.icon || undefined, sortOrder: parseInt(form.sortOrder) || 0, isActive: form.isActive }
      if (editItem) await api.updateNotificationCategory(editItem.id, payload)
      else await api.createNotificationCategory(payload)
      resetForm()
      load()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget)
    try {
      await api.deleteNotificationCategory(deleteTarget)
      setCategories(c => c.filter(cat => cat.id !== deleteTarget))
      toast.success('Category deleted')
    } catch (e: any) { toast.error(e.message || 'Failed to delete') }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bildirishnoma Kategoriyalari</h1>
          <p className="text-dark-400 text-sm mt-1">Bildirishnoma turlarini boshqarish</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
          <PlusIcon className="w-4 h-4" />Kategoriya qo'shish
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-200 rounded-xl border border-white/5 p-6">
          <h3 className="text-white font-semibold mb-4">{editItem ? 'Tahrirlash' : 'Yangi kategoriya'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-dark-400 text-xs mb-1 block">Kalit (key) *</label>
              <input value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value }))} placeholder="friend_request" disabled={!!editItem} className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="text-dark-400 text-xs mb-1 block">Label *</label>
              <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Do'stlik taklifi" className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-dark-400 text-xs mb-1 block">Icon (emoji)</label>
              <input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="👥" className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-dark-400 text-xs mb-1 block">Tartib raqami</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))} className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-3">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-dark-300 text-sm">Faol</span>
          </label>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} disabled={saving || !form.key || !form.label} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saqlanmoqda...' : editItem ? 'Yangilash' : 'Yaratish'}</button>
            <button onClick={resetForm} className="px-4 py-2 bg-surface-300 text-dark-300 rounded-lg text-sm hover:text-white">Bekor qilish</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-dark-400">Kategoriya topilmadi</div>
      ) : (
        <div className="bg-surface-200 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Icon', 'Label', 'Kalit', 'Tartib', 'Status', ''].map(h => <th key={h} className="text-left text-dark-400 text-xs font-medium px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-4 py-3 text-xl">{cat.icon ?? '🔔'}</td>
                  <td className="px-4 py-3 text-white font-medium text-sm">{cat.label}</td>
                  <td className="px-4 py-3"><span className="font-mono text-dark-300 text-xs bg-surface-300 px-2 py-0.5 rounded">{cat.key}</span></td>
                  <td className="px-4 py-3 text-dark-400 text-sm">{cat.sortOrder}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.isActive ? 'bg-green-400/10 text-green-400' : 'bg-surface-300 text-dark-400'}`}>{cat.isActive ? 'Faol' : 'Nofaol'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditItem(cat); setForm({ key: cat.key, label: cat.label, icon: cat.icon ?? '', sortOrder: String(cat.sortOrder), isActive: cat.isActive }); setShowForm(true) }} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-white/5"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(cat.id)} disabled={deletingId === cat.id} className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this notification category?"
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={!!deletingId}
      />
    </div>
  )
}

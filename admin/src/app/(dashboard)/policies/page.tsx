'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

interface Policy {
  id: string
  slug: string
  title: string
  language: string
  version: string
  content: string
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  slug: '',
  title: '',
  language: 'uz',
  version: '1.0',
  content: '',
  isPublished: false,
}

const langColors: Record<string, string> = {
  uz: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ru: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  en: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.adminGetPolicies()
      const result = data?.data ?? data
      setPolicies(result?.items ?? (Array.isArray(result) ? result : []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  const openCreate = () => {
    setEditingPolicy(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (policy: Policy) => {
    setEditingPolicy(policy)
    setForm({
      slug: policy.slug,
      title: policy.title,
      language: policy.language,
      version: policy.version,
      content: policy.content,
      isPublished: policy.isPublished,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingPolicy) {
        await api.adminUpdatePolicy(editingPolicy.id, form)
      } else {
        await api.adminCreatePolicy(form)
      }
      setModalOpen(false)
      loadPolicies()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async (policy: Policy) => {
    setProcessingId(policy.id)
    try {
      if (policy.isPublished) {
        await api.adminUnpublishPolicy(policy.id)
      } else {
        await api.adminPublishPolicy(policy.id)
      }
      loadPolicies()
    } catch (e) {
      console.error(e)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.adminDeletePolicy(deleteTarget.id)
      setDeleteTarget(null)
      loadPolicies()
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Siyosatlar</h1>
          <p className="text-dark-400 text-sm mt-1">Policy sahifalarini boshqarish</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Yangi siyosat
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-12 text-dark-400">Siyosat topilmadi</div>
      ) : (
        <div className="bg-surface-200 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Slug', 'Sarlavha', 'Til', 'Versiya', 'Holat', 'Nashr sanasi', 'Amallar'].map(h => (
                  <th key={h} className="text-left text-dark-400 text-xs font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.map(policy => (
                <tr key={policy.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-4 py-3">
                    <span className="font-mono text-primary-400 text-sm bg-primary-600/10 px-2 py-0.5 rounded">
                      {policy.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white text-sm font-medium">{policy.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border uppercase ${langColors[policy.language] ?? 'text-dark-400 bg-surface-300 border-white/5'}`}>
                      {policy.language}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-300 text-sm">{policy.version}</td>
                  <td className="px-4 py-3">
                    {policy.isPublished ? (
                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium border text-green-400 bg-green-400/10 border-green-400/20">
                        Nashr qilingan
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium border text-dark-400 bg-surface-300 border-white/5">
                        Qoralama
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-xs">
                    {policy.publishedAt ? new Date(policy.publishedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePublishToggle(policy)}
                        disabled={processingId === policy.id}
                        title={policy.isPublished ? 'Nashrdan olish' : 'Nashr qilish'}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          policy.isPublished
                            ? 'text-yellow-400 hover:bg-yellow-400/10'
                            : 'text-green-400 hover:bg-green-400/10'
                        }`}
                      >
                        {policy.isPublished ? (
                          <XCircleIcon className="w-4 h-4" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(policy)}
                        className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(policy)}
                        className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-200 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <h2 className="text-white font-bold text-lg">
              {editingPolicy ? 'Siyosatni tahrirlash' : 'Yangi siyosat yaratish'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-dark-400 text-xs mb-1 block">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                  placeholder="privacy-policy"
                  className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="text-dark-400 text-xs mb-1 block">Sarlavha</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Maxfiylik siyosati"
                  className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="text-dark-400 text-xs mb-1 block">Til</label>
                <select
                  value={form.language}
                  onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="uz">O'zbek (uz)</option>
                  <option value="ru">Русский (ru)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
              <div>
                <label className="text-dark-400 text-xs mb-1 block">Versiya</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                  placeholder="1.0"
                  className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="text-dark-400 text-xs mb-1 block">Mazmun</label>
              <textarea
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                rows={10}
                placeholder="Siyosat mazmunini kiriting..."
                className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 resize-y min-h-[200px]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-dark-300 text-sm">Nashr qilish</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.slug || !form.title}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 bg-surface-300 text-dark-300 hover:text-white rounded-lg text-sm transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-200 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-5">
            <h2 className="text-white font-bold text-lg">Siyosatni o'chirish</h2>
            <p className="text-dark-300 text-sm">
              <span className="font-mono text-primary-400">{deleteTarget.slug}</span> siyosatini o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {deleting ? "O'chirilmoqda..." : "O'chirish"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2 bg-surface-300 text-dark-300 hover:text-white rounded-lg text-sm transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

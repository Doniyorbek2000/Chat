'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Toggle from '@/components/ui/Toggle'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

const TIER_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  PRINCE:    { label: 'Shahzoda',  color: 'text-yellow-400',  badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  NOBLE:     { label: 'Olijanob', color: 'text-purple-400',  badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  RULER:     { label: 'Hukmdor', color: 'text-red-400',     badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  PRESIDENT: { label: 'Prezident', color: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

interface NoblePlan {
  id: string
  tier: string
  name: string
  monthlyPriceCoins: number
  monthlyPriceDiamonds: number
  dailyCoins: number
  expBoostPercent: number
  giftDiscountPercent: number
  badgeUrl?: string
  coloredNameStyle?: string
  isActive: boolean
  sortOrder: number
}

interface PlanForm {
  tier: string
  name: string
  monthlyPriceCoins: string
  monthlyPriceDiamonds: string
  dailyCoins: string
  expBoostPercent: string
  giftDiscountPercent: string
  coloredNameStyle: string
  isActive: boolean
  sortOrder: string
}

const emptyForm = (): PlanForm => ({
  tier: 'PRINCE',
  name: '',
  monthlyPriceCoins: '0',
  monthlyPriceDiamonds: '0',
  dailyCoins: '0',
  expBoostPercent: '0',
  giftDiscountPercent: '0',
  coloredNameStyle: '',
  isActive: true,
  sortOrder: '0',
})

export default function NoblePage() {
  const [plans, setPlans] = useState<NoblePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<NoblePlan | null>(null)
  const [form, setForm] = useState<PlanForm>(emptyForm())
  const [errors, setErrors] = useState<Partial<PlanForm>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<NoblePlan | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getNoblePlans()
      const items = (res as any)?.items ?? (res as any)?.data ?? res ?? []
      setPlans(Array.isArray(items) ? items : [])
    } catch {
      toast.error('Failed to load noble plans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (plan: NoblePlan) => {
    setEditTarget(plan)
    setForm({
      tier: plan.tier,
      name: plan.name,
      monthlyPriceCoins: String(plan.monthlyPriceCoins),
      monthlyPriceDiamonds: String(plan.monthlyPriceDiamonds),
      dailyCoins: String(plan.dailyCoins),
      expBoostPercent: String(plan.expBoostPercent),
      giftDiscountPercent: String(plan.giftDiscountPercent),
      coloredNameStyle: plan.coloredNameStyle ?? '',
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder),
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const e: Partial<PlanForm> = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (isNaN(Number(form.monthlyPriceCoins)) || Number(form.monthlyPriceCoins) < 0)
      e.monthlyPriceCoins = 'Valid number required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        tier: form.tier,
        name: form.name.trim(),
        monthlyPriceCoins: Number(form.monthlyPriceCoins),
        monthlyPriceDiamonds: Number(form.monthlyPriceDiamonds),
        dailyCoins: Number(form.dailyCoins),
        expBoostPercent: Number(form.expBoostPercent),
        giftDiscountPercent: Number(form.giftDiscountPercent),
        coloredNameStyle: form.coloredNameStyle.trim(),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      }
      if (editTarget) {
        const updated = await api.updateNoblePlan(editTarget.id, payload)
        setPlans(prev => prev.map(p => p.id === editTarget.id ? { ...p, ...(updated as any) } : p))
        toast.success('Plan updated')
      } else {
        const created = await api.createNoblePlan(payload)
        setPlans(prev => [...prev, created as NoblePlan])
        toast.success('Plan created')
      }
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plan: NoblePlan) => {
    setDeleting(plan.id)
    try {
      await api.deleteNoblePlan(plan.id)
      setPlans(prev => prev.filter(p => p.id !== plan.id))
      toast.success(`"${plan.name}" deleted`)
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const totalSubscribers = plans.reduce((s) => s + 0, 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Noble Plans</h1>
          <p className="text-sm text-dark-400 mt-0.5">{plans.length} tier(s) configured</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(TIER_CONFIG).map(([tier, cfg]) => {
          const plan = plans.find(p => p.tier === tier)
          return (
            <div key={tier} className="bg-dark-800 border border-white/5 rounded-xl p-4">
              <p className={`text-xs font-medium ${cfg.color} mb-1`}>{cfg.label}</p>
              <p className="text-lg font-bold text-white">
                {plan ? formatNumber(plan.monthlyPriceCoins) : '—'}
              </p>
              <p className="text-xs text-dark-400">coins/month</p>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <StarIcon className="w-10 h-10 text-dark-600" />
            <p className="text-dark-400 text-sm">No noble plans yet</p>
            <button onClick={openCreate} className="text-primary-400 text-sm hover:underline">
              Create first plan
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-dark-400 text-xs">
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Price / mo</th>
                <th className="text-left px-4 py-3">Daily Coins</th>
                <th className="text-left px-4 py-3">EXP Boost</th>
                <th className="text-left px-4 py-3">Gift Discount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => {
                const cfg = TIER_CONFIG[plan.tier] ?? { label: plan.tier, color: 'text-white', badge: 'bg-dark-600 text-white border-white/10' }
                return (
                  <tr key={plan.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="text-white font-medium">{plan.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-amber-400 font-medium">{formatNumber(plan.monthlyPriceCoins)}</td>
                    <td className="px-4 py-3 text-dark-300">{formatNumber(plan.dailyCoins)}</td>
                    <td className="px-4 py-3 text-green-400">+{plan.expBoostPercent}%</td>
                    <td className="px-4 py-3 text-blue-400">-{plan.giftDiscountPercent}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${plan.isActive ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-dark-400'}`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(plan)}
                          className="p-1.5 text-dark-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(plan)}
                          disabled={deleting === plan.id}
                          className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Edit: ${editTarget.name}` : 'Create Noble Plan'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tier" error={errors.tier}>
              <select
                value={form.tier}
                onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                disabled={!!editTarget}
              >
                {Object.entries(TIER_CONFIG).map(([t, c]) => (
                  <option key={t} value={t}>{c.label} ({t})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Name" error={errors.name}>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Shahzoda"
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Monthly Price (Coins)" error={errors.monthlyPriceCoins}>
              <input
                type="number"
                min="0"
                value={form.monthlyPriceCoins}
                onChange={e => setForm(f => ({ ...f, monthlyPriceCoins: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
            <FormField label="Monthly Price (Diamonds)">
              <input
                type="number"
                min="0"
                value={form.monthlyPriceDiamonds}
                onChange={e => setForm(f => ({ ...f, monthlyPriceDiamonds: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Daily Coins">
              <input
                type="number"
                min="0"
                value={form.dailyCoins}
                onChange={e => setForm(f => ({ ...f, dailyCoins: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
            <FormField label="EXP Boost (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={form.expBoostPercent}
                onChange={e => setForm(f => ({ ...f, expBoostPercent: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
            <FormField label="Gift Discount (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={form.giftDiscountPercent}
                onChange={e => setForm(f => ({ ...f, giftDiscountPercent: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name Style (CSS class)">
              <input
                value={form.coloredNameStyle}
                onChange={e => setForm(f => ({ ...f, coloredNameStyle: e.target.value }))}
                placeholder="e.g. gradient-gold"
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
            <FormField label="Sort Order">
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </FormField>
          </div>
          <div className="flex items-center justify-between py-2">
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
        title="Delete Noble Plan"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={!!deleting}
      />
    </div>
  )
}

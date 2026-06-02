'use client'

import { useState, useEffect } from 'react'
import { PencilSquareIcon, StarIcon, UsersIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/ui/Modal'
import Toggle from '@/components/ui/Toggle'
import FormField from '@/components/ui/FormField'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import type { VIPPlan } from '@/types'
import toast from 'react-hot-toast'

const vipColors: Record<number, { bg: string; border: string; badge: string; text: string }> = {
  1:  { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-400',    text: 'text-blue-400' },
  2:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  badge: 'bg-green-500/20 text-green-400',  text: 'text-green-400' },
  3:  { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-400',text: 'text-yellow-400' },
  4:  { bg: 'bg-orange-500/10', border: 'border-orange-500/20', badge: 'bg-orange-500/20 text-orange-400',text: 'text-orange-400' },
  5:  { bg: 'bg-red-500/10',    border: 'border-red-500/20',    badge: 'bg-red-500/20 text-red-400',      text: 'text-red-400' },
  6:  { bg: 'bg-pink-500/10',   border: 'border-pink-500/20',   badge: 'bg-pink-500/20 text-pink-400',    text: 'text-pink-400' },
  7:  { bg: 'bg-purple-500/10', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-400',text: 'text-purple-400' },
  8:  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', badge: 'bg-indigo-500/20 text-indigo-400',text: 'text-indigo-400' },
  9:  { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   badge: 'bg-cyan-500/20 text-cyan-400',    text: 'text-cyan-400' },
  10: { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  badge: 'bg-amber-500/20 text-amber-400',  text: 'text-amber-400' },
}

const vipNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby', 'Sapphire', 'Emerald', 'Crystal', 'Legend']

const mockPlans: (VIPPlan & { subscribers: number })[] = Array.from({ length: 10 }, (_, i) => ({
  id: `vip-${i + 1}`,
  level: i + 1,
  name: `VIP ${vipNames[i]}`,
  priceMonthly: [500, 1200, 2500, 5000, 10000, 20000, 35000, 60000, 90000, 150000][i],
  priceYearly: [5000, 12000, 25000, 50000, 100000, 200000, 350000, 600000, 900000, 1500000][i],
  benefits: [
    { type: 'frame', value: `frame_vip${i + 1}`, description: 'Exclusive avatar frame' },
    { type: 'badge', value: `badge_vip${i + 1}`, description: 'VIP badge in chat' },
    { type: 'gift_bonus', value: (i + 1) * 5, description: `${(i + 1) * 5}% gift bonus` },
  ],
  color: ['#3b82f6','#22c55e','#eab308','#f97316','#ef4444','#ec4899','#a855f7','#6366f1','#06b6d4','#f59e0b'][i],
  isActive: true,
  subscribers: Math.floor(Math.random() * 5000) + 200,
}))

interface EditForm {
  priceMonthly: string
  priceYearly: string
  benefits: string
  frameUrl: string
  isActive: boolean
}

export default function VipPage() {
  const [plans, setPlans] = useState(mockPlans)
  const [editTarget, setEditTarget] = useState<(typeof mockPlans)[0] | null>(null)
  const [form, setForm] = useState<EditForm>({ priceMonthly: '', priceYearly: '', benefits: '', frameUrl: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<EditForm>>({})

  const totalSubscribers = plans.reduce((s, p) => s + p.subscribers, 0)
  const totalRevenue = plans.reduce((s, p) => s + p.subscribers * p.priceMonthly, 0)

  const openEdit = (plan: typeof mockPlans[0]) => {
    setEditTarget(plan)
    setForm({
      priceMonthly: String(plan.priceMonthly),
      priceYearly: String(plan.priceYearly),
      benefits: plan.benefits.map(b => b.description).join('\n'),
      frameUrl: plan.frameUrl || '',
      isActive: plan.isActive,
    })
    setErrors({})
  }

  const validate = () => {
    const e: Partial<EditForm> = {}
    if (!form.priceMonthly || isNaN(Number(form.priceMonthly))) e.priceMonthly = 'Valid number required'
    if (!form.priceYearly || isNaN(Number(form.priceYearly))) e.priceYearly = 'Valid number required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!editTarget || !validate()) return
    setSaving(true)
    try {
      await api.updateVIPPlan(editTarget.id, {
        priceMonthly: Number(form.priceMonthly),
        priceYearly: Number(form.priceYearly),
        frameUrl: form.frameUrl || undefined,
        isActive: form.isActive,
      })
      setPlans(prev => prev.map(p =>
        p.id === editTarget.id
          ? { ...p, priceMonthly: Number(form.priceMonthly), priceYearly: Number(form.priceYearly), frameUrl: form.frameUrl || undefined, isActive: form.isActive }
          : p
      ))
      toast.success(`VIP ${editTarget.name} updated successfully`)
      setEditTarget(null)
    } catch {
      toast.error('Failed to update VIP plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Global Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatNumber(totalSubscribers)}</p>
              <p className="text-[#737373] text-sm">Total VIP Subscribers</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatNumber(totalRevenue)} 🪙</p>
              <p className="text-[#737373] text-sm">Total VIP Revenue (Monthly)</p>
            </div>
          </div>
        </div>
      </div>

      {/* VIP Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {plans.map((plan) => {
          const colors = vipColors[plan.level]
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-5 transition-all duration-200 hover:scale-[1.02] ${colors.bg} ${colors.border} ${!plan.isActive ? 'opacity-50' : ''}`}
            >
              {/* Level Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}>
                  ★ {plan.level}
                </span>
                <button
                  onClick={() => openEdit(plan)}
                  className={`p-1.5 rounded-lg ${colors.text} hover:bg-white/10 transition-all`}
                  title="Edit"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-white font-semibold text-lg mb-1">{plan.name}</h4>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] text-xs">Monthly</span>
                  <span className={`text-sm font-bold ${colors.text}`}>{formatNumber(plan.priceMonthly)} 🪙</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] text-xs">Yearly</span>
                  <span className={`text-sm font-bold ${colors.text}`}>{formatNumber(plan.priceYearly)} 🪙</span>
                </div>
              </div>

              <div className={`pt-3 border-t ${colors.border}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] text-xs">Subscribers</span>
                  <span className="text-white text-sm font-bold">{formatNumber(plan.subscribers)}</span>
                </div>
              </div>

              {!plan.isActive && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                  <span className="text-white text-xs font-medium bg-black/60 px-3 py-1 rounded-full">Inactive</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit ${editTarget?.name}`}
        size="md"
      >
        {editTarget && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Monthly Price (Coins)" required error={errors.priceMonthly}>
                <input
                  type="number"
                  value={form.priceMonthly}
                  onChange={(e) => setForm(f => ({ ...f, priceMonthly: e.target.value }))}
                  className="input"
                  placeholder="e.g. 2500"
                />
              </FormField>
              <FormField label="Yearly Price (Coins)" required error={errors.priceYearly}>
                <input
                  type="number"
                  value={form.priceYearly}
                  onChange={(e) => setForm(f => ({ ...f, priceYearly: e.target.value }))}
                  className="input"
                  placeholder="e.g. 25000"
                />
              </FormField>
            </div>
            <FormField label="Benefits" hint="One benefit per line">
              <textarea
                value={form.benefits}
                onChange={(e) => setForm(f => ({ ...f, benefits: e.target.value }))}
                rows={4}
                className="input resize-none"
                placeholder="Exclusive avatar frame&#10;VIP badge in chat&#10;10% gift bonus"
              />
            </FormField>
            <FormField label="Frame URL" hint="Avatar frame image URL for this VIP level">
              <input
                type="url"
                value={form.frameUrl}
                onChange={(e) => setForm(f => ({ ...f, frameUrl: e.target.value }))}
                className="input"
                placeholder="https://cdn.voxo.app/frames/vip1.png"
              />
            </FormField>
            <div className="flex items-center justify-between pt-2">
              <Toggle
                checked={form.isActive}
                onChange={(val) => setForm(f => ({ ...f, isActive: val }))}
                label="Active"
                description="Show this VIP level to users"
              />
              <div className="flex gap-3">
                <button onClick={() => setEditTarget(null)} className="btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

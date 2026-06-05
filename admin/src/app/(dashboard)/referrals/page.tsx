'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PencilIcon } from '@heroicons/react/24/outline'

interface ReferralRelation {
  id: string
  createdAt: string
  isSuspicious: boolean
  referrer: { id: string; displayName: string }
  referee: { id: string; displayName: string }
  code: { code: string }
  rewards: Array<{ coins: number; isPaid: boolean }>
}

interface RebateRule {
  id: string
  level: number
  rebatePercent: number
  minRechargeUSD: number
  isActive: boolean
}

export default function ReferralsPage() {
  const [activeTab, setActiveTab] = useState<'relations' | 'rules'>('relations')
  const [relations, setRelations] = useState<ReferralRelation[]>([])
  const [rules, setRules] = useState<RebateRule[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [editRule, setEditRule] = useState<RebateRule | null>(null)
  const [ruleForm, setRuleForm] = useState({ rebatePercent: '', isActive: true })
  const [saving, setSaving] = useState(false)

  const loadRelations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getAdminReferrals({ page: 1, limit: 20 })
      const result = data?.data ?? data
      setRelations(result?.items ?? (Array.isArray(result) ? result : []))
      setTotal(result?.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getReferralRules()
      setRules(Array.isArray(data?.data ?? data) ? (data?.data ?? data) : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'relations') loadRelations()
    else loadRules()
  }, [activeTab, loadRelations, loadRules])

  const handleSaveRule = async () => {
    if (!editRule) return
    setSaving(true)
    try {
      await api.updateReferralRule(editRule.id, {
        rebatePercent: parseFloat(ruleForm.rebatePercent),
        isActive: ruleForm.isActive,
      })
      setEditRule(null)
      loadRules()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Referral Management</h1>
          <p className="text-dark-400 text-sm mt-1">Taklif munosabatlari va rebate qoidalari</p>
        </div>
        <div className="bg-surface-200 rounded-xl border border-white/5 px-4 py-2 text-center">
          <p className="text-dark-400 text-xs">Jami</p>
          <p className="text-white font-bold text-xl">{total}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5">
        {(['relations', 'rules'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? 'text-primary-400 border-b-2 border-primary-400' : 'text-dark-400 hover:text-white'
            }`}
          >
            {tab === 'relations' ? 'Munosabatlar' : 'Rebate Qoidalar'}
          </button>
        ))}
      </div>

      {activeTab === 'relations' && (
        loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : relations.length === 0 ? (
          <div className="text-center py-12 text-dark-400">Referral munosabati topilmadi</div>
        ) : (
          <div className="bg-surface-200 rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Taklif qiluvchi', 'Taklif qilingan', 'Kod', 'Mukofot', 'Sana', 'Status'].map(h => (
                    <th key={h} className="text-left text-dark-400 text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relations.map(rel => {
                  const totalCoins = rel.rewards.reduce((s, r) => s + r.coins, 0)
                  return (
                    <tr key={rel.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                      <td className="px-4 py-3 text-white text-sm font-medium">{rel.referrer.displayName}</td>
                      <td className="px-4 py-3 text-white text-sm">{rel.referee.displayName}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-primary-400 text-sm bg-primary-600/10 px-2 py-0.5 rounded">{rel.code.code}</span>
                      </td>
                      <td className="px-4 py-3 text-amber-400 text-sm font-medium">{totalCoins} 💰</td>
                      <td className="px-4 py-3 text-dark-400 text-xs">{new Date(rel.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {rel.isSuspicious && (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">Shubhali</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-dark-400">Qoida topilmadi</div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="bg-surface-200 rounded-xl border border-white/5 p-4">
                {editRule?.id === rule.id ? (
                  <div className="space-y-3">
                    <p className="text-white font-semibold">Level {rule.level} Rebate qoidasini tahrirlash</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-dark-400 text-xs mb-1 block">Rebate % (recharge summasidan)</label>
                        <input
                          type="number"
                          value={ruleForm.rebatePercent}
                          onChange={e => setRuleForm(p => ({ ...p, rebatePercent: e.target.value }))}
                          step="0.5" min="0" max="100"
                          className="w-full bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ruleForm.isActive}
                            onChange={e => setRuleForm(p => ({ ...p, isActive: e.target.checked }))}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-dark-300 text-sm">Faol</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveRule} disabled={saving}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
                        {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                      </button>
                      <button onClick={() => setEditRule(null)}
                        className="px-4 py-2 bg-surface-300 text-dark-300 rounded-lg text-sm hover:text-white">
                        Bekor qilish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold">
                        L{rule.level}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          Level {rule.level} — {rule.level === 1 ? "To'g'ridan do'st" : "Do'stning do'sti"}
                        </p>
                        <p className="text-dark-400 text-sm">{rule.rebatePercent}% · Min ${rule.minRechargeUSD}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${rule.isActive ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-dark-400 bg-surface-300 border-white/5'}`}>
                        {rule.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                      <button
                        onClick={() => { setEditRule(rule); setRuleForm({ rebatePercent: String(rule.rebatePercent), isActive: rule.isActive }) }}
                        className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-white/5"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

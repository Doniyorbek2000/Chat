'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldExclamationIcon, ArrowPathIcon, FlagIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

const RISK_EVENT_TYPES = ['MULTI_ACCOUNT', 'SELF_REFERRAL', 'CIRCULAR_GIFT', 'GIFT_SPAM', 'SUSPICIOUS_WITHDRAWAL', 'DEVICE_FRAUD', 'IP_FRAUD', 'WEBHOOK_REPLAY']

export default function RiskDashboardPage() {
  const [tab, setTab] = useState<'events' | 'users' | 'rules'>('events')
  const [events, setEvents] = useState<any[]>([])
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ev, fu, rl] = await Promise.all([
        api.getRiskEvents({ eventType: filterType || undefined, page, limit: 20 }),
        api.getFlaggedUsers({ page: 1, limit: 20 }),
        api.getRiskRules(),
      ])
      setEvents((ev?.data ?? ev) as any[])
      setFlaggedUsers((fu?.data ?? fu) as any[])
      setRules(Array.isArray(rl?.data ?? rl) ? (rl?.data ?? rl) : [])
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [filterType, page])

  useEffect(() => { load() }, [load])

  const handleFlag = async (userId: string, isFlagged: boolean) => {
    setActionLoading(userId)
    try {
      if (isFlagged) await api.clearUser(userId)
      else await api.flagUser(userId)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleRule = async (ruleId: string) => {
    setActionLoading(ruleId)
    try {
      await api.toggleRiskRule(ruleId)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const riskLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-green-500/20 text-green-400',
      MEDIUM: 'bg-yellow-500/20 text-yellow-400',
      HIGH: 'bg-orange-500/20 text-orange-400',
      CRITICAL: 'bg-red-500/20 text-red-400',
    }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors[level] ?? 'bg-white/10 text-white'}`}>{level}</span>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Risk Boshqarish</h1>
          <p className="text-[#737373] text-sm mt-0.5">Firibgarlik aniqlash, bayroqlangan foydalanuvchilar va qoidalar</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white transition-all">
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit border border-white/10">
        {[['events', 'Voqealar'], ['users', 'Bayroqlangan Foydalanuvchilar'], ['rules', 'Qoidalar']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-4 py-2 text-sm rounded-md transition-all ${tab === k ? 'bg-[#7C3AED] text-white font-medium' : 'text-[#737373] hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-14 bg-white/5 rounded-xl" />)}</div>
      ) : tab === 'events' ? (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex gap-3 flex-wrap">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field text-sm py-1.5 px-3 w-auto">
              <option value="">Barcha turlari</option>
              {RISK_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Foydalanuvchi', 'Turi', 'Ball', 'Daraja', 'Vaqt'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-[#737373] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Array.isArray(events) ? events : []).map((e: any, i: number) => (
                  <tr key={e.id ?? i} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="text-white text-sm">{e.user?.displayName ?? '—'}</p>
                      <p className="text-[#737373] text-xs">@{e.user?.uid ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-orange-400 font-mono">{e.eventType}</td>
                    <td className="px-5 py-3 text-sm text-white">{e.scoreDelta ?? 0}</td>
                    <td className="px-5 py-3">{e.riskLevel ? riskLevelBadge(e.riskLevel) : '—'}</td>
                    <td className="px-5 py-3 text-[#737373] text-xs">{e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'users' ? (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Foydalanuvchi', 'Risk Balli', 'Daraja', 'Bayroqlangan', 'Amal'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-[#737373] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Array.isArray(flaggedUsers) ? flaggedUsers : []).map((u: any, i: number) => (
                  <tr key={u.id ?? i} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="text-white text-sm">{u.user?.displayName ?? u.displayName ?? '—'}</p>
                      <p className="text-[#737373] text-xs">@{u.user?.uid ?? u.uid ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-red-400 font-bold">{u.score ?? 0}</td>
                    <td className="px-5 py-3">{riskLevelBadge(u.level ?? 'LOW')}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.isFlagged ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {u.isFlagged ? 'Bayroqlangan' : 'Tozalangan'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleFlag(u.userId ?? u.id, u.isFlagged)}
                        disabled={actionLoading === (u.userId ?? u.id)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${u.isFlagged ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'}`}
                      >
                        {actionLoading === (u.userId ?? u.id) ? '...' : u.isFlagged ? 'Tozalash' : 'Bayroqlash'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Qoida Nomi', 'Turi', 'Daraja Yangilash', 'Holat', 'Amal'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-[#737373] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rules.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="text-white text-sm font-medium">{r.name}</p>
                      {r.description && <p className="text-[#737373] text-xs">{r.description}</p>}
                    </td>
                    <td className="px-5 py-3 text-orange-400 text-sm font-mono">{r.eventType}</td>
                    <td className="px-5 py-3 text-red-400 font-bold">+{r.scoreDelta}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-[#737373]'}`}>
                        {r.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleRule(r.id)}
                        disabled={actionLoading === r.id}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                      >
                        {actionLoading === r.id ? '...' : r.isActive ? "O'chirish" : 'Yoqish'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

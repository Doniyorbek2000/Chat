'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

const PERIODS = [
  { key: 'weekly', label: 'Haftalik' },
  { key: 'monthly', label: 'Oylik' },
  { key: 'all', label: 'Barcha vaqt' },
]

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  ROOKIE: { label: '🌱 Yangi', color: 'text-green-400' },
  BRONZE: { label: '🥉 Bronza', color: 'text-orange-400' },
  SILVER: { label: '🥈 Kumush', color: 'text-slate-300' },
  GOLD: { label: '🥇 Oltin', color: 'text-yellow-400' },
  PLATINUM: { label: '💿 Platina', color: 'text-cyan-400' },
  DIAMOND: { label: '💎 Olmos', color: 'text-blue-400' },
  LEGEND: { label: '👑 Afsonaviy', color: 'text-purple-400' },
}

export default function HostsPage() {
  const [ranking, setRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('weekly')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getHostRanking(period, 50)
      const data = res?.data ?? res
      setRanking(Array.isArray(data?.ranking ?? data) ? (data?.ranking ?? data) : [])
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Host Reytingi</h1>
          <p className="text-[#737373] text-sm mt-0.5">XP, daraja va sovg&apos;a qiymati bo&apos;yicha eng yaxshi hostlar</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white">
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Period selector */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit border border-white/10">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-4 py-2 text-sm rounded-md transition-all ${period === p.key ? 'bg-[#7C3AED] text-white font-medium' : 'text-[#737373] hover:text-white'}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="animate-pulse h-14 bg-white/5 rounded" />)}</div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-16 text-[#737373]">Reyting ma&apos;lumoti topilmadi</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['#', 'Host', 'Daraja', 'XP', "Sovg'a Qiymati", 'Efir Daqiqalari', 'Izdoshlar'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-[#737373] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ranking.map((h: any, i: number) => {
                  const tier = h.tier ?? 'ROOKIE'
                  const tierInfo = TIER_LABELS[tier] ?? { label: tier, color: 'text-white' }
                  return (
                    <tr key={h.id ?? i} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        {i < 3 ? (
                          <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                        ) : (
                          <span className="text-[#737373] text-sm font-medium">#{i + 1}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-white text-sm font-medium">{h.user?.displayName ?? '—'}</p>
                        <p className="text-[#737373] text-xs">@{h.user?.uid ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-semibold ${tierInfo.color}`}>{tierInfo.label}</span>
                        <span className="text-[#737373] text-xs ml-2">Lv.{h.level ?? 1}</span>
                      </td>
                      <td className="px-5 py-3.5 text-purple-400 font-semibold text-sm">{(h.xp ?? 0).toLocaleString()} XP</td>
                      <td className="px-5 py-3.5 text-yellow-400 font-semibold text-sm">{h.totalGiftValue ?? '0'}</td>
                      <td className="px-5 py-3.5 text-[#737373] text-sm">{(h.totalLiveMinutes ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-[#737373] text-sm">{(h.totalFollowers ?? 0).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

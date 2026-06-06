'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UsersIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import StatsCard from '@/components/ui/StatsCard'
import { ChartCard, VoxoAreaChart } from '@/components/ui/Chart'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'

export default function GrowthDashboardPage() {
  const [summary, setSummary] = useState<any>(null)
  const [retention, setRetention] = useState<any>(null)
  const [revenueChart, setRevenueChart] = useState<any[]>([])
  const [topHosts, setTopHosts] = useState<any[]>([])
  const [riskSummary, setRiskSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, r, rc, th, risk] = await Promise.all([
        api.getGrowthSummary(from, to),
        api.getGrowthRetention(),
        api.getGrowthRevenueChart(from, to, 'day'),
        api.getGrowthTopHosts(period, 10),
        api.getAdminRiskSummary(),
      ])
      setSummary(s?.data ?? s)
      setRetention(r?.data ?? r)
      setRevenueChart(Array.isArray(rc?.data ?? rc) ? (rc?.data ?? rc) : [])
      setTopHosts(Array.isArray(th?.data ?? th) ? (th?.data ?? th) : [])
      setRiskSummary(risk?.data ?? risk)
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
          <h1 className="text-2xl font-bold text-white">O&apos;sish Paneli</h1>
          <p className="text-[#737373] text-sm mt-0.5">DAU, retention, daromad va top hostlar</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white transition-all">
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Yangi Foydalanuvchilar" value={formatNumber(summary?.newUsers ?? 0)} icon={UsersIcon} iconColor="text-purple-400" iconBg="bg-purple-600/20" loading={loading} />
        <StatsCard title="To'lovchi Foydalanuvchilar" value={formatNumber(summary?.payingUsers ?? 0)} icon={CurrencyDollarIcon} iconColor="text-green-400" iconBg="bg-green-600/20" description={`ARPPU: ${formatNumber(summary?.arppu ?? 0)}`} loading={loading} />
        <StatsCard title="Jami Daromad" value={`${formatNumber(summary?.totalRevenue ?? 0)}`} icon={ChartBarIcon} iconColor="text-blue-400" iconBg="bg-blue-600/20" description={`${formatNumber(summary?.giftsCount ?? 0)} sovg'a`} loading={loading} />
        <StatsCard title="Efir Daqiqalari" value={formatNumber(summary?.liveMinutes ?? 0)} icon={ClockIcon} iconColor="text-yellow-400" iconBg="bg-yellow-600/20" description={`${summary?.activeRooms ?? 0} faol xona`} loading={loading} />
      </div>

      {/* Retention */}
      {retention && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'D1 Retention', value: `${retention.d1Rate?.toFixed(1) ?? 0}%`, sub: `${retention.d1Active ?? 0}/${retention.d1Total ?? 0}`, color: 'purple' },
            { label: 'D7 Retention', value: `${retention.d7Rate?.toFixed(1) ?? 0}%`, sub: `${retention.d7Active ?? 0}/${retention.d7Total ?? 0}`, color: 'blue' },
            { label: 'D30 Retention', value: `${retention.d30Rate?.toFixed(1) ?? 0}%`, sub: `${retention.d30Active ?? 0}/${retention.d30Total ?? 0}`, color: 'green' },
          ].map((r) => (
            <div key={r.label} className="card p-5">
              <p className="text-[#737373] text-sm">{r.label}</p>
              <p className={`text-2xl font-bold text-${r.color}-400 mt-1`}>{r.value}</p>
              <p className="text-[#737373] text-xs mt-1">{r.sub} foydalanuvchi</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      <ChartCard title="Kunlik Daromad" subtitle="So'nggi 30 kunlik daromad grafigi" loading={loading} height={280}>
        <VoxoAreaChart
          data={revenueChart.map((d: any) => ({ date: d.date ?? d.period, revenue: Number(d.total ?? d.value ?? 0) }))}
          areas={[{ key: 'revenue', label: 'Daromad', color: '#7c3aed' }]}
          xKey="date"
        />
      </ChartCard>

      {/* Top Hosts */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Top Hostlar</h3>
            <p className="text-[#737373] text-sm mt-0.5">Eng ko&apos;p sovg&apos;a olgan hostlar</p>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-md transition-all ${period === p ? 'bg-[#7C3AED] text-white' : 'text-[#737373] hover:text-white'}`}>
                {p === 'weekly' ? 'Haftalik' : 'Oylik'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-10 bg-white/5 rounded" />)}</div>
          ) : topHosts.length === 0 ? (
            <div className="text-center py-10 text-[#737373] text-sm">Ma&apos;lumot topilmadi</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs text-[#737373] uppercase">#</th>
                  <th className="px-5 py-3 text-left text-xs text-[#737373] uppercase">Host</th>
                  <th className="px-5 py-3 text-right text-xs text-[#737373] uppercase">Sovg&apos;a Qiymati</th>
                  <th className="px-5 py-3 text-right text-xs text-[#737373] uppercase">Izdoshlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topHosts.map((h: any, i: number) => (
                  <tr key={h.id ?? i} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-[#737373] text-sm">#{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="text-white text-sm font-medium">{h.user?.displayName ?? '—'}</p>
                      <p className="text-[#737373] text-xs">@{h.user?.uid ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-yellow-400 font-semibold text-sm">{h.totalGiftValue ?? '0'}</td>
                    <td className="px-5 py-3 text-right text-[#737373] text-sm">{formatNumber(h.totalFollowers ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Risk Summary */}
      {riskSummary && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldExclamationIcon className="w-5 h-5 text-red-400" />
            <h3 className="text-white font-semibold">Risk Ko&apos;rsatkichlari</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Bayroqlangan Foydalanuvchilar', value: riskSummary.flaggedUsers ?? 0, color: 'red' },
              { label: 'Yuqori Riskli', value: riskSummary.highRiskUsers ?? 0, color: 'orange' },
              { label: 'Kutilayotgan To\'lovlar', value: riskSummary.pendingPayouts ?? 0, color: 'yellow' },
              { label: "So'nggi Voqealar", value: riskSummary.recentEvents ?? 0, color: 'blue' },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-white/5">
                <p className={`text-2xl font-bold text-${s.color}-400`}>{s.value}</p>
                <p className="text-[#737373] text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

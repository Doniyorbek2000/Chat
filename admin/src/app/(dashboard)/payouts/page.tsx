'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

const STATUS_CONFIGS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Kutilmoqda', color: 'bg-yellow-500/20 text-yellow-400' },
  PROCESSING: { label: 'Jarayonda', color: 'bg-blue-500/20 text-blue-400' },
  COMPLETED: { label: "To'landi", color: 'bg-green-500/20 text-green-400' },
  REJECTED: { label: 'Rad etildi', color: 'bg-red-500/20 text-red-400' },
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.adminGetPayouts({ status: filterStatus || undefined, page, limit: 20 })
      const data = res?.data ?? res
      setPayouts(Array.isArray(data?.data ?? data) ? (data?.data ?? data) : [])
      setTotal(data?.total ?? 0)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, page])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await api.adminApprovePayout(id)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setActionLoading(rejectModal.id)
    try {
      await api.adminRejectPayout(rejectModal.id, rejectReason)
      setRejectModal(null)
      setRejectReason('')
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = payouts.filter((p) => p.status === 'PENDING').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Host To&apos;lovlari</h1>
          <p className="text-[#737373] text-sm mt-0.5">Pul yechish so&apos;rovlarini ko&apos;rib chiqish va tasdiqlash</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-sm rounded-lg border border-yellow-500/30">
              {pendingCount} ta kutilmoqda
            </span>
          )}
          <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A28] rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4">
            <h2 className="text-white font-bold text-lg">So&apos;rovni Rad Etish</h2>
            <p className="text-[#737373] text-sm">Host: <span className="text-white">{rejectModal.name}</span></p>
            <div>
              <label className="text-[#737373] text-xs mb-1 block">Rad etish sababi (ixtiyoriy)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input-field w-full text-sm h-20 resize-none"
                placeholder="Sabab kiriting..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="px-4 py-2 text-sm text-[#737373] hover:text-white">Bekor</button>
              <button onClick={handleReject} disabled={actionLoading === rejectModal.id} className="px-5 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 text-sm rounded-lg font-medium disabled:opacity-50">
                {actionLoading === rejectModal.id ? 'Rad etilmoqda...' : 'Rad Etish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }} className="input-field text-sm py-1.5 px-3 w-auto">
          <option value="">Barcha holatlari</option>
          {Object.entries(STATUS_CONFIGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-14 bg-white/5 rounded" />)}</div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-16 text-[#737373]">To&apos;lovlar topilmadi</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Host', 'Miqdor', 'Holat', "So'rov Sanasi", 'Amal'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-[#737373] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payouts.map((p: any) => {
                  const statusConf = STATUS_CONFIGS[p.status] ?? { label: p.status, color: 'bg-white/10 text-white' }
                  const isPending = p.status === 'PENDING'
                  const hostName = p.host?.user?.displayName ?? p.hostName ?? '—'
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <p className="text-white text-sm font-medium">{hostName}</p>
                        <p className="text-[#737373] text-xs">@{p.host?.user?.uid ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-blue-400 font-bold text-sm">💎 {p.amount?.toString?.() ?? '0'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusConf.color}`}>{statusConf.label}</span>
                        {p.rejectedReason && <p className="text-red-400 text-xs mt-1">{p.rejectedReason}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-[#737373] text-xs">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {isPending ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={actionLoading === p.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-all font-medium"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                              {actionLoading === p.id ? '...' : 'Tasdiqlash'}
                            </button>
                            <button
                              onClick={() => setRejectModal({ id: p.id, name: hostName })}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all font-medium"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                              Rad etish
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#737373] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        {total > 20 && (
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[#737373] text-sm">Jami: {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs bg-white/5 rounded-lg disabled:opacity-40">Oldingi</button>
              <span className="text-[#737373] text-sm px-2">{page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={payouts.length < 20} className="px-3 py-1.5 text-xs bg-white/5 rounded-lg disabled:opacity-40">Keyingi</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

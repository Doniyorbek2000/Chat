'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

const PERIODS = ['DAILY', 'WEEKLY', 'SPECIAL']
const ACTION_TYPES = ['LOGIN', 'SEND_GIFT', 'JOIN_ROOM', 'HOST_ROOM', 'LIKE_POST', 'COMMENT_POST', 'ADD_FRIEND', 'STREAK_3', 'SEND_MESSAGE']
const REWARD_TYPES = ['COINS', 'DIAMONDS', 'VIP_POINTS', 'EXP']

const emptyForm = { title: '', description: '', period: 'DAILY', actionType: 'LOGIN', targetCount: 1, rewardType: 'COINS', rewardAmount: 100, sortOrder: 0 }

export default function MissionsPage() {
  const [missions, setMissions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.adminGetMissions({ page, limit: 20 })
      const data = res?.data ?? res
      setMissions(Array.isArray(data?.data ?? data) ? (data?.data ?? data) : [])
      setTotal(data?.total ?? 0)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setShowForm(true) }
  const openEdit = (m: any) => {
    setEditId(m.id)
    setForm({ title: m.title, description: m.description ?? '', period: m.period, actionType: m.actionType, targetCount: m.targetCount, rewardType: m.rewardType, rewardAmount: Number(m.rewardAmount), sortOrder: m.sortOrder ?? 0 })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editId) await api.adminUpdateMission(editId, form)
      else await api.adminCreateMission({ ...form })
      setShowForm(false)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    setActionLoading(id)
    try {
      await api.adminToggleMission(id)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const periodBadge = (p: string) => {
    const colors: Record<string, string> = { DAILY: 'bg-blue-500/20 text-blue-400', WEEKLY: 'bg-purple-500/20 text-purple-400', SPECIAL: 'bg-yellow-500/20 text-yellow-400' }
    const labels: Record<string, string> = { DAILY: 'Kunlik', WEEKLY: 'Haftalik', SPECIAL: 'Maxsus' }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${colors[p] ?? 'bg-white/10 text-white'}`}>{labels[p] ?? p}</span>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vazifalar Boshqaruvi</h1>
          <p className="text-[#737373] text-sm mt-0.5">Kunlik va haftalik vazifalarni boshqarish</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white"><ArrowPathIcon className="w-4 h-4" /></button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg transition-all">
            <PlusIcon className="w-4 h-4" /> Yangi Vazifa
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A28] rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10">
            <h2 className="text-white font-bold text-lg">{editId ? "Vazifani Tahrirlash" : "Yangi Vazifa"}</h2>
            <div className="space-y-3">
              {[['title', 'Sarlavha', 'text'], ['description', "Tavsif", 'text']].map(([k, l]) => (
                <div key={k}>
                  <label className="text-[#737373] text-xs mb-1 block">{l}</label>
                  <input value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="input-field w-full text-sm" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {([['period', 'Davr', PERIODS], ['actionType', 'Harakat Turi', ACTION_TYPES], ['rewardType', "Mukofot Turi", REWARD_TYPES]] as [string, string, string[]][]).map(([k, l, opts]) => (
                  <div key={k}>
                    <label className="text-[#737373] text-xs mb-1 block">{l}</label>
                    <select value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="input-field w-full text-sm">
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                {([['targetCount', 'Maqsad Soni'], ['rewardAmount', 'Mukofot Miqdori'], ['sortOrder', 'Tartib']] as [string, string][]).map(([k, l]) => (
                  <div key={k}>
                    <label className="text-[#737373] text-xs mb-1 block">{l}</label>
                    <input type="number" value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} className="input-field w-full text-sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#737373] hover:text-white">Bekor</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm rounded-lg font-medium disabled:opacity-50">
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-12 bg-white/5 rounded" />)}</div>
          ) : missions.length === 0 ? (
            <div className="text-center py-12 text-[#737373]">Vazifalar topilmadi</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Sarlavha', 'Davr', 'Harakat', 'Maqsad', 'Mukofot', 'Holat', 'Amal'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-[#737373] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {missions.map((m: any) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="text-white text-sm font-medium">{m.title}</p>
                      {m.description && <p className="text-[#737373] text-xs">{m.description}</p>}
                    </td>
                    <td className="px-5 py-3">{periodBadge(m.period)}</td>
                    <td className="px-5 py-3 text-[#737373] text-xs font-mono">{m.actionType}</td>
                    <td className="px-5 py-3 text-white text-sm">{m.targetCount}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-semibold ${m.rewardType === 'COINS' ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {m.rewardAmount?.toString?.()} {m.rewardType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-[#737373]'}`}>
                        {m.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#737373] hover:text-white transition-all">
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggle(m.id)} disabled={actionLoading === m.id} className={`px-2 py-1 text-xs rounded-lg transition-all ${m.isActive ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}>
                          {actionLoading === m.id ? '...' : m.isActive ? "O'chirish" : 'Yoqish'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <button onClick={() => setPage(p => p + 1)} disabled={missions.length < 20} className="px-3 py-1.5 text-xs bg-white/5 rounded-lg disabled:opacity-40">Keyingi</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

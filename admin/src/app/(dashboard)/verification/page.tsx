'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'

const BADGE_TYPES = ['PHONE_VERIFIED', 'EMAIL_VERIFIED', 'VERIFIED_HOST', 'VERIFIED_AGENCY', 'OFFICIAL', 'SAFE_ROOM', 'TOP_CREATOR']

const BADGE_LABELS: Record<string, string> = {
  PHONE_VERIFIED: '📱 Telefon',
  EMAIL_VERIFIED: '✉️ Email',
  VERIFIED_HOST: '🎙️ Tasdiqlangan Host',
  VERIFIED_AGENCY: '🏢 Tasdiqlangan Agentlik',
  OFFICIAL: '✅ Rasmiy',
  SAFE_ROOM: '🛡️ Xavfsiz Xona',
  TOP_CREATOR: '⭐ Top Yaratuvchi',
}

export default function VerificationPage() {
  const [tab, setTab] = useState<'requests' | 'grant'>('requests')
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [userId, setUserId] = useState('')
  const [selectedBadge, setSelectedBadge] = useState('VERIFIED_HOST')
  const [grantLoading, setGrantLoading] = useState(false)
  const [agencyId, setAgencyId] = useState('')
  const [agencyLoading, setAgencyLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.adminGetVerificationRequests()
      const data = res?.data ?? res
      setRequests(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleVerify = async (uid: string, badgeType: string, revoke = false) => {
    const key = `${uid}-${badgeType}`
    setActionLoading(key)
    try {
      if (revoke) await api.adminUnverifyUser(uid, badgeType)
      else await api.adminVerifyUser(uid, badgeType)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleGrant = async () => {
    if (!userId.trim()) return
    setGrantLoading(true)
    try {
      await api.adminVerifyUser(userId.trim(), selectedBadge)
      alert(`✅ ${BADGE_LABELS[selectedBadge]} badge berildi`)
      setUserId('')
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setGrantLoading(false)
    }
  }

  const handleVerifyAgency = async () => {
    if (!agencyId.trim()) return
    setAgencyLoading(true)
    try {
      await api.adminVerifyAgency(agencyId.trim())
      alert('✅ Agentlik tasdiqlandi')
      setAgencyId('')
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e.message)
    } finally {
      setAgencyLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasdiqlash Badgelari</h1>
          <p className="text-[#737373] text-sm mt-0.5">Foydalanuvchi va agentlik badgelerini boshqarish</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#737373] hover:text-white"><ArrowPathIcon className="w-4 h-4" /></button>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit border border-white/10">
        {[['requests', 'So\'rovlar'], ['grant', 'Badge Berish']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-4 py-2 text-sm rounded-md transition-all ${tab === k ? 'bg-[#7C3AED] text-white font-medium' : 'text-[#737373] hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {tab === 'requests' ? (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse h-12 bg-white/5 rounded" />)}</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <CheckBadgeIcon className="w-12 h-12 text-[#737373] mx-auto mb-3" />
                <p className="text-[#737373]">Kutilayotgan so&apos;rovlar yo&apos;q</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Foydalanuvchi', 'Badge Turi', 'So\'ralgan Vaqt', 'Amal'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs text-[#737373] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requests.map((r: any, i: number) => {
                    const uid = r.userId ?? r.user?.id ?? r.id
                    const badge = r.badgeType ?? r.type
                    const key = `${uid}-${badge}`
                    return (
                      <tr key={r.id ?? i} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3">
                          <p className="text-white text-sm">{r.user?.displayName ?? r.displayName ?? '—'}</p>
                          <p className="text-[#737373] text-xs">@{r.user?.uid ?? r.uid ?? uid}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-purple-400">{BADGE_LABELS[badge] ?? badge}</td>
                        <td className="px-5 py-3 text-[#737373] text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleVerify(uid, badge, false)} disabled={actionLoading === key} className="px-3 py-1.5 text-xs rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-all">
                              {actionLoading === key ? '...' : 'Tasdiqlash'}
                            </button>
                            <button onClick={() => handleVerify(uid, badge, true)} disabled={actionLoading === key} className="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all">
                              Rad etish
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grant user badge */}
          <div className="card p-6 space-y-4">
            <h3 className="text-white font-semibold">Foydalanuvchiga Badge Berish</h3>
            <div>
              <label className="text-[#737373] text-xs mb-1 block">Foydalanuvchi ID yoki UID</label>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_id yoki UID" className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="text-[#737373] text-xs mb-1 block">Badge Turi</label>
              <select value={selectedBadge} onChange={(e) => setSelectedBadge(e.target.value)} className="input-field w-full text-sm">
                {BADGE_TYPES.filter(b => !['VERIFIED_AGENCY', 'SAFE_ROOM'].includes(b)).map((b) => (
                  <option key={b} value={b}>{BADGE_LABELS[b] ?? b}</option>
                ))}
              </select>
            </div>
            <button onClick={handleGrant} disabled={!userId.trim() || grantLoading} className="w-full py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {grantLoading ? 'Berilmoqda...' : 'Badge Berish'}
            </button>
          </div>

          {/* Verify agency */}
          <div className="card p-6 space-y-4">
            <h3 className="text-white font-semibold">Agentlikni Tasdiqlash</h3>
            <div>
              <label className="text-[#737373] text-xs mb-1 block">Agentlik ID</label>
              <input value={agencyId} onChange={(e) => setAgencyId(e.target.value)} placeholder="agency_id" className="input-field w-full text-sm" />
            </div>
            <button onClick={handleVerifyAgency} disabled={!agencyId.trim() || agencyLoading} className="w-full py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm font-medium border border-green-600/30 disabled:opacity-50">
              {agencyLoading ? 'Tasdiqlanmoqda...' : '🏢 Agentlikni Tasdiqlash'}
            </button>
            <p className="text-[#737373] text-xs">VERIFIED_AGENCY badge avtomatik ravishda beriladi</p>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

interface DeletionUser {
  id: string
  displayName: string
  uid: string
}

interface DeletionRequest {
  id: string
  reason: string
  status: string
  scheduledAt: string | null
  createdAt: string
  user: DeletionUser
}

const STATUSES = ['ALL', 'SCHEDULED', 'CANCELLED', 'COMPLETED'] as const

const statusColors: Record<string, string> = {
  SCHEDULED: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  CANCELLED: 'text-dark-400 bg-surface-300 border-white/5',
  COMPLETED: 'text-red-400 bg-red-400/10 border-red-400/20',
}

const statusLabels: Record<string, string> = {
  ALL: 'Hammasi',
  SCHEDULED: 'Rejalashtirilgan',
  CANCELLED: 'Bekor qilingan',
  COMPLETED: 'Bajarilgan',
}

export default function DeletionsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [total, setTotal] = useState(0)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page: 1, limit: 20 }
      if (statusFilter !== 'ALL') params.status = statusFilter
      const data = await api.adminGetDeletionRequests(params)
      const result = data?.data ?? data
      setRequests(result?.items ?? (Array.isArray(result) ? result : []))
      setTotal(result?.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hisob o'chirish so'rovlari</h1>
          <p className="text-dark-400 text-sm mt-1">Foydalanuvchilarning hisob o'chirish talablari</p>
        </div>
        <div className="bg-surface-200 rounded-xl border border-white/5 px-4 py-2 text-center">
          <p className="text-dark-400 text-xs">Jami</p>
          <p className="text-white font-bold text-xl">{total}</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === s
                ? (statusColors[s] ?? 'text-primary-400 bg-primary-400/10 border-primary-400/20')
                : 'text-dark-400 bg-surface-300 border-white/5 hover:text-white'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-dark-400">So'rov topilmadi</div>
      ) : (
        <div className="bg-surface-200 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Foydalanuvchi', 'Sabab', 'Holat', 'Reja sanasi', 'So\'rov sanasi'].map(h => (
                  <th key={h} className="text-left text-dark-400 text-xs font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{req.user.displayName}</p>
                    <p className="text-dark-400 text-xs">@{req.user.uid}</p>
                  </td>
                  <td className="px-4 py-3 text-dark-300 text-sm max-w-[240px]">
                    <span className="line-clamp-2">{req.reason || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${statusColors[req.status] ?? 'text-dark-400 bg-surface-300 border-white/5'}`}>
                      {statusLabels[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-xs">
                    {req.scheduledAt ? new Date(req.scheduledAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-xs">
                    {new Date(req.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

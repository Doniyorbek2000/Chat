'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface TicketUser {
  id: string
  displayName: string
  uid: string
}

interface TicketReply {
  id: string
  body: string
  isAdmin: boolean
  createdAt: string
  sender?: { displayName: string }
}

interface Ticket {
  id: string
  title: string
  category: string
  status: string
  adminNote?: string
  createdAt: string
  user: TicketUser
  replies?: TicketReply[]
}

interface SupportLog {
  id: string
  fileName: string
  platform: string
  appVersion: string
  deviceInfo: string
  logContent?: string
  createdAt: string
  user: TicketUser
}

const TICKET_STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

const statusColors: Record<string, string> = {
  OPEN: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  IN_PROGRESS: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  RESOLVED: 'text-green-400 bg-green-400/10 border-green-400/20',
  CLOSED: 'text-dark-400 bg-surface-300 border-white/5',
}

const statusLabels: Record<string, string> = {
  ALL: 'Hammasi',
  OPEN: 'Ochiq',
  IN_PROGRESS: 'Jarayonda',
  RESOLVED: 'Hal qilingan',
  CLOSED: 'Yopilgan',
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'logs'>('tickets')

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [ticketTotal, setTicketTotal] = useState(0)

  // Logs state
  const [logs, setLogs] = useState<SupportLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<SupportLog | null>(null)
  const [logsTotal, setLogsTotal] = useState(0)

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true)
    try {
      const params: Record<string, any> = { page: 1, limit: 20 }
      if (statusFilter !== 'ALL') params.status = statusFilter
      const data = await api.adminGetTickets(params)
      const result = data?.data ?? data
      setTickets(result?.items ?? (Array.isArray(result) ? result : []))
      setTicketTotal(result?.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setTicketsLoading(false)
    }
  }, [statusFilter])

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const data = await api.adminGetLogs({ page: 1, limit: 20 })
      const result = data?.data ?? data
      setLogs(result?.items ?? (Array.isArray(result) ? result : []))
      setLogsTotal(result?.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'tickets') loadTickets()
    else loadLogs()
  }, [activeTab, loadTickets, loadLogs])

  const handleToggleExpand = (ticketId: string) => {
    setExpandedId(prev => (prev === ticketId ? null : ticketId))
    setReplyText('')
  }

  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return
    setSendingReply(true)
    try {
      await api.adminReplyTicket(ticketId, replyText.trim())
      setReplyText('')
      loadTickets()
    } catch (e) {
      console.error(e)
    } finally {
      setSendingReply(false)
    }
  }

  const handleStatusChange = async (ticket: Ticket, newStatus: string) => {
    setUpdatingId(ticket.id)
    try {
      await api.adminUpdateTicket(ticket.id, { status: newStatus })
      loadTickets()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Qo'llab-quvvatlash</h1>
          <p className="text-dark-400 text-sm mt-1">Murojaat va loglarni boshqarish</p>
        </div>
        <div className="bg-surface-200 rounded-xl border border-white/5 px-4 py-2 text-center">
          <p className="text-dark-400 text-xs">Jami</p>
          <p className="text-white font-bold text-xl">
            {activeTab === 'tickets' ? ticketTotal : logsTotal}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5">
        {(['tickets', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {tab === 'tickets' ? 'Sorovlar' : 'Loglar'}
          </button>
        ))}
      </div>

      {/* Tickets tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {TICKET_STATUSES.map(s => (
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

          {ticketsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-dark-400">Murojaat topilmadi</div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => (
                <div key={ticket.id} className="bg-surface-200 rounded-xl border border-white/5 overflow-hidden">
                  {/* Ticket row */}
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/2 transition-colors"
                    onClick={() => handleToggleExpand(ticket.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium truncate">{ticket.title}</span>
                        <span className="text-dark-400 text-xs shrink-0">#{ticket.category}</span>
                      </div>
                      <p className="text-dark-400 text-xs mt-0.5">
                        {ticket.user.displayName} · @{ticket.user.uid}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${statusColors[ticket.status] ?? 'text-dark-400 bg-surface-300 border-white/5'}`}>
                        {statusLabels[ticket.status] ?? ticket.status}
                      </span>
                      <span className="text-dark-400 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      <select
                        value={ticket.status}
                        onChange={e => { e.stopPropagation(); handleStatusChange(ticket, e.target.value) }}
                        onClick={e => e.stopPropagation()}
                        disabled={updatingId === ticket.id}
                        className="bg-surface-300 border border-white/10 rounded-lg px-2 py-1 text-dark-300 text-xs focus:outline-none focus:border-primary-500 disabled:opacity-50"
                      >
                        {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(s => (
                          <option key={s} value={s}>{statusLabels[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Expanded replies */}
                  {expandedId === ticket.id && (
                    <div className="border-t border-white/5 px-4 py-4 space-y-4">
                      {/* Replies list */}
                      {ticket.replies && ticket.replies.length > 0 ? (
                        <div className="space-y-3">
                          {ticket.replies.map(reply => (
                            <div
                              key={reply.id}
                              className={`flex gap-3 ${reply.isAdmin ? 'flex-row-reverse' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                reply.isAdmin ? 'bg-primary-600/20 text-primary-400' : 'bg-surface-300 text-dark-300'
                              }`}>
                                {reply.isAdmin ? 'A' : (ticket.user.displayName.charAt(0).toUpperCase())}
                              </div>
                              <div className={`max-w-[70%] ${reply.isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`px-3 py-2 rounded-xl text-sm ${
                                  reply.isAdmin
                                    ? 'bg-primary-600/20 text-white'
                                    : 'bg-surface-300 text-white/80'
                                }`}>
                                  {reply.body}
                                </div>
                                <span className="text-dark-400 text-xs mt-1">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-dark-400 text-sm text-center py-2">Javob yo'q</p>
                      )}

                      {/* Reply form */}
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Javob yozing..."
                          rows={2}
                          className="flex-1 bg-surface-300 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
                        />
                        <button
                          onClick={() => handleSendReply(ticket.id)}
                          disabled={sendingReply || !replyText.trim()}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 transition-colors shrink-0"
                        >
                          <PaperAirplaneIcon className="w-4 h-4" />
                          Yuborish
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs tab */}
      {activeTab === 'logs' && (
        <div>
          {logsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-dark-400">Log topilmadi</div>
          ) : (
            <div className="bg-surface-200 rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Foydalanuvchi', 'Fayl nomi', 'Platforma', 'Versiya', 'Qurilma', 'Sana'].map(h => (
                      <th key={h} className="text-left text-dark-400 text-xs font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/2 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{log.user.displayName}</p>
                        <p className="text-dark-400 text-xs">@{log.user.uid}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-primary-400 text-xs bg-primary-600/10 px-2 py-0.5 rounded">
                          {log.fileName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-dark-300 text-sm">{log.platform}</td>
                      <td className="px-4 py-3 text-dark-300 text-sm">{log.appVersion}</td>
                      <td className="px-4 py-3 text-dark-400 text-xs truncate max-w-[180px]">{log.deviceInfo}</td>
                      <td className="px-4 py-3 text-dark-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Log Content Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-200 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-lg">{selectedLog.fileName}</h2>
                <p className="text-dark-400 text-xs mt-0.5">
                  {selectedLog.user.displayName} · {selectedLog.platform} {selectedLog.appVersion}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <pre className="bg-surface-300 rounded-xl p-4 text-xs text-dark-200 font-mono leading-relaxed whitespace-pre-wrap break-words">
                {selectedLog.logContent ?? 'Log mazmuni mavjud emas'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { BellIcon, PaperAirplaneIcon, ClockIcon } from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import FormField from '@/components/ui/FormField'
import Toggle from '@/components/ui/Toggle'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { PushNotification } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<PushNotification>()

const mockHistory: PushNotification[] = Array.from({ length: 30 }, (_, i) => ({
  id: `notif-${i}`,
  title: ['New Event: Ramadan Challenge', 'Maintenance Notice', 'Double Diamonds Weekend', 'New Gift Pack Released', 'System Update'][i % 5],
  body: ['Join our Ramadan challenge and win exclusive prizes!', 'Scheduled maintenance on Sunday at 2AM UTC.', 'Earn double diamonds this weekend only!', 'Check out our new luxury gift collection.', 'Version 2.5.0 is now available.'][i % 5],
  type: (['event', 'system', 'promotion', 'promotion', 'system'] as const)[i % 5] as PushNotification['type'],
  target: (['all', 'vip_users', 'all', 'all', 'all'] as const)[i % 5] as PushNotification['target'],
  status: (['sent', 'sent', 'scheduled', 'draft', 'sent'] as const)[i % 5] as PushNotification['status'],
  sentCount: [12500, 3200, 12500, 0, 12500][i % 5],
  createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  sentAt: i % 5 !== 2 && i % 5 !== 3 ? new Date(Date.now() - i * 86400000).toISOString() : undefined,
}))

interface NotifForm {
  target: PushNotification['target']
  targetValue: string
  title: string
  body: string
  type: PushNotification['type']
  schedule: 'now' | 'custom'
  scheduledAt: string
}

const initialForm: NotifForm = {
  target: 'all',
  targetValue: '',
  title: '',
  body: '',
  type: 'general',
  schedule: 'now',
  scheduledAt: '',
}

const typeOptions = [
  { value: 'general', label: 'SYSTEM' },
  { value: 'promotion', label: 'PROMOTION' },
  { value: 'event', label: 'EVENT' },
  { value: 'warning', label: 'ALERT' },
]

const targetOptions = [
  { value: 'all', label: 'All Users', icon: '👥' },
  { value: 'specific_user', label: 'Specific UID', icon: '👤' },
  { value: 'vip_users', label: 'VIP Only', icon: '⭐' },
  { value: 'country', label: 'By Country', icon: '🌍' },
]

const typeColors: Record<string, string> = {
  general: 'text-blue-400 bg-blue-500/20',
  promotion: 'text-purple-400 bg-purple-500/20',
  event: 'text-amber-400 bg-amber-500/20',
  warning: 'text-red-400 bg-red-500/20',
  system: 'text-blue-400 bg-blue-500/20',
}

export default function NotificationsPage() {
  const [form, setForm] = useState<NotifForm>(initialForm)
  const [errors, setErrors] = useState<Partial<NotifForm>>({})
  const [sending, setSending] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const setField = <K extends keyof NotifForm>(key: K, val: NotifForm[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const e: Partial<NotifForm> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.body.trim()) e.body = 'Body is required'
    if (form.target === 'specific_user' && !form.targetValue.trim()) e.targetValue = 'UID is required'
    if (form.target === 'country' && !form.targetValue.trim()) e.targetValue = 'Country code is required'
    if (form.schedule === 'custom' && !form.scheduledAt) e.scheduledAt = 'Schedule time is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSend = async () => {
    if (!validate()) return
    setSending(true)
    try {
      const payload: Partial<PushNotification> = {
        title: form.title,
        body: form.body,
        type: form.type,
        target: form.target,
        targetValue: form.targetValue || undefined,
        scheduledAt: form.schedule === 'custom' ? form.scheduledAt : undefined,
      }
      if (form.schedule === 'now') {
        await api.sendNotification(payload)
        toast.success('Notification sent successfully!')
      } else {
        await api.scheduleNotification(payload)
        toast.success('Notification scheduled!')
      }
      setForm(initialForm)
    } catch {
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const columns = [
    columnHelper.accessor('title', {
      header: 'Title',
      size: 200,
      cell: (info) => <span className="text-white text-sm font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      size: 120,
      cell: (info) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${typeColors[info.getValue()] || 'text-[#737373] bg-white/5'}`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('target', {
      header: 'Audience',
      size: 130,
      cell: (info) => (
        <span className="text-[#A0A0B0] text-sm capitalize">{info.getValue().replace(/_/g, ' ')}</span>
      ),
    }),
    columnHelper.accessor('sentCount', {
      header: 'Sent To',
      size: 100,
      cell: (info) => (
        <span className="text-white text-sm">{info.getValue()?.toLocaleString() || '—'}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: (info) => <Badge status={info.getValue()} size="sm" />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Date',
      size: 160,
      cell: (info) => (
        <span className="text-[#737373] text-sm">{formatDateTime(info.getValue())}</span>
      ),
    }),
  ]

  const paginated = mockHistory.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Send Form */}
        <div className="xl:col-span-2 card space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
              <BellIcon className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Send Notification</h3>
              <p className="text-[#737373] text-sm">Broadcast to users instantly or schedule</p>
            </div>
          </div>

          {/* Target */}
          <FormField label="Target Audience" required>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {targetOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setField('target', opt.value as PushNotification['target']); setField('targetValue', '') }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-sm font-medium ${
                    form.target === opt.value
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-white'
                      : 'border-white/10 bg-white/3 text-[#737373] hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>

          {(form.target === 'specific_user' || form.target === 'country') && (
            <FormField
              label={form.target === 'specific_user' ? 'User UID' : 'Country Code'}
              required
              error={errors.targetValue}
            >
              <input
                type="text"
                value={form.targetValue}
                onChange={(e) => setField('targetValue', e.target.value)}
                className="input"
                placeholder={form.target === 'specific_user' ? 'e.g. U12345' : 'e.g. SA, AE, US'}
              />
            </FormField>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Title" required error={errors.title}>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className="input"
                placeholder="Notification title..."
                maxLength={100}
              />
            </FormField>
            <FormField label="Type" required>
              <select
                value={form.type}
                onChange={(e) => setField('type', e.target.value as PushNotification['type'])}
                className="input"
              >
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Message Body" required error={errors.body}>
            <textarea
              value={form.body}
              onChange={(e) => setField('body', e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Notification message..."
              maxLength={500}
            />
            <p className="text-[#737373] text-xs text-right mt-1">{form.body.length}/500</p>
          </FormField>

          {/* Schedule */}
          <FormField label="Send Time">
            <div className="flex items-center gap-3 mb-3">
              {(['now', 'custom'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setField('schedule', s)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.schedule === s
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-white'
                      : 'border-white/10 text-[#737373] hover:text-white'
                  }`}
                >
                  {s === 'now' ? <PaperAirplaneIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                  {s === 'now' ? 'Send Now' : 'Schedule'}
                </button>
              ))}
            </div>
            {form.schedule === 'custom' && (
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setField('scheduledAt', e.target.value)}
                className="input"
              />
            )}
            {errors.scheduledAt && <p className="text-red-400 text-xs mt-1">{errors.scheduledAt}</p>}
          </FormField>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="btn-primary px-6"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-4 h-4" />
              )}
              {form.schedule === 'now' ? 'Send Now' : 'Schedule Notification'}
            </button>
          </div>
        </div>

        {/* Phone Preview */}
        <div className="flex flex-col items-center gap-4">
          <h4 className="text-[#737373] text-sm font-medium self-start">Preview</h4>
          {/* Phone frame */}
          <div className="relative w-56 bg-[#0A0A0F] rounded-[2.5rem] border-4 border-[#2A2A3A] shadow-2xl overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#2A2A3A] rounded-b-2xl z-10" />
            {/* Screen */}
            <div className="pt-10 pb-8 min-h-[420px] bg-gradient-to-b from-[#0E0E1E] to-[#0A0A0F] px-3">
              {/* Status bar */}
              <div className="flex items-center justify-between px-2 mb-4">
                <span className="text-white text-xs font-medium">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 rounded-sm border border-white/40 flex items-center px-0.5">
                    <div className="h-full w-3/4 bg-green-400 rounded-sm" />
                  </div>
                </div>
              </div>
              {/* Notification card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-[#7C3AED] flex items-center justify-center shrink-0">
                    <BellIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-white text-xs font-semibold truncate">VOXO</span>
                      <span className="text-[#737373] text-xs shrink-0">now</span>
                    </div>
                    <p className="text-white text-xs font-medium mt-0.5 line-clamp-1">
                      {form.title || 'Notification Title'}
                    </p>
                    <p className="text-[#A0A0B0] text-xs mt-0.5 line-clamp-2">
                      {form.body || 'Your notification message will appear here...'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[form.type] || 'text-[#737373] bg-white/5'}`}>
                  {form.type.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Home bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />
          </div>
          <p className="text-[#737373] text-xs text-center">Push notification preview</p>
        </div>
      </div>

      {/* History Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-white font-semibold">Send History</h3>
          <span className="text-[#737373] text-sm">{mockHistory.length} notifications</span>
        </div>
        <DataTable
          data={paginated}
          columns={columns}
          total={mockHistory.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyMessage="No notifications sent yet"
          className="p-4"
        />
      </div>
    </div>
  )
}

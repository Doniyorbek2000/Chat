'use client'

import { useState, useEffect, useCallback } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  PlusIcon,
  PencilSquareIcon,
  CalendarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import Toggle from '@/components/ui/Toggle'
import { ConfirmModal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Event, EventType, EventStatus } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<any>()

const eventTypeOptions: { value: EventType; label: string; color: string }[] = [
  { value: 'ranking', label: 'RANKING', color: 'text-amber-400 bg-amber-500/20' },
  { value: 'spending', label: 'SPENDING', color: 'text-green-400 bg-green-500/20' },
  { value: 'gifting', label: 'GIFTING', color: 'text-purple-400 bg-purple-500/20' },
  { value: 'room_activity', label: 'ROOM_ACTIVITY', color: 'text-blue-400 bg-blue-500/20' },
  { value: 'custom', label: 'CUSTOM', color: 'text-red-400 bg-red-500/20' },
]

interface EventForm {
  name: string
  description: string
  type: EventType
  startDate: string
  endDate: string
  coverImage: string
  isActive: boolean
  rewards: string
}

const emptyForm: EventForm = {
  name: '',
  description: '',
  type: 'ranking',
  startDate: '',
  endDate: '',
  coverImage: '',
  isActive: true,
  rewards: JSON.stringify([
    { rank: 1, reward: 'First prize', value: 50000 },
    { rank: 2, reward: 'Second prize', value: 25000 },
  ], null, 2),
}

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<EventForm>>({})
  const [saving, setSaving] = useState(false)
  const [rewardsError, setRewardsError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getEvents({ page, limit: pageSize })
      setEvents((res as any).data ?? [])
      setTotal((res as any).total ?? 0)
    } catch {
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => { load() }, [load])

  const activeEvents = events.filter(e => e.status === 'active' || e.isActive).length

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setRewardsError('')
    setDrawerOpen(true)
  }

  const openEdit = (event: any) => {
    setEditTarget(event)
    setForm({
      name: event.name,
      description: event.description || '',
      type: event.type || 'ranking',
      startDate: event.startDate ? event.startDate.split('T')[0] : '',
      endDate: event.endDate ? event.endDate.split('T')[0] : '',
      coverImage: event.coverImage || '',
      isActive: event.isActive ?? (event.status === 'active'),
      rewards: JSON.stringify(event.prizes || event.rewards || [], null, 2),
    })
    setErrors({})
    setRewardsError('')
    setDrawerOpen(true)
  }

  const setField = <K extends keyof EventForm>(key: K, val: EventForm[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const e: Partial<EventForm> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.startDate) e.startDate = 'Start date is required'
    if (!form.endDate) e.endDate = 'End date is required'
    let rwErr = ''
    try { JSON.parse(form.rewards) } catch { rwErr = 'Invalid JSON format' }
    setRewardsError(rwErr)
    setErrors(e)
    return Object.keys(e).length === 0 && !rwErr
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const data: Record<string, any> = {
        name: form.name,
        description: form.description,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        coverImage: form.coverImage || undefined,
        isActive: form.isActive,
        prizes: JSON.parse(form.rewards),
      }
      if (editTarget) {
        await api.updateEvent(editTarget.id, data)
        toast.success('Event updated')
      } else {
        await api.createEvent(data as any)
        toast.success('Event created')
      }
      setDrawerOpen(false)
      load()
    } catch {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (event: any) => {
    try {
      // No deleteEvent in API yet — show handled gracefully
      toast.error('Delete not supported via API')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete event')
    }
  }

  const columns = [
    columnHelper.accessor('coverImage', {
      header: 'Banner',
      size: 100,
      cell: (info: any) => (
        <div className="w-16 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10">
          {info.getValue() ? (
            <img src={info.getValue()} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-[#737373]" />
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      size: 200,
      cell: (info: any) => <span className="text-white text-sm font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      size: 140,
      cell: (info: any) => {
        const opt = eventTypeOptions.find(o => o.value === info.getValue())
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${opt?.color || 'text-[#737373] bg-white/5'}`}>
            {opt?.label || info.getValue() || '—'}
          </span>
        )
      },
    }),
    columnHelper.accessor('startDate', {
      header: 'Start',
      size: 110,
      cell: (info: any) => <span className="text-[#A0A0B0] text-sm">{info.getValue() ? formatDate(info.getValue()) : '—'}</span>,
    }),
    columnHelper.accessor('endDate', {
      header: 'End',
      size: 110,
      cell: (info: any) => <span className="text-[#A0A0B0] text-sm">{info.getValue() ? formatDate(info.getValue()) : '—'}</span>,
    }),
    columnHelper.accessor('isActive', {
      header: 'Active',
      size: 80,
      cell: (info: any) => {
        const event = info.row.original
        const active = info.getValue() ?? (event.status === 'active')
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'text-green-400 bg-green-500/20' : 'text-[#737373] bg-white/5'}`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 80,
      cell: ({ row }: any) => {
        const event = row.original
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEdit(event)}
              className="p-1.5 rounded-lg text-[#737373] hover:text-blue-400 hover:bg-blue-500/10 transition-all"
              title="Edit"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          </div>
        )
      },
    }),
  ]

  if (error) {
    return (
      <div className="card text-center py-12 space-y-3">
        <p className="text-red-400">{error}</p>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Events', value: activeEvents, color: 'text-green-400' },
          { label: 'Total Events', value: total, color: 'text-white' },
          { label: 'Loaded', value: events.length, color: 'text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="card py-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[#737373] text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-white font-semibold">All Events</h3>
          <button onClick={openCreate} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Create Event
          </button>
        </div>
        <DataTable
          data={events}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyMessage="No events found"
          className="p-4"
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? 'Edit Event' : 'Create Event'}
        size="xl"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Event Name" required error={errors.name} className="sm:col-span-2">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="input"
                placeholder="e.g. Ramadan Challenge 2024"
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={2}
                className="input resize-none"
                placeholder="Event description..."
              />
            </FormField>

            <FormField label="Event Type" required>
              <select value={form.type} onChange={(e) => setField('type', e.target.value as EventType)} className="input">
                {eventTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Start Date" required error={errors.startDate}>
              <input type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} className="input" />
            </FormField>
            <FormField label="End Date" required error={errors.endDate}>
              <input type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} className="input" />
            </FormField>

            <FormField label="Banner URL" hint="Recommended: 600×300px" className="sm:col-span-2">
              <input
                type="url"
                value={form.coverImage}
                onChange={(e) => setField('coverImage', e.target.value)}
                className="input"
                placeholder="https://cdn.voxo.app/events/..."
              />
              {form.coverImage && (
                <div className="mt-2 w-full h-24 rounded-xl overflow-hidden border border-white/10">
                  <img src={form.coverImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </FormField>

            <FormField
              label="Rewards (JSON)"
              hint="Array of { rank, reward, value } objects"
              className="sm:col-span-2"
            >
              <textarea
                value={form.rewards}
                onChange={(e) => {
                  setField('rewards', e.target.value)
                  setRewardsError('')
                  try { JSON.parse(e.target.value) } catch { setRewardsError('Invalid JSON') }
                }}
                rows={6}
                className={`input resize-none font-mono text-xs ${rewardsError ? 'border-red-500/50' : ''}`}
                placeholder='[{"rank":1,"reward":"Prize name","value":50000}]'
              />
              {rewardsError && <p className="text-red-400 text-xs mt-1">{rewardsError}</p>}
            </FormField>

            <div className="sm:col-span-2">
              <Toggle checked={form.isActive} onChange={(val) => setField('isActive', val)} label="Active" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-4">
          <button onClick={() => setDrawerOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {editTarget ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

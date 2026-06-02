'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import {
  PlusIcon,
  EyeIcon,
  PencilSquareIcon,
  CalendarIcon,
  UsersIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/ui/FormField'
import { api } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Event, EventType, EventStatus } from '@/types'
import toast from 'react-hot-toast'

const columnHelper = createColumnHelper<Event>()

const eventTypeOptions: { value: EventType; label: string; color: string }[] = [
  { value: 'ranking', label: 'RANKING', color: 'text-amber-400 bg-amber-500/20' },
  { value: 'spending', label: 'NATIONAL', color: 'text-green-400 bg-green-500/20' },
  { value: 'gifting', label: 'RAMADAN', color: 'text-purple-400 bg-purple-500/20' },
  { value: 'room_activity', label: 'NEW_YEAR', color: 'text-blue-400 bg-blue-500/20' },
  { value: 'custom', label: 'FAMILY_WAR', color: 'text-red-400 bg-red-500/20' },
]

const mockEvents: Event[] = Array.from({ length: 20 }, (_, i) => ({
  id: `event-${i}`,
  name: ['Ramadan Challenge 2024', 'New Year Gala', 'National Day Celebration', 'Family War Season 3', 'Diamond Hunt', 'Star Gift Festival', 'Summer Splash', 'Golden Week'][i % 8],
  description: 'Join this exciting event and compete with top users worldwide for amazing prizes!',
  coverImage: `https://picsum.photos/600/300?random=${i + 200}`,
  type: (['ranking', 'spending', 'gifting', 'room_activity', 'custom'] as const)[i % 5],
  status: (['active', 'active', 'ended', 'draft', 'active'] as const)[i % 5] as EventStatus,
  startDate: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
  endDate: new Date(Date.now() + Math.random() * 86400000 * 10).toISOString(),
  participantsCount: Math.floor(Math.random() * 5000) + 100,
  prizes: [
    { rank: 1, reward: 'Diamond Frame + 50,000 coins', value: 50000 },
    { rank: 2, reward: 'Gold Frame + 25,000 coins', value: 25000 },
    { rank: 3, reward: 'Silver Frame + 10,000 coins', value: 10000 },
  ],
  createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
}))

interface EventForm {
  name: string
  description: string
  type: EventType
  startDate: string
  endDate: string
  coverImage: string
  rewards: string
}

const emptyForm: EventForm = {
  name: '',
  description: '',
  type: 'ranking',
  startDate: '',
  endDate: '',
  coverImage: '',
  rewards: JSON.stringify([
    { rank: 1, reward: 'First prize', value: 50000 },
    { rank: 2, reward: 'Second prize', value: 25000 },
  ], null, 2),
}

export default function EventsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Event | null>(null)
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<EventForm>>({})
  const [saving, setSaving] = useState(false)
  const [rewardsError, setRewardsError] = useState('')

  const activeEvents = mockEvents.filter(e => e.status === 'active').length
  const totalParticipants = mockEvents.reduce((s, e) => s + e.participantsCount, 0)

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setRewardsError('')
    setDrawerOpen(true)
  }

  const openEdit = (event: Event) => {
    setEditTarget(event)
    setForm({
      name: event.name,
      description: event.description || '',
      type: event.type,
      startDate: event.startDate.split('T')[0],
      endDate: event.endDate.split('T')[0],
      coverImage: event.coverImage || '',
      rewards: JSON.stringify(event.prizes || [], null, 2),
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
    try { JSON.parse(form.rewards) } catch { setRewardsError('Invalid JSON format') }
    setErrors(e)
    return Object.keys(e).length === 0 && !rewardsError
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('type', form.type)
      fd.append('startDate', form.startDate)
      fd.append('endDate', form.endDate)
      fd.append('coverImage', form.coverImage)
      fd.append('prizes', form.rewards)
      if (editTarget) {
        await api.updateEvent(editTarget.id, fd)
        toast.success('Event updated')
      } else {
        await api.createEvent(fd)
        toast.success('Event created')
      }
      setDrawerOpen(false)
    } catch {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const paginated = mockEvents.slice((page - 1) * pageSize, page * pageSize)

  const columns = [
    columnHelper.accessor('coverImage', {
      header: 'Banner',
      size: 100,
      cell: (info) => (
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
      cell: (info) => <span className="text-white text-sm font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      size: 130,
      cell: (info) => {
        const opt = eventTypeOptions.find(o => o.value === info.getValue())
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${opt?.color || 'text-[#737373] bg-white/5'}`}>
            {opt?.label || info.getValue()}
          </span>
        )
      },
    }),
    columnHelper.accessor('startDate', {
      header: 'Start',
      size: 110,
      cell: (info) => <span className="text-[#A0A0B0] text-sm">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('endDate', {
      header: 'End',
      size: 110,
      cell: (info) => <span className="text-[#A0A0B0] text-sm">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('participantsCount', {
      header: 'Participants',
      size: 120,
      cell: (info) => (
        <span className="text-white text-sm font-medium">{formatNumber(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <Badge status={info.getValue()} size="sm" />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 90,
      cell: ({ row }) => {
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Events', value: activeEvents, color: 'text-green-400' },
          { label: 'Total Events', value: mockEvents.length, color: 'text-white' },
          { label: 'Total Participants', value: formatNumber(totalParticipants), color: 'text-blue-400' },
          { label: 'Draft', value: mockEvents.filter(e => e.status === 'draft').length, color: 'text-yellow-400' },
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
          data={paginated}
          columns={columns}
          loading={loading}
          total={mockEvents.length}
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline'
import FormField from '@/components/ui/FormField'
import Toggle from '@/components/ui/Toggle'
import { api } from '@/lib/api'
import type { GiftCategory, GiftType } from '@/types'
import toast from 'react-hot-toast'

const categoryOptions: { value: GiftCategory; label: string; color: string }[] = [
  { value: 'basic', label: 'NORMAL', color: 'text-[#A0A0B0]' },
  { value: 'premium', label: 'LUXURY', color: 'text-blue-400' },
  { value: 'special', label: 'COUPLE', color: 'text-pink-400' },
  { value: 'event', label: 'FAMILY', color: 'text-green-400' },
  { value: 'seasonal', label: 'LUCKY', color: 'text-amber-400' },
]

const extCategoryOptions = [
  { value: 'vip', label: 'VIP' },
  { value: 'nation', label: 'NATION' },
]

const typeOptions: { value: GiftType; label: string; description: string }[] = [
  { value: 'static', label: 'STATIC', description: 'PNG/JPG image' },
  { value: 'lottie', label: 'LOTTIE', description: 'Lottie JSON animation' },
  { value: 'svga', label: 'SVGA', description: 'SVGA animation file' },
  { value: 'fullscreen', label: 'FULLSCREEN', description: 'Full-screen animation' },
]

interface GiftForm {
  name: string
  category: GiftCategory
  type: GiftType
  imageUrl: string
  animationUrl: string
  priceDiamonds: string
  priceCoins: string
  sortOrder: string
  isActive: boolean
  isSpecial: boolean
}

const emptyForm: GiftForm = {
  name: '',
  category: 'basic',
  type: 'static',
  imageUrl: '',
  animationUrl: '',
  priceDiamonds: '',
  priceCoins: '',
  sortOrder: '1',
  isActive: true,
  isSpecial: false,
}

export default function NewGiftPage() {
  const router = useRouter()
  const [form, setForm] = useState<GiftForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<GiftForm>>({})
  const [saving, setSaving] = useState(false)

  const setField = <K extends keyof GiftForm>(key: K, val: GiftForm[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const e: Partial<GiftForm> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.imageUrl.trim()) e.imageUrl = 'Image URL is required'
    if (!form.priceDiamonds || isNaN(Number(form.priceDiamonds)) || Number(form.priceDiamonds) <= 0) {
      e.priceDiamonds = 'Valid diamond price is required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('category', form.category)
      fd.append('type', form.type)
      fd.append('imageUrl', form.imageUrl)
      fd.append('animationUrl', form.animationUrl)
      fd.append('priceDiamonds', form.priceDiamonds)
      fd.append('priceCoins', form.priceCoins)
      fd.append('sortOrder', form.sortOrder)
      fd.append('isActive', String(form.isActive))
      fd.append('isSpecial', String(form.isSpecial))

      await api.createGift(fd)
      toast.success(`Gift "${form.name}" created successfully!`)
      router.push('/gifts')
    } catch {
      toast.error('Failed to create gift')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.push('/gifts')}
        className="flex items-center gap-2 text-[#737373] hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Gifts
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h4 className="text-[#737373] text-sm font-medium mb-4">Gift Preview</h4>
            <div className="w-full aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden mb-4">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="Gift preview"
                  className="w-full h-full object-contain p-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="text-center text-[#737373]">
                  <PhotoIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Enter image URL to preview</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-lg truncate">
                  {form.name || 'Gift Name'}
                </p>
                {form.isSpecial && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium shrink-0">
                    ★ Special
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-white/5 ${
                  categoryOptions.find(c => c.value === form.category)?.color || 'text-[#737373]'
                }`}>
                  {categoryOptions.find(c => c.value === form.category)?.label || form.category}
                </span>
                <span className="text-xs font-medium text-[#737373] uppercase">
                  {form.type}
                </span>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1">
                {form.priceDiamonds && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#737373] text-xs">Diamond Price</span>
                    <span className="text-blue-400 font-bold text-sm">{Number(form.priceDiamonds).toLocaleString()} 💎</span>
                  </div>
                )}
                {form.priceCoins && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#737373] text-xs">Coin Price</span>
                    <span className="text-yellow-400 font-bold text-sm">{Number(form.priceCoins).toLocaleString()} 🪙</span>
                  </div>
                )}
              </div>

              <div className={`text-center text-xs py-1.5 rounded-lg font-medium ${
                form.isActive ? 'text-green-400 bg-green-500/10' : 'text-[#737373] bg-white/5'
              }`}>
                {form.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <h3 className="text-white font-semibold mb-5">Create New Gift</h3>

            <div className="space-y-5">
              <FormField label="Gift Name" required error={errors.name}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="input"
                  placeholder="e.g. Golden Crown"
                />
              </FormField>

              <FormField label="Category" required>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setField('category', cat.value)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        form.category === cat.value
                          ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-white'
                          : 'border-white/10 text-[#737373] hover:text-white hover:border-white/20'
                      }`}
                    >
                      <span className={cat.color}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Animation Type" required>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {typeOptions.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setField('type', t.value)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-center ${
                        form.type === t.value
                          ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-white'
                          : 'border-white/10 text-[#737373] hover:text-white hover:border-white/20'
                      }`}
                    >
                      <p className="font-bold">{t.label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Image URL" required error={errors.imageUrl} hint="Gift thumbnail/static image">
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setField('imageUrl', e.target.value)}
                  className="input"
                  placeholder="https://cdn.voxo.app/gifts/crown.png"
                />
              </FormField>

              {form.type !== 'static' && (
                <FormField label="Animation URL" hint={`${form.type.toUpperCase()} file URL`}>
                  <input
                    type="url"
                    value={form.animationUrl}
                    onChange={(e) => setField('animationUrl', e.target.value)}
                    className="input"
                    placeholder={`https://cdn.voxo.app/gifts/crown.${form.type === 'lottie' ? 'json' : form.type}`}
                  />
                </FormField>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Diamond Price" required error={errors.priceDiamonds}>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.priceDiamonds}
                      onChange={(e) => setField('priceDiamonds', e.target.value)}
                      className="input pr-8"
                      placeholder="100"
                      min="1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">💎</span>
                  </div>
                </FormField>
                <FormField label="Coin Price" hint="Optional">
                  <div className="relative">
                    <input
                      type="number"
                      value={form.priceCoins}
                      onChange={(e) => setField('priceCoins', e.target.value)}
                      className="input pr-8"
                      placeholder="Optional"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                  </div>
                </FormField>
                <FormField label="Sort Order">
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setField('sortOrder', e.target.value)}
                    className="input"
                    placeholder="1"
                    min="1"
                  />
                </FormField>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <div className="bg-white/3 rounded-xl p-4 flex items-center justify-between flex-1">
                  <div>
                    <p className="text-white text-sm font-medium">Active</p>
                    <p className="text-[#737373] text-xs">Show in gift panel</p>
                  </div>
                  <Toggle checked={form.isActive} onChange={(val) => setField('isActive', val)} />
                </div>
                <div className="bg-white/3 rounded-xl p-4 flex items-center justify-between flex-1">
                  <div>
                    <p className="text-white text-sm font-medium">Special</p>
                    <p className="text-[#737373] text-xs">Mark as featured</p>
                  </div>
                  <Toggle checked={form.isSpecial} onChange={(val) => setField('isSpecial', val)} />
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => router.push('/gifts')} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary px-6" disabled={saving}>
              {saving && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Create Gift
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

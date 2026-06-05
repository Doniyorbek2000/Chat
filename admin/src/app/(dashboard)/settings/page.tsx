'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import Toggle from '@/components/ui/Toggle'
import FormField from '@/components/ui/FormField'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import type { CoinPackage } from '@/types'
import toast from 'react-hot-toast'

type SettingsTab = 'general' | 'packages'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  // --- General Settings ---
  const [settings, setSettings] = useState<any>(null)
  const [generalForm, setGeneralForm] = useState<any>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // --- Coin Packages ---
  const [packages, setPackages] = useState<CoinPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [editingPkg, setEditingPkg] = useState<string | null>(null)
  const [pkgForm, setPkgForm] = useState<Partial<CoinPackage>>({})

  const loadSettings = async () => {
    setSettingsLoading(true)
    setSettingsError(null)
    try {
      const res = await api.getSettings()
      const data = (res as any)?.data ?? res
      setSettings(data)
      setGeneralForm(data)
    } catch {
      setSettingsError('Settings API not yet configured')
      setSettings(null)
      setGeneralForm(null)
    } finally {
      setSettingsLoading(false)
    }
  }

  const loadPackages = async () => {
    setPackagesLoading(true)
    try {
      const res = await api.getCoinPackages()
      setPackages(Array.isArray(res) ? res : (res as any)?.data ?? [])
    } catch {
      setPackages([])
    } finally {
      setPackagesLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'packages') loadPackages()
  }, [activeTab])

  const handleSaveGeneral = async () => {
    if (!generalForm) return
    setSaving(true)
    try {
      await api.updateSettings(generalForm)
      setSettings(generalForm)
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleEditPkg = (pkg: CoinPackage) => {
    setEditingPkg(pkg.id)
    setPkgForm({ ...pkg })
  }

  const handleSavePkg = async () => {
    if (!editingPkg || !pkgForm.id) return
    try {
      await api.updateCoinPackage(pkgForm.id, pkgForm)
      setPackages(prev => prev.map(p => p.id === pkgForm.id ? { ...p, ...pkgForm } as CoinPackage : p))
      toast.success('Package updated')
      setEditingPkg(null)
    } catch {
      toast.error('Failed to update package')
    }
  }

  const handleDeletePkg = async (id: string) => {
    try {
      await api.deleteCoinPackage(id)
      setPackages(prev => prev.filter(p => p.id !== id))
      toast.success('Package deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleCreatePkg = async () => {
    try {
      const newPkg = await api.createCoinPackage({ coins: 1000, bonusCoins: 0, priceUSD: 9.99, isPopular: false, isActive: true })
      setPackages(prev => [...prev, newPkg])
      toast.success('Package created')
    } catch {
      toast.error('Failed to create package')
    }
  }

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'packages', label: 'Coin Packages' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'text-white border-[#7C3AED]'
                  : 'text-[#737373] border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <>
          {settingsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : settingsError || !generalForm ? (
            <div className="card text-center py-12 space-y-3">
              <p className="text-[#737373]">Settings API not yet configured</p>
              <button onClick={loadSettings} className="btn-secondary inline-flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : (
            <div className="card space-y-6">
              <h3 className="text-white font-semibold">General Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {generalForm.appName !== undefined && (
                  <FormField label="App Name">
                    <input
                      type="text"
                      value={generalForm.appName ?? ''}
                      onChange={(e) => setGeneralForm((f: any) => ({ ...f, appName: e.target.value }))}
                      className="input"
                    />
                  </FormField>
                )}
                {generalForm.maxRoomSeats !== undefined && (
                  <FormField label="Max Room Seats">
                    <input
                      type="number"
                      value={generalForm.maxRoomSeats ?? ''}
                      onChange={(e) => setGeneralForm((f: any) => ({ ...f, maxRoomSeats: Number(e.target.value) }))}
                      className="input"
                    />
                  </FormField>
                )}
                {generalForm.defaultLanguage !== undefined && (
                  <FormField label="Default Language">
                    <input
                      type="text"
                      value={generalForm.defaultLanguage ?? ''}
                      onChange={(e) => setGeneralForm((f: any) => ({ ...f, defaultLanguage: e.target.value }))}
                      className="input"
                      placeholder="en"
                    />
                  </FormField>
                )}
                {generalForm.minWithdrawalAmount !== undefined && (
                  <FormField label="Min Withdrawal Amount">
                    <input
                      type="number"
                      value={generalForm.minWithdrawalAmount ?? ''}
                      onChange={(e) => setGeneralForm((f: any) => ({ ...f, minWithdrawalAmount: Number(e.target.value) }))}
                      className="input"
                    />
                  </FormField>
                )}
                {generalForm.maxWithdrawalAmount !== undefined && (
                  <FormField label="Max Withdrawal Amount">
                    <input
                      type="number"
                      value={generalForm.maxWithdrawalAmount ?? ''}
                      onChange={(e) => setGeneralForm((f: any) => ({ ...f, maxWithdrawalAmount: Number(e.target.value) }))}
                      className="input"
                    />
                  </FormField>
                )}
              </div>

              <div className="border-t border-white/5 pt-5 space-y-4">
                <h4 className="text-white font-medium">System Toggles</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'maintenanceMode', label: 'Maintenance Mode', description: 'Disable app access for all users' },
                    { key: 'registrationEnabled', label: 'Enable Registration', description: 'Allow new user sign-ups' },
                    { key: 'giftingEnabled', label: 'Gifting Enabled', description: 'Allow users to send gifts' },
                    { key: 'withdrawalEnabled', label: 'Withdrawal Enabled', description: 'Allow withdrawal requests' },
                    { key: 'referralEnabled', label: 'Referral Enabled', description: 'Enable the referral system' },
                  ]
                    .filter(item => generalForm[item.key] !== undefined)
                    .map((item) => (
                      <div key={item.key} className="bg-white/3 rounded-xl p-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white text-sm font-medium">{item.label}</p>
                          <p className="text-[#737373] text-xs mt-0.5">{item.description}</p>
                        </div>
                        <Toggle
                          checked={!!generalForm[item.key]}
                          onChange={(val) => setGeneralForm((f: any) => ({ ...f, [item.key]: val }))}
                        />
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveGeneral} className="btn-primary" disabled={saving}>
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Coin Packages */}
      {activeTab === 'packages' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Coin Packages</h3>
            <button onClick={handleCreatePkg} className="btn-primary">
              <PlusIcon className="w-4 h-4" />
              Add Package
            </button>
          </div>
          {packagesLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-[#737373] text-sm text-center py-8">No packages found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Coins', 'Bonus Coins', 'Price (USD)', 'Total Coins', 'Popular', 'Active', 'Actions'].map(h => (
                      <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {packages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-white/2 transition-colors">
                      <td className="table-cell">
                        {editingPkg === pkg.id ? (
                          <input
                            type="number"
                            value={pkgForm.coins}
                            onChange={(e) => setPkgForm(f => ({ ...f, coins: Number(e.target.value) }))}
                            className="input py-1.5 px-2 w-24 text-sm"
                          />
                        ) : (
                          <span className="text-yellow-400 font-medium">{formatNumber(pkg.coins)} 🪙</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {editingPkg === pkg.id ? (
                          <input
                            type="number"
                            value={pkgForm.bonusCoins}
                            onChange={(e) => setPkgForm(f => ({ ...f, bonusCoins: Number(e.target.value) }))}
                            className="input py-1.5 px-2 w-24 text-sm"
                          />
                        ) : (
                          <span className="text-green-400">{pkg.bonusCoins > 0 ? `+${formatNumber(pkg.bonusCoins)}` : '—'}</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {editingPkg === pkg.id ? (
                          <input
                            type="number"
                            value={pkgForm.priceUSD}
                            onChange={(e) => setPkgForm(f => ({ ...f, priceUSD: Number(e.target.value) }))}
                            step={0.01}
                            className="input py-1.5 px-2 w-24 text-sm"
                          />
                        ) : (
                          <span className="text-white">${pkg.priceUSD}</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="text-[#A0A0B0]">{formatNumber(pkg.coins + pkg.bonusCoins)}</span>
                      </td>
                      <td className="table-cell">
                        <Toggle
                          checked={editingPkg === pkg.id ? !!pkgForm.isPopular : pkg.isPopular}
                          onChange={(val) => editingPkg === pkg.id ? setPkgForm(f => ({ ...f, isPopular: val })) : undefined}
                          disabled={editingPkg !== pkg.id}
                        />
                      </td>
                      <td className="table-cell">
                        <Toggle
                          checked={editingPkg === pkg.id ? !!pkgForm.isActive : pkg.isActive}
                          onChange={(val) => editingPkg === pkg.id ? setPkgForm(f => ({ ...f, isActive: val })) : undefined}
                          disabled={editingPkg !== pkg.id}
                        />
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          {editingPkg === pkg.id ? (
                            <>
                              <button onClick={handleSavePkg} className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-all">
                                <CheckIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingPkg(null)} className="p-1.5 rounded-lg text-[#737373] hover:bg-white/5 transition-all">
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEditPkg(pkg)} className="p-1.5 rounded-lg text-[#737373] hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeletePkg(pkg.id)} className="p-1.5 rounded-lg text-[#737373] hover:text-red-400 hover:bg-red-500/10 transition-all">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

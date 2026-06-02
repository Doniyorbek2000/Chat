'use client'

import { useState, useEffect } from 'react'
import {
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import Toggle from '@/components/ui/Toggle'
import FormField from '@/components/ui/FormField'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import type { AppSettings, CoinPackage } from '@/types'
import toast from 'react-hot-toast'

type SettingsTab = 'general' | 'payments' | 'packages' | 'features'

const mockSettings: AppSettings = {
  appName: 'VOXO',
  appVersion: '2.5.0',
  maintenanceMode: false,
  maintenanceMessage: 'We are undergoing scheduled maintenance. Back soon!',
  defaultCurrency: 'USD',
  coinExchangeRate: 0.01,
  diamondExchangeRate: 0.1,
  withdrawalMinAmount: 1000,
  withdrawalMaxAmount: 100000,
  withdrawalFeeRate: 0.05,
  giftCommissionRate: 0.3,
  agencyCommissionRate: 0.1,
  maxRoomSeats: 18,
  enableRegistration: true,
  requirePhoneVerification: true,
  enableGuestMode: false,
  chatMessageMaxLength: 500,
  rateLimitRequests: 100,
  rateLimitWindow: 60,
}

const mockPackages: CoinPackage[] = [
  { id: 'pkg-1', coins: 100, bonusCoins: 0, priceUSD: 0.99, isPopular: false, isActive: true },
  { id: 'pkg-2', coins: 500, bonusCoins: 50, priceUSD: 4.99, isPopular: false, isActive: true },
  { id: 'pkg-3', coins: 1200, bonusCoins: 200, priceUSD: 9.99, isPopular: true, isActive: true },
  { id: 'pkg-4', coins: 3000, bonusCoins: 600, priceUSD: 24.99, isPopular: false, isActive: true },
  { id: 'pkg-5', coins: 6500, bonusCoins: 1500, priceUSD: 49.99, isPopular: false, isActive: true },
  { id: 'pkg-6', coins: 15000, bonusCoins: 4000, priceUSD: 99.99, isPopular: false, isActive: false },
]

const mockApiKeys = [
  { id: 'stripe', label: 'Stripe Secret Key', value: 'sk_live_••••••••••••••••••••••••••••••••••••••••', revealed: false },
  { id: 'firebase', label: 'Firebase Server Key', value: '••••••••••••••••••••••••••••••••••••••••', revealed: false },
  { id: 'agora', label: 'Agora App Certificate', value: '••••••••••••••••••••••••••••••••••••••••', revealed: false },
  { id: 'paypal', label: 'PayPal Client Secret', value: '••••••••••••••••••••••••••••••••••••••••', revealed: false },
]

const featureFlags = [
  { id: 'pk_battle', label: 'PK Battle', description: 'Allow users to initiate PK battles between rooms' },
  { id: 'couples', label: 'Couples Feature', description: 'Enable couples pairing and couple gifts' },
  { id: 'agencies', label: 'Agencies', description: 'Enable the agency system and talent management' },
  { id: 'lucky_gifts', label: 'Lucky Gifts', description: 'Enable random lucky gift boxes with variable rewards' },
  { id: 'family_war', label: 'Family War', description: 'Enable seasonal family war events' },
  { id: 'guest_mode', label: 'Guest Mode', description: 'Allow unauthenticated users to view rooms' },
  { id: 'live_shopping', label: 'Live Shopping', description: 'Enable product pinning during live streams' },
  { id: 'virtual_gifts_v2', label: 'Fullscreen Gifts', description: 'Enable fullscreen animation gifts (SVGA/Lottie)' },
  { id: 'ai_moderation', label: 'AI Moderation', description: 'Automatic content moderation using AI' },
  { id: 'data_export', label: 'User Data Export', description: 'Allow users to request their data export (GDPR)' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState(mockSettings)
  const [packages, setPackages] = useState(mockPackages)
  const [apiKeys, setApiKeys] = useState(mockApiKeys)
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(featureFlags.map(f => [f.id, Math.random() > 0.4]))
  )
  const [saving, setSaving] = useState(false)
  const [editingPkg, setEditingPkg] = useState<string | null>(null)
  const [pkgForm, setPkgForm] = useState<Partial<CoinPackage>>({})
  const [generalForm, setGeneralForm] = useState(mockSettings)

  const handleSaveGeneral = async () => {
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

  const handleSaveFlags = async () => {
    setSaving(true)
    try {
      await api.updateSettings({ ...settings, enableGuestMode: flags['guest_mode'] })
      toast.success('Feature flags updated')
    } catch {
      toast.error('Failed to update flags')
    } finally {
      setSaving(false)
    }
  }

  const handleRevealKey = (id: string) => {
    setApiKeys(keys => keys.map(k => k.id === id ? { ...k, revealed: !k.revealed } : k))
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

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'payments', label: 'Payments' },
    { key: 'packages', label: 'Coin Packages' },
    { key: 'features', label: 'Feature Flags' },
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
        <div className="card space-y-6">
          <h3 className="text-white font-semibold">General Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="App Name">
              <input
                type="text"
                value={generalForm.appName}
                onChange={(e) => setGeneralForm(f => ({ ...f, appName: e.target.value }))}
                className="input"
              />
            </FormField>
            <FormField label="Minimum App Version">
              <input
                type="text"
                value={generalForm.appVersion}
                onChange={(e) => setGeneralForm(f => ({ ...f, appVersion: e.target.value }))}
                className="input"
                placeholder="e.g. 2.5.0"
              />
            </FormField>
            <FormField label="Default Currency">
              <select
                value={generalForm.defaultCurrency}
                onChange={(e) => setGeneralForm(f => ({ ...f, defaultCurrency: e.target.value }))}
                className="input"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
              </select>
            </FormField>
            <FormField label="Max Room Seats">
              <input
                type="number"
                value={generalForm.maxRoomSeats}
                onChange={(e) => setGeneralForm(f => ({ ...f, maxRoomSeats: Number(e.target.value) }))}
                className="input"
              />
            </FormField>
            <FormField label="Chat Message Max Length">
              <input
                type="number"
                value={generalForm.chatMessageMaxLength}
                onChange={(e) => setGeneralForm(f => ({ ...f, chatMessageMaxLength: Number(e.target.value) }))}
                className="input"
              />
            </FormField>
            <FormField label="Contact Email">
              <input
                type="email"
                defaultValue="support@voxo.app"
                className="input"
                placeholder="support@voxo.app"
              />
            </FormField>
          </div>

          <div className="border-t border-white/5 pt-5 space-y-4">
            <h4 className="text-white font-medium">System Toggles</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'maintenanceMode' as const, label: 'Maintenance Mode', description: 'Disable app access for all users' },
                { key: 'enableRegistration' as const, label: 'Enable Registration', description: 'Allow new user sign-ups' },
                { key: 'requirePhoneVerification' as const, label: 'Phone Verification', description: 'Require phone for registration' },
                { key: 'enableGuestMode' as const, label: 'Guest Mode', description: 'Allow viewing without login' },
              ].map((item) => (
                <div key={item.key} className="bg-white/3 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-[#737373] text-xs mt-0.5">{item.description}</p>
                  </div>
                  <Toggle
                    checked={generalForm[item.key] as boolean}
                    onChange={(val) => setGeneralForm(f => ({ ...f, [item.key]: val }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {generalForm.maintenanceMode && (
            <FormField label="Maintenance Message">
              <textarea
                value={generalForm.maintenanceMessage || ''}
                onChange={(e) => setGeneralForm(f => ({ ...f, maintenanceMessage: e.target.value }))}
                rows={2}
                className="input resize-none"
              />
            </FormField>
          )}

          <div className="flex justify-end">
            <button onClick={handleSaveGeneral} className="btn-primary" disabled={saving}>
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-5">
          <div className="card space-y-4">
            <h3 className="text-white font-semibold">Payment Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Coin Exchange Rate (coins → USD)">
                <input type="number" defaultValue={0.01} step={0.001} className="input" />
              </FormField>
              <FormField label="Diamond Exchange Rate (💎 → USD)">
                <input type="number" defaultValue={0.1} step={0.01} className="input" />
              </FormField>
              <FormField label="Withdrawal Fee Rate (%)">
                <input type="number" defaultValue={5} min={0} max={50} className="input" />
              </FormField>
              <FormField label="Min Withdrawal (💎)">
                <input type="number" defaultValue={1000} className="input" />
              </FormField>
              <FormField label="Max Withdrawal (💎)">
                <input type="number" defaultValue={100000} className="input" />
              </FormField>
              <FormField label="Gift Commission Rate (%)">
                <input type="number" defaultValue={30} min={0} max={100} className="input" />
              </FormField>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="text-white font-semibold">API Keys</h3>
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="bg-white/3 rounded-xl p-4">
                  <p className="text-[#737373] text-xs mb-2 font-medium">{key.label}</p>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 font-mono text-sm text-white bg-[#0A0A0F] rounded-lg px-3 py-2 border border-white/10 truncate">
                      {key.revealed ? key.value : key.value.replace(/./g, '•').slice(0, 40) + '...'}
                    </code>
                    <button
                      onClick={() => handleRevealKey(key.id)}
                      className="p-2 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all shrink-0"
                      title={key.revealed ? 'Hide' : 'Reveal'}
                    >
                      {key.revealed ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[#737373] text-xs">API keys are masked for security. Click reveal to temporarily show them.</p>
          </div>
        </div>
      )}

      {/* Coin Packages */}
      {activeTab === 'packages' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Coin Packages</h3>
            <button
              onClick={async () => {
                try {
                  await api.createCoinPackage({ coins: 1000, bonusCoins: 0, priceUSD: 9.99, isPopular: false, isActive: true })
                  setPackages(prev => [...prev, { id: `pkg-new-${Date.now()}`, coins: 1000, bonusCoins: 0, priceUSD: 9.99, isPopular: false, isActive: true }])
                  toast.success('Package created')
                } catch { toast.error('Failed to create') }
              }}
              className="btn-primary"
            >
              <PlusIcon className="w-4 h-4" />
              Add Package
            </button>
          </div>
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
                        onChange={(val) => editingPkg === pkg.id ? setPkgForm(f => ({ ...f, isPopular: val })) : {}}
                        disabled={editingPkg !== pkg.id}
                      />
                    </td>
                    <td className="table-cell">
                      <Toggle
                        checked={editingPkg === pkg.id ? !!pkgForm.isActive : pkg.isActive}
                        onChange={(val) => editingPkg === pkg.id ? setPkgForm(f => ({ ...f, isActive: val })) : {}}
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
        </div>
      )}

      {/* Feature Flags */}
      {activeTab === 'features' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Feature Flags</h3>
              <p className="text-[#737373] text-sm mt-0.5">Toggle platform features on/off without a deployment</p>
            </div>
            <button onClick={handleSaveFlags} className="btn-primary" disabled={saving}>
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Flags
            </button>
          </div>
          <div className="space-y-2">
            {featureFlags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4 bg-white/3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="text-white text-sm font-medium">{flag.label}</p>
                  <p className="text-[#737373] text-xs mt-0.5">{flag.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${flags[flag.id] ? 'text-green-400' : 'text-[#737373]'}`}>
                    {flags[flag.id] ? 'Enabled' : 'Disabled'}
                  </span>
                  <Toggle
                    checked={!!flags[flag.id]}
                    onChange={(val) => setFlags(f => ({ ...f, [flag.id]: val }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

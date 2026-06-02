'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  variant = 'primary',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#12121A] rounded-2xl border border-white/10 shadow-xl animate-slide-up">
        <div className="flex items-start justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            {variant === 'danger' && (
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              </div>
            )}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-white/5 transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-[#A0A0B0] text-sm mb-6">{message}</p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-white/5 hover:bg-white/10 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`font-medium px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                variant === 'danger'
                  ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20'
                  : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
              }`}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

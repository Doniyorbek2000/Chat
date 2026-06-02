import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern)
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy HH:mm')
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatCoins(amount: number): string {
  return `${formatNumber(amount)} 🪙`
}

export function formatDiamonds(amount: number): string {
  return `${formatNumber(amount)} 💎`
}

export function truncate(str: string, length: number = 30): string {
  if (str.length <= length) return str
  return `${str.slice(0, length)}...`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-400 bg-green-500/20',
    banned: 'text-red-400 bg-red-500/20',
    suspended: 'text-orange-400 bg-orange-500/20',
    pending: 'text-yellow-400 bg-yellow-500/20',
    processing: 'text-blue-400 bg-blue-500/20',
    approved: 'text-green-400 bg-green-500/20',
    rejected: 'text-red-400 bg-red-500/20',
    cancelled: 'text-dark-400 bg-dark-600',
    live: 'text-green-400 bg-green-500/20',
    ended: 'text-dark-400 bg-dark-600',
    draft: 'text-blue-400 bg-blue-500/20',
    completed: 'text-green-400 bg-green-500/20',
    failed: 'text-red-400 bg-red-500/20',
  }
  return colors[status] || 'text-dark-400 bg-dark-600'
}

export function getVIPColor(level: number): string {
  const colors: Record<number, string> = {
    0: 'text-dark-400',
    1: 'text-blue-400',
    2: 'text-green-400',
    3: 'text-yellow-400',
    4: 'text-orange-400',
    5: 'text-red-400',
    6: 'text-pink-400',
    7: 'text-purple-400',
    8: 'text-indigo-400',
    9: 'text-cyan-400',
    10: 'text-amber-400',
  }
  return colors[level] || 'text-dark-400'
}

export function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  })
  return query.toString()
}

export function parseQueryString(search: string): Record<string, string> {
  const params = new URLSearchParams(search)
  const result: Record<string, string> = {}
  params.forEach((value, key) => {
    result[key] = value
  })
  return result
}

export const ROLES_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  support: 1,
}

export function hasPermission(userRole: string, requiredRole: string): boolean {
  return (ROLES_HIERARCHY[userRole] || 0) >= (ROLES_HIERARCHY[requiredRole] || 0)
}

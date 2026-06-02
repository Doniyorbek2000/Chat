import { cn, getStatusColor } from '@/lib/utils'

interface BadgeProps {
  status: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function Badge({ status, label, className, size = 'md' }: BadgeProps) {
  const colorClass = getStatusColor(status)
  const displayLabel = label || status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full capitalize',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs',
        colorClass,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {displayLabel}
    </span>
  )
}

export function VIPBadge({ level, className }: { level: number; className?: string }) {
  if (level === 0) return null

  const colors: Record<number, string> = {
    1: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    2: 'text-green-400 bg-green-500/20 border-green-500/30',
    3: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    4: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    5: 'text-red-400 bg-red-500/20 border-red-500/30',
    6: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
    7: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    8: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
    9: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
    10: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  }

  const color = colors[level] || 'text-dark-400 bg-dark-600 border-dark-500'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full border',
        color,
        className
      )}
    >
      ★ VIP {level}
    </span>
  )
}

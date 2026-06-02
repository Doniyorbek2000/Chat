import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
  iconColor?: string
  iconBg?: string
  description?: string
  loading?: boolean
}

export default function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon: Icon,
  iconColor = 'text-primary-400',
  iconBg = 'bg-primary-600/20',
  description,
  loading = false,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-white/10 rounded w-24 mb-3" />
            <div className="h-8 bg-white/10 rounded w-32 mb-2" />
            <div className="h-3 bg-white/10 rounded w-20" />
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="card hover:border-white/10 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-dark-300 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white truncate">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className={cn(
                  'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
                  isPositive
                    ? 'text-green-400 bg-green-500/20'
                    : 'text-red-400 bg-red-500/20'
                )}
              >
                {isPositive ? (
                  <ArrowUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3" />
                )}
                {Math.abs(change).toFixed(1)}%
              </div>
              <span className="text-dark-500 text-xs">{changeLabel}</span>
            </div>
          )}
          {description && (
            <p className="text-dark-400 text-xs mt-1">{description}</p>
          )}
        </div>

        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center border border-white/5 shrink-0',
            iconBg,
            'group-hover:scale-110 transition-transform duration-200'
          )}
        >
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </div>
  )
}

import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  online?: boolean
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

const onlineDotSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
}

// Generate consistent color from string
function stringToColor(str: string): string {
  const colors = [
    'bg-primary-600/30 text-primary-300',
    'bg-blue-600/30 text-blue-300',
    'bg-green-600/30 text-green-300',
    'bg-yellow-600/30 text-yellow-300',
    'bg-red-600/30 text-red-300',
    'bg-pink-600/30 text-pink-300',
    'bg-indigo-600/30 text-indigo-300',
    'bg-cyan-600/30 text-cyan-300',
    'bg-orange-600/30 text-orange-300',
    'bg-teal-600/30 text-teal-300',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function Avatar({ src, name, size = 'md', className, online }: AvatarProps) {
  const initials = getInitials(name)
  const colorClass = stringToColor(name)

  return (
    <div className={cn('relative inline-block shrink-0', className)}>
      {src ? (
        <div className={cn('rounded-full overflow-hidden', sizes[size])}>
          <Image
            src={src}
            alt={name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold border border-white/10',
            sizes[size],
            colorClass
          )}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface-200',
            onlineDotSizes[size],
            online ? 'bg-green-400' : 'bg-dark-500'
          )}
        />
      )}
    </div>
  )
}

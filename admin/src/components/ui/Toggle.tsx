import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
  disabled?: boolean
  description?: string
}

export default function Toggle({ checked, onChange, label, disabled = false, description }: ToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-[#0A0A0F]',
          checked ? 'bg-[#7C3AED]' : 'bg-[#2A2A3A]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg',
            'transform ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      {(label || description) && (
        <div>
          {label && (
            <span className={cn('text-sm font-medium', disabled ? 'text-[#737373]' : 'text-white')}>
              {label}
            </span>
          )}
          {description && (
            <p className="text-[#737373] text-xs mt-0.5">{description}</p>
          )}
        </div>
      )}
    </div>
  )
}

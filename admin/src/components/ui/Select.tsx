import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export default function Select({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = 'Select...',
  disabled = false,
  className,
  required,
}: SelectProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="text-[#C0C0D0] text-sm font-medium block">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'bg-[#1A1A28] border text-white placeholder-[#737373] rounded-lg px-4 py-2.5 w-full',
          'focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-500/50' : 'border-white/10',
        )}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#12121A]">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
          {error}
        </p>
      )}
    </div>
  )
}

import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  hint?: string
}

export default function FormField({ label, error, required, children, className, hint }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-[#C0C0D0] text-sm font-medium block">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[#737373] text-xs">{hint}</p>
      )}
      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
          {error}
        </p>
      )}
    </div>
  )
}

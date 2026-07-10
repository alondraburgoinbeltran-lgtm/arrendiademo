import { ChevronDown } from 'lucide-react'

export function HeaderSelect({ label, value, onChange, options }: {
  label: string
  value: number
  onChange: (value: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] lg:text-[10px] font-semibold text-white/50 uppercase tracking-wider px-0.5">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 lg:h-10 w-[88px] lg:w-[130px] appearance-none bg-white/10 border border-white/15 rounded-lg pl-3 pr-8 text-xs lg:text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15"
        >
          {options.map(o => (
            <option key={o.value} value={o.value} className="text-[#1A1A1A]">{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70" />
      </div>
    </label>
  )
}

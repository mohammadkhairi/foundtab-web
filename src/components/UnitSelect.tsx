export const PRESET_UNITS = ['g', 'kg', 'ml', 'liter', 'pcs', 'pkt', 'pack', 'box', 'bottle', 'tin', 'carton', 'sachet', 'roll', 'dozen', 'tbsp', 'tsp', 'cup']

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
}

export default function UnitSelect({ value, onChange, className = '', id }: Props) {
  const isCustom = value !== '' && !PRESET_UNITS.includes(value)

  return (
    <div className={className}>
      <select
        id={id}
        value={isCustom ? '__custom__' : value}
        onChange={(e) => {
          if (e.target.value !== '__custom__') onChange(e.target.value)
          else onChange('')
        }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      >
        <option value="">Select unit…</option>
        {PRESET_UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
        <option value="__custom__">Other…</option>
      </select>
      {isCustom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type unit…"
          className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          autoFocus
        />
      )}
    </div>
  )
}

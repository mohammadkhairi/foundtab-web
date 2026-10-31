import { useState, useRef, useEffect } from 'react'

type Option = {
  id: string
  label: string
  sublabel?: string
}

type Props = {
  options: Option[]
  value: string
  onChange: (id: string, typedName?: string) => void
  placeholder?: string
  searchPlaceholder?: string
  /** If provided, an extra option appears at the top allowing "create new".
   *  label can be a static string or a function that receives the current search query. */
  createOption?: { id: string; label: string | ((query: string) => string) }
  className?: string
  /** When true, the dropdown opens immediately on mount */
  autoOpen?: boolean
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Search…', searchPlaceholder, createOption, className = '', autoOpen }: Props) {
  const [open, setOpen] = useState(autoOpen ?? false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const createLabel = createOption
    ? typeof createOption.label === 'function'
      ? createOption.label(query)
      : createOption.label
    : ''

  const selectedLabel =
    value === createOption?.id
      ? (typeof createOption.label === 'function' ? createOption.label('') : createOption.label)
      : options.find((o) => o.id === value)?.label ?? ''

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function selectCreate() {
    onChange(createOption!.id, query.trim() || undefined)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <span className={selectedLabel ? 'text-gray-700' : 'text-gray-400'}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder ?? 'Type to search…'}
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto overscroll-contain py-1">
            {createOption && (
              <li>
                <button
                  type="button"
                  onClick={selectCreate}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    value === createOption.id && !query ? 'bg-sky-50 text-sky-700 font-medium' : 'text-sky-600 hover:bg-sky-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {createLabel}
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-xs text-gray-400 text-center">No results for "{query}"</li>
            ) : (
              filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => select(option.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      value === option.id ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                    {option.sublabel && (
                      <span className="ml-1.5 text-xs text-gray-400">{option.sublabel}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type ChecklistStep = {
  key: string
  label: string
  description: string
  route: string
}

const STEPS: ChecklistStep[] = [
  {
    key: 'raw-material',
    label: 'Tambah bahan mentah',
    description: 'Rekod stok bahan yang anda guna untuk masak.',
    route: '/raw-materials/new',
  },
  {
    key: 'product',
    label: 'Tambah produk',
    description: 'Tetapkan produk yang anda jual beserta resepi.',
    route: '/products/new',
  },
  {
    key: 'purchase',
    label: 'Rekod pembelian',
    description: 'Log resit pertama anda untuk jejak kos.',
    route: '/purchases/new',
  },
]

const STORAGE_KEY = 'ft-setup-checklist'

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveCompleted(keys: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]))
}

export function markStepComplete(key: string) {
  const completed = loadCompleted()
  completed.add(key)
  saveCompleted(completed)
}

export default function SetupChecklist() {
  const navigate = useNavigate()
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted)

  useEffect(() => {
    saveCompleted(completed)
  }, [completed])

  function toggleStep(key: string) {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const doneCount = STEPS.filter((s) => completed.has(s.key)).length
  const allDone = doneCount === STEPS.length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Senarai semak persediaan</h3>
        <span className="text-xs text-gray-500">
          {doneCount}/{STEPS.length}
        </span>
      </div>

      {allDone ? (
        <div className="py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Semua selesai!</p>
          <p className="text-xs text-gray-500 mt-0.5">FoundTab anda sudah sedia digunakan.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {STEPS.map((step) => {
            const done = completed.has(step.key)
            return (
              <li key={step.key} className="flex items-start gap-3">
                <button
                  onClick={() => toggleStep(step.key)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    done
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 bg-white'
                  }`}
                  aria-label={done ? 'Tandakan belum selesai' : 'Tandakan selesai'}
                >
                  {done && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {!done && (
                  <button
                    onClick={() => navigate(step.route)}
                    className="text-xs text-sky-600 font-medium whitespace-nowrap"
                  >
                    Mula
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

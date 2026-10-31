import { useNavigate } from 'react-router-dom'
import { useT } from '../../../hooks/useT'

type ChecklistStatus = {
  hasRawMaterials: boolean
  hasProducts: boolean
  hasRecipes: boolean
}

type Props = {
  status: ChecklistStatus
}

type Step = {
  key: keyof ChecklistStatus
  label: string
  description: string
  route: string
  ctaLabel: string
}

export default function SetupChecklist({ status }: Props) {
  const navigate = useNavigate()
  const t = useT()

  const STEPS: Step[] = [
    {
      key: 'hasRawMaterials',
      label: t('checklist_step_rawMaterial'),
      description: t('checklist_step_rawMaterial_desc'),
      route: '/raw-materials/new',
      ctaLabel: t('checklist_start'),
    },
    {
      key: 'hasProducts',
      label: t('checklist_step_product'),
      description: t('checklist_step_product_desc'),
      route: '/products/new',
      ctaLabel: t('checklist_start'),
    },
    {
      key: 'hasRecipes',
      label: t('checklist_step_recipe'),
      description: t('checklist_step_recipe_desc'),
      route: '/recipes/new',
      ctaLabel: t('checklist_start'),
    },
  ]

  const doneCount = STEPS.filter((s) => status[s.key]).length
  const allDone = doneCount === STEPS.length

  if (allDone) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{t('checklist_allDone')}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t('checklist_allDone_desc')}</p>
            <button
              onClick={() => navigate('/help')}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-600"
            >
              {t('checklist_getHelp')}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('checklist_title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('checklist_subtitle')}</p>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
          {doneCount}/{STEPS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-sky-500 rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-3">
        {STEPS.map((step, idx) => {
          const done = status[step.key]
          const isNext = !done && STEPS.slice(0, idx).every((s) => status[s.key])
          return (
            <li key={step.key} className={`flex items-start gap-3 ${done ? 'opacity-50' : ''}`}>
              <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                done
                  ? 'border-green-500 bg-green-500'
                  : isNext
                  ? 'border-sky-400 bg-white'
                  : 'border-gray-200 bg-white'
              }`}>
                {done ? (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`text-[10px] font-bold ${isNext ? 'text-sky-400' : 'text-gray-300'}`}>{idx + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
              </div>
              {!done && isNext && (
                <button
                  onClick={() => navigate(step.route)}
                  className="flex-shrink-0 text-xs bg-sky-500 text-white px-3 py-1.5 rounded-lg font-medium"
                >
                  {step.ctaLabel}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

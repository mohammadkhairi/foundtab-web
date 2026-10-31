import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'

type ParsedItem = {
  itemName: string
  quantity: number
  pricePerUnit: number | null
  totalPrice: number | null
}

type ParsedOrder = {
  customerName: string | null
  customerPhone: string | null
  deliveryDate: string | null
  notes: string | null
  items: ParsedItem[]
  totalAmount: number | null
}

export default function WhatsAppOrderPage() {
  const navigate = useNavigate()
  const { refreshToken } = useAuth()
  const t = useT()

  const [message, setMessage] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleParse() {
    if (!message.trim()) { setError(t('orders_errorPasteFirst')); return }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setParsing(true)
    setError(null)
    try {
      const result = await apiFetch<ParsedOrder>('/api/v1/orders/parse-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ text: message }),
        token: freshToken,
      })
      setParsed({
        ...result,
        customerName: result.customerName?.toUpperCase() ?? null,
        items: result.items.map((item) => ({ ...item, itemName: item.itemName?.toUpperCase() ?? item.itemName })),
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('orders_errorParse'))
      }
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirm() {
    if (!parsed) return
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({ ...parsed, channel: 'WHATSAPP' }),
        token: freshToken,
      })
      navigate(`/orders/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('orders_errorSaveOrder'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900" data-tour="order-whatsapp">
            {t('orders_whatsapp')}
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {!parsed ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
              {t('orders_whatsappDesc')}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder={t('orders_whatsappPlaceholder')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={() => void handleParse()}
              disabled={parsing || !message.trim()}
              className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {parsing ? t('orders_parsing') : t('orders_parseButton')}
            </button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
              <p className="text-xs text-green-700 font-medium">{t('orders_reviewParsed')}</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">{t('orders_customerName')}</p>
                  <p className="font-medium text-gray-900">{parsed.customerName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('orders_customerPhone')}</p>
                  <p className="font-medium text-gray-900">{parsed.customerPhone ?? '—'}</p>
                </div>
                {parsed.deliveryDate && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">{t('orders_deliveryDate')}</p>
                    <p className="font-medium text-gray-900">{parsed.deliveryDate}</p>
                  </div>
                )}
              </div>
            </div>

            {parsed.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
                <p className="text-xs font-medium text-gray-600 mb-3">{t('orders_items')}</p>
                <ul className="space-y-2">
                  {parsed.items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{item.itemName}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                      {item.totalPrice !== null && (
                        <p className="text-sm text-gray-700 whitespace-nowrap">
                          RM {item.totalPrice.toFixed(2)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {parsed.totalAmount !== null && (
                  <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
                    <p className="text-sm font-semibold text-gray-900">{t('orders_totalAmount')}</p>
                    <p className="text-sm font-semibold text-gray-900">RM {parsed.totalAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {parsed.notes && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
                <p className="text-xs text-gray-500 mb-1">{t('orders_notes')}</p>
                <p className="text-sm text-gray-700">{parsed.notes}</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setParsed(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl text-sm"
              >
                {t('common_back')}
              </button>
              <button
                onClick={() => void handleConfirm()}
                disabled={saving}
                className="flex-1 bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {saving ? t('common_saving') : t('common_confirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'
import SearchableSelect from '../../../components/SearchableSelect'
import UnitSelect from '../../../components/UnitSelect'

type OcrItem = {
  itemName: string
  quantity: number
  unit: string
  unitPrice: number | null
  totalPrice: number | null
  suggestedRawMaterialId: string | null
  suggestedGenericName: string | null
}

type SplitItem = {
  mappedMaterialId: string | null
  mappedMaterialName: string
  quantity: string
  unit: string
}

type ReviewItem = OcrItem & {
  mappedMaterialId: string | null
  mappedMaterialName: string
  deleted: boolean
  skipped: boolean
  showPicker: boolean
  pendingVariantNames: string[]
  splits: SplitItem[]
}

type FieldState = { supplierName: string; receiptDate: string; totalAmount: string }
type RawMaterial = { id: string; name: string; baseUnit: string }

type Phase = 'upload' | 'summary' | 'review' | 'confirm' | 'saving'

const DRAFT_KEY = 'foundtab_ocr_draft'
const MAPPING_KEY = 'foundtab_receipt_mappings'

const FEE_KEYWORDS = ['gst', 'sst', 'service charge', 'discount', 'rounding', 'fee', 'tax', 'charge']

function getSupplierMemory(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(MAPPING_KEY) ?? '{}') } catch { return {} }
}

function saveMapping(supplierName: string, itemName: string, materialId: string) {
  const mem = getSupplierMemory()
  mem[`${supplierName}||${itemName.toLowerCase()}`] = materialId
  try { localStorage.setItem(MAPPING_KEY, JSON.stringify(mem)) } catch {}
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t === q) return 1
  if (t.includes(q) || q.includes(t)) return 0.8
  let score = 0
  let ti = 0
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi]!, ti)
    if (idx >= 0) { score++; ti = idx + 1 }
  }
  return score / Math.max(q.length, t.length)
}

function isFeeItem(itemName: string): boolean {
  const lower = itemName.toLowerCase()
  return FEE_KEYWORDS.some((kw) => lower.includes(kw))
}

export default function OcrReviewPage() {
  const navigate = useNavigate()
  const { refreshToken } = useAuth()
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('upload')
  const [uploading, setUploading] = useState(false)
  const [fields, setFields] = useState<FieldState>({ supplierName: '', receiptDate: '', totalAmount: '' })
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<number>>(new Set())
  const [trackingIdx, setTrackingIdx] = useState<number | null>(null)
  const [editingConfirmIdx, setEditingConfirmIdx] = useState<number | null>(null)
  const [editingUnitIdx, setEditingUnitIdx] = useState<number | null>(null)
  const [editingUnitQty, setEditingUnitQty] = useState<string>('')
  const [splittingIdx, setSplittingIdx] = useState<number | null>(null)
  const [variantInputs, setVariantInputs] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [materials, setMaterials] = useState<RawMaterial[]>([])

  // Restore in-progress draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (!saved) return
    try {
      const draft = JSON.parse(saved) as {
        phase: Phase
        fields: FieldState
        reviewItems: ReviewItem[]
        reviewIdx: number
        rejectedSuggestions: number[]
        trackingIdx: number | null
      }
      if (!draft.phase || draft.phase === 'upload' || draft.phase === 'saving') return
      setPhase(draft.phase)
      setFields(draft.fields)
      setReviewItems(draft.reviewItems)
      setReviewIdx(draft.reviewIdx ?? 0)
      setRejectedSuggestions(new Set(draft.rejectedSuggestions ?? []))
      setTrackingIdx(draft.trackingIdx ?? null)
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  // Save draft to localStorage whenever in-progress state changes
  useEffect(() => {
    if (phase === 'upload' || phase === 'saving') return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        phase,
        fields,
        reviewItems,
        reviewIdx,
        rejectedSuggestions: [...rejectedSuggestions],
        trackingIdx,
      }))
    } catch {}
  }, [phase, fields, reviewItems, reviewIdx, rejectedSuggestions, trackingIdx])

  useEffect(() => {
    refreshToken().then((tok) => {
      if (!tok) return
      apiFetch<{ items: RawMaterial[] }>('/api/v1/raw-materials', { token: tok })
        .then((res) => setMaterials(res.items ?? []))
        .catch(() => {})
    })
  }, [])

  // Derived item categories
  const feeItems = reviewItems.filter((i) => isFeeItem(i.itemName))
  const matchedItems = reviewItems.filter(
    (i) =>
      !isFeeItem(i.itemName) &&
      (i.suggestedRawMaterialId !== null ||
        materials.some((m) => m.name.toLowerCase() === i.itemName.toLowerCase().trim())),
  )
  const unmatchedItems = reviewItems.filter(
    (i) =>
      !isFeeItem(i.itemName) &&
      i.suggestedRawMaterialId === null &&
      !materials.some((m) => m.name.toLowerCase() === i.itemName.toLowerCase().trim()),
  )

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setPhase('upload')
    setFields({ supplierName: '', receiptDate: '', totalAmount: '' })
    setReviewItems([])
    setReviewIdx(0)
    setRejectedSuggestions(new Set())
    setTrackingIdx(null)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const freshToken = await refreshToken()
    if (!freshToken) return
    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const result = await apiFetch<{ supplierName: string | null; receiptDate: string | null; totalAmount: number | null; items: OcrItem[] }>('/api/v1/uploads/receipt-ocr', {
        method: 'POST',
        body: formData,
        token: freshToken,
      })
      setFields({
        supplierName: result.supplierName ?? '',
        receiptDate: result.receiptDate ?? '',
        totalAmount: result.totalAmount !== null ? String(result.totalAmount) : '',
      })
      const memory = getSupplierMemory()
      const supplierKey = result.supplierName?.toLowerCase() ?? ''
      const mapped = result.items.map((item): ReviewItem => {
        const exactMatch = materials.find(
          (m) => m.name.toLowerCase() === item.itemName.toLowerCase().trim(),
        )
        const memKey = `${supplierKey}||${item.itemName.toLowerCase()}`
        const memMatch = memory[memKey] ? materials.find((m) => m.id === memory[memKey]) : undefined
        const materialId = memMatch?.id ?? item.suggestedRawMaterialId ?? exactMatch?.id ?? null
        const materialName =
          memMatch?.name ??
          item.suggestedGenericName ??
          exactMatch?.name ??
          item.itemName
        return {
          ...item,
          mappedMaterialId: materialId,
          mappedMaterialName: materialName,
          deleted: false,
          skipped: isFeeItem(item.itemName),
          showPicker: false,
          pendingVariantNames: [],
          splits: [],
        }
      })
      setReviewItems(mapped)
      setReviewIdx(0)
      setRejectedSuggestions(new Set())
      setTrackingIdx(null)
      // Skip review phase if there are no unmatched items (using initial derivation)
      const hasUnmatched = result.items.some(
        (item) =>
          !isFeeItem(item.itemName) &&
          item.suggestedRawMaterialId === null &&
          !materials.some((m) => m.name.toLowerCase() === item.itemName.toLowerCase().trim()),
      )
      setPhase(hasUnmatched ? 'summary' : 'confirm')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('purchases_uploadError'))
    } finally {
      setUploading(false)
    }
  }

  function updateField(field: keyof FieldState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function advanceReview() {
    const next = reviewIdx + 1
    if (next >= unmatchedItems.length) {
      setPhase('confirm')
    } else {
      setReviewIdx(next)
      setTrackingIdx(null)
    }
  }

  function confirmSuggestion(idx: number) {
    const item = unmatchedItems[idx]
    if (!item) return
    const globalIdx = reviewItems.findIndex((r) => r === item)
    setReviewItems((prev) =>
      prev.map((r, i) =>
        i === globalIdx
          ? { ...r, mappedMaterialId: item.suggestedRawMaterialId, mappedMaterialName: item.suggestedGenericName ?? item.itemName }
          : r,
      ),
    )
    advanceReview()
  }

  function rejectSuggestion(idx: number) {
    setRejectedSuggestions((prev) => new Set([...prev, idx]))
    setTrackingIdx(null)
  }

  function skipItem(idx: number) {
    const item = unmatchedItems[idx]
    if (!item) return
    const globalIdx = reviewItems.findIndex((r) => r === item)
    setReviewItems((prev) =>
      prev.map((r, i) => (i === globalIdx ? { ...r, skipped: true } : r)),
    )
    advanceReview()
  }

  function trackItem(idx: number) {
    const item = unmatchedItems[idx]
    if (!item) return
    const globalIdx = reviewItems.findIndex((r) => r === item)
    const prefill = (item.suggestedGenericName ?? item.itemName).toUpperCase()
    setReviewItems((prev) =>
      prev.map((r, i) => (i === globalIdx ? { ...r, mappedMaterialName: prefill } : r)),
    )
    setTrackingIdx(idx)
  }

  function updateItemName(idx: number, name: string) {
    const item = unmatchedItems[idx]
    if (!item) return
    const globalIdx = reviewItems.findIndex((r) => r === item)
    setReviewItems((prev) =>
      prev.map((r, i) => (i === globalIdx ? { ...r, mappedMaterialName: name.toUpperCase() } : r)),
    )
  }

  function setShowPickerForIdx(idx: number) {
    const item = unmatchedItems[idx]
    if (!item) return
    const globalIdx = reviewItems.findIndex((r) => r === item)
    setReviewItems((prev) =>
      prev.map((r, i) => (i === globalIdx ? { ...r, showPicker: true } : r)),
    )
  }

  function linkToExisting(idx: number, materialId: string, typedName?: string) {
    const item = unmatchedItems[idx]
    if (!item) return
    const globalIdx = reviewItems.findIndex((r) => r === item)
    if (materialId === '__new__') {
      const nameToUse = typedName?.trim() ? typedName.trim().toUpperCase() : item.itemName
      setReviewItems((prev) =>
        prev.map((r, i) =>
          i === globalIdx ? { ...r, mappedMaterialId: null, mappedMaterialName: nameToUse, showPicker: false } : r,
        ),
      )
    } else {
      const mat = materials.find((m) => m.id === materialId)
      saveMapping(fields.supplierName, item.itemName, materialId)
      setReviewItems((prev) =>
        prev.map((r, i) =>
          i === globalIdx
            ? { ...r, mappedMaterialId: materialId, mappedMaterialName: mat?.name ?? item.itemName, showPicker: false }
            : r,
        ),
      )
      advanceReview()
    }
  }

  function openSplit(confirmIdx: number) {
    const item = confirmedItems[confirmIdx]
    if (!item) return
    const globalIdx = reviewItems.indexOf(item)
    if (item.splits.length === 0) {
      setReviewItems((prev) =>
        prev.map((r, ri) =>
          ri === globalIdx
            ? {
                ...r,
                splits: [
                  { mappedMaterialId: item.mappedMaterialId, mappedMaterialName: item.mappedMaterialName, quantity: String(item.quantity), unit: item.unit },
                  { mappedMaterialId: null, mappedMaterialName: '', quantity: '', unit: item.unit },
                ],
              }
            : r,
        ),
      )
    }
    setSplittingIdx(confirmIdx)
    setEditingConfirmIdx(null)
    setEditingUnitIdx(null)
  }

  function updateSplit(confirmIdx: number, splitIdx: number, patch: Partial<SplitItem>) {
    const item = confirmedItems[confirmIdx]
    if (!item) return
    const globalIdx = reviewItems.indexOf(item)
    setReviewItems((prev) =>
      prev.map((r, ri) =>
        ri === globalIdx
          ? { ...r, splits: r.splits.map((s, si) => si === splitIdx ? { ...s, ...patch } : s) }
          : r,
      ),
    )
  }

  function addSplitRow(confirmIdx: number) {
    const item = confirmedItems[confirmIdx]
    if (!item) return
    const globalIdx = reviewItems.indexOf(item)
    setReviewItems((prev) =>
      prev.map((r, ri) =>
        ri === globalIdx
          ? { ...r, splits: [...r.splits, { mappedMaterialId: null, mappedMaterialName: '', quantity: '', unit: '' }] }
          : r,
      ),
    )
  }

  function removeSplitRow(confirmIdx: number, splitIdx: number) {
    const item = confirmedItems[confirmIdx]
    if (!item) return
    const globalIdx = reviewItems.indexOf(item)
    setReviewItems((prev) =>
      prev.map((r, ri) =>
        ri === globalIdx
          ? { ...r, splits: r.splits.filter((_, si) => si !== splitIdx) }
          : r,
      ),
    )
  }

  function clearSplits(confirmIdx: number) {
    const item = confirmedItems[confirmIdx]
    if (!item) return
    const globalIdx = reviewItems.indexOf(item)
    setReviewItems((prev) =>
      prev.map((r, ri) => ri === globalIdx ? { ...r, splits: [] } : r),
    )
    setSplittingIdx(null)
  }

  async function handleConfirm() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setPhase('saving')
    setError(null)
    const activeItems = reviewItems.filter((i) => !i.deleted && !i.skipped && !isFeeItem(i.itemName))

    // Flatten splits into individual payload items, tracking variant queues by submit index
    type PayloadItem = {
      rawMaterialId?: string
      rawMaterialName: string
      purchasedAs?: string
      quantity: number
      purchaseUnit: string
      pricePerUnit?: number
      totalPrice?: number
    }
    const payloadItems: PayloadItem[] = []
    const variantQueue: { names: string[] }[] = []

    for (const item of activeItems) {
      const validSplits = item.splits.filter((s) => s.mappedMaterialName.trim() && Number(s.quantity) > 0)
      if (validSplits.length > 0) {
        for (const s of validSplits) {
          payloadItems.push({
            rawMaterialId: s.mappedMaterialId ?? undefined,
            rawMaterialName: s.mappedMaterialName.toUpperCase(),
            quantity: Number(s.quantity),
            purchaseUnit: s.unit || item.unit,
          })
          variantQueue.push({ names: [] })
        }
      } else {
        payloadItems.push({
          rawMaterialId: item.mappedMaterialId ?? undefined,
          rawMaterialName: item.mappedMaterialName.toUpperCase(),
          ...(item.itemName.toUpperCase() !== item.mappedMaterialName.toUpperCase() ? { purchasedAs: item.itemName.toUpperCase() } : {}),
          quantity: item.quantity,
          purchaseUnit: item.unit,
          ...(item.unitPrice !== null ? { pricePerUnit: item.unitPrice } : {}),
          ...(item.totalPrice !== null ? { totalPrice: item.totalPrice } : {}),
        })
        variantQueue.push({ names: item.pendingVariantNames })
      }
    }

    try {
      const draft = await apiFetch<{ id: string }>('/api/v1/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierName: fields.supplierName || undefined,
          receiptDate: fields.receiptDate || undefined,
          totalAmount: fields.totalAmount !== '' ? parseFloat(fields.totalAmount) : undefined,
          items: payloadItems,
        }),
        token: freshToken,
      })
      const submitted = await apiFetch<{ items: Array<{ id: string; rawMaterialId: string | null }> }>(
        `/api/v1/purchases/${draft.id}/submit`,
        { method: 'POST', token: freshToken },
      )
      for (let i = 0; i < variantQueue.length; i++) {
        const { names } = variantQueue[i]!
        if (!names.length) continue
        const submittedItem = submitted?.items?.[i]
        if (!submittedItem?.rawMaterialId) continue
        for (const variantName of names) {
          try {
            await apiFetch(`/api/v1/raw-materials/${submittedItem.rawMaterialId}/variants`, {
              method: 'POST',
              body: JSON.stringify({ name: variantName }),
              token: freshToken,
            })
          } catch { /* non-fatal */ }
        }
      }
      localStorage.removeItem(DRAFT_KEY)
      navigate('/purchases')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('purchases_saveError'))
      setPhase('confirm')
    }
  }

  const currentUnmatchedItem = unmatchedItems[reviewIdx] as ReviewItem | undefined
  const confirmedItems = reviewItems.filter((i) => !i.deleted && !i.skipped && !isFeeItem(i.itemName))

  const backButton = (
    <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8 flex flex-col">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          {backButton}
          <h1 className="text-base font-semibold text-gray-900 flex-1">{t('purchases_scan')}</h1>
          {phase !== 'upload' && phase !== 'saving' && (
            <button onClick={discardDraft} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Discard
            </button>
          )}
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        {backButton}
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('purchases_scan')}</h1>
        {phase !== 'upload' && phase !== 'saving' && (
          <button onClick={discardDraft} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
            Discard draft
          </button>
        )}
      </header>

      <div className={phase === 'upload' ? 'flex-1 flex flex-col items-center justify-center p-4 w-full' : 'p-4 md:px-8 md:py-6 md:max-w-4xl mx-auto w-full'}>

        {/* Upload phase */}
        {phase === 'upload' && (
          <div className="space-y-4 w-full max-w-lg">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click() }}
              className="bg-white border-2 border-dashed border-sky-300 rounded-2xl p-16 text-center cursor-pointer hover:border-sky-400 transition-colors flex flex-col items-center justify-center min-h-64"
            >
              {uploading ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mx-auto" />
                  <p className="text-sm text-gray-500">{t('purchases_extracting')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{t('purchases_takePhoto')}</p>
                  <p className="text-xs text-gray-500">{t('purchases_takePhotoDesc')}</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button onClick={() => navigate('/purchases/new')} className="w-full text-sky-600 text-sm font-medium py-2">
              {t('purchases_manualEntry')}
            </button>
          </div>
        )}

        {/* Summary phase */}
        {phase === 'summary' && (
          <div className="space-y-4">
            {/* Purchase header fields */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('purchases_supplier')}</label>
                <input type="text" value={fields.supplierName} onChange={updateField('supplierName')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('purchases_date')}</label>
                  <input type="date" value={fields.receiptDate} onChange={updateField('receiptDate')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('purchases_totalAmount')} (RM)</label>
                  <input type="number" inputMode="decimal" min="0" step="0.01" value={fields.totalAmount} onChange={updateField('totalAmount')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-3">
              <p className="font-semibold text-gray-900">Receipt has {reviewItems.length} items</p>
              {matchedItems.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-gray-700">{matchedItems.length} items — already in your stock. Matched.</span>
                </div>
              )}
              {unmatchedItems.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-amber-500">?</span>
                  <span className="text-sm text-gray-700">{unmatchedItems.length} new item{unmatchedItems.length !== 1 ? 's' : ''} — we need your help to identify them.</span>
                </div>
              )}
              {feeItems.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">✕</span>
                  <span className="text-sm text-gray-500">{feeItems.length} items — fees/taxes, we'll skip them.</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setPhase('review')}
              className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm"
            >
              Review {unmatchedItems.length} items →
            </button>
          </div>
        )}

        {/* Review phase — one unmatched item at a time */}
        {phase === 'review' && currentUnmatchedItem && (
          <div className="space-y-4">
            {/* Case A: LLM matched to existing and user has NOT rejected */}
            {currentUnmatchedItem.suggestedRawMaterialId !== null && !rejectedSuggestions.has(reviewIdx) && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                  <p className="text-xs text-gray-400 mb-1">{currentUnmatchedItem.itemName}</p>
                  <p className="text-sm text-gray-600">
                    {currentUnmatchedItem.quantity} {currentUnmatchedItem.unit}
                    {currentUnmatchedItem.totalPrice ? ` · RM ${currentUnmatchedItem.totalPrice.toFixed(2)}` : ''}
                  </p>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900 mb-3">Is this the same as:</p>
                    <button
                      onClick={() => confirmSuggestion(reviewIdx)}
                      className="w-full flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-700"
                    >
                      <span>✓</span> Yes — {currentUnmatchedItem.suggestedGenericName}
                    </button>
                    <button
                      onClick={() => rejectSuggestion(reviewIdx)}
                      className="w-full mt-2 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
                    >
                      <span>✕</span> No, it's different
                    </button>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400">Item {reviewIdx + 1} of {unmatchedItems.length}</p>
              </div>
            )}

            {/* Case B: New item OR rejected suggestion — not yet tracking */}
            {(currentUnmatchedItem.suggestedRawMaterialId === null || rejectedSuggestions.has(reviewIdx)) &&
              trackingIdx !== reviewIdx &&
              !currentUnmatchedItem.showPicker && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{currentUnmatchedItem.itemName}</p>
                    <p className="text-sm text-gray-600">
                      {currentUnmatchedItem.quantity} {currentUnmatchedItem.unit}
                      {currentUnmatchedItem.totalPrice ? ` · RM ${currentUnmatchedItem.totalPrice.toFixed(2)}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-3">Do you want to track this in your stock?</p>
                    <button
                      onClick={() => trackItem(reviewIdx)}
                      className="w-full flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded-xl text-sm font-medium text-sky-700 mb-2"
                    >
                      <span>✓</span> Yes, track this item
                    </button>
                    <button
                      onClick={() => skipItem(reviewIdx)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600"
                    >
                      <span>✕</span> No, skip it
                    </button>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400">Item {reviewIdx + 1} of {unmatchedItems.length}</p>
              </div>
            )}

            {/* Case B: tracking — name editing sub-view */}
            {trackingIdx === reviewIdx && !currentUnmatchedItem.showPicker && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-3">
                  <p className="text-xs text-gray-400 mb-1">{currentUnmatchedItem.itemName}</p>
                  <p className="text-sm font-medium text-gray-900">What do you call this item?</p>
                  <input
                    type="text"
                    value={currentUnmatchedItem.mappedMaterialName}
                    onChange={(e) => updateItemName(reviewIdx, e.target.value)}
                    className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-xs text-gray-400">Use a simple name, e.g. "TEPUNG GANDUM" not "TEPUNG GANDUM CAP SAWAH"</p>
                  <button
                    onClick={() => advanceReview()}
                    className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm"
                  >
                    Save & next →
                  </button>
                  <button
                    onClick={() => setShowPickerForIdx(reviewIdx)}
                    className="block w-full text-center text-xs text-sky-600 font-medium"
                  >
                    Link to existing item instead →
                  </button>
                </div>
                <p className="text-xs text-center text-gray-400">Item {reviewIdx + 1} of {unmatchedItems.length}</p>
              </div>
            )}

            {/* Picker sub-view */}
            {currentUnmatchedItem.showPicker && (() => {
              const topMatches = [...materials]
                .map((m) => ({ m, score: fuzzyScore(currentUnmatchedItem.itemName, m.name) }))
                .filter(({ score }) => score > 0.3)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-3">
                    <p className="text-xs text-gray-400 mb-1">{currentUnmatchedItem.itemName}</p>
                    <p className="text-sm font-medium text-gray-900">Search your stock:</p>
                    {topMatches.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">Quick picks:</p>
                        <div className="flex flex-wrap gap-2">
                          {topMatches.map(({ m }) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => linkToExisting(reviewIdx, m.id)}
                              className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium rounded-full hover:bg-sky-100 transition-colors"
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <SearchableSelect
                      value={currentUnmatchedItem.mappedMaterialId ?? '__new__'}
                      onChange={(id, typedName) => linkToExisting(reviewIdx, id, typedName)}
                      options={materials.map((m) => ({ id: m.id, label: m.name, sublabel: m.baseUnit }))}
                      createOption={{ id: '__new__', label: (q) => q ? `Add as new: "${q.toUpperCase()}" →` : 'Add as new item →' }}
                      placeholder="Type to search..."
                      searchPlaceholder="Search or type a name to add new…"
                    />
                  </div>
                  <p className="text-xs text-center text-gray-400">Item {reviewIdx + 1} of {unmatchedItems.length}</p>
                </div>
              )
            })()}
          </div>
        )}

        {/* Confirm phase */}
        {phase === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-900">
              These {confirmedItems.length} items will be saved. Check the mappings below.
            </p>
            {confirmedItems.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card divide-y divide-gray-50">
                {confirmedItems.map((item, i) => {
                  const isNew = item.mappedMaterialId === null
                  const globalIdx = reviewItems.indexOf(item)
                  const isEditing = editingConfirmIdx === i
                  const isSplitting = splittingIdx === i
                  const hasSplits = item.splits.length > 0
                  return (
                    <div key={i} className="px-4 py-3 space-y-2">
                      {/* Receipt line */}
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">From receipt</p>
                      <p className="text-xs font-medium text-gray-700">{item.itemName.toUpperCase()}</p>

                      {/* Material change panel */}
                      {isEditing && (
                        <div className="space-y-2 bg-sky-50 rounded-xl p-3">
                          <p className="text-xs font-medium text-gray-700">Select material or type a name:</p>
                          <SearchableSelect
                            autoOpen
                            value={item.mappedMaterialId ?? '__new__'}
                            onChange={(id, typedName) => {
                              if (id === '__new__') {
                                const nameToUse = typedName?.trim() ? typedName.trim().toUpperCase() : item.itemName
                                setReviewItems((prev) =>
                                  prev.map((r, ri) =>
                                    ri === globalIdx ? { ...r, mappedMaterialId: null, mappedMaterialName: nameToUse } : r,
                                  ),
                                )
                              } else {
                                const mat = materials.find((m) => m.id === id)
                                setReviewItems((prev) =>
                                  prev.map((r, ri) =>
                                    ri === globalIdx
                                      ? { ...r, mappedMaterialId: id, mappedMaterialName: mat?.name ?? item.itemName }
                                      : r,
                                  ),
                                )
                              }
                              setEditingConfirmIdx(null)
                            }}
                            options={materials.map((m) => ({ id: m.id, label: m.name.toUpperCase(), sublabel: m.baseUnit }))}
                            createOption={{ id: '__new__', label: (q) => q ? `Create "${q.toUpperCase()}" as new material` : `Create "${item.itemName.toUpperCase()}" as new material` }}
                            placeholder="Search materials…"
                            searchPlaceholder="Search or type a name to add new…"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingConfirmIdx(null)}
                            className="text-xs text-gray-400 w-full text-center py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Split editor */}
                      {isSplitting && (
                        <div className="space-y-3 bg-sky-50 rounded-xl p-3">
                          <p className="text-xs font-medium text-gray-600">Split into separate stock items:</p>
                          {item.splits.map((s, si) => (
                            <div key={si} className="space-y-1.5 pb-3 border-b border-sky-100 last:border-0 last:pb-0">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <SearchableSelect
                                    value={s.mappedMaterialId ?? '__new__'}
                                    onChange={(id, typedName) => {
                                      if (id === '__new__') {
                                        updateSplit(i, si, { mappedMaterialId: null, mappedMaterialName: typedName?.trim().toUpperCase() ?? '' })
                                      } else {
                                        const mat = materials.find((m) => m.id === id)
                                        updateSplit(i, si, { mappedMaterialId: id, mappedMaterialName: mat?.name ?? '' })
                                      }
                                    }}
                                    options={materials.map((m) => ({ id: m.id, label: m.name, sublabel: m.baseUnit }))}
                                    createOption={{ id: '__new__', label: (q) => q ? `Add "${q.toUpperCase()}"` : 'Add new item…' }}
                                    placeholder="Material name…"
                                    searchPlaceholder="Search or add new…"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSplitRow(i, si)}
                                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={s.quantity}
                                  onChange={(e) => updateSplit(i, si, { quantity: e.target.value })}
                                  placeholder="Qty"
                                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-sky-400"
                                />
                                <div className="flex-1">
                                  <UnitSelect value={s.unit} onChange={(u) => updateSplit(i, si, { unit: u })} />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addSplitRow(i)}
                            className="text-xs text-sky-600 font-medium"
                          >
                            + Add item
                          </button>
                          <div className="flex items-center gap-3 pt-1 border-t border-sky-100">
                            <button
                              type="button"
                              onClick={() => setSplittingIdx(null)}
                              className="flex-1 bg-sky-500 text-white font-semibold py-2 rounded-xl text-xs"
                            >
                              Done
                            </button>
                            <button
                              type="button"
                              onClick={() => clearSplits(i)}
                              className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                            >
                              Remove split
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Normal single-item row */}
                      {!isEditing && !isSplitting && !hasSplits && (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="text-sm font-semibold text-gray-900 truncate">
                                {item.mappedMaterialName.toUpperCase()}
                              </span>
                              {isNew ? (
                                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">New</span>
                              ) : (
                                <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Existing</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUnitIdx(editingUnitIdx === i ? null : i)
                                  setEditingUnitQty(String(item.quantity))
                                }}
                                className="text-xs text-gray-400 hover:text-sky-600 border-b border-dashed border-gray-300 hover:border-sky-400 transition-colors"
                              >
                                {item.quantity} {item.unit}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => { openSplit(i); setEditingUnitIdx(null) }}
                                className="text-xs text-sky-600 font-medium px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                              >
                                Split
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingConfirmIdx(i); setEditingUnitIdx(null) }}
                                className="text-xs text-sky-600 font-medium px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                              >
                                Change
                              </button>
                            </div>
                          </div>
                          {/* Unit override panel */}
                          {editingUnitIdx === i && (
                            <div className="flex items-center gap-2 bg-sky-50 rounded-xl p-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={editingUnitQty}
                                onChange={(e) => setEditingUnitQty(e.target.value)}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-sky-400"
                              />
                              <div className="flex-1">
                                <UnitSelect
                                  value={item.unit}
                                  onChange={(u) => {
                                    if (!u) return
                                    setReviewItems((prev) =>
                                      prev.map((r, ri) =>
                                        ri === globalIdx
                                          ? { ...r, quantity: parseFloat(editingUnitQty) || r.quantity, unit: u }
                                          : r,
                                      ),
                                    )
                                    setEditingUnitIdx(null)
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingUnitIdx(null)}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Splits summary */}
                      {!isEditing && !isSplitting && hasSplits && (
                        <div className="space-y-1.5">
                          {item.splits.map((s, si) => (
                            <div key={si} className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-gray-900">{s.mappedMaterialName || '—'}</span>
                              {s.quantity && <span className="text-gray-400">{s.quantity} {s.unit}</span>}
                            </div>
                          ))}
                          <div className="flex items-center gap-3 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setSplittingIdx(i)}
                              className="text-xs text-sky-600 font-medium"
                            >
                              Edit splits
                            </button>
                            <button
                              type="button"
                              onClick={() => clearSplits(i)}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              Remove split
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Brands / Variants — only for new single-material items */}
                      {isNew && !isEditing && !isSplitting && !hasSplits && (
                        <div className="mt-2 border-t border-gray-100 pt-2 space-y-1.5">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Other brands for this material</p>
                          {item.pendingVariantNames.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.pendingVariantNames.map((v) => (
                                <span key={v} className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full">
                                  {v}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReviewItems((prev) =>
                                        prev.map((r, ri) =>
                                          ri === globalIdx
                                            ? { ...r, pendingVariantNames: r.pendingVariantNames.filter((n) => n !== v) }
                                            : r,
                                        ),
                                      )
                                    }
                                    className="text-sky-400 hover:text-sky-600"
                                  >×</button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={variantInputs[i] ?? ''}
                              onChange={(e) => setVariantInputs((prev) => ({ ...prev, [i]: e.target.value.toUpperCase() }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const val = (variantInputs[i] ?? '').trim()
                                  if (!val || item.pendingVariantNames.includes(val)) return
                                  setReviewItems((prev) =>
                                    prev.map((r, ri) =>
                                      ri === globalIdx
                                        ? { ...r, pendingVariantNames: [...r.pendingVariantNames, val] }
                                        : r,
                                    ),
                                  )
                                  setVariantInputs((prev) => ({ ...prev, [i]: '' }))
                                }
                              }}
                              placeholder="e.g. CAP LAYAR"
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (variantInputs[i] ?? '').trim()
                                if (!val || item.pendingVariantNames.includes(val)) return
                                setReviewItems((prev) =>
                                  prev.map((r, ri) =>
                                    ri === globalIdx
                                      ? { ...r, pendingVariantNames: [...r.pendingVariantNames, val] }
                                      : r,
                                  ),
                                )
                                setVariantInputs((prev) => ({ ...prev, [i]: '' }))
                              }}
                              className="text-xs bg-sky-100 text-sky-700 font-medium px-2 py-1.5 rounded-lg hover:bg-sky-200 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {confirmedItems.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 text-center">
                <p className="text-sm text-gray-400">No items to save.</p>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={() => void handleConfirm()}
              className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm"
            >
              Yes, all good
            </button>
          </div>
        )}

        {/* Saving phase */}
        {phase === 'saving' && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">{t('common_saving')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

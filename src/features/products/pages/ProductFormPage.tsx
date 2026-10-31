import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ArchiveDialog from '../../../components/ArchiveDialog'
import UnitSelect from '../../../components/UnitSelect'
import { useT } from '../../../hooks/useT'

type FormData = {
  name: string
  sku: string
  salePrice: string
  finishedGoodsUnit: string
}

type Product = {
  id: string
  name: string
  sku: string | null
  salePrice: string | null
  unit: string
  imageUrl: string | null
  expiryDate: string | null
}

const EMPTY: FormData ={ name: '', sku: '', salePrice: '', finishedGoodsUnit: 'pcs' }
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'
const MAX_SIZE_MB = 5

const BackArrow = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

export default function ProductFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const isEdit = !!id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [archiveDialog, setArchiveDialog] = useState<{ usageLines: string[] } | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryDurationDays, setExpiryDurationDays] = useState('')

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)

  useEffect(() => {
    if (!isEdit || !token) return
    void apiFetch<Product>(`/api/v1/products/${id}`, { token })
      .then((p) => {
        setForm({
          name: p.name,
          sku: p.sku ?? '',
          salePrice: p.salePrice !== null ? String(p.salePrice) : '',
          finishedGoodsUnit: p.unit,
        })
        if (p.imageUrl) {
          setImageUrl(p.imageUrl)
          setImagePreview(p.imageUrl)
        }
        if (p.expiryDate) {
          setExpiryDate(new Date(p.expiryDate).toISOString().slice(0, 16))
        }
        if ((p as any).expiryDurationDays) {
          setExpiryDurationDays(String((p as any).expiryDurationDays))
        }
        setLoading(false)
      })
      .catch(() => {
        setError(t('products_loadError'))
        setLoading(false)
      })
  }, [id, isEdit, token])

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB`)
      return
    }

    // Show local preview immediately
    setImagePreview(URL.createObjectURL(file))
    setImageUploading(true)
    setError(null)

    try {
      const freshToken = await refreshToken()
      if (!freshToken) return

      const { uploadUrl, publicUrl } = await apiFetch<{
        uploadUrl: string | null
        key: string | null
        publicUrl: string
      }>('/api/v1/uploads/product-image/presigned', {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, fileSizeBytes: file.size }),
        token: freshToken,
      })

      if (uploadUrl) {
        // Real R2 — PUT directly to the presigned URL
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      }

      setImageUrl(publicUrl)
    } catch {
      setError('Image upload failed. Try again.')
      setImagePreview(imageUrl) // revert preview to existing image
    } finally {
      setImageUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('products_nameRequired')); return }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      salePrice: form.salePrice !== '' ? parseFloat(form.salePrice) : null,
      unit: form.finishedGoodsUnit.trim() || 'pcs',
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      expiryDurationDays: expiryDurationDays !== '' ? parseInt(expiryDurationDays) : null,
    }

    try {
      if (isEdit) {
        await apiFetch(`/api/v1/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload), token: freshToken })
      } else {
        await apiFetch<{ id: string }>('/api/v1/products', { method: 'POST', body: JSON.stringify(payload), token: freshToken })
      }
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/products')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('products_saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function openArchiveDialog() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    try {
      const usage = await apiFetch<{ plannedProductions: number; activeOrders: number }>(
        `/api/v1/products/${id}/usage`,
        { token: freshToken },
      )
      const lines: string[] = []
      if (usage.plannedProductions > 0) lines.push(`${usage.plannedProductions} planned production${usage.plannedProductions !== 1 ? 's' : ''}`)
      if (usage.activeOrders > 0) lines.push(`${usage.activeOrders} active order${usage.activeOrders !== 1 ? 's' : ''}`)
      setArchiveDialog({ usageLines: lines })
    } catch {
      setError(t('products_deleteError'))
    }
  }

  async function handleArchiveConfirm() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setArchiving(true)
    try {
      await apiFetch(`/api/v1/products/${id}`, { method: 'DELETE', token: freshToken })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/products')
    } catch {
      setError(t('products_deleteError'))
      setArchiving(false)
      setArchiveDialog(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const title = isEdit ? t('products_formEditTitle') : t('products_formAddTitle')
  const imagePicker = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Product image <span className="text-gray-400 font-normal">({t('common_optional')})</span>
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={(e) => void handleImageChange(e)}
        className="sr-only"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={imageUploading}
        className="relative w-full h-32 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden hover:border-sky-300 transition-colors disabled:opacity-60"
      >
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">Change image</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5">
            {imageUploading ? (
              <p className="text-xs text-gray-400">Uploading...</p>
            ) : (
              <>
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-400">Tap to add image</p>
                <p className="text-[10px] text-gray-300">JPG, PNG, WEBP · max {MAX_SIZE_MB}MB</p>
              </>
            )}
          </div>
        )}
        {imageUploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <p className="text-xs text-sky-600 font-medium">Uploading...</p>
          </div>
        )}
      </button>
      {imagePreview && (
        <button
          type="button"
          onClick={() => { setImageUrl(null); setImagePreview(null) }}
          className="mt-1.5 text-xs text-red-400 hover:text-red-500"
        >
          Remove image
        </button>
      )}
    </div>
  )

  const fields = (
    <>
      {imagePicker}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="pname">
          {t('products_name')} <span className="text-red-500">*</span>
        </label>
        <input
          id="pname"
          type="text"
          value={form.name}
          onChange={updateField('name')}
          placeholder={t('products_namePlaceholder')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sku">
          {t('products_sku')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
        </label>
        <input
          id="sku"
          type="text"
          value={form.sku}
          onChange={updateField('sku')}
          placeholder={t('products_skuPlaceholder')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="sale-price">
          {t('products_salePrice')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
        </label>
        <input
          id="sale-price"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.salePrice}
          onChange={updateField('salePrice')}
          placeholder="e.g. 3.50"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="fg-unit">
          {t('products_unit')} <span className="text-red-500">*</span>
        </label>
        <UnitSelect
          id="fg-unit"
          value={form.finishedGoodsUnit}
          onChange={(val) => setForm((prev) => ({ ...prev, finishedGoodsUnit: val }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Expiry duration <span className="text-gray-400 font-normal">(days, optional)</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={expiryDurationDays}
          onChange={(e) => setExpiryDurationDays(e.target.value)}
          placeholder="e.g. 3"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <p className="text-xs text-gray-400 mt-1">When a production completes, expiry date auto-sets to completion date + this many days.</p>
      </div>


      {error && <p className="text-sm text-red-600">{error}</p>}
    </>
  )

  const submitLabel = saving ? t('common_saving') : t('common_save')

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <BackArrow />
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">{title}</h1>
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t('common_back')}>
          <BackArrow />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{title}</h1>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">

        {/* Mobile form */}
        <form onSubmit={handleSubmit} className="md:hidden p-4 space-y-4">
          {fields}
          <button type="submit" disabled={saving || imageUploading} className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
            {submitLabel}
          </button>
          {isEdit && (
            <button type="button" onClick={() => void openArchiveDialog()} disabled={saving} className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60">
              Archive
            </button>
          )}
        </form>

        {/* Desktop card form */}
        <form onSubmit={handleSubmit} className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-card">
          <div className="p-6 space-y-5">
            {fields}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            {isEdit ? (
              <button type="button" onClick={() => void openArchiveDialog()} disabled={saving} className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors disabled:opacity-60">
                Archive
              </button>
            ) : <div />}
            <button type="submit" disabled={saving || imageUploading} className="bg-sky-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-sky-600 transition-colors disabled:opacity-60">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>

      {archiveDialog && (
        <ArchiveDialog
          title="Archive this product?"
          description="The product will be hidden from active lists and cannot be selected for new orders or productions."
          usageLines={archiveDialog.usageLines}
          onConfirm={() => void handleArchiveConfirm()}
          onCancel={() => setArchiveDialog(null)}
          confirming={archiving}
        />
      )}
    </div>
  )
}

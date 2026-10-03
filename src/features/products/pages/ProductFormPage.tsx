import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'

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
  salePrice: number | null
  finishedGoodsUnit: string
}

const EMPTY: FormData = { name: '', sku: '', salePrice: '', finishedGoodsUnit: 'pcs' }

export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !token) return
    void apiFetch<Product>(`/api/v1/products/${id}`, { token })
      .then((p) => {
        setForm({
          name: p.name,
          sku: p.sku ?? '',
          salePrice: p.salePrice !== null ? String(p.salePrice) : '',
          finishedGoodsUnit: p.finishedGoodsUnit,
        })
        setLoading(false)
      })
      .catch(() => {
        setError('Gagal memuatkan produk.')
        setLoading(false)
      })
  }, [id, isEdit, token])

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nama diperlukan.'); return }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      salePrice: form.salePrice !== '' ? parseFloat(form.salePrice) : null,
      finishedGoodsUnit: form.finishedGoodsUnit.trim() || 'pcs',
    }

    try {
      if (isEdit) {
        await apiFetch(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(payload), token })
        navigate(`/products/${id}/recipe`)
      } else {
        const created = await apiFetch<{ id: string }>('/api/v1/products', { method: 'POST', body: JSON.stringify(payload), token })
        navigate(`/products/${created.id}/recipe`)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal menyimpan. Cuba lagi.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Padam produk ini? Tindakan ini tidak boleh dibatalkan.')) return
    setSaving(true)
    try {
      await apiFetch(`/api/v1/products/${id}`, { method: 'DELETE', token })
      navigate('/products')
    } catch {
      setError('Gagal memadam. Cuba lagi.')
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">
            {isEdit ? 'Edit produk' : 'Tambah produk'}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pname">
            Nama produk <span className="text-red-500">*</span>
          </label>
          <input
            id="pname"
            type="text"
            value={form.name}
            onChange={updateField('name')}
            placeholder="Cth: Karipap Sardin"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sku">
            SKU / Kod produk <span className="text-gray-400">(pilihan)</span>
          </label>
          <input
            id="sku"
            type="text"
            value={form.sku}
            onChange={updateField('sku')}
            placeholder="Cth: KS-001"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sale-price">
            Harga jual (RM) <span className="text-gray-400">(pilihan)</span>
          </label>
          <input
            id="sale-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.salePrice}
            onChange={updateField('salePrice')}
            placeholder="Cth: 3.50"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fg-unit">
            Unit siap
          </label>
          <input
            id="fg-unit"
            type="text"
            value={form.finishedGoodsUnit}
            onChange={updateField('finishedGoodsUnit')}
            placeholder="Cth: pcs, pack, biji"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Seterusnya: Bina resepi'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving}
            className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60"
          >
            Padam produk ini
          </button>
        )}
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import HelpDrawer from '../../../components/HelpDrawer'

type FormData = {
  name: string
  baseUnit: string
  quantityOnHand: string
  reorderLevel: string
  unitCost: string
}

type RawMaterial = {
  id: string
  name: string
  baseUnit: string
  quantityOnHand: number
  reorderLevel: number | null
  unitCost: number | null
}

const EMPTY: FormData = { name: '', baseUnit: 'kg', quantityOnHand: '0', reorderLevel: '', unitCost: '' }

export default function RawMaterialFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (!isEdit || !token) return
    void apiFetch<RawMaterial>(`/api/v1/raw-materials/${id}`, { token }).then((rm) => {
      setForm({
        name: rm.name,
        baseUnit: rm.baseUnit,
        quantityOnHand: String(rm.quantityOnHand),
        reorderLevel: rm.reorderLevel !== null ? String(rm.reorderLevel) : '',
        unitCost: rm.unitCost !== null ? String(rm.unitCost) : '',
      })
      setLoading(false)
    }).catch(() => {
      setError('Gagal memuatkan bahan.')
      setLoading(false)
    })
  }, [id, isEdit, token])

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      baseUnit: form.baseUnit.trim(),
      quantityOnHand: parseFloat(form.quantityOnHand) || 0,
      reorderLevel: form.reorderLevel !== '' ? parseFloat(form.reorderLevel) : null,
      unitCost: form.unitCost !== '' ? parseFloat(form.unitCost) : null,
    }

    try {
      if (isEdit) {
        await apiFetch(`/api/v1/raw-materials/${id}`, { method: 'PUT', body: JSON.stringify(payload), token })
      } else {
        await apiFetch('/api/v1/raw-materials', { method: 'POST', body: JSON.stringify(payload), token })
      }
      navigate('/raw-materials')
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
    if (!confirm('Padam bahan ini? Tindakan ini tidak boleh dibatalkan.')) return
    setSaving(true)
    try {
      await apiFetch(`/api/v1/raw-materials/${id}`, { method: 'DELETE', token })
      navigate('/raw-materials')
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
            {isEdit ? 'Edit bahan mentah' : 'Tambah bahan mentah'}
          </h1>
          <button onClick={() => setHelpOpen(true)} className="text-gray-400" aria-label="Bantuan">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rm-name">
            Nama bahan <span className="text-red-500">*</span>
          </label>
          <input
            id="rm-name"
            type="text"
            value={form.name}
            onChange={updateField('name')}
            placeholder="Cth: Tepung gandum"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="base-unit">
            Unit asas <span className="text-red-500">*</span>
          </label>
          <input
            id="base-unit"
            type="text"
            value={form.baseUnit}
            onChange={updateField('baseUnit')}
            placeholder="Cth: kg, liter, biji"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="qty">
            Kuantiti semasa ({form.baseUnit || 'unit'})
          </label>
          <input
            id="qty"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.quantityOnHand}
            onChange={updateField('quantityOnHand')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reorder">
            Paras amaran rendah <span className="text-gray-400">(pilihan)</span>
          </label>
          <input
            id="reorder"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.reorderLevel}
            onChange={updateField('reorderLevel')}
            placeholder={`Cth: 5 ${form.baseUnit}`}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cost">
            Kos per unit (RM) <span className="text-gray-400">(pilihan)</span>
          </label>
          <input
            id="cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.unitCost}
            onChange={updateField('unitCost')}
            placeholder="Cth: 2.50"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving}
            className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60"
          >
            Padam bahan ini
          </button>
        )}
      </form>

      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Tentang bahan mentah">
        <p>Bahan mentah ialah bahan yang anda beli dan guna untuk menghasilkan produk.</p>
        <p><strong>Unit asas</strong> — unit terkecil yang anda simpan, cth: kg, liter, biji.</p>
        <p><strong>Paras amaran</strong> — anda akan dimaklumkan apabila stok jatuh ke paras ini.</p>
        <p><strong>Kos per unit</strong> — digunakan untuk kira kos setiap produk secara automatik.</p>
      </HelpDrawer>
    </div>
  )
}

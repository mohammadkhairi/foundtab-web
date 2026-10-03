import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'

type RawMaterial = {
  id: string
  name: string
  baseUnit: string
}

type RecipeLine = {
  rawMaterialId: string
  name: string
  quantity: string
  unit: string
}

type RecipeResponse = {
  productId: string
  lines: Array<{ rawMaterialId: string; quantity: number; unit: string }>
}

export default function RecipeBuilderPage() {
  const navigate = useNavigate()
  const { id: productId } = useParams<{ id: string }>()
  const { token } = useAuth()

  const [lines, setLines] = useState<RecipeLine[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const { data: materialsData, isLoading: materialsLoading } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: () =>
      apiFetch<{ items: RawMaterial[] }>('/api/v1/raw-materials', { token }),
    enabled: !!token,
  })

  useEffect(() => {
    if (!productId || !token) return
    void apiFetch<RecipeResponse>(`/api/v1/products/${productId}/recipe`, { token })
      .then((recipe) => {
        const materialMap = new Map((materialsData?.items ?? []).map((m) => [m.id, m]))
        setLines(
          recipe.lines.map((l) => ({
            rawMaterialId: l.rawMaterialId,
            name: materialMap.get(l.rawMaterialId)?.name ?? l.rawMaterialId,
            quantity: String(l.quantity),
            unit: l.unit,
          })),
        )
      })
      .catch(() => {
        // No recipe yet — start empty
      })
  }, [productId, token, materialsData])

  function addMaterial(material: RawMaterial) {
    const already = lines.find((l) => l.rawMaterialId === material.id)
    if (already) { setShowPicker(false); return }
    setLines((prev) => [
      ...prev,
      { rawMaterialId: material.id, name: material.name, quantity: '1', unit: material.baseUnit },
    ])
    setShowPicker(false)
  }

  function updateQuantity(idx: number, value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: value } : l)))
  }

  function updateUnit(idx: number, value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unit: value } : l)))
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/v1/products/${productId}/recipe`, {
        method: 'PUT',
        body: JSON.stringify({
          lines: lines.map((l) => ({
            rawMaterialId: l.rawMaterialId,
            quantity: parseFloat(l.quantity) || 0,
            unit: l.unit,
          })),
        }),
        token,
      })
      navigate('/products')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal menyimpan resepi. Cuba lagi.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (materialsLoading) return <LoadingSpinner />

  const materials = materialsData?.items ?? []
  const unaddedMaterials = materials.filter((m) => !lines.find((l) => l.rawMaterialId === m.id))

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1" data-tour="product-recipe">
            Bina resepi
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">
          Tambah bahan-bahan yang diperlukan untuk hasilkan 1 unit produk ini.
        </p>

        {lines.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">Belum ada bahan dalam resepi.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((line, idx) => (
              <li key={line.rawMaterialId} className="bg-white rounded-2xl border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 flex-1 truncate">{line.name}</p>
                  <button
                    onClick={() => removeLine(idx)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    aria-label="Buang"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={line.quantity}
                    onChange={(e) => updateQuantity(idx, e.target.value)}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Kuantiti"
                  />
                  <input
                    type="text"
                    value={line.unit}
                    onChange={(e) => updateUnit(idx, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Unit"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full border-2 border-dashed border-sky-300 rounded-2xl py-3 text-sky-600 text-sm font-medium"
        >
          + Tambah bahan
        </button>

        {showPicker && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowPicker(false)}
              aria-hidden="true"
            />
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[60vh] overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold text-gray-900">Pilih bahan mentah</h3>
              </div>
              {unaddedMaterials.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">Semua bahan sudah ditambah.</p>
                </div>
              ) : (
                <ul>
                  {unaddedMaterials.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => addMaterial(m)}
                        className="w-full px-4 py-3 text-left text-sm text-gray-800 border-b border-gray-100 hover:bg-gray-50"
                      >
                        {m.name}
                        <span className="text-xs text-gray-400 ml-2">({m.baseUnit})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan resepi'}
        </button>

        <button
          onClick={() => navigate('/products')}
          className="w-full text-gray-400 text-sm py-2"
        >
          Langkau buat masa ini
        </button>
      </div>
    </div>
  )
}

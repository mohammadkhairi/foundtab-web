import type { Step } from 'react-joyride'

export type TourModule = 'dashboard' | 'rawMaterials' | 'products' | 'purchases' | 'productions' | 'orders'

const TOUR_STEPS: Record<TourModule, Step[]> = {
  dashboard: [
    {
      target: '[data-tour="dashboard-summary"]',
      title: 'Ringkasan perniagaan',
      content: 'Lihat jualan, kos dan stok anda sekilas pandang di sini.',
      skipBeacon: true,
    },
    {
      target: '[data-tour="dashboard-stock-tab"]',
      title: 'Tab stok',
      content: 'Semak stok bahan mentah dan amaran stok rendah.',
    },
    {
      target: '[data-tour="dashboard-goods-tab"]',
      title: 'Tab barangan siap',
      content: 'Jejak unit siap yang boleh dijual.',
    },
  ],
  rawMaterials: [
    {
      target: '[data-tour="raw-material-add"]',
      title: 'Tambah bahan mentah',
      content: 'Klik di sini untuk merekod bahan baru ke dalam inventori.',
      skipBeacon: true,
    },
    {
      target: '[data-tour="raw-material-list"]',
      title: 'Senarai bahan',
      content: 'Semua bahan mentah anda tersenarai di sini dengan tahap stok semasa.',
    },
  ],
  products: [
    {
      target: '[data-tour="product-add"]',
      title: 'Tambah produk',
      content: 'Cipta produk baharu yang anda jual.',
      skipBeacon: true,
    },
    {
      target: '[data-tour="product-recipe"]',
      title: 'Bina resepi',
      content: 'Tetapkan bahan-bahan yang diperlukan untuk setiap produk supaya kos dikira secara automatik.',
    },
  ],
  purchases: [
    {
      target: '[data-tour="purchase-scan"]',
      title: 'Imbas resit',
      content: 'Ambil gambar resit anda — kami akan ekstrak maklumat secara automatik.',
      skipBeacon: true,
    },
    {
      target: '[data-tour="purchase-list"]',
      title: 'Sejarah pembelian',
      content: 'Semua pembelian anda tersenarai di sini.',
    },
  ],
  productions: [
    {
      target: '[data-tour="production-log"]',
      title: 'Log pengeluaran',
      content: 'Rekodkan setiap kali anda memasak atau mengeluarkan produk.',
      skipBeacon: true,
    },
    {
      target: '[data-tour="production-history"]',
      title: 'Sejarah pengeluaran',
      content: 'Semak rekod pengeluaran lepas dan kos yang ditanggung.',
    },
  ],
  orders: [
    {
      target: '[data-tour="order-whatsapp"]',
      title: 'Import dari WhatsApp',
      content: 'Tampal mesej pesanan pelanggan — kami akan urai pesanan secara automatik.',
      skipBeacon: true,
    },
    {
      target: '[data-tour="order-list"]',
      title: 'Senarai pesanan',
      content: 'Urus semua pesanan masuk dari sini.',
    },
  ],
}

const TOUR_SEEN_KEY = 'ft-tour-seen'

function loadSeenModules(): Set<TourModule> {
  try {
    const raw = localStorage.getItem(TOUR_SEEN_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as TourModule[])
  } catch {
    return new Set()
  }
}

function markSeen(module: TourModule) {
  const seen = loadSeenModules()
  seen.add(module)
  localStorage.setItem(TOUR_SEEN_KEY, JSON.stringify([...seen]))
}

export function useOnboardingTour(module: TourModule) {
  const seen = loadSeenModules()
  const shouldRun = !seen.has(module)
  const steps = TOUR_STEPS[module] ?? []

  function onTourFinish() {
    markSeen(module)
  }

  return { steps, shouldRun, onTourFinish }
}

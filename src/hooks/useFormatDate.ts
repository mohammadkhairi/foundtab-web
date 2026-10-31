import { useLang } from '../contexts/LangContext'

export function useFormatDate() {
  const { lang } = useLang()
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(locale, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return { formatDate, formatDateTime }
}

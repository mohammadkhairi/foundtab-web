import { useLang } from '../contexts/LangContext'
import { translations, type TranslationKey } from '../i18n/translations'

export function useT() {
  const { lang } = useLang()
  return function t(key: TranslationKey): string {
    return translations[lang][key]
  }
}

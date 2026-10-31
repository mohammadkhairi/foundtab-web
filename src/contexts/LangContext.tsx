import { createContext, useContext, useState, useEffect } from 'react'
import type { Lang } from '../i18n/translations'

const LANG_KEY = 'ft-lang'

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue>({ lang: 'en', setLang: () => undefined })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_KEY)
    return stored === 'ms' ? 'ms' : 'en'
  })

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  function setLang(next: Lang) {
    setLangState(next)
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

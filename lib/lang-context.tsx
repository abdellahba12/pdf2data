'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Lang, translations, TranslationKey } from './i18n'

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'es', setLang: () => {}, t: (key) => translations.es[key],
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')

  useEffect(() => {
    const saved = localStorage.getItem('pdf2data-lang') as Lang | null
    if (saved === 'en' || saved === 'es') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('pdf2data-lang', l)
  }

  function t(key: TranslationKey): string {
    return translations[lang][key]
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() { return useContext(LangContext) }

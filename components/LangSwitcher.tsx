'use client'
import { useLang } from '@/lib/lang-context'

export default function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center gap-1 bg-cream border border-border rounded-lg p-0.5">
      <button onClick={() => setLang('es')} title="Español"
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${lang === 'es' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
        ES
      </button>
      <button onClick={() => setLang('en')} title="English"
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${lang === 'en' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
        EN
      </button>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { usePlanStore } from '@/lib/store'
import { useLang } from '@/lib/lang-context'

export default function PlanBadge() {
  const { planInfo, setPlanInfo } = usePlanStore()
  const { t } = useLang()

  useEffect(() => {
    fetch('/api/plan').then(r => r.json()).then(d => { if (d.plan) setPlanInfo(d.plan) })
  }, [setPlanInfo])

  if (!planInfo) return null

  const isFree = planInfo.plan === 'free'
  const isTrial = planInfo.plan === 'trial'
  const isPro = planInfo.plan === 'pro'

  if (isPro) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber/10 border border-amber/30 rounded-full text-xs font-semibold text-amber">
        PRO
      </span>
    )
  }

  if (isTrial && planInfo.trialDaysLeft !== null) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {planInfo.trialDaysLeft} {t('trialDaysLeft')}
      </span>
    )
  }

  if (isFree) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cream border border-border rounded-full text-xs font-medium text-ink-muted">
        {planInfo.docsRemaining >= 0 ? `${planInfo.docsRemaining} ${t('docsRemaining')}` : t('freePlan')}
      </span>
    )
  }

  return null
}

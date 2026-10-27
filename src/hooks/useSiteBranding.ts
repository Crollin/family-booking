'use client'

import { useSyncExternalStore } from 'react'

import { readPublicConfig } from '@/lib/public-config'
import { DEFAULT_SITE_NAME, DEFAULT_SITE_TAGLINE } from '@/lib/site-branding'

const subscribe = () => () => {}

/**
 * Nom et accroche du site côté client. Le rendu serveur et l'hydratation
 * utilisent les valeurs par défaut, puis la configuration injectée par le
 * serveur (`SITE_NAME`, `SITE_TAGLINE`) prend le relais sans écart d'hydratation.
 */
export function useSiteBranding(): { siteName: string; siteTagline: string } {
  const siteName = useSyncExternalStore(
    subscribe,
    () => readPublicConfig().siteName,
    () => DEFAULT_SITE_NAME
  )
  const siteTagline = useSyncExternalStore(
    subscribe,
    () => readPublicConfig().siteTagline,
    () => DEFAULT_SITE_TAGLINE
  )
  return { siteName, siteTagline }
}

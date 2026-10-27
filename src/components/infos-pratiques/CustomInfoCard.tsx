'use client'

import type { ReactNode } from 'react'
import { InfoSectionCard } from '@/components/infos-pratiques/InfoSectionCard'
import { RichInfoContent } from '@/components/infos-pratiques/RichInfoContent'
import {
  Bus,
  Home,
  Info,
  Lightbulb,
  Store,
  Ticket,
  Wifi,
  Key,
  Droplet,
  Thermometer,
  Lock,
  Power,
  Shield,
  CheckCircle2,
} from 'lucide-react'

type CustomInfoItem = {
  id: string
  title: string
  content: string
  icon?: string
  order: number
}

type CustomInfoCardProps = {
  item: CustomInfoItem
}

export function CustomInfoCard({ item }: CustomInfoCardProps) {
  const icon = resolveIcon(item.icon, item.title)

  return (
    <InfoSectionCard title={item.title} icon={icon} compact>
      <RichInfoContent content={item.content} />
    </InfoSectionCard>
  )
}

function resolveIcon(iconName: string | undefined, title: string): ReactNode {
  const props = { className: 'h-4 w-4', strokeWidth: 1.5 as const }
  const lower = title.toLowerCase()

  if (iconName) {
    const named = namedIcon(iconName, props)
    if (named) return named
  }

  if (lower.includes('commerce') || lower.includes('magasin')) {
    return <Store {...props} />
  }
  if (lower.includes('navette') || lower.includes('bus') || lower.includes('moutiers')) {
    return <Bus {...props} />
  }
  if (lower.includes('forfait') || lower.includes('ski') || lower.includes('piste')) {
    return <Ticket {...props} />
  }

  return <Info {...props} />
}

function namedIcon(
  iconName: string,
  props: { className: string; strokeWidth: number }
): ReactNode | null {
  const map: Record<string, ReactNode> = {
    key: <Key {...props} />,
    droplet: <Droplet {...props} />,
    thermometer: <Thermometer {...props} />,
    lightbulb: <Lightbulb {...props} />,
    wifi: <Wifi {...props} />,
    home: <Home {...props} />,
    lock: <Lock {...props} />,
    power: <Power {...props} />,
    shield: <Shield {...props} />,
    'check-circle': <CheckCircle2 {...props} />,
    store: <Store {...props} />,
    bus: <Bus {...props} />,
    ticket: <Ticket {...props} />,
    info: <Info {...props} />,
  }
  return map[iconName] ?? null
}

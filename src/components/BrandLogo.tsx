import Image from 'next/image'

import { cn } from '@/lib/utils'

export type BrandLogoVariant = 'auto' | 'light' | 'dark'

type BrandLogoProps = {
  variant?: BrandLogoVariant
  className?: string
  alt?: string
  priority?: boolean
  sizes?: string
}

const DEFAULT_ALT = 'Family Lodge'

const LOGO_LIGHT = '/logo-light.svg'
const LOGO_DARK = '/logo-dark.svg'

export function BrandLogo({
  variant = 'auto',
  className,
  alt = DEFAULT_ALT,
  priority = false,
  sizes,
}: BrandLogoProps) {
  const baseClassName = cn('h-8 w-auto select-none object-contain', className)
  const width = 576
  const height = 576

  if (variant === 'light') {
    return (
      <Image
        src={LOGO_LIGHT}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={baseClassName}
        alt={alt}
      />
    )
  }

  if (variant === 'dark') {
    return (
      <Image
        src={LOGO_DARK}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={baseClassName}
        alt={alt}
      />
    )
  }

  return (
    <>
      <Image
        src={LOGO_LIGHT}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={cn(baseClassName, 'dark:hidden')}
        alt={alt}
      />
      <Image
        src={LOGO_DARK}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={cn(baseClassName, 'hidden dark:block')}
        alt={alt}
      />
    </>
  )
}

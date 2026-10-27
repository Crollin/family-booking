'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { ArrowRight } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'

type HomeContentProps = {
  siteName: string
  siteTagline: string
}

export function HomeContent({ siteName, siteTagline }: HomeContentProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const handleReserveClick = () => {
    if (session?.user) {
      router.push('/dashboard')
    } else {
      router.push('/login?callbackUrl=/dashboard')
    }
  }

  const handleMeteoClick = () => {
    if (session?.user) {
      router.push('/meteo')
    } else {
      router.push('/login?callbackUrl=/meteo')
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <section className="relative min-h-[100dvh] flex flex-col overflow-hidden">
        {/* Full-bleed hero (illustration SVG neutre) */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat animate-hero-reveal"
          style={{
            backgroundImage: 'url(/hero-bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/55 to-foreground/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-foreground/20" />
        </div>

        {/* Asymmetric brand-first content — left-weighted */}
        <div className="relative z-10 flex flex-1 flex-col justify-end md:justify-center px-6 sm:px-10 lg:px-16 pb-16 pt-24 md:pb-24 max-w-3xl">
          <div className="animate-fade-up mb-8 md:mb-10">
            <BrandLogo
              variant="dark"
              className="h-16 sm:h-20 md:h-24 w-auto"
              priority
              alt={siteName}
              sizes="(max-width: 640px) 200px, 320px"
            />
          </div>

          <h1 className="animate-fade-up-delay font-sans text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-primary-foreground leading-[0.95] mb-5 md:mb-6">
            {siteName}
          </h1>

          <p className="animate-fade-up-delay-2 text-base sm:text-lg md:text-xl text-primary-foreground/85 max-w-md mb-8 md:mb-10 leading-relaxed">
            {siteTagline}
          </p>

          <div className="animate-fade-up-delay-2 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              onClick={handleReserveClick}
              variant="default"
              size="lg"
              className="h-12 px-7 text-base"
            >
              Réserver un séjour
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={handleMeteoClick}
              variant="outline"
              size="lg"
              className="h-12 px-7 text-base border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Voir la météo
            </Button>
          </div>
        </div>

        <footer className="relative z-10 px-6 sm:px-10 lg:px-16 py-5 text-sm text-primary-foreground/60">
          {siteName}
        </footer>
      </section>
    </div>
  )
}

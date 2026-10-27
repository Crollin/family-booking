'use client'

import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { UserRole } from '@/types'
import { LogOut, Home, User, Settings, Sun, Moon, Info, Menu, BookOpen, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { getUserInitials } from '@/lib/user-initials'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState, type ComponentType } from 'react'
import { useSession } from '@/hooks/useSession'
import { useSiteBranding } from '@/hooks/useSiteBranding'
import { usePathname, useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  match?: (pathname: string) => boolean
}

const PRIMARY_NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Calendrier',
    icon: Home,
    match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
  },
  {
    href: '/infos-pratiques',
    label: 'Infos pratiques',
    icon: Info,
    match: (pathname) => pathname.startsWith('/infos-pratiques'),
  },
  {
    href: '/guide-local',
    label: 'Guide local',
    icon: MapPin,
    match: (pathname) => pathname.startsWith('/guide-local'),
  },
  {
    href: '/livre-dor',
    label: "Livre d'or",
    icon: BookOpen,
    match: (pathname) => pathname.startsWith('/livre-dor'),
  },
]

export function Navbar() {
  const { siteName } = useSiteBranding()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClientSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (!mounted) return

    let currentTheme = theme

    if (theme === 'system' || !theme) {
      if (typeof window !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        currentTheme = prefersDark ? 'dark' : 'light'
      } else {
        currentTheme = 'light'
      }
    }

    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  const getThemeIcon = () => {
    if (theme === 'dark') {
      return <Sun className="h-4 w-4" />
    } else if (theme === 'light') {
      return <Moon className="h-4 w-4" />
    } else {
      if (typeof window !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        return prefersDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      }
      return <Moon className="h-4 w-4" />
    }
  }

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      router.refresh()
      router.push('/')
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    } catch (error: unknown) {
      console.error('Erreur lors de la déconnexion:', error)
      alert('Erreur lors de la déconnexion. Veuillez réessayer.')
    }
  }

  const isActive = (item: NavItem) => {
    if (!pathname) return false
    return item.match ? item.match(pathname) : pathname === item.href
  }

  const accountLinksActive = {
    profile: pathname?.startsWith('/profile') ?? false,
    admin: pathname?.startsWith('/admin') ?? false,
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-14 items-center justify-between gap-3 md:h-16">
          <Link
            href="/dashboard"
            className="relative z-10 flex shrink-0 items-center"
          >
            <BrandLogo
              alt={siteName}
              className="h-9 w-auto max-w-[min(48vw,160px)] object-contain sm:h-10 sm:max-w-[180px]"
              priority
              sizes="(max-width: 640px) 140px, 180px"
            />
            <span className="sr-only">{siteName}</span>
          </Link>

          {/* Desktop */}
          <div className="hidden min-w-0 md:flex items-center justify-end gap-1 lg:gap-2">
            <div className="flex items-center gap-0.5 lg:gap-1" role="navigation" aria-label="Navigation principale">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex h-16 items-center px-2.5 lg:px-3 text-sm transition-colors duration-200',
                      active
                        ? 'font-medium text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        'absolute inset-x-2.5 lg:inset-x-3 bottom-0 h-0.5 rounded-full bg-primary transition-opacity duration-200',
                        active ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden
                    />
                  </Link>
                )
              })}
            </div>

            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {getThemeIcon()}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex shrink-0 items-center gap-2">
                  <Avatar
                    src={session?.user?.avatarUrl || null}
                    alt={session?.user?.name || 'Avatar'}
                    fallback={getUserInitials(session?.user)}
                    size="sm"
                  />
                  <span className="hidden lg:inline text-sm">
                    {session?.user?.name || session?.user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {session?.user?.name || 'Mon compte'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className={cn(accountLinksActive.profile && 'text-primary font-medium')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                {session?.user?.role === UserRole.ADMIN ? (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin"
                      className={cn(accountLinksActive.admin && 'text-primary font-medium')}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSignOut(e)
                  }}
                  onSelect={(e) => {
                    e.preventDefault()
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile */}
          <div className="flex shrink-0 items-center gap-0.5 md:hidden">
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {getThemeIcon()}
              </Button>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <BrandLogo
                      alt={siteName}
                      className="h-10 w-auto object-contain"
                      priority
                      sizes="160px"
                    />
                    <span className="sr-only">{siteName}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-1">
                  {PRIMARY_NAV.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200',
                          active
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    )
                  })}

                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={accountLinksActive.profile ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200',
                      accountLinksActive.profile
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    Profil
                  </Link>

                  {session?.user?.role === UserRole.ADMIN ? (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={accountLinksActive.admin ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-200',
                        accountLinksActive.admin
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      Admin
                    </Link>
                  ) : null}

                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Avatar
                        src={session?.user?.avatarUrl || null}
                        alt={session?.user?.name || 'Avatar'}
                        fallback={getUserInitials(session?.user)}
                        size="sm"
                      />
                      <div className="text-sm font-medium text-foreground">
                        {session?.user?.name || session?.user?.email || 'Mon compte'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSignOut(e)
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}

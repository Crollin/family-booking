'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { BrandLogo } from '@/components/BrandLogo'
import { Loader2, Lock, Mail, User, AlertCircle, RefreshCw } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { safeCallbackUrl } from '@/lib/safe-callback-url'
import { readPublicConfig } from '@/lib/public-config'
import { useSiteBranding } from '@/hooks/useSiteBranding'
import { login } from './actions'

function LoginPageContent() {
  const { siteName } = useSiteBranding()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingFirstUser, setIsCheckingFirstUser] = useState(true)
  const [isFirstUser, setIsFirstUser] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<any>(null)
  const [passwordErrors, setPasswordErrors] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  })

  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  const supabase = createClientSupabaseClient()
  const turnstileSiteKey = readPublicConfig().turnstileSiteKey || undefined
  const isTurnstileEnabled = !!turnstileSiteKey && turnstileSiteKey.trim() !== ''

  // Afficher les messages d'erreur ou de succès depuis l'URL
  useEffect(() => {
    if (error) {
      toast({
        title: 'Erreur de connexion',
        description: decodeURIComponent(error),
        variant: 'destructive',
      })
    }
    if (message) {
      toast({
        title: 'Succès',
        description: decodeURIComponent(message),
      })
    }
  }, [error, message, toast])

  // Vérifier s'il s'agit du premier utilisateur au chargement
  const checkFirstUser = async () => {
    setIsCheckingFirstUser(true)
    setConnectionError(null)
    
    try {
      const response = await fetch('/api/auth/first-user')
      const data = await response.json()
      
      if (response.ok) {
        setIsFirstUser(data.isFirstUser)
        setConnectionError(null)
      } else {
        const isConnectionError = response.status === 503 || 
          data.message?.includes('Impossible de se connecter') ||
          data.message?.includes('Failed to connect')
        
        if (isConnectionError) {
          setConnectionError(data.message || data.error || 'Impossible de se connecter à Supabase')
        } else {
          setConnectionError(null)
          setIsFirstUser(false)
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification du premier utilisateur:', error)
      setConnectionError('Impossible de se connecter au serveur. Vérifiez votre connexion réseau.')
    } finally {
      setIsCheckingFirstUser(false)
    }
  }

  useEffect(() => {
    checkFirstUser()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier que Turnstile est validé si configuré
    if (isTurnstileEnabled && !turnstileToken) {
      toast({
        title: 'Vérification requise',
        description: 'Veuillez compléter la vérification de sécurité.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: turnstileToken ? { captchaToken: turnstileToken } : undefined,
      })

      if (error) {
        let errorMessage = 'Email ou mot de passe incorrect.'
        
        if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Votre email n\'a pas été confirmé. Vérifiez votre boîte de réception.'
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect.'
        } else if (error.message.includes('User not found')) {
          errorMessage = 'Aucun compte trouvé avec cet email.'
        } else if (error.message.includes('Password')) {
          errorMessage = 'Le mot de passe est incorrect.'
        } else if (error.message.includes('too_many_requests')) {
          errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer plus tard.'
        } else {
          errorMessage = process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'Une erreur est survenue lors de la connexion. Veuillez réessayer.'
        }

        toast({
          title: 'Erreur de connexion',
          description: errorMessage,
          variant: 'destructive',
        })
      } else if (data.user) {
        toast({
          title: 'Connexion réussie !',
          description: 'Vous êtes maintenant connecté.',
        })
        // Réinitialiser Turnstile après succès
        if (turnstileRef.current) {
          turnstileRef.current.reset()
          setTurnstileToken(null)
        }
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la connexion.',
        variant: 'destructive',
      })
      // Réinitialiser Turnstile après erreur
      if (turnstileRef.current) {
        turnstileRef.current.reset()
        setTurnstileToken(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: 'Email requis',
        description: 'Veuillez entrer votre adresse email pour réinitialiser votre mot de passe.',
        variant: 'destructive',
      })
      return
    }

    setIsResettingPassword(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      })

      if (error) {
        throw error
      }

      toast({
        title: 'Email envoyé !',
        description: 'Vérifiez votre boîte de réception pour le lien de réinitialisation.',
      })
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'envoi de l\'email.',
        variant: 'destructive',
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleCreateFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier que Turnstile est validé si configuré
    if (isTurnstileEnabled && !turnstileToken) {
      toast({
        title: 'Vérification requise',
        description: 'Veuillez compléter la vérification de sécurité.',
        variant: 'destructive',
      })
      return
    }

    // Validation du mot de passe
    const isPasswordValid = 
      password.length >= 12 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!isPasswordValid) {
      toast({
        title: 'Mot de passe invalide',
        description: 'Le mot de passe ne respecte pas les critères de sécurité requis.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/first-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          turnstileToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.message || data.error || 'Une erreur est survenue lors de la création du compte.'
        
        const isConnectionError = response.status === 503 || 
          errorMessage.includes('Impossible de se connecter') ||
          errorMessage.includes('Failed to connect')
        
        if (isConnectionError) {
          setConnectionError(errorMessage)
        }
        
        toast({
          title: 'Erreur',
          description: errorMessage,
          variant: 'destructive',
        })
        return
      }
      
      setConnectionError(null)

      toast({
        title: 'Compte créé avec succès !',
        description: 'Votre compte administrateur a été créé. Vous pouvez maintenant vous connecter.',
      })

      // Réinitialiser Turnstile après succès
      if (turnstileRef.current) {
        turnstileRef.current.reset()
        setTurnstileToken(null)
      }

      setIsFirstUser(false)
      setName('')
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la création du compte.',
        variant: 'destructive',
      })
      // Réinitialiser Turnstile après erreur
      if (turnstileRef.current) {
        turnstileRef.current.reset()
        setTurnstileToken(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Afficher un loader pendant la vérification
  if (isCheckingFirstUser) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Image de fond avec overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: 'url(/hero-bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        >
          <div className="absolute inset-0 bg-slate-900/60"></div>
        </div>
        <div className="relative z-10 w-full max-w-md p-4">
          <Card className="w-full max-w-md animate-fade-in backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Link href="/" aria-label="Retour à l'accueil" className="mb-2 inline-flex">
                  <BrandLogo
                    alt={siteName}
                    variant="auto"
                    className="h-20 w-auto"
                    priority
                    sizes="(max-width: 640px) 220px, 280px"
                  />
                </Link>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Vérification en cours...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Afficher une erreur de connexion avec possibilité de retry
  if (connectionError) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Image de fond avec overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: 'url(/hero-bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        >
          <div className="absolute inset-0 bg-slate-900/60"></div>
        </div>
        <div className="relative z-10 w-full max-w-md p-4">
          <Card className="w-full max-w-md animate-fade-in backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
            <CardHeader className="space-y-1 text-center">
              <Link href="/" aria-label="Retour à l'accueil" className="mx-auto mb-6 inline-flex">
                <BrandLogo
                  alt={siteName}
                  variant="auto"
                  className="h-20 w-auto"
                  priority
                  sizes="(max-width: 640px) 220px, 280px"
                />
              </Link>
              <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold text-destructive">
                Erreur de connexion
              </CardTitle>
              <CardDescription className="text-base">
                Impossible de se connecter à Supabase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">{connectionError}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Vérifiez que :
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Tous les services sont démarrés : <code>docker compose ps</code></li>
                  <li>
                    <code>PUBLIC_URL</code> dans votre <code>.env</code> correspond bien à
                    l&apos;adresse que vous utilisez
                  </li>
                  <li>
                    Les journaux ne signalent rien d&apos;anormal :{' '}
                    <code>docker compose logs app</code>
                  </li>
                </ul>
              </div>
              <Button
                onClick={checkFirstUser}
                className="w-full"
                disabled={isCheckingFirstUser}
              >
                {isCheckingFirstUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réessayer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Image de fond avec overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/hero-bg.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/60"></div>
      </div>

      {/* Formulaire de connexion */}
      <div className="relative z-10 w-full max-w-md p-4">
        <Card className="w-full max-w-md animate-fade-in backdrop-blur-sm bg-white/95 dark:bg-slate-900/95 shadow-xl border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="space-y-1 text-center">
            <Link href="/" aria-label="Retour à l'accueil" className="mx-auto mb-6 inline-flex">
              <BrandLogo
                alt={siteName}
                variant="auto"
                className="h-28 w-auto"
                priority
                sizes="(max-width: 640px) 280px, 448px"
              />
            </Link>
            <CardTitle className="sr-only">{siteName}</CardTitle>
            <CardDescription className="text-base">
              {isFirstUser 
                ? 'Créez le premier compte administrateur'
                : 'Connectez-vous à votre compte'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFirstUser ? (
              <form onSubmit={handleCreateFirstAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Votre nom"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 12 caractères"
                      value={password}
                      onChange={(e) => {
                        const newPassword = e.target.value
                        setPassword(newPassword)
                        // Validation en temps réel
                        setPasswordErrors({
                          length: newPassword.length >= 12,
                          uppercase: /[A-Z]/.test(newPassword),
                          lowercase: /[a-z]/.test(newPassword),
                          number: /[0-9]/.test(newPassword),
                          symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
                        })
                      }}
                      required
                      minLength={12}
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground mb-2">Le mot de passe doit contenir :</p>
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 ${passwordErrors.length ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        <span>{passwordErrors.length ? '✓' : '○'}</span>
                        <span>Au moins 12 caractères</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordErrors.uppercase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        <span>{passwordErrors.uppercase ? '✓' : '○'}</span>
                        <span>Une majuscule</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordErrors.lowercase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        <span>{passwordErrors.lowercase ? '✓' : '○'}</span>
                        <span>Une minuscule</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordErrors.number ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        <span>{passwordErrors.number ? '✓' : '○'}</span>
                        <span>Un chiffre</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordErrors.symbol ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        <span>{passwordErrors.symbol ? '✓' : '○'}</span>
                        <span>Un symbole (!@#$%^&*...)</span>
                      </div>
                    </div>
                  </div>
                </div>
                {isTurnstileEnabled && turnstileSiteKey && (
                  <div className="flex justify-center">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={turnstileSiteKey}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => setTurnstileToken(null)}
                      onExpire={() => setTurnstileToken(null)}
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || (isTurnstileEnabled && !turnstileToken)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    'Créer le compte administrateur'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10"
                    />
                  </div>
                </div>
                {isTurnstileEnabled && turnstileSiteKey && (
                  <div className="flex justify-center">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={turnstileSiteKey}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => setTurnstileToken(null)}
                      onExpire={() => setTurnstileToken(null)}
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || (isTurnstileEnabled && !turnstileToken)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResettingPassword || isLoading}
                    className="text-sm text-muted-foreground hover:text-primary underline disabled:opacity-50"
                  >
                    {isResettingPassword ? 'Envoi en cours...' : 'Mot de passe oublié ?'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}

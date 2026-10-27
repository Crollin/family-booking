'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Mountain, Lock } from 'lucide-react'

function SetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [token, setToken] = useState('')

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Récupérer le token depuis les paramètres de l'URL
    // Supabase peut utiliser 'token', 'token_hash', ou le token peut être dans le hash de l'URL
    const tokenParam = searchParams.get('token') || searchParams.get('token_hash')
    
    // Si le token n'est pas dans les query params, vérifier le hash de l'URL
    // (pour les liens de réinitialisation Supabase qui utilisent le hash)
    if (!tokenParam) {
      // Essayer d'extraire depuis le hash de l'URL (format: #access_token=...&type=recovery)
      const hash = window.location.hash
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        if (accessToken) {
          // Si on a un access_token dans le hash, l'utilisateur est déjà authentifié
          // On peut directement mettre à jour le mot de passe
          setIsValidating(false)
          return
        }
      }
      
      toast({
        title: 'Token manquant',
        description: 'Vous devez avoir un lien valide pour définir votre mot de passe.',
        variant: 'destructive',
      })
      router.push('/')
      return
    }
    setToken(tokenParam)
    setIsValidating(false)
  }, [searchParams, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 8 caractères.',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    try {
      // Essayer d'abord avec updateUser (pour les tokens de réinitialisation)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        // Si updateUser échoue, essayer avec verifyOtp et updateUser
        // Le token peut être un token_hash pour verifyOtp
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        })

        if (verifyError) {
          // Dernière tentative : utiliser l'API route
          const response = await fetch('/api/auth/set-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
              password,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Une erreur est survenue')
          }

          toast({
            title: 'Mot de passe défini !',
            description: 'Vous pouvez maintenant vous connecter.',
          })

          router.push('/')
          return
        }

        // Si verifyOtp réussit, mettre à jour le mot de passe
        if (verifyData.user) {
          const { error: finalUpdateError } = await supabase.auth.updateUser({
            password,
          })

          if (finalUpdateError) {
            throw finalUpdateError
          }
        }
      }

      toast({
        title: 'Mot de passe défini !',
        description: 'Vous pouvez maintenant vous connecter.',
      })

      router.push('/')
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la définition du mot de passe.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Mountain className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Définir votre mot de passe
          </CardTitle>
          <CardDescription className="text-base">
            Choisissez un mot de passe sécurisé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  minLength={8}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Définition en cours...
                </>
              ) : (
                'Définir le mot de passe'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <SetPasswordPageContent />
    </Suspense>
  )
}

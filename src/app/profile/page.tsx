'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MyReservations } from '@/components/member/MyReservations'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileFieldRow } from '@/components/profile/ProfileFieldRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserRole } from '@/types'
import { LogOut, Edit2, Save, X, Lock } from 'lucide-react'
import { uploadAvatar, deleteAvatar, validateAvatarFile } from '@/lib/profile-upload'
import { getUserInitials } from '@/lib/user-initials'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const { toast } = useToast()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(session?.user?.name || '')
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [emailValue, setEmailValue] = useState(session?.user?.email || '')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.name) {
      setNameValue(session.user.name)
    }
    if (session?.user?.email) {
      setEmailValue(session.user.email)
    }
  }, [session])

  const handleUpdateName = async () => {
    if (!nameValue.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom ne peut pas être vide',
        variant: 'destructive',
      })
      return
    }

    setIsUpdatingName(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: nameValue.trim() },
      })

      if (error) throw error

      toast({
        title: 'Succès',
        description: 'Votre nom a été mis à jour avec succès',
      })

      setIsEditingName(false)
      router.refresh()
      setTimeout(() => router.refresh(), 500)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      console.error('Erreur lors de la mise à jour du nom:', error)
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!emailValue.trim()) {
      toast({
        title: 'Erreur',
        description: "L'email ne peut pas être vide",
        variant: 'destructive',
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue.trim())) {
      toast({
        title: 'Erreur',
        description: "Format d'email invalide",
        variant: 'destructive',
      })
      return
    }

    setIsUpdatingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailValue.trim(),
      })

      if (error) throw error

      toast({
        title: 'Email de vérification envoyé',
        description:
          'Un email de confirmation a été envoyé à votre nouvelle adresse. Veuillez vérifier votre boîte de réception.',
      })

      setIsEditingEmail(false)
      router.refresh()
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Erreur lors de la mise à jour de l'email:", error)
      let errorMessage = "Une erreur est survenue lors de la mise à jour de l'email"

      if (err.message?.includes('already registered')) {
        errorMessage = 'Cet email est déjà utilisé par un autre compte'
      } else if (err.message) {
        errorMessage = err.message
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nouveau mot de passe ne peut pas être vide',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      })
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été mis à jour avec succès',
      })

      setIsEditingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error('Erreur lors de la mise à jour du mot de passe:', error)
      let errorMessage = 'Une erreur est survenue lors de la mise à jour du mot de passe'

      if (err.message?.includes('same')) {
        errorMessage = "Le nouveau mot de passe doit être différent de l'ancien"
      } else if (err.message) {
        errorMessage = err.message
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      toast({
        title: 'Erreur',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setIsUploadingAvatar(true)
    try {
      await uploadAvatar(file)
      toast({
        title: 'Succès',
        description: 'Votre photo de profil a été mise à jour avec succès',
      })
      setAvatarPreview(null)
      router.refresh()
      setTimeout(() => router.refresh(), 500)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue lors de l'upload"
      console.error("Erreur lors de l'upload:", error)
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      })
      setAvatarPreview(null)
    } finally {
      setIsUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const handleAvatarDelete = async () => {
    if (!session?.user?.avatarUrl && !avatarPreview) return

    setIsDeletingAvatar(true)
    try {
      await deleteAvatar()
      toast({
        title: 'Succès',
        description: 'Votre photo de profil a été supprimée',
      })
      setAvatarPreview(null)
      router.refresh()
      setTimeout(() => router.refresh(), 500)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression'
      console.error('Erreur lors de la suppression:', error)
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsDeletingAvatar(false)
    }
  }

  const handleSignOut = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (isSigningOut) return

    setIsSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      await new Promise((resolve) => setTimeout(resolve, 100))
      router.refresh()
      router.push('/')

      setTimeout(() => {
        if (window.location.pathname !== '/') {
          window.location.href = '/'
        }
      }, 200)
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      alert('Erreur lors de la déconnexion. Veuillez réessayer.')
      setIsSigningOut(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="space-y-8">
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const avatarSrc = avatarPreview || session?.user?.avatarUrl || null
  const initials = getUserInitials(session?.user)
  const hasAvatar = Boolean(avatarPreview || session?.user?.avatarUrl)

  return (
    <div className="space-y-8">
      <ProfileHeader
        avatarSrc={avatarSrc}
        initials={initials}
        name={session?.user?.name}
        email={session?.user?.email}
        role={session?.user?.role}
        hasAvatar={hasAvatar}
        isUploading={isUploadingAvatar}
        isDeleting={isDeletingAvatar}
        onUpload={handleAvatarUpload}
        onDelete={handleAvatarDelete}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Identité</CardTitle>
            <CardDescription>Vos informations de compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProfileFieldRow label="Nom">
              {isEditingName ? (
                <div className="space-y-2">
                  <Input
                    id="name"
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    disabled={isUpdatingName}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleUpdateName} disabled={isUpdatingName}>
                      <Save className="mr-2 h-4 w-4" />
                      {isUpdatingName ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingName(false)
                        setNameValue(session?.user?.name || '')
                      }}
                      disabled={isUpdatingName}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{session?.user?.name || 'Non renseigné'}</p>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                </div>
              )}
            </ProfileFieldRow>

            <ProfileFieldRow label="Email">
              {isEditingEmail ? (
                <div className="space-y-2">
                  <Input
                    id="email"
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    disabled={isUpdatingEmail}
                  />
                  <p className="text-xs text-muted-foreground">
                    Un email de confirmation sera envoyé à votre nouvelle adresse
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleUpdateEmail} disabled={isUpdatingEmail}>
                      <Save className="mr-2 h-4 w-4" />
                      {isUpdatingEmail ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingEmail(false)
                        setEmailValue(session?.user?.email || '')
                      }}
                      disabled={isUpdatingEmail}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all font-medium">{session?.user?.email}</p>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingEmail(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                </div>
              )}
            </ProfileFieldRow>

            <ProfileFieldRow label="Rôle">
              <p className="font-medium">
                {session?.user?.role === UserRole.ADMIN ? 'Administrateur' : 'Membre'}
              </p>
            </ProfileFieldRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sécurité</CardTitle>
            <CardDescription>Protégez l&apos;accès à votre compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingPassword ? (
              <div className="space-y-4 rounded-lg border bg-muted/15 p-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                    placeholder="Entrez votre nouveau mot de passe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                    placeholder="Confirmez votre nouveau mot de passe"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Le mot de passe doit contenir au moins 6 caractères
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isUpdatingPassword ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingPassword(false)
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={isUpdatingPassword}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-lg border bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Mot de passe</p>
                    <p className="text-sm text-muted-foreground">
                      Modifiez votre mot de passe de connexion
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setIsEditingPassword(true)}>
                  Modifier
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Déconnexion</p>
                  <p className="text-sm text-muted-foreground">
                    Quitter votre session sur cet appareil
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  aria-label="Se déconnecter"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isSigningOut ? 'Déconnexion...' : 'Se déconnecter'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MyReservations />
    </div>
  )
}

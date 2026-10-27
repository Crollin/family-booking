'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { UserRole } from '@/types'
import { Trash2, UserPlus, Users, Clock, Mail } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from '@/hooks/useSession'
import { CopyValueButton } from '@/components/infos-pratiques/CopyValueButton'

interface Member {
  id: string
  email: string
  name: string | null
  role: UserRole
  autoApproveOwnReservations?: boolean
  createdAt: string
  _count: {
    reservations: number
  }
}

interface Invitation {
  id: string
  email: string
  createdAt: string
  expiresAt: string
  inviter: {
    id: string
    email: string
    name: string | null
  } | null
}

type TabType = 'members' | 'invitations'

export function MembersList() {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('members')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState<UserRole>(UserRole.MEMBER)
  const [isCreating, setIsCreating] = useState(false)
  // Renseigné quand aucun fournisseur d'e-mail n'est configuré : le lien doit
  // alors être transmis à la main.
  const [pendingInviteLink, setPendingInviteLink] = useState<{ email: string; link: string } | null>(
    null
  )
  const { toast } = useToast()
  const { data: session } = useSession()

  useEffect(() => {
    fetchMembers()
    fetchInvitations()
  }, [])

  const fetchMembers = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/members')
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const { apiGet } = await import('@/lib/api-client')
      const response = await apiGet('/api/invitations')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des invitations:', error)
    }
  }

  const handleCreate = async () => {
    if (!createEmail) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un email',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)

    try {
      const { apiPost } = await import('@/lib/api-client')
      const response = await apiPost('/api/invitations', { email: createEmail })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      if (data.emailSent === false && data.invitation?.link) {
        setPendingInviteLink({ email: createEmail, link: data.invitation.link })
      } else {
        toast({
          title: 'Invitation envoyée !',
          description: `Un email d'invitation a été envoyé à ${createEmail}.`,
        })
      }

      setCreateEmail('')
      setCreateName('')
      setCreateRole(UserRole.MEMBER)
      setIsCreateDialogOpen(false)
      fetchMembers()
      fetchInvitations()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${userName || 'cet utilisateur'} ?`)) {
      return
    }

    try {
      const { apiDelete } = await import('@/lib/api-client')
      const response = await apiDelete(`/api/members?userId=${userId}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: 'Membre supprimé',
        description: 'Le membre a été supprimé avec succès.',
      })

      fetchMembers()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const { apiPut } = await import('@/lib/api-client')
      const response = await apiPut('/api/members', { userId, role: newRole })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: 'Rôle modifié',
        description: 'Le rôle a été modifié avec succès.',
      })

      fetchMembers()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    }
  }

  const handleAutoApproveChange = async (userId: string, enabled: boolean) => {
    try {
      const { apiPut } = await import('@/lib/api-client')
      const response = await apiPut('/api/members', {
        userId,
        autoApproveOwnReservations: enabled,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: 'Préférence enregistrée',
        description: enabled
          ? 'Les demandes de cet admin seront validées automatiquement.'
          : 'Les demandes de cet admin resteront en attente.',
      })

      fetchMembers()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'invitation pour ${email} ?`)) {
      return
    }

    try {
      const { apiDelete } = await import('@/lib/api-client')
      const response = await apiDelete(`/api/invitations?id=${invitationId}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Une erreur est survenue')
      }

      toast({
        title: 'Invitation supprimée',
        description: 'L\'invitation a été supprimée avec succès.',
      })

      fetchInvitations()
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      })
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const isCurrentUser = (memberId: string) => {
    return session?.user?.id === memberId
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Membres</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les membres de la famille
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Inviter un membre
          </Button>
        </CardHeader>
        <CardContent>
          {/* Onglets */}
          <div className="flex space-x-2 border-b mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              Membres ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'invitations'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-4 w-4" />
              Invitations en attente ({invitations.length})
            </button>
          </div>

          {pendingInviteLink && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">Invitation créée pour {pendingInviteLink.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aucun service d&apos;e-mail n&apos;est configuré : transmettez ce lien
                    vous-même. Il expire dans 7 jours.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingInviteLink(null)}
                >
                  Fermer
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-background px-3 py-2 text-xs">
                  {pendingInviteLink.link}
                </code>
                <CopyValueButton value={pendingInviteLink.link} label="Copier le lien" />
              </div>
            </div>
          )}

          {/* Contenu des onglets */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Aucun membre pour le moment</p>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
                        {getInitials(member.name, member.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">
                            {member.name || member.email}
                          </p>
                          {isCurrentUser(member.id) && (
                            <Badge variant="secondary" className="text-xs">
                              Vous
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {member._count.reservations} réservation{member._count.reservations > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {member.role === UserRole.ADMIN && (
                        <label className="flex items-center gap-2 text-sm max-w-[11rem] cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={Boolean(member.autoApproveOwnReservations)}
                            onChange={(e) =>
                              handleAutoApproveChange(member.id, e.target.checked)
                            }
                          />
                          <span className="leading-tight">
                            Auto-valider ses propres demandes
                          </span>
                        </label>
                      )}
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.id, value as UserRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.MEMBER}>Membre</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(member.id, member.name || member.email)}
                        disabled={isCurrentUser(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'invitations' && (
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Aucune invitation en attente</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Les invitations envoyées mais non utilisées apparaîtront ici
                  </p>
                </div>
              ) : (
                invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground font-semibold flex-shrink-0">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate mb-1">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Expire le {formatDate(invitation.expiresAt)}
                        </p>
                        {invitation.inviter && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Invité par {invitation.inviter.name || invitation.inviter.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteInvitation(invitation.id, invitation.email)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
            <DialogDescription>
              Envoyez une invitation par email. Le membre recevra un lien pour créer son compte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="nouveau@membre.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nom complet (optionnel)"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={createRole} onValueChange={(value) => setCreateRole(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.MEMBER}>Membre</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Envoi...' : 'Envoyer l\'invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}



import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserRole } from '@/types'
import { Upload, Trash2 } from 'lucide-react'

type ProfileHeaderProps = {
  avatarSrc: string | null
  initials: string
  name?: string | null
  email?: string | null
  role?: UserRole
  hasAvatar: boolean
  isUploading: boolean
  isDeleting: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: () => void
}

export function ProfileHeader({
  avatarSrc,
  initials,
  name,
  email,
  role,
  hasAvatar,
  isUploading,
  isDeleting,
  onUpload,
  onDelete,
}: ProfileHeaderProps) {
  const isAdmin = role === UserRole.ADMIN
  const busy = isUploading || isDeleting

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/50 via-background to-muted/20 p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
          <Avatar
            src={avatarSrc}
            alt={name || 'Photo de profil'}
            fallback={initials}
            size="2xl"
            className="ring-4 ring-background shadow-md"
          />
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <label htmlFor="avatar-upload">
              <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? 'Envoi...' : 'Changer la photo'}
                </span>
              </Button>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={onUpload}
              className="hidden"
              disabled={busy}
            />
            {hasAvatar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={busy}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            )}
          </div>
          <p className="max-w-[14rem] text-center text-xs text-muted-foreground sm:text-left">
            JPEG, PNG ou WebP. 2 Mo maximum.
          </p>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {name || 'Mon profil'}
          </h1>
          {email && <p className="mt-1 text-muted-foreground">{email}</p>}
          {role && (
            <Badge
              variant="outline"
              className={
                isAdmin
                  ? 'mt-3 border-primary/30 bg-primary/10 text-primary'
                  : 'mt-3'
              }
            >
              {isAdmin ? 'Administrateur' : 'Membre'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

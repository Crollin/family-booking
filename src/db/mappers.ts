import { Reservation, ReservationStatus, User, UserRole } from '@/types'

type ReservationRow = {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: string
  guests: number
  comment: string | null
  admin_comment: string | null
  created_at: string
  updated_at: string
  user?: { id: string; name: string | null; email?: string | null; avatar_url?: string | null } | null
}

function mapUser(
  user: NonNullable<ReservationRow['user']>,
  includeEmail: boolean
): User {
  const base = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatar_url ?? null,
    role: UserRole.MEMBER,
    emailVerified: null,
    createdAt: new Date(0),
  }

  if (includeEmail) {
    return { ...base, email: user.email ?? '' }
  }

  return { ...base, email: undefined as unknown as string }
}

export function mapReservationRow(
  row: ReservationRow,
  opts: { includeEmail?: boolean } = {}
): Reservation {
  const includeEmail = opts.includeEmail !== false

  return {
    id: row.id,
    userId: row.user_id,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    status: row.status as ReservationStatus,
    guests: row.guests,
    comment: row.comment,
    adminComment: row.admin_comment,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    user: row.user ? mapUser(row.user, includeEmail) : undefined,
  }
}

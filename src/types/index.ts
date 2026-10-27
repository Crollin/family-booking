export enum UserRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum ReservationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: UserRole
  emailVerified: Date | null
  createdAt: Date
}

export interface Reservation {
  id: string
  userId: string
  startDate: Date
  endDate: Date
  status: ReservationStatus
  guests: number
  comment: string | null
  adminComment: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
}

export interface Invitation {
  id: string
  email: string
  token: string
  invitedBy: string
  used: boolean
  createdAt: Date
  expiresAt: Date
  inviter?: User
}

export interface GuestbookPhoto {
  id: string
  entryId: string
  storagePath: string
  url: string
  order: number
  createdAt: Date
}

export interface GuestbookEntry {
  id: string
  userId: string
  reservationId: string | null
  message: string
  stayPeriod: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
  reservation?: Reservation
  photos?: GuestbookPhoto[]
}

export type LocalGuideCategory = 'restaurant' | 'activite' | 'service' | 'commerce'

export type LocalGuideSeason = 'hiver' | 'ete'

export interface LocalGuideEntry {
  id: string
  category: LocalGuideCategory
  name: string
  description?: string | null
  imageUrl?: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  accessInstructions: string | null
  tags: string[]
  seasons: LocalGuideSeason[]
  createdAt: Date
  updatedAt: Date
}

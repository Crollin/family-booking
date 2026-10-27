// Types pour Supabase Auth
// Ces types sont utilisés pour la compatibilité avec les composants qui attendent une session

import { UserRole } from './index'

export interface Session {
  user: {
    id: string
    email: string
    name?: string | null
    role: UserRole
  }
}

export interface User {
  id: string
  email: string
  name?: string | null
  role: UserRole
}

// Réexporter les types de la base de données
export type { Database } from '@/types/database'




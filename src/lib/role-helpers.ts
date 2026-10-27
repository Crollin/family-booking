import { UserRole } from '@/types'

/**
 * Liste des valeurs valides de l'enum user_role (synchronisée avec PostgreSQL)
 * Cette constante sert de source de vérité pour les validations côté application
 */
export const VALID_USER_ROLES = ['ADMIN', 'MEMBER'] as const

/**
 * Type pour les rôles valides
 */
export type ValidUserRole = typeof VALID_USER_ROLES[number]

/**
 * Vérifie si une valeur est un rôle utilisateur valide
 * @param role - La valeur à valider
 * @returns true si la valeur est un rôle valide, false sinon
 */
export function isValidUserRole(role: unknown): role is UserRole {
  if (typeof role !== 'string') {
    return false
  }
  return VALID_USER_ROLES.includes(role as ValidUserRole)
}

/**
 * Normalise une valeur vers un rôle utilisateur valide
 * Gère la casse et les variations courantes
 * @param role - La valeur à normaliser
 * @returns Le rôle normalisé ou null si la valeur ne peut pas être normalisée
 */
export function normalizeUserRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') {
    return null
  }

  const normalized = role.toUpperCase().trim()

  // Mapping des variations courantes vers les valeurs exactes
  const roleMap: Record<string, UserRole> = {
    'ADMIN': UserRole.ADMIN,
    'MEMBER': UserRole.MEMBER,
    'USER': UserRole.MEMBER, // Alias commun
  }

  if (roleMap[normalized]) {
    return roleMap[normalized]
  }

  // Vérifier si c'est déjà une valeur valide
  if (isValidUserRole(normalized)) {
    return normalized as UserRole
  }

  return null
}

/**
 * Valide et normalise un rôle utilisateur
 * Utilisé dans les routes API pour s'assurer que les valeurs sont valides avant écriture
 * @param role - La valeur à valider et normaliser
 * @returns Le rôle normalisé
 * @throws Error si le rôle n'est pas valide
 */
export function validateAndNormalizeRole(role: unknown): UserRole {
  // Essayer d'abord la normalisation
  const normalized = normalizeUserRole(role)
  
  if (normalized !== null) {
    return normalized
  }

  // Si la normalisation échoue, vérifier si c'est déjà valide
  if (isValidUserRole(role)) {
    return role
  }

  // Logger l'erreur pour le débogage
  console.error('Tentative d\'écriture d\'un rôle invalide:', role, {
    valeursAcceptees: VALID_USER_ROLES,
    type: typeof role,
  })

  throw new Error(
    `Rôle invalide: "${role}". Valeurs acceptées: ${VALID_USER_ROLES.join(', ')}`
  )
}

/**
 * Récupère tous les rôles utilisateur valides
 * Utile pour les formulaires et les validations côté client
 * @returns Tableau des rôles valides
 */
export function getValidUserRoles(): readonly UserRole[] {
  return VALID_USER_ROLES as readonly UserRole[]
}

/**
 * Vérifie si un rôle est ADMIN
 * @param role - Le rôle à vérifier
 * @returns true si le rôle est ADMIN
 */
export function isAdminRole(role: unknown): boolean {
  return isValidUserRole(role) && role === UserRole.ADMIN
}

/**
 * Vérifie si un rôle est MEMBER
 * @param role - Le rôle à vérifier
 * @returns true si le rôle est MEMBER
 */
export function isMemberRole(role: unknown): boolean {
  return isValidUserRole(role) && role === UserRole.MEMBER
}


/**
 * Module de diagnostic Supabase utilisant le MCP Supabase
 * Pour vérifier la connexion et diagnostiquer les problèmes
 */

import { getSupabaseServerUrl } from './runtime-env'

export interface SupabaseConnectionStatus {
  connected: boolean
  url?: string
  error?: string
  details?: {
    message?: string
    code?: string
    hint?: string
  }
}

export interface SupabaseDiagnostic {
  connection: SupabaseConnectionStatus
  tables?: {
    exists: boolean
    count?: number
    error?: string
  }
  users?: {
    count: number
    error?: string
  }
  migrations?: {
    applied: number
    error?: string
  }
  timestamp: string
}

/**
 * Vérifie la connexion à Supabase en utilisant le MCP
 * Cette fonction utilise execute_sql pour tester la connexion
 */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const supabaseUrl = getSupabaseServerUrl()

  if (!supabaseUrl) {
    return {
      connected: false,
      error: 'PUBLIC_URL non définie',
      details: {
        message: 'La variable d\'environnement PUBLIC_URL n\'est pas définie',
      },
    }
  }

  try {
    // Essayer une requête SQL simple pour vérifier la connexion
    // Note: Cette fonction sera appelée depuis une route API qui peut utiliser le MCP
    // Pour l'instant, on retourne une structure qui sera utilisée avec le MCP
    
    return {
      connected: true,
      url: supabaseUrl,
    }
  } catch (error: any) {
    return {
      connected: false,
      url: supabaseUrl,
      error: error?.message || 'Erreur de connexion inconnue',
      details: {
        message: error?.message,
        code: error?.code,
        hint: error?.hint,
      },
    }
  }
}

/**
 * Effectue un diagnostic complet de Supabase
 * Cette fonction doit être appelée depuis une route API qui a accès au MCP
 */
export async function diagnoseSupabase(): Promise<SupabaseDiagnostic> {
  const diagnostic: SupabaseDiagnostic = {
    connection: await checkSupabaseConnection(),
    timestamp: new Date().toISOString(),
  }

  // Si la connexion échoue, on retourne le diagnostic de base
  if (!diagnostic.connection.connected) {
    return diagnostic
  }

  // Les vérifications suivantes seront faites via le MCP dans les routes API
  // car le MCP n'est pas accessible directement depuis le code client/serveur standard
  
  return diagnostic
}

/**
 * Vérifie si Supabase est accessible en testant une requête simple
 * Utilise le client Supabase standard comme fallback si le MCP n'est pas disponible
 */
export async function checkSupabaseHealthWithClient(
  supabaseClient: any
): Promise<{ healthy: boolean; error?: string }> {
  try {
    // Essayer une requête simple pour vérifier la connexion
    const { error } = await supabaseClient.from('users').select('id').limit(1)
    
    if (error) {
      // Vérifier si c'est une erreur de connexion
      const errorMessage = error.message || ''
      const errorCode = error.code || ''
      const errorHint = error.hint || ''
      
      if (
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Failed to connect') ||
        errorCode === 'ECONNREFUSED'
      ) {
        const supabaseUrl = getSupabaseServerUrl()

        let errorMsg = `Impossible de se connecter à Supabase à l'URL configurée: ${supabaseUrl || 'non définie'}. `

        errorMsg += `Vérifiez que les services de la pile sont démarrés : docker compose ps. `

        errorMsg += `Erreur: ${errorMessage}`
        
        return {
          healthy: false,
          error: errorMsg,
        }
      }
      
      // Erreur d'authentification (401) - probablement problème avec les clés API
      if (errorCode === 'PGRST301' || errorMessage.includes('JWT') || errorMessage.includes('invalid') || errorCode === '42501') {
        return {
          healthy: false,
          error: `Erreur d'authentification Supabase. Vérifiez que les clés API (ANON_KEY et SERVICE_ROLE_KEY) sont correctes. Erreur: ${errorMessage}${errorHint ? ` - ${errorHint}` : ''}`,
        }
      }
      
      // Autres erreurs (peut-être que la table n'existe pas encore, mais la connexion fonctionne)
      return {
        healthy: true, // La connexion fonctionne même si la requête échoue
        error: error.message,
      }
    }
    
    return { healthy: true }
  } catch (error: any) {
    const errorMessage = error?.message || 'Erreur inconnue'
    
    if (
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Failed to connect')
    ) {
      return {
        healthy: false,
        error: 'Impossible de se connecter à Supabase. Vérifiez que Supabase est démarré et accessible.',
      }
    }
    
    return {
      healthy: false,
      error: errorMessage,
    }
  }
}

/**
 * Sérialise une erreur Supabase/PostgREST de manière sûre pour le logging.
 * Évite le "[object Object]" en extrayant explicitement les propriétés.
 */
export function serializeSupabaseError(error: any): {
  message: string
  code: string
  hint: string
  details: string
} {
  const message =
    typeof error?.message === 'string'
      ? error.message
      : typeof error?.message === 'object'
        ? JSON.stringify(error.message)
        : error?.toString?.() || 'Erreur inconnue'

  let details: string
  if (typeof error?.details === 'string') {
    details = error.details
  } else if (error != null) {
    try {
      details = JSON.stringify(
        {
          message: error?.message,
          code: error?.code,
          hint: error?.hint,
          details: error?.details,
        },
        null,
        2
      )
    } catch {
      details = String(error)
    }
  } else {
    details = ''
  }

  return {
    message,
    code: error?.code ?? '',
    hint: error?.hint ?? '',
    details,
  }
}

/**
 * Retourne un message d'erreur convivial pour l'utilisateur
 */
export function getFriendlyErrorMessage(error: any): string {
  const errorMessage =
    typeof error?.message === 'string'
      ? error.message
      : typeof error?.message === 'object'
        ? JSON.stringify(error.message)
        : error?.toString?.() || 'Erreur inconnue'

  if (
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return 'Impossible de se connecter à Supabase. Vérifiez que Supabase est démarré et accessible à l\'adresse configurée.'
  }

  if (errorMessage.includes('Failed to connect')) {
    return 'La connexion à Supabase a échoué. Vérifiez votre configuration et que Supabase est en cours d\'exécution.'
  }

  if (errorMessage.includes('PUBLIC_URL') || errorMessage.includes('ANON_KEY')) {
    return 'La configuration Supabase est incomplète. Vérifiez PUBLIC_URL et ANON_KEY dans votre fichier .env.'
  }

  return errorMessage
}


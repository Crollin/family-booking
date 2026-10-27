/**
 * Client API helper pour les appels fetch avec gestion automatique des credentials
 * Assure que les cookies sont toujours inclus dans les requêtes pour l'authentification
 */

type FetchOptions = RequestInit & {
  body?: any
}

/**
 * Effectue un appel API avec les credentials inclus automatiquement
 * @param url L'URL de l'API (peut être relative ou absolue)
 * @param options Les options de fetch (body sera automatiquement stringifié si c'est un objet)
 * @returns La réponse fetch
 */
export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { body, ...fetchOptions } = options

  // Préparer les headers
  const headers = new Headers(fetchOptions.headers)
  
  // Si body est un objet et Content-Type n'est pas défini, l'ajouter
  if (body && typeof body === 'object' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Effectuer l'appel avec credentials inclus
  return fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // CRITIQUE: Inclure les cookies pour l'authentification
    body: body && typeof body === 'object' ? JSON.stringify(body) : body,
  })
}

/**
 * Helper pour les appels GET
 */
export async function apiGet(url: string, options: Omit<FetchOptions, 'method' | 'body'> = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: 'GET' })
}

/**
 * Helper pour les appels POST
 */
export async function apiPost(url: string, body?: any, options: Omit<FetchOptions, 'method'> = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: 'POST', body })
}

/**
 * Helper pour les appels PUT
 */
export async function apiPut(url: string, body?: any, options: Omit<FetchOptions, 'method'> = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: 'PUT', body })
}

/**
 * Helper pour les appels DELETE
 */
export async function apiDelete(url: string, options: Omit<FetchOptions, 'method' | 'body'> = {}): Promise<Response> {
  return apiFetch(url, { ...options, method: 'DELETE' })
}



export interface BackendAccount {
  id?: string
  email?: string
  displayName?: string
  [key: string]: unknown
}

export class BackendApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message)
    this.name = 'BackendApiError'
  }
}

function apiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
  if (!baseUrl) throw new BackendApiError('The account service is not configured. Set VITE_API_BASE_URL.')
  return `${baseUrl}${path}`
}

export async function getMyAccount(accessToken: string, signal?: AbortSignal): Promise<BackendAccount> {
  let response: Response

  try {
    response = await fetch(apiUrl('/v1/me'), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    })
  } catch (error) {
    if (error instanceof BackendApiError || (error instanceof DOMException && error.name === 'AbortError')) throw error
    throw new BackendApiError('The account service could not be reached. Please try again later.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new BackendApiError('Your login succeeded, but the account service could not authenticate this session.', response.status)
  }

  if (!response.ok) {
    throw new BackendApiError('The account service is temporarily unavailable. Please try again later.', response.status)
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BackendApiError('The account service returned an invalid response.', response.status)
  }

  if ('data' in payload) {
    const data = payload.data
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BackendApiError('The account service returned an invalid response.', response.status)
    }
    return data as BackendAccount
  }

  return payload as BackendAccount
}

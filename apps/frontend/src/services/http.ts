import type { ApiError } from '../contracts/api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export class HttpError extends Error implements ApiError {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...options, credentials: 'include' })
  } catch {
    throw new HttpError(0, 'No se pudo conectar con el servidor. Inténtalo de nuevo.')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new HttpError(response.status, body?.error ?? 'La solicitud no pudo completarse.')
  }

  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}

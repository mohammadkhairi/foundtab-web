import { env } from '../config/env'

type ApiOptions = RequestInit & {
  token?: string
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, ...rest } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...rest.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${env.VITE_API_URL}${path}`, { ...rest, headers })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
    throw new ApiError(response.status, body.error ?? 'UNKNOWN', body.message ?? 'Request failed')
  }

  return response.json() as Promise<T>
}

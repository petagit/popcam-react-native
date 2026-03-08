/**
 * Shared API client for the PopCam web backend.
 *
 * Attach a token provider once (from App.tsx AuthenticatedApp) and every
 * apiFetch() call will include a fresh Clerk Bearer token automatically.
 */

const BASE_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://pop-cam.com').replace(/\/$/, '')

// Token provider set from AuthenticatedApp in App.tsx
let _tokenProvider: (() => Promise<string | null>) | null = null

export function setApiTokenProvider(provider: () => Promise<string | null>): void {
  _tokenProvider = provider
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = _tokenProvider ? await _tokenProvider() : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${BASE_URL}${path}`, { ...options, headers })
}

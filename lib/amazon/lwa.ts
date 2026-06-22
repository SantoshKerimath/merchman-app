// app/lib/amazon/lwa.ts

export interface LwaConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export interface TokenCache {
  token: string
  expiresAt: Date
}

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const EXPIRY_BUFFER_SECS = 60

export async function getAccessToken(
  config: LwaConfig,
  cached?: TokenCache
): Promise<TokenCache> {
  // Sandbox mode: skip real LWA exchange — reports.ts uses fixture data anyway
  if (process.env.AMAZON_SANDBOX === 'true') {
    return {
      token: 'sandbox-access-token',
      expiresAt: new Date(Date.now() + 3600 * 1000),
    }
  }

  // Return cached token if still valid (with buffer)
  if (cached) {
    const bufferMs = EXPIRY_BUFFER_SECS * 1000
    if (cached.expiresAt.getTime() - Date.now() > bufferMs) {
      return cached
    }
  }

  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LWA token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  return {
    token: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

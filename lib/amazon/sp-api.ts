// app/lib/amazon/sp-api.ts

const SANDBOX_BASE = 'https://sandbox.sellingpartnerapi-in.amazon.com'
const PROD_BASE    = 'https://sellingpartnerapi-in.amazon.com'

export function getBaseUrl(): string {
  return process.env.AMAZON_SANDBOX === 'true' ? SANDBOX_BASE : PROD_BASE
}

export async function spRequest(
  accessToken: string,
  method: 'GET' | 'POST',
  path: string,
  body?: object
): Promise<Response> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SP-API ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res
}

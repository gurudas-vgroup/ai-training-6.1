import { env } from '../config/env.js'

// Refresh this many ms before the token's real expiry, so a call in flight
// never straddles the boundary.
const EXPIRY_BUFFER_MS = 60_000

let cachedToken = null // { accessToken, expiresAt }

async function fetchAccessToken() {
  const response = await fetch(`https://${env.storeDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Shopify OAuth token request failed (${response.status}): ${body}`)
  }

  const data = JSON.parse(body)
  return {
    accessToken: data.access_token,
    // expires_in is seconds; fall back to an hour if Shopify ever omits it.
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - EXPIRY_BUFFER_MS,
  }
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken
  }
  cachedToken = await fetchAccessToken()
  return cachedToken.accessToken
}

/** Runs one GraphQL Admin API request, refreshing the cached token if needed. */
export async function shopifyGraphql(query, variables = {}) {
  const token = await getAccessToken()

  const response = await fetch(
    `https://${env.storeDomain}/admin/api/${env.apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    },
  )

  const payload = await response.json()

  if (!response.ok || payload.errors) {
    throw new Error(`Shopify Admin API error: ${JSON.stringify(payload.errors || payload)}`)
  }

  return payload.data
}

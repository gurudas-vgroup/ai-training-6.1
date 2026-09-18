import 'dotenv/config'

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    )
  }
  return value
}

export const env = {
  storeDomain: required('SHOPIFY_STORE_DOMAIN'),
  clientId: required('SHOPIFY_CLIENT_ID'),
  clientSecret: required('SHOPIFY_CLIENT_SECRET'),
  apiVersion: process.env.SHOPIFY_API_VERSION || '2025-10',
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
}

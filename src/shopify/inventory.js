import { shopifyGraphql } from './client.js'
import { pickProductMatch, pickLocationMatch } from './matching.js'

// Needs read_products.
const PRODUCTS_QUERY = `
  query FindProducts($query: String!) {
    products(first: 10, query: $query) {
      nodes {
        id
        title
        variants(first: 100) {
          nodes {
            id
            title
            inventoryItem { id }
          }
        }
      }
    }
  }
`

// Needs read_locations.
const LOCATIONS_QUERY = `
  query ListLocations {
    locations(first: 50) {
      nodes { id name }
    }
  }
`

// Needs read_inventory.
const INVENTORY_LEVELS_QUERY = `
  query InventoryLevels($ids: [ID!]!, $locationId: ID!) {
    nodes(ids: $ids) {
      ... on InventoryItem {
        id
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) {
            name
            quantity
          }
        }
      }
    }
  }
`

/**
 * Resolves a product name and a location name (as they appear in Shopify) to
 * their IDs, then reports available stock for each of the product's variants
 * at that location.
 */
export async function checkInventoryLevel({ productName, locationName }) {
  const [productsData, locationsData] = await Promise.all([
    shopifyGraphql(PRODUCTS_QUERY, { query: `title:*${productName}*` }),
    shopifyGraphql(LOCATIONS_QUERY),
  ])

  const product = pickProductMatch(productsData.products.nodes, productName)
  const location = pickLocationMatch(locationsData.locations.nodes, locationName)

  const variants = product.variants.nodes
  const inventoryItemIds = variants.map((variant) => variant.inventoryItem.id)

  const levelsData = await shopifyGraphql(INVENTORY_LEVELS_QUERY, {
    ids: inventoryItemIds,
    locationId: location.id,
  })

  // nodes(ids:) preserves input order, one slot per id.
  const variantLevels = variants.map((variant, index) => {
    const item = levelsData.nodes[index]
    const available =
      item?.inventoryLevel?.quantities?.find((q) => q.name === 'available')?.quantity ?? null
    return { variant: variant.title, available }
  })

  return {
    product: product.title,
    location: location.name,
    variants: variantLevels,
  }
}

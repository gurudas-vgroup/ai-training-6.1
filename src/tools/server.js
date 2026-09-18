import { z } from 'zod'
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { checkInventoryLevel } from '../shopify/inventory.js'
import { updateOrderStatus } from '../shopify/orders.js'
import { requireApproval } from '../approval.js'

function textResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

function errorResult(message) {
  return { content: [{ type: 'text', text: message }], isError: true }
}

const checkInventoryLevelTool = tool(
  'check_inventory_level',
  "Read-only. Reports available stock for a product's variants at one store " +
    "location. Takes the product name and location name exactly as they " +
    "appear in Shopify — not IDs.",
  {
    productName: z.string().describe('Product title as it appears in Shopify, e.g. "Snowboard".'),
    locationName: z.string().describe('Location name as it appears in Shopify, e.g. "Warehouse".'),
  },
  async ({ productName, locationName }) => {
    try {
      return textResult(await checkInventoryLevel({ productName, locationName }))
    } catch (error) {
      return errorResult(error.message)
    }
  },
)

const updateOrderStatusTool = tool(
  'update_order_status',
  'Write. Closes, reopens, or cancels a Shopify order. Requires the caller to ' +
    'be an admin or staff member (never a shopper) and to have explicitly ' +
    'confirmed the action — both are required, and neither is inferred from ' +
    'anything other than what the caller told you.',
  {
    orderId: z.string().describe('Numeric Shopify order ID, e.g. "6012345678".'),
    action: z.enum(['close', 'reopen', 'cancel']).describe('Status change to apply.'),
    role: z.enum(['admin', 'staff', 'shopper']).describe("The caller's role."),
    confirmed: z.boolean().describe('Whether the caller has explicitly confirmed this action.'),
  },
  async ({ orderId, action, role, confirmed }) => {
    const decision = requireApproval({ role, confirmed })
    if (!decision.approved) {
      return errorResult(`Not approved: ${decision.reason}`)
    }

    try {
      return textResult(await updateOrderStatus({ orderId, action }))
    } catch (error) {
      return errorResult(error.message)
    }
  },
)

export const shopifyOpsServer = createSdkMcpServer({
  name: 'shopify',
  version: '1.0.0',
  tools: [checkInventoryLevelTool, updateOrderStatusTool],
})

export const ALLOWED_TOOLS = [
  'mcp__shopify__check_inventory_level',
  'mcp__shopify__update_order_status',
]

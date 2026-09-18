import { shopifyGraphql } from './client.js'

// All three mutations need write_orders.

const ORDER_CLOSE = `
  mutation OrderClose($input: OrderCloseInput!) {
    orderClose(input: $input) {
      order { id name closed }
      userErrors { field message }
    }
  }
`

const ORDER_OPEN = `
  mutation OrderOpen($input: OrderOpenInput!) {
    orderOpen(input: $input) {
      order { id name closed }
      userErrors { field message }
    }
  }
`

// orderCancel runs as an async job and reports its own error list separately
// from the usual userErrors — Shopify's API, not a typo.
const ORDER_CANCEL = `
  mutation OrderCancel(
    $orderId: ID!
    $reason: OrderCancelReason!
    $refund: Boolean!
    $restock: Boolean!
  ) {
    orderCancel(orderId: $orderId, reason: $reason, refund: $refund, restock: $restock) {
      job { id done }
      orderCancelUserErrors { field message code }
    }
  }
`

function toOrderGid(orderId) {
  return orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`
}

function assertNoUserErrors(userErrors) {
  if (userErrors?.length) {
    throw new Error(userErrors.map((error) => error.message).join('; '))
  }
}

/** Applies a status change to an order. Callers must pass this through requireApproval() first. */
export async function updateOrderStatus({ orderId, action }) {
  const id = toOrderGid(orderId)

  if (action === 'close') {
    const data = await shopifyGraphql(ORDER_CLOSE, { input: { id } })
    assertNoUserErrors(data.orderClose.userErrors)
    return { action, order: data.orderClose.order }
  }

  if (action === 'reopen') {
    const data = await shopifyGraphql(ORDER_OPEN, { input: { id } })
    assertNoUserErrors(data.orderOpen.userErrors)
    return { action, order: data.orderOpen.order }
  }

  if (action === 'cancel') {
    const data = await shopifyGraphql(ORDER_CANCEL, {
      orderId: id,
      reason: 'OTHER',
      refund: false,
      restock: false,
    })
    assertNoUserErrors(data.orderCancel.orderCancelUserErrors)
    return { action, orderId, job: data.orderCancel.job }
  }

  throw new Error(`Unknown order action "${action}". Expected close, reopen, or cancel.`)
}

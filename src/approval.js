const APPROVED_ROLES = new Set(['admin', 'staff'])

/**
 * Gate in front of every write. Both conditions must hold — a confirmed
 * shopper is still rejected, and an unconfirmed admin is still rejected.
 */
export function requireApproval({ role, confirmed }) {
  if (!APPROVED_ROLES.has(role)) {
    return {
      approved: false,
      reason: `Role "${role}" is not permitted to perform this action. Only "admin" or "staff" may.`,
    }
  }

  if (confirmed !== true) {
    return {
      approved: false,
      reason: 'This action requires explicit confirmation before it can proceed.',
    }
  }

  return { approved: true }
}

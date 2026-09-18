import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requireApproval } from '../src/approval.js'

test('shopper role is rejected even when confirmed', () => {
  const result = requireApproval({ role: 'shopper', confirmed: true })
  assert.equal(result.approved, false)
})

test('shopper role is rejected when not confirmed', () => {
  const result = requireApproval({ role: 'shopper', confirmed: false })
  assert.equal(result.approved, false)
})

test('admin role is rejected without confirmation', () => {
  const result = requireApproval({ role: 'admin', confirmed: false })
  assert.equal(result.approved, false)
})

test('staff role is rejected without confirmation', () => {
  const result = requireApproval({ role: 'staff', confirmed: false })
  assert.equal(result.approved, false)
})

test('admin role with confirmation passes', () => {
  const result = requireApproval({ role: 'admin', confirmed: true })
  assert.equal(result.approved, true)
})

test('staff role with confirmation passes', () => {
  const result = requireApproval({ role: 'staff', confirmed: true })
  assert.equal(result.approved, true)
})

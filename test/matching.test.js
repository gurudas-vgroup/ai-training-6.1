import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickProductMatch, pickLocationMatch } from '../src/shopify/matching.js'

const products = [
  { title: 'Snowboard' },
  { title: 'Snowboard Wax' },
  { title: 'The Complete Snowboard' },
]

test('pickProductMatch: exact match wins over substring candidates', () => {
  const result = pickProductMatch(products, 'Snowboard')
  assert.equal(result.title, 'Snowboard')
})

test('pickProductMatch: exact match is case-insensitive', () => {
  const result = pickProductMatch(products, 'snowboard')
  assert.equal(result.title, 'Snowboard')
})

test('pickProductMatch: falls back to a unique substring match', () => {
  const result = pickProductMatch(products, 'Wax')
  assert.equal(result.title, 'Snowboard Wax')
})

test('pickProductMatch: zero matches raises a clear error', () => {
  assert.throws(() => pickProductMatch(products, 'Skis'), /No product found/)
})

test('pickProductMatch: ambiguous substring matches raise a clear error, never a guess', () => {
  // "Snowboard", "Snowboard Wax" and "The Complete Snowboard" all contain
  // "board", and none matches it exactly.
  assert.throws(() => pickProductMatch(products, 'board'), /Ambiguous product name/)
})

const locations = [
  { name: 'Warehouse' },
  { name: 'Warehouse Annex' },
  { name: 'Downtown Store' },
  { name: 'Online Store' },
]

test('pickLocationMatch: exact match wins even though a substring candidate also exists', () => {
  const result = pickLocationMatch(locations, 'Warehouse')
  assert.equal(result.name, 'Warehouse')
})

test('pickLocationMatch: ambiguous substring matches raise a clear error, never a guess', () => {
  assert.throws(() => pickLocationMatch(locations, 'Store'), /Ambiguous location name/)
})

/**
 * Picks the single candidate whose name matches `query`: an exact
 * case-insensitive match wins outright, even over several substring
 * candidates. Otherwise a unique case-insensitive substring match is
 * accepted. Zero or multiple matches is an error — never a guess.
 */
function pickByName(candidates, query, { entityLabel, getName }) {
  const needle = query.trim().toLowerCase()

  const exact = candidates.filter((item) => getName(item).trim().toLowerCase() === needle)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) {
    throw new Error(
      `Ambiguous ${entityLabel} name "${query}": ${exact.length} exact matches. Use a more specific name.`,
    )
  }

  const substring = candidates.filter((item) =>
    getName(item).trim().toLowerCase().includes(needle),
  )
  if (substring.length === 1) return substring[0]
  if (substring.length === 0) {
    throw new Error(`No ${entityLabel} found matching "${query}".`)
  }
  throw new Error(
    `Ambiguous ${entityLabel} name "${query}": ${substring.length} matches ` +
      `(${substring.map(getName).join(', ')}). Use a more specific name.`,
  )
}

export function pickProductMatch(products, query) {
  return pickByName(products, query, { entityLabel: 'product', getName: (p) => p.title })
}

export function pickLocationMatch(locations, query) {
  return pickByName(locations, query, { entityLabel: 'location', getName: (l) => l.name })
}

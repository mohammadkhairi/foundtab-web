/** Returns a human-readable quantity string, auto-upgrading small units when sensible. */
export function formatQty(value: number, unit: string): string {
  const u = unit.toLowerCase().trim()

  if ((u === 'g' || u === 'gram' || u === 'grams') && Math.abs(value) >= 1000) {
    return `${stripTrailingZeros(value / 1000)} kg`
  }
  if ((u === 'ml' || u === 'milliliter' || u === 'millilitre') && Math.abs(value) >= 1000) {
    return `${stripTrailingZeros(value / 1000)} L`
  }

  return `${stripTrailingZeros(value)} ${unit}`
}

/** Same as formatQty but prefixes positive values with '+' (for stock movement deltas). */
export function formatDelta(value: number, unit: string): string {
  const str = formatQty(Math.abs(value), unit)
  if (value > 0) return `+${str}`
  if (value < 0) return `-${str}`
  return str
}

function stripTrailingZeros(n: number): string {
  // Up to 3 decimal places, no trailing zeros
  return parseFloat(n.toFixed(3)).toString()
}

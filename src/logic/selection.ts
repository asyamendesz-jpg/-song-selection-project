export function toggleExclusive<T extends string>(
  current: T[],
  value: T,
  exclusive: T,
  max: number,
): T[] {
  if (value === exclusive) {
    return current.includes(exclusive) ? [] : [exclusive];
  }
  const without = current.filter((item) => item !== exclusive && item !== value);
  if (current.includes(value)) return without;
  if (without.length >= max) return current;
  return [...without, value];
}

export function toggleCapped<T extends string>(current: T[], value: T, max: number): T[] {
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (current.length >= max) return current;
  return [...current, value];
}

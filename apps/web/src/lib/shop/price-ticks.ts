export function buildPriceTicks(min: number, max: number, count = 5): number[] {
  if (max <= min) return [min];
  const steps = count - 1;
  const ticks: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = min + ((max - min) * i) / steps;
    ticks.push(Math.round(value));
  }
  return Array.from(new Set(ticks)).sort((a, b) => a - b);
}

export function formatCompactPrice(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

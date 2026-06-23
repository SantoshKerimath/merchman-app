// Claude Sonnet 4.6 pricing (USD per token)
export const RATES = {
  input: 3 / 1_000_000,   // $3 per million input tokens
  output: 15 / 1_000_000, // $15 per million output tokens
}

export interface Band {
  label: string
  usd: number
}

export const BANDS: Band[] = [
  { label: 'Starter', usd: 20 },
  { label: 'Growth', usd: 100 },
  { label: 'Scale', usd: 500 },
]

export function computeCostUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * RATES.input + outputTokens * RATES.output
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(2)}`
}

/** Format a USD cost: sub-cent amounts keep 4 significant decimals, otherwise cents. */
export function formatCostUsd(cost: number | null | undefined): string | null {
  if (cost === null || cost === undefined || Number.isNaN(cost)) return null;
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

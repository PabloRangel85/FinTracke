import type { TransactionRepository } from "./transaction-repository";

export async function getFinancialSummary(repository: TransactionRepository) {
  const totals = await repository.aggregateTotals();

  return {
    inflowCents: totals.inflowCents,
    outflowCents: totals.outflowCents,
    balanceCents: totals.inflowCents - totals.outflowCents,
  };
}
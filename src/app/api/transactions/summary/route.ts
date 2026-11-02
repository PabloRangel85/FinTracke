import { getFinancialSummary } from "@/modules/transactions/application/get-financial-summary";
import { transactionRepository } from "@/modules/transactions/infrastructure/prisma-transaction-repository";

export async function GET() {
  const summary = await getFinancialSummary(transactionRepository);

  return Response.json({
    inflow: summary.inflowCents / 100,
    outflow: summary.outflowCents / 100,
    balance: summary.balanceCents / 100,
  });
}
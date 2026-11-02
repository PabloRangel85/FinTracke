import type { TransactionType } from "../domain/transaction";
import type { TransactionRepository } from "./transaction-repository";

export function listTransactions(
  repository: TransactionRepository,
  filters: { search?: string; type?: TransactionType } = {},
) {
  return repository.list(filters);
}
import {
  inferCategoryId,
  validateCategoryForType,
  validateNewTransaction,
  type NewTransaction,
  type Transaction,
} from "../domain/transaction";
import type { TransactionRepository } from "./transaction-repository";

export type CreateTransactionCommand = NewTransaction & { categoryId?: string };

export async function createTransaction(
  repository: TransactionRepository,
  command: CreateTransactionCommand,
): Promise<Transaction> {
  const transaction = validateNewTransaction(command);
  const categoryId = command.categoryId || inferCategoryId(transaction.description, transaction.type);
  const category = await repository.findCategory(categoryId);

  if (!category) {
    throw new Error("A categoria informada não existe.");
  }

  validateCategoryForType(category, transaction.type);

  return repository.create({ ...transaction, categoryId: category.id });
}
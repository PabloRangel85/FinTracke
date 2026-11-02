import type { Category, Transaction, TransactionType } from "../domain/transaction";

export type TransactionFilters = {
  search?: string;
  type?: TransactionType;
};

export type TransactionTotals = {
  inflowCents: number;
  outflowCents: number;
};

export interface TransactionRepository {
  findCategory(id: string): Promise<Category | null>;
  create(input: {
    description: string;
    amountCents: number;
    type: TransactionType;
    date: Date;
    categoryId: string;
  }): Promise<Transaction>;
  list(filters: TransactionFilters): Promise<Transaction[]>;
  aggregateTotals(): Promise<TransactionTotals>;
}
import { describe, expect, it } from "vitest";
import { createTransaction } from "./create-transaction";
import { getFinancialSummary } from "./get-financial-summary";
import type { TransactionRepository } from "./transaction-repository";
import {
  DomainValidationError,
  type Category,
  type Transaction,
  type TransactionType,
} from "../domain/transaction";

const categories: Category[] = [
  { id: "FOOD", name: "Alimentação", transactionType: "OUTFLOW", color: "#d88752" },
  { id: "TRANSPORT", name: "Transporte", transactionType: "OUTFLOW", color: "#6e9a80" },
  { id: "OTHER_EXPENSE", name: "Outros gastos", transactionType: "OUTFLOW", color: "#8c8a83" },
  { id: "SALARY", name: "Salário", transactionType: "INFLOW", color: "#708f67" },
  { id: "OTHER_INCOME", name: "Outras receitas", transactionType: "INFLOW", color: "#8c8a83" },
];

function makeRepository(): TransactionRepository {
  const transactions: Transaction[] = [];

  return {
    findCategory: async (id) => categories.find((category) => category.id === id) ?? null,
    create: async (input) => {
      const transaction = {
        ...input,
        id: String(transactions.length + 1),
        category: categories.find((category) => category.id === input.categoryId)!,
      };
      transactions.push(transaction);
      return transaction;
    },
    list: async () => transactions,
    aggregateTotals: async () => ({
      inflowCents: transactions
        .filter((transaction) => transaction.type === "INFLOW")
        .reduce((total, transaction) => total + transaction.amountCents, 0),
      outflowCents: transactions
        .filter((transaction) => transaction.type === "OUTFLOW")
        .reduce((total, transaction) => total + transaction.amountCents, 0),
    }),
  };
}

function transactionInput(type: TransactionType, description: string, amountCents = 12_500) {
  return { description, amountCents, type, date: new Date("2026-11-02T12:00:00.000Z") };
}

describe("createTransaction", () => {
  it("infers a category from a case- and accent-insensitive description", async () => {
    const transaction = await createTransaction(
      makeRepository(),
      transactionInput("OUTFLOW", "Mercado da manhã"),
    );

    expect(transaction.category.id).toBe("FOOD");
  });

  it("recognizes transportation and income keywords", async () => {
    const repository = makeRepository();

    const ride = await createTransaction(repository, transactionInput("OUTFLOW", "UBER trip"));
    const salary = await createTransaction(repository, transactionInput("INFLOW", "Salário mensal"));

    expect(ride.category.id).toBe("TRANSPORT");
    expect(salary.category.id).toBe("SALARY");
  });

  it("rejects invalid amounts before writing", async () => {
    await expect(
      createTransaction(makeRepository(), transactionInput("OUTFLOW", "Café", 0)),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it("rejects a category that conflicts with the transaction type", async () => {
    await expect(
      createTransaction(makeRepository(), {
        ...transactionInput("OUTFLOW", "Salário"),
        categoryId: "SALARY",
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it("calculates the consolidated balance from repository totals", async () => {
    const repository = makeRepository();
    await createTransaction(repository, transactionInput("INFLOW", "Salário", 250_000));
    await createTransaction(repository, transactionInput("OUTFLOW", "Mercado", 48_250));

    await expect(getFinancialSummary(repository)).resolves.toEqual({
      inflowCents: 250_000,
      outflowCents: 48_250,
      balanceCents: 201_750,
    });
  });
});
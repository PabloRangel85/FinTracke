import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  Category,
  Transaction,
  TransactionType,
} from "../domain/transaction";
import type {
  TransactionFilters,
  TransactionRepository,
} from "../application/transaction-repository";
import { CATEGORY_CATALOG } from "./category-catalog";

function mapCategory(category: { id: string; name: string; transactionType: string; color: string }): Category {
  return { ...category, transactionType: category.transactionType as TransactionType };
}

function mapTransaction(
  transaction: Prisma.TransactionGetPayload<{ include: { category: true } }>,
): Transaction {
  return {
    id: transaction.id,
    description: transaction.description,
    amountCents: transaction.amountCents,
    type: transaction.type as TransactionType,
    date: transaction.date,
    category: mapCategory(transaction.category),
  };
}

export async function ensureCategories(): Promise<Category[]> {
  await Promise.all(
    CATEGORY_CATALOG.map((category) =>
      prisma.category.upsert({
        where: { id: category.id },
        create: category,
        update: {
          name: category.name,
          transactionType: category.transactionType,
          color: category.color,
        },
      }),
    ),
  );

  return CATEGORY_CATALOG;
}

export const transactionRepository: TransactionRepository = {
  async findCategory(id) {
    const category = await prisma.category.findUnique({ where: { id } });
    return category ? mapCategory(category) : null;
  },

  async create(input) {
    const transaction = await prisma.transaction.create({
      data: input,
      include: { category: true },
    });
    return mapTransaction(transaction);
  },

  async list(filters: TransactionFilters) {
    const where: Prisma.TransactionWhereInput = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.search
        ? {
            OR: [
              { description: { contains: filters.search } },
              { category: { name: { contains: filters.search } } },
            ],
          }
        : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return transactions.map(mapTransaction);
  },

  async aggregateTotals() {
    const totals = await prisma.transaction.groupBy({
      by: ["type"],
      _sum: { amountCents: true },
    });

    return totals.reduce(
      (summary, row) => {
        if (row.type === "INFLOW") summary.inflowCents = row._sum.amountCents ?? 0;
        if (row.type === "OUTFLOW") summary.outflowCents = row._sum.amountCents ?? 0;
        return summary;
      },
      { inflowCents: 0, outflowCents: 0 },
    );
  },
};
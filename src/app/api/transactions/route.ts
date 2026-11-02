import { z } from "zod";
import { createTransaction } from "@/modules/transactions/application/create-transaction";
import { listTransactions } from "@/modules/transactions/application/list-transactions";
import { DomainValidationError } from "@/modules/transactions/domain/transaction";
import {
  ensureCategories,
  transactionRepository,
} from "@/modules/transactions/infrastructure/prisma-transaction-repository";

const createSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount: z.string().regex(/^\d+(?:[,.]\d{1,2})?$/, "Informe um valor com até duas casas decimais."),
  type: z.enum(["INFLOW", "OUTFLOW"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().min(1).optional(),
});

function toResponse(transaction: Awaited<ReturnType<typeof createTransaction>>) {
  return {
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amountCents / 100,
    type: transaction.type,
    date: transaction.date.toISOString().slice(0, 10),
    category: transaction.category,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const typeValue = url.searchParams.get("type");
  const type = typeValue === "INFLOW" || typeValue === "OUTFLOW" ? typeValue : undefined;
  const search = url.searchParams.get("search")?.trim().slice(0, 80) || undefined;
  const transactions = await listTransactions(transactionRepository, { type, search });

  return Response.json(transactions.map(toResponse));
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const amountCents = Math.round(Number(parsed.data.amount.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 999_999_999) {
    return Response.json({ error: "Informe um valor positivo de até R$ 9.999.999,99." }, { status: 400 });
  }

  const date = new Date(`${parsed.data.date}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== parsed.data.date) {
    return Response.json({ error: "Informe uma data válida." }, { status: 400 });
  }

  try {
    await ensureCategories();
    const transaction = await createTransaction(transactionRepository, {
      description: parsed.data.description,
      amountCents,
      type: parsed.data.type,
      date,
      categoryId: parsed.data.categoryId,
    });

    return Response.json(toResponse(transaction), { status: 201 });
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message === "A categoria informada não existe.") {
      return Response.json({ error: error.message }, { status: 404 });
    }
    return Response.json({ error: "Não foi possível registrar a transação." }, { status: 500 });
  }
}
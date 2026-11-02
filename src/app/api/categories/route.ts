import { ensureCategories } from "@/modules/transactions/infrastructure/prisma-transaction-repository";

export async function GET() {
  const categories = await ensureCategories();
  return Response.json(categories);
}
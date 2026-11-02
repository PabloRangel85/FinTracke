import { PrismaClient } from "@prisma/client";
import { CATEGORY_CATALOG } from "../src/modules/transactions/infrastructure/category-catalog";

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
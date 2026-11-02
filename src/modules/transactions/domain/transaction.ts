export type TransactionType = "INFLOW" | "OUTFLOW";

export type Category = {
  id: string;
  name: string;
  transactionType: TransactionType;
  color: string;
};

export type Transaction = {
  id: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  date: Date;
  category: Category;
};

export type NewTransaction = {
  description: string;
  amountCents: number;
  type: TransactionType;
  date: Date;
};

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}

export function validateNewTransaction(input: NewTransaction): NewTransaction {
  const description = input.description.trim();

  if (!description || description.length > 120) {
    throw new DomainValidationError("A descrição deve ter entre 1 e 120 caracteres.");
  }

  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new DomainValidationError("O valor deve ser positivo e ter no máximo duas casas decimais.");
  }

  if (input.amountCents > 999_999_999) {
    throw new DomainValidationError("O valor máximo por transação é R$ 9.999.999,99.");
  }

  if (input.type !== "INFLOW" && input.type !== "OUTFLOW") {
    throw new DomainValidationError("O tipo da transação deve ser entrada ou saída.");
  }

  if (!(input.date instanceof Date) || Number.isNaN(input.date.getTime())) {
    throw new DomainValidationError("Informe uma data válida.");
  }

  return { ...input, description };
}

const CATEGORY_KEYWORDS: Record<TransactionType, Array<[string, string]>> = {
  INFLOW: [
    ["SALARY", "salario", "folha de pagamento", "pro-labore"],
    ["INVESTMENTS", "dividendo", "rendimento", "investimento", "juros"],
  ].map(([categoryId, ...keywords]) => [categoryId, keywords.join("|")]),
  OUTFLOW: [
    ["FOOD", "ifood", "mercado", "supermercado", "restaurante", "padaria", "rappi", "delivery"],
    ["TRANSPORT", "uber", "99app", "99pop", "gasolina", "combustivel", "metro", "onibus", "estacionamento", "taxi"],
    ["HOUSING", "aluguel", "condominio", "energia", "conta de luz", "conta de agua", "internet"],
    ["HEALTH", "farmacia", "medico", "consulta", "hospital", "plano de saude", "dentista"],
    ["LEISURE", "cinema", "netflix", "spotify", "viagem", "show", "streaming"],
    ["EDUCATION", "curso", "faculdade", "escola", "livro", "mensalidade escolar"],
    ["SHOPPING", "amazon", "roupa", "shopping", "loja", "compra online"],
    ["SERVICES", "seguro", "assinatura", "manutencao", "servico", "contador"],
  ].map(([categoryId, ...keywords]) => [categoryId, keywords.join("|")]),
};

export function inferCategoryId(description: string, type: TransactionType): string {
  const normalized = description
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const [categoryId, keywordList] of CATEGORY_KEYWORDS[type]) {
    if (keywordList.split("|").some((keyword) => normalized.includes(keyword))) {
      return categoryId;
    }
  }

  return type === "INFLOW" ? "OTHER_INCOME" : "OTHER_EXPENSE";
}

export function validateCategoryForType(category: Category, type: TransactionType): void {
  if (category.transactionType !== type) {
    throw new DomainValidationError("A categoria não corresponde ao tipo da transação.");
  }
}
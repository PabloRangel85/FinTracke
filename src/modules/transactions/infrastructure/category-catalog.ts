import type { Category } from "../domain/transaction";

export const CATEGORY_CATALOG: Category[] = [
  { id: "FOOD", name: "Alimentação", transactionType: "OUTFLOW", color: "#c7794d" },
  { id: "TRANSPORT", name: "Transporte", transactionType: "OUTFLOW", color: "#628c78" },
  { id: "HOUSING", name: "Moradia", transactionType: "OUTFLOW", color: "#bd8e4e" },
  { id: "HEALTH", name: "Saúde", transactionType: "OUTFLOW", color: "#b85c50" },
  { id: "LEISURE", name: "Lazer", transactionType: "OUTFLOW", color: "#6e8399" },
  { id: "EDUCATION", name: "Educação", transactionType: "OUTFLOW", color: "#8a795f" },
  { id: "SHOPPING", name: "Compras", transactionType: "OUTFLOW", color: "#aa6c7a" },
  { id: "SERVICES", name: "Serviços", transactionType: "OUTFLOW", color: "#7b7b68" },
  { id: "OTHER_EXPENSE", name: "Outros gastos", transactionType: "OUTFLOW", color: "#8b8b83" },
  { id: "SALARY", name: "Salário", transactionType: "INFLOW", color: "#5e8a68" },
  { id: "INVESTMENTS", name: "Investimentos", transactionType: "INFLOW", color: "#68879c" },
  { id: "OTHER_INCOME", name: "Outras receitas", transactionType: "INFLOW", color: "#858d65" },
];
"use client";

import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useDeferredValue, useEffect, useEffectEvent, useState, useTransition } from "react";
import type { FormEvent } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category, TransactionType } from "@/modules/transactions/domain/transaction";

type TransactionRow = {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: Category;
};

type Summary = { inflow: number; outflow: number; balance: number };

const EMPTY_SUMMARY: Summary = { inflow: 0, outflow: 0, balance: 0 };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function amountToInput(value: string) {
  const normalized = value.replace(/\s/g, "");
  return normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
}

function localDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "Não foi possível concluir a solicitação.";
    throw new Error(message);
  }
  return body as T;
}

function buildMonthlyFlow(transactions: TransactionRow[], now: Date | null) {
  if (!now) return [];
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      month: monthLabel.format(date).replace(".", ""),
      Entradas: 0,
      Saídas: 0,
    };
  });

  for (const transaction of transactions) {
    const month = months.find((item) => item.key === transaction.date.slice(0, 7));
    if (!month) continue;
    if (transaction.type === "INFLOW") month.Entradas += transaction.amount;
    else month.Saídas += transaction.amount;
  }

  return months;
}

function buildCategoryBreakdown(transactions: TransactionRow[]) {
  const values = new Map<string, { name: string; value: number; color: string }>();

  for (const transaction of transactions) {
    if (transaction.type !== "OUTFLOW") continue;
    const current = values.get(transaction.category.id);
    values.set(transaction.category.id, {
      name: transaction.category.name,
      value: (current?.value ?? 0) + transaction.amount,
      color: transaction.category.color,
    });
  }

  return [...values.values()].sort((first, second) => second.value - first.value);
}

export function FinanceDashboard() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [today, setToday] = useState<Date | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("OUTFLOW");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const [, startTransition] = useTransition();

  async function refresh(query = search, kind = filterType) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (kind !== "ALL") params.set("type", kind);

    const [allRows, rows, totals] = await Promise.all([
      fetch("/api/transactions", { cache: "no-store" }).then(readJson<TransactionRow[]>),
      fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" }).then(readJson<TransactionRow[]>),
      fetch("/api/transactions/summary", { cache: "no-store" }).then(readJson<Summary>),
    ]);

    startTransition(() => {
      setAllTransactions(allRows);
      setTransactions(rows);
      setSummary(totals);
    });
  }

  const refreshForCurrentFilter = useEffectEvent(() => refresh(deferredSearch, filterType));
  const initializeLocalDate = useEffectEvent(() => {
    const currentDate = new Date();
    setToday(currentDate);
    setDate(localDateInput(currentDate));
  });

  useEffect(() => {
    const controller = new AbortController();
    const dateTimer = window.setTimeout(initializeLocalDate, 0);

    async function load() {
      try {
        const [categoryResponse, rowsResponse, summaryResponse] = await Promise.all([
          fetch("/api/categories", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/transactions", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/transactions/summary", { signal: controller.signal, cache: "no-store" }),
        ]);
        const [nextCategories, rows, totals] = await Promise.all([
          readJson<Category[]>(categoryResponse),
          readJson<TransactionRow[]>(rowsResponse),
          readJson<Summary>(summaryResponse),
        ]);
        if (controller.signal.aborted) return;
        setCategories(nextCategories);
        setAllTransactions(rows);
        setTransactions(rows);
        setSummary(totals);
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => {
      controller.abort();
      window.clearTimeout(dateTimer);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    let active = true;

    const timeout = window.setTimeout(() => {
      refreshForCurrentFilter()
        .then(() => {
          if (active) setErrorMessage("");
        })
        .catch((error: unknown) => {
          if (active) setErrorMessage(error instanceof Error ? error.message : "Falha ao filtrar transações.");
        });
    }, 140);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [deferredSearch, filterType, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setErrorMessage("");

    try {
      const created = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: amountToInput(amount),
          type,
          date,
          ...(categoryId ? { categoryId } : {}),
        }),
      }).then(readJson<TransactionRow>);

      await refresh();
      setDescription("");
      setAmount("");
      setCategoryId("");
      setDate(localDateInput(new Date()));
      setNotice(`${created.category.name} · lançamento registrado`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível registrar a transação.");
    } finally {
      setSaving(false);
    }
  }

  const expenseCategories = categories.filter((category) => category.transactionType === "OUTFLOW");
  const incomeCategories = categories.filter((category) => category.transactionType === "INFLOW");
  const visibleCategories = type === "INFLOW" ? incomeCategories : expenseCategories;
  const monthlyFlow = buildMonthlyFlow(allTransactions, today);
  const categoryBreakdown = buildCategoryBreakdown(allTransactions);
  const sixMonthBalance = monthlyFlow.reduce((balance, month) => balance + month.Entradas - month.Saídas, 0);
  const topCategories = categoryBreakdown.slice(0, 4);
  const greetingDate = today ? new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today) : "";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Fintrack, página inicial">
          <span className="brand-mark"><Wallet size={19} strokeWidth={2.2} /></span>
          <span>fintrack<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-switcher">
          <span className="workspace-avatar">A</span>
          <span className="workspace-copy"><strong>Meu espaço</strong><small>Pessoal</small></span>
          <ChevronDown size={15} />
        </div>

        <p className="nav-caption">MENU</p>
        <nav className="primary-nav" aria-label="Navegação principal">
          <a className="nav-link active" href="#overview"><LayoutDashboard size={17} /> Visão geral</a>
          <a className="nav-link" href="#transactions"><ArrowLeftRight size={17} /> Transações</a>
          <a className="nav-link" href="#insights"><CreditCard size={17} /> Categorias</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon"><Sparkles size={16} /></span>
            <div><strong>Um passo de cada vez</strong><p>Pequenos hábitos, mais clareza.</p></div>
          </div>
          <div className="profile-button">
            <span className="profile-avatar">AC</span>
            <span><strong>Olá, Ana</strong><small>Conta pessoal</small></span>
            <CircleHelp size={17} />
          </div>
        </div>
      </aside>

      <main className="main-area" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Meu espaço</span><span className="crumb-slash">/</span><strong>Visão geral</strong></div>
          <div className="topbar-actions">
            <span className="today-label"><CalendarDays size={15} /> {greetingDate}</span>
            <span className="avatar-small">AC</span>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">SEU PANORAMA FINANCEIRO</p>
              <h1>Seu dinheiro,<br className="mobile-break" /> em perspectiva<span className="heading-period">.</span></h1>
              <p className="heading-copy">Um panorama simples para decisões mais tranquilas.</p>
            </div>
            <div className="period-control" aria-label="Período: últimos seis meses">
              <CalendarDays size={16} /><span>Últimos 6 meses</span><ChevronDown size={15} />
            </div>
          </section>

          <section className="summary-grid" aria-label="Resumo financeiro">
            <article className="summary-card income-card">
              <div className="summary-label"><span className="summary-icon"><ArrowDownLeft size={17} /></span><span>Entradas</span><span className="summary-period">Total recebido</span></div>
              <strong className="summary-value">{currency.format(summary.inflow)}</strong>
              <span className="summary-foot"><span className="positive-dot" /> Receitas registradas</span>
            </article>
            <article className="summary-card expense-card">
              <div className="summary-label"><span className="summary-icon"><ArrowUpRight size={17} /></span><span>Saídas</span><span className="summary-period">Total utilizado</span></div>
              <strong className="summary-value">{currency.format(summary.outflow)}</strong>
              <span className="summary-foot"><span className="expense-dot" /> Despesas registradas</span>
            </article>
            <article className="summary-card balance-card">
              <div className="summary-label"><span className="summary-icon"><Wallet size={17} /></span><span>Saldo líquido</span><span className="summary-period">Disponível</span></div>
              <strong className="summary-value">{currency.format(summary.balance)}</strong>
              <span className="summary-foot"><span className="balance-dot" /> Entradas menos saídas</span>
            </article>
          </section>

          <div className="overview-grid">
            <section className="panel flow-panel" id="insights">
              <div className="panel-heading">
                <div><p className="panel-kicker">MOVIMENTO</p><h2>Fluxo financeiro</h2></div>
                <div className="chart-legend"><span><i className="legend-income" /> Entradas</span><span><i className="legend-expense" /> Saídas</span></div>
              </div>
              <div className="chart-summary"><strong>{currency.format(sixMonthBalance)}</strong><span>saldo nos últimos 6 meses</span></div>
              <div className="flow-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyFlow} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#527b68" stopOpacity={0.17} /><stop offset="95%" stopColor="#527b68" stopOpacity={0.01} /></linearGradient>
                      <linearGradient id="expense-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7794d" stopOpacity={0.13} /><stop offset="95%" stopColor="#c7794d" stopOpacity={0.01} /></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#eeeae2" strokeDasharray="3 5" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#92918a", fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#92918a", fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value.toFixed(0)}`} />
                    <Tooltip formatter={(value) => currency.format(Number(value))} contentStyle={{ border: "1px solid #e8e4dc", borderRadius: 8, fontSize: 12, boxShadow: "0 6px 24px #29261e12" }} />
                    <Area type="monotone" dataKey="Entradas" stroke="#527b68" strokeWidth={2.5} fill="url(#income-fill)" activeDot={{ r: 4, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="Saídas" stroke="#c7794d" strokeWidth={2} fill="url(#expense-fill)" activeDot={{ r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-footnote"><span>Visão mensal</span><span>Valores em reais (R$)</span></div>
            </section>

            <section className="panel category-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">PARA ONDE VAI</p><h2>Gastos por categoria</h2></div>
                <span className="icon-button" title="Categorias calculadas sobre todos os lançamentos" aria-label="Categorias calculadas sobre todos os lançamentos"><CircleHelp size={16} /></span>
              </div>
              {categoryBreakdown.length ? (
                <>
                  <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius="72%" outerRadius="94%" paddingAngle={3} stroke="none">
                          {categoryBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => currency.format(Number(value))} contentStyle={{ border: "1px solid #e8e4dc", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center"><span>SAÍDAS</span><strong>{currency.format(summary.outflow)}</strong></div>
                  </div>
                  <div className="category-legend">
                    {topCategories.map((category) => (
                      <div className="category-line" key={category.name}>
                        <span className="category-name"><i style={{ backgroundColor: category.color }} />{category.name}</span>
                        <strong>{currency.format(category.value)}</strong>
                      </div>
                    ))}
                  </div>
                  {categoryBreakdown.length > 4 && <p className="category-extra">+ {categoryBreakdown.length - 4} outras categorias</p>}
                </>
              ) : (
                <div className="chart-empty"><span className="empty-ring"><Wallet size={20} /></span><p>Suas categorias aparecem aqui conforme você registra gastos.</p></div>
              )}
            </section>
          </div>

          <div className="activity-grid">
            <section className="panel transactions-panel" id="transactions">
              <div className="panel-heading transactions-heading">
                <div><p className="panel-kicker">ACOMPANHAMENTO</p><h2>Últimas transações</h2></div>
                <span className="transaction-count">{transactions.length} {transactions.length === 1 ? "lançamento" : "lançamentos"}</span>
              </div>
              <div className="table-toolbar">
                <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lançamento..." aria-label="Buscar lançamento" /></label>
                <label className="filter-select"><Filter size={15} /><select value={filterType} onChange={(event) => setFilterType(event.target.value)} aria-label="Filtrar por tipo"><option value="ALL">Todos os tipos</option><option value="INFLOW">Entradas</option><option value="OUTFLOW">Saídas</option></select><ChevronDown size={13} /></label>
              </div>

              <div className="transaction-table-wrap">
                <table className="transaction-table">
                  <thead><tr><th>LANÇAMENTO</th><th>CATEGORIA</th><th>DATA</th><th className="amount-heading">VALOR</th></tr></thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="table-state" colSpan={4}><LoaderCircle size={18} className="spin" /> Carregando seus lançamentos...</td></tr>
                    ) : transactions.length ? transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td><div className="transaction-title"><span className={`transaction-type-icon ${transaction.type === "INFLOW" ? "inflow-icon" : "outflow-icon"}`}>{transaction.type === "INFLOW" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><strong>{transaction.description}</strong></div></td>
                        <td><span className="category-chip"><i style={{ backgroundColor: transaction.category.color }} />{transaction.category.name}</span></td>
                        <td className="date-cell">{dateLabel.format(new Date(`${transaction.date}T12:00:00`)).replace(".", "")}</td>
                        <td className={`amount-cell ${transaction.type === "INFLOW" ? "amount-inflow" : "amount-outflow"}`}>{transaction.type === "INFLOW" ? "+ " : "− "}{currency.format(transaction.amount)}</td>
                      </tr>
                    )) : (
                      <tr><td className="table-state" colSpan={4}><span className="empty-table-icon"><Search size={18} /></span><strong>Nenhum lançamento por aqui</strong><span>Experimente ajustar a busca ou registre uma nova transação.</span></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="table-footer"><span>Valores categorizados automaticamente pela descrição.</span><button type="button" className="view-all-button" onClick={() => { setSearch(""); setFilterType("ALL"); }}>Limpar filtros <ArrowDownRight size={14} /></button></footer>
            </section>

            <aside className="panel quick-entry-panel">
              <div className="quick-entry-heading"><span className="quick-entry-mark"><Plus size={17} /></span><div><p className="panel-kicker">NOVO LANÇAMENTO</p><h2>Adicionar</h2></div></div>
              <form className="transaction-form" onSubmit={handleSubmit}>
                <fieldset className="type-switch">
                  <legend className="sr-only">Tipo de lançamento</legend>
                  <button type="button" className={type === "OUTFLOW" ? "selected expense-selected" : ""} onClick={() => { setType("OUTFLOW"); setCategoryId(""); }}><ArrowUpRight size={15} /> Saída</button>
                  <button type="button" className={type === "INFLOW" ? "selected income-selected" : ""} onClick={() => { setType("INFLOW"); setCategoryId(""); }}><ArrowDownLeft size={15} /> Entrada</button>
                </fieldset>

                <label className="form-label">Descrição<input required minLength={1} maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Mercado da semana" /></label>
                <label className="form-label">Valor<div className="currency-input"><span>R$</span><input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.,]/g, ""))} placeholder="0,00" aria-label="Valor em reais" /></div></label>
                <label className="form-label">Categoria<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Sugerir pela descrição</option>{visibleCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><ChevronDown className="select-chevron" size={14} /></label>
                <label className="form-label">Data<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>

                <p className="form-hint"><Sparkles size={13} /> A categoria pode ser sugerida pela descrição.</p>
                {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
                {notice && <p className="form-success" role="status"><Check size={14} /> {notice}</p>}
                <button className="submit-button" type="submit" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />}{saving ? "Registrando..." : "Registrar lançamento"}</button>
              </form>
            </aside>
          </div>

          <footer className="page-footer"><span>Fintrack <span>·</span> clareza para seguir em frente</span><span>Seus dados ficam no seu dispositivo.</span></footer>
        </div>
      </main>
    </div>
  );
}
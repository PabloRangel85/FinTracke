# FinTrack

Gerenciador pessoal de receitas e despesas com categorização automática, extrato e saldo consolidado.

## Executar localmente

Requisitos: Node.js 24+ e npm.

```bash
npm install
cp -n .env.example .env
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

A aplicação estará em `http://localhost:3000`. O SQLite local fica em `prisma/dev.db`.

## API

- `GET /api/categories`: lista as categorias disponíveis.
- `GET /api/transactions`: lista transações; aceita `search` e `type=INFLOW|OUTFLOW`.
- `POST /api/transactions`: cria transação com `description`, `amount` (decimal em reais), `type`, `date` (`YYYY-MM-DD`) e `categoryId` opcional.
- `GET /api/transactions/summary`: retorna `inflow`, `outflow` e `balance`, agregados pelo banco.

Exemplo de criação:

```json
{
  "description": "Mercado da semana",
  "amount": "245,90",
  "type": "OUTFLOW",
  "date": "2026-11-02"
}
```

Os valores são persistidos como centavos inteiros. Categorias são uma entidade relacional, e uma categoria incompatível com o tipo da transação é rejeitada. O caso de uso sugere categorias por palavras-chave na descrição e permite selecionar outra categoria válida do mesmo tipo.

## Verificações

```bash
npm test
npm run lint
npm run build
```

As fronteiras entre domínio, casos de uso, persistência e interface estão descritas em `.agentrules`.
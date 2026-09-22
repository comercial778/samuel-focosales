# FocoSales CRM

CRM otimizado para closer — calculadora de vendas/comissão, ciclos de produto,
parcelas, comprovantes, metas e dashboard. Reconstruído a partir da documentação
`ESTRUTURA-COMPLETA.md` e da base de dados exportada do sistema original.

**Stack:** React 19 + TanStack Start (SSR/rotas por arquivo) + Tailwind v4 +
componentes estilo shadcn/ui + Recharts. Backend: Supabase (Postgres + Auth +
Storage), workspace único compartilhado entre todos os usuários autenticados.

## 1. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.
3. Copie `.env.example` para `.env` e preencha:

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key   # só para o script de seed
   ```

4. Em **Authentication → Providers**, habilite **Email** e, se quiser o botão
   "Continuar com Google", habilite **Google** (configure o OAuth client no
   Google Cloud Console e cole client id/secret).
5. Em **Authentication → URL Configuration**, adicione a URL do app (local e de
   produção) em *Redirect URLs*.

## 2. Aplicar o schema

Abra o **SQL Editor** do projeto Supabase e execute o conteúdo de
`supabase/migrations/0001_init.sql` (ou use a Supabase CLI: `supabase db push`
apontando para este projeto). Isso cria:

- Tabelas `profiles`, `user_roles`, `user_settings`, `sales`, `installments`,
  `receipts`, `sales_goals`, `dashboard_shares`.
- Triggers: criação automática de profile/role/settings no cadastro
  (`handle_new_user`), conversão automática de oportunidade → venda quando o
  pagamento é recebido, `updated_at` automático.
- RLS: workspace compartilhado — qualquer usuário autenticado lê/escreve todos
  os dados (igual ao sistema original).
- Bucket de Storage privado `receipts` para upload de comprovantes/contratos.

## 3. Importar os dados reais (opcional)

Os dados exportados do sistema original (36 vendas, 78 parcelas, 84
comprovantes, metas, etc.) estão em `supabase/seed-data/focosales-dados.sql` e
podem ser importados com:

```bash
npm install
SUPABASE_SERVICE_ROLE_KEY=... VITE_SUPABASE_URL=... npm run seed
```

O script (`scripts/seed.ts`):

- Cria uma conta no Supabase Auth para cada perfil exportado (via Admin API,
  com senha aleatória — os usuários originais devem redefinir a senha, ou você
  pode gerar links de recuperação depois).
- Remapeia todos os `owner_id`/`user_id` para os novos ids gerados.
- Importa vendas, parcelas, comprovantes (como links, sem re-hospedar
  arquivos), metas e o compartilhamento legado.
- É idempotente para usuários (reconhece e-mails já cadastrados) e usa
  `upsert` por id nas demais tabelas.

## 4. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`, crie uma conta em `/auth` (ou use uma importada
pelo seed) e comece a usar.

## 5. Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (SSR via Nitro) |
| `npm run preview` | Serve o build de produção |
| `npm run lint` / `npm run format` | Lint / formatação |
| `npm run seed` | Importa os dados reais exportados |

## 6. Estrutura do projeto

```
src/
  routes/            # páginas (roteamento por arquivo do TanStack Router)
  server/             # server functions (API interna, ver seção abaixo)
  components/
    ui/               # primitivos (botão, card, dialog, select, ...)
    sales/            # formulário de venda, parcelas, comprovantes
    charts/           # gráficos do dashboard
  lib/
    business/         # regras de negócio (produtos/ciclo, comissão, período)
    supabase/         # clientes browser/server + tipos do banco
supabase/
  migrations/0001_init.sql   # schema completo
  seed-data/                  # dump original exportado
scripts/
  seed.ts                     # importador dos dados reais
```

## 7. Regras de negócio (resumo)

- **Comissão:** PIX à vista 9%, Cartão 6%, calculada sobre as parcelas
  **recebidas** dentro do período filtrado. Oportunidades nunca entram em
  faturamento/comissão.
- **Ciclo do produto:** início = data da primeira parcela com data (ou a data
  da venda, se nenhuma parcela tiver data); término = início + duração do
  produto (Gestão Mensal: 1 mês, Gestão 3/6: 3/6 meses, Mentoria 4 meses,
  Mentoria + Gestão: 3 meses, Street: 12 meses).
- **Regra-mestre dos filtros:** tudo é filtrado pela data de vencimento da
  parcela (`due_date`), não pela data da venda — exceto onde indicado (ex.:
  "Nº de vendas" e "Faturamento" do Dashboard usam a data da venda).
- **Ciclo financeiro padrão:** dia 25 a 25.
- Diferente do sistema original, editar uma venda aqui **não** apaga e recria
  todas as parcelas — parcelas existentes são atualizadas por id, preservando
  os comprovantes já anexados a elas.

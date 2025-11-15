## Visão geral

Aplicação completa para operação de PDV com Next.js (App Router), Prisma e PostgreSQL. Inclui catálogo orientado por estoque, PDV com fluxo guiado, painel de histórico e agora um mecanismo de autenticação de operadores.

## Requisitos

- Node.js 18+
- Banco PostgreSQL configurado e acessível via variáveis de ambiente
- Dependências instaladas com `npm install`

## Configuração de ambiente

Crie (ou atualize) o arquivo `.env` na raiz do projeto com as variáveis necessárias:

```env
DATABASE_URL="postgres://…"
DIRECT_DATABASE_URL="postgres://…"
POSTGRES_URL="postgres://…"
AUTH_SECRET="troque-por-uma-chave-secreta"
```

> **Importante:** `AUTH_SECRET` é usada para assinar os tokens de sessão. Utilize um valor longo e aleatório em produção.

## Seeding inicial

O script `scripts/seed-produtos.js` populará produtos base e garante a existência de um operador padrão.

```bash
npx prisma migrate deploy
node ./scripts/seed-produtos.js
```

Credenciais criadas pelo seed:

- **Login:** `operador.master`
- **Senha:** `123456`

Substitua ou remova esse operador conforme a política de segurança do projeto.

## Executando em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). As rotas `/estoque`, `/venda` e `/venda/historico` exigem autenticação.

## Fluxo de autenticação

1. Acesse `/login` e informe as credenciais de operador.
2. Um cookie httpOnly (`sabor_session`) é emitido com duração de 8 horas.
3. As APIs e páginas protegidas validam o cookie antes de responder.
4. Use o botão **Encerrar sessão** para invalidar o cookie.

Em caso de sessão expirada, o usuário é redirecionado automaticamente para `/login`, mantendo a rota desejada na query `redirect`.

## Scripts úteis

- `npm run dev` — inicia o ambiente de desenvolvimento.
- `npm run build` — gera a versão de produção.
- `npm run start` — executa a build já gerada.
- `npm run lint` — validações do ESLint.

## Estrutura destacada

- `app/login` — página e formulário de login.
- `app/api/auth/*` — endpoints de login, logout e sessão.
- `lib/auth` — utilitários de token e sessão.
- `components/auth/auth-provider.tsx` — contexto de autenticação usado pelas rotas protegidas.

## Segurança

- Senhas de operadores estão em texto plano apenas para fins didáticos — utilize hashing (ex.: bcrypt) em ambientes reais.
- Ajuste `AUTH_SECRET` e demais credenciais antes de publicar.
- Considere mover o login para um provedor dedicado (NextAuth, Auth.js, etc.) conforme a complexidade do produto.

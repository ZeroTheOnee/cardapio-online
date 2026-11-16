# PedeEasy

Aplicação multi-loja para cardápios digitais e pedidos online. Clientes escolhem produtos e acompanham pedidos; cada loja administra pedidos, catálogo, entrega e aparência em `/admin`.

## Requisitos

- Node.js 20 ou mais recente
- Um projeto Supabase com Auth e banco configurados

## Rodar localmente

1. Instale as dependências com `npm install`.
2. Crie `.env.local` na raiz do projeto:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
   ```

   Use somente a chave pública do Supabase (`anon` ou `publishable`). Nunca coloque uma chave `service_role` ou `secret` em variável `NEXT_PUBLIC_`.

3. Inicie o servidor com `npm run dev` e abra <http://localhost:3000>.

## Comandos

```bash
npm run dev    # desenvolvimento local
npm run lint   # análise estática com ESLint
npm run build  # build de produção
npm start      # serve o build de produção
```

## Estrutura

- `app/[slug]`: cardápio público de uma loja.
- `app/entrar`: login e cadastro de clientes.
- `app/pedido/[id]` e `app/meus-pedidos`: acompanhamento e histórico.
- `app/admin`: painel dos donos de loja.
- `lib/supabase`: clientes Supabase para servidor e navegador.
- `supabase/schema.sql`: referência SQL do banco.

## Supabase e segurança

O app depende das tabelas, políticas RLS e funções RPC do Supabase. Pedidos devem ser criados pela função `criar_pedido`, que calcula o total e atualiza o estoque no banco. Não remova RLS nem permita que o navegador envie valores de preço ou total como fonte confiável.

**Atenção:** o `supabase/schema.sql` versionado ainda não contém todas as tabelas, colunas e funções usadas pelo código atual (por exemplo, localidades e configuração de Pix). Não use esse arquivo sozinho para criar ou restaurar um banco. Antes de configurar um projeto Supabase novo, atualize e confira o esquema completo contra as consultas e RPCs do app. Para o banco já em uso, registre cada mudança SQL em migrações versionadas e preserve os dados existentes.

No Supabase, configure as URLs de redirecionamento de Auth para o endereço local e o domínio publicado, incluindo `/auth/confirm`. O cadastro e recuperação de senha também dependem das configurações de confirmação de e-mail e SMTP do projeto.

## Publicação

O projeto pode ser publicado na Vercel. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nas variáveis de ambiente da Vercel e confira as URLs de redirecionamento no Supabase Auth. Depois de alterar variáveis, faça um novo deploy.

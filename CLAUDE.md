# Cardápio Online — contexto do projeto

Leia este arquivo inteiro antes de mexer em qualquer coisa.

## O que é

Plataforma **multi-loja** de cardápio digital e pedidos para restaurantes, lanchonetes e food trucks. O dono do projeto vende o serviço (mensalidade) para pequenos negócios do interior. Uma única aplicação e um único banco atendem todas as lojas; cada loja é uma linha na tabela `lojas`.

- **Cliente final:** abre o cardápio da loja, monta o carrinho, cria conta (com endereço de entrega) e faz o pedido.
- **Dono da loja:** usa o painel `/admin` para ver pedidos, mudar status, cancelar, editar preço/estoque, cadastrar produtos e abrir/fechar a loja.
- **Administrador da plataforma (o usuário):** cria as lojas e os logins dos donos manualmente pelo Supabase.

## Como trabalhar com o usuário

- Responda em **português do Brasil**, de forma prática e direta (ação primeiro).
- O usuário está **começando em programação** e usa **Windows (PowerShell) + VS Code**. Explique o que está fazendo e por quê, em linguagem simples, e diga como testar cada mudança.
- A pasta do projeto fica dentro do OneDrive (Desktop), que às vezes trava arquivos. Plano B se houver erros estranhos de arquivo: mover o projeto para uma pasta fora do OneDrive (ex.: `C:\projetos`).
- Antes de mudanças grandes, lembre o usuário de fazer `git commit`. Nunca faça `git push --force`.
- Nunca mostre, grave em arquivo versionado ou envie para o GitHub chaves secretas.

## Stack

- **Next.js 16** (App Router, **sem** pasta `src/`), **React**, **TypeScript**, **Tailwind CSS**
- **Supabase** (PostgreSQL + Auth) via `@supabase/supabase-js` e `@supabase/ssr`
- Hospedagem: **Vercel**, deploy automático a cada `git push` na branch `main`
- Código no GitHub (repositório privado `ZeroTheOnee/cardapio-online`)

Pontos importantes da versão do Next.js:
- `params` das rotas é uma **Promise** (`const { slug } = await params`).
- **Cache Components e Partial Prefetching estão DESLIGADOS** de propósito (preço e estoque mudam o tempo todo). Não reative em `next.config.ts`.
- Não alterar o bloco `turbopack.rules` do `next.config.ts` (config do Tailwind).

## Comandos

```
npm run dev      # servidor local em http://localhost:3000
npm run build    # build de produção (rode antes de publicar mudanças grandes)
npm run lint
git add . && git commit -m "mensagem" && git push   # publica (a Vercel faz o deploy)
```

Se o `npm run dev` avisar que a porta 3000 está em uso, há um servidor antigo rodando: `taskkill /PID <número> /F` e rodar de novo.

## Estrutura de pastas

```
app/
  page.tsx                  página de teste de conexão (a trocar por uma home de verdade)
  [slug]/page.tsx           cardápio público da loja (servidor: busca loja, categorias, produtos)
  [slug]/Cardapio.tsx       interface do cardápio, carrinho e checkout (cliente)
  entrar/page.tsx           login e cadastro do cliente (aceita ?loja=<slug> para voltar ao cardápio)
  pedido/[id]/page.tsx      confirmação/acompanhamento do pedido
  admin/page.tsx            painel do dono (servidor: exige login e loja do usuário)
  admin/Painel.tsx          interface do painel: pedidos, produtos, abrir/fechar loja
lib/supabase/
  server.ts                 cliente Supabase para componentes de servidor (cookies)
  client.ts                 cliente Supabase para o navegador
supabase/schema.sql         esquema completo do banco (backup e referência)
```

## Banco de dados

Fonte da verdade: `supabase/schema.sql`. Resumo:

- `lojas` (dono_id → auth.users, slug único, taxa_entrega, aberta)
- `categorias`, `produtos` (preco, estoque, ativo, imagem_url)
- `clientes` (id = auth.users.id), `enderecos`
- `pedidos` (status, tipo entrega/retirada, endereco_entrega em jsonb, subtotal, taxa, total, forma_pagamento, pagamento_status)
- `itens_pedido` (guarda nome e preço da hora da compra)
- Funções: `criar_pedido(...)` e `cancelar_pedido(...)` (security definer)

## Regras de segurança — NÃO QUEBRAR

1. **RLS ligado em todas as tabelas.** Nunca desligar para "fazer funcionar"; corrija a política.
2. **Pedidos só são criados pela função `criar_pedido`** (chamada via `supabase.rpc`). Ela confere preço e estoque no servidor, desconta estoque e grava tudo numa transação. O navegador nunca define preço ou total.
3. **Cancelamento só pela função `cancelar_pedido`**, que devolve o estoque.
4. **Ninguém cria loja pelo sistema.** Só existe política de UPDATE em `lojas` (sem INSERT). Lojas são criadas pelo administrador no SQL Editor.
5. **Só chaves públicas no código do site.** A chave `service_role` (ou "secret") do Supabase **nunca** pode ter prefixo `NEXT_PUBLIC_`, nem ser usada em componente de cliente, nem ir para o Git.
6. O pagamento (quando houver Pix automático) só pode virar "pago" por **webhook validado no servidor**, nunca por informação vinda do navegador.

## Variáveis de ambiente

Local em `.env.local` (já ignorado pelo Git) e na Vercel (Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # chave publishable (sb_publishable_...), feita para ficar no navegador
```

Mudou variável na Vercel? É preciso **Redeploy** para valer. Nunca imprimir os valores no chat.

## Publicação

GitHub → Vercel (importação do repositório, framework Next.js, raiz `./`). Produção: `https://cardapio-online-iota-two.vercel.app`. No Supabase, em Authentication → URL Configuration: Site URL = a URL da Vercel; Redirect URLs com ela (`/**`) e `http://localhost:3000/**`.

## Estado atual

**Funcionando (testado, local e online):** cardápio por loja, carrinho respeitando estoque, cadastro/login de cliente com endereço, checkout (entrega ou retirada; dinheiro ou cartão na entrega), página do pedido, painel do dono com pedidos (atualiza a cada 15 s), troca de status e links de WhatsApp, edição de preço/estoque/ativo, cadastro de produto, abrir/fechar loja.

**Conferir se foi aplicado (o usuário seguiu instruções passo a passo):**
- Botão **Cancelar** pedido em `app/admin/Painel.tsx` (função `cancelar` + `onCancelar` no `CartaoPedido`) e a função `cancelar_pedido` no banco.
- No Supabase, a política `lojas_dono_atualizar` existe e a antiga `lojas_dono` (que permitia INSERT) foi removida. Conferir com: `select policyname, cmd from pg_policies where tablename = 'lojas';`
- A política `clientes_dono_ver` existe (o dono precisa ver nome/telefone de quem pediu).
- Link "Entrar / Criar conta" visível no topo do cardápio (era opcional).

**Pendente, na ordem sugerida:**
1. **Aparência por loja:** colunas na tabela `lojas` (logo, capa, cor principal, texto de boas-vindas...), cardápio lendo esses dados e aba "Aparência" no painel, com upload de imagens no Supabase Storage.
2. **Pagamento Pix:** primeiro Pix manual (mostrar a chave Pix da loja e o dono confirmar "Pix recebido" no painel); depois, se necessário, Pix automático pelo Mercado Pago, com credenciais por loja guardadas só no servidor e webhook. Usar os campos `pagamento_status` e `forma_pagamento = 'pix'` já existentes.
3. **Carrinho persistente** (hoje zera ao trocar de página ou entrar na conta), por exemplo em `localStorage`.
4. **Fotos dos produtos** (coluna `imagem_url` já existe; falta upload no painel; comprimir imagens).
5. **Home da plataforma** no lugar da página de teste em `app/page.tsx`.
6. **Tela do administrador** para cadastrar lojas sem usar SQL (só vale a pena a partir de umas 5 lojas).
7. Melhorias: dono com mais de uma loja (o painel hoje usa só a primeira), histórico e relatórios, horário de funcionamento.

## Decisões tomadas

- Um só sistema multi-loja, em vez de um site por cliente. Personalização visual por configuração no banco. Design 100% sob medida só como serviço premium, à parte.
- **Uma única tela de login** (`/entrar`) para cliente e dono; o painel só abre para quem é dono de loja. Não criar `/admin/entrar` por enquanto.
- Pagamento na entrega primeiro; Pix depois.
- Construir no plano gratuito e migrar para **Supabase Pro e Vercel Pro** quando entrar a primeira receita. Antes de qualquer loja real: assinar os planos pagos (o plano gratuito da Vercel é só para uso não comercial e o do Supabase pausa por inatividade e não tem backup) e **religar a confirmação de e-mail** do Supabase (desligada para facilitar os testes).

## Atualização recente — imagens de aparência

- `app/admin/Aparencia.tsx` permite enviar e apagar logo e capa da loja. O navegador aceita JPG, PNG e WebP de até 5 MB, converte para JPEG e limita a largura a 1200 px antes do envio.
- As imagens ficam no bucket público `lojas`, em `loja_id/logo-<uuid>.jpg` ou `loja_id/capa-<uuid>.jpg`. O sistema salva a URL pública em `lojas.logo_url` ou `lojas.capa_url`; o cardápio já exibe essas colunas.
- `supabase/schema.sql` termina com a criação/configuração do bucket e as políticas de Storage: leitura pública, envio e exclusão autenticados somente pelo dono da loja daquela pasta.
- **Pendente após esta alteração:** executar o bloco final de Storage de `supabase/schema.sql` no SQL Editor do Supabase. A SQL não é executada automaticamente pelo aplicativo.

## Pontos de atenção conhecidos

- A política `pedidos_dono_atualizar` permite ao dono atualizar qualquer coluna do pedido (inclusive total). Aceitável por ora; considerar restringir a mudança de status a uma função.
- LGPD: a loja é a responsável pelos dados dos clientes dela; a plataforma é operadora. Terão de existir termo de uso e política de privacidade antes de lojas reais.
- Plano gratuito do Supabase não tem backup: manter `supabase/schema.sql` atualizado a cada mudança no banco, e registrar nele qualquer SQL novo executado.

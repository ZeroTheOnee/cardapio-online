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
  [slug]/page.tsx           cardápio público da loja (servidor: busca loja, categorias, produtos e localidades ativas)
  [slug]/Cardapio.tsx       interface do cardápio, carrinho e checkout (cliente); o carrinho é guardado em localStorage na chave `carrinho:<loja_id>`
  entrar/page.tsx           login e cadastro do cliente (aceita ?loja=<slug> para voltar ao cardápio); tem o link "Esqueci minha senha"
  esqueci-senha/            pede o link de redefinição por e-mail (page.tsx servidor + FormEsqueci.tsx cliente)
  redefinir-senha/          define a nova senha depois do link (page.tsx exige sessão + FormNovaSenha.tsx)
  auth/confirm/route.ts     recebe o link do e-mail (token_hash + type=recovery, ou `code` do modelo padrão), valida no servidor (verifyOtp ou exchangeCodeForSession) e redireciona para /redefinir-senha
  pedido/[id]/page.tsx      acompanhamento do pedido: linha do tempo, atualiza sozinha enquanto em andamento; no Pix mostra a chave, o valor e o botão de WhatsApp
  pedido/[id]/LinhaDoTempo.tsx  passos recebido > em preparo > saiu/pronto > entregue (texto muda em retirada); cancelado mostra aviso
  pedido/[id]/AtualizarSozinho.tsx  cliente: chama router.refresh() a cada N s (só com a aba visível e pedido em andamento)
  meus-pedidos/page.tsx     histórico do cliente logado (até 50 pedidos, mais novos primeiro), com status; leva a /pedido/<id>
  pedido/[id]/CopiarPix.tsx botão de copiar a chave Pix (cliente)
  admin/page.tsx            painel do dono (servidor: exige login e loja do usuário)
  admin/Aparencia.tsx       aba "Aparência" do painel: cor principal, descrição, Instagram, endereço e envio de logo/capa (reduz para JPEG de até 1200 px e envia ao Storage em "<loja_id>/")
  admin/ProdutoCard.tsx     card de edição de um produto (preço, estoque, ativo) com a foto; substituiu a antiga LinhaProduto
  admin/FotoProduto.tsx     envio/troca/exclusão da foto de um produto (JPEG até 800 px no Storage, em "<loja_id>/produto-<id>-<uuid>.jpg")
  admin/Entrega.tsx         aba "Entrega": taxa padrão da loja e cadastro/edição/exclusão de localidades com taxa própria
  admin/Painel.tsx          interface do painel: pedidos (status, cancelar, "Pix recebido", botão "Avisar cliente" que abre o WhatsApp com mensagem pronta conforme o status; aviso de pedido novo: botão "Ligar som" (o navegador exige um clique), bipe, faixa verde e título da aba "🔔 Novo pedido!"; o painel atualiza a cada 15 s em qualquer aba), produtos, aba Entrega, aba Pagamento (chave Pix), abrir/fechar loja
lib/supabase/
  server.ts                 cliente Supabase para componentes de servidor (cookies)
  client.ts                 cliente Supabase para o navegador
lib/imagem.ts               reduzirImagem (converte para JPEG com fundo branco) e caminhoDoStorage (URL pública -> caminho no bucket)
supabase/schema.sql         esquema completo do banco (backup e referência)
```

## Banco de dados

Fonte da verdade: `supabase/schema.sql`. Resumo:

- `lojas` (dono_id → auth.users, slug único, taxa_entrega, aberta, aceita_pix; aparência: cor_principal (hex #RRGGBB, validado por check), logo_url, capa_url, descricao, instagram, endereco_texto)
- `lojas_pagamento` (chave Pix da loja; tabela PRIVADA, só o dono lê)
- `localidades` (loja_id, nome, taxa, ativo; único por loja+nome). Qualquer um lê; só o dono escreve. Se a loja tem localidade ativa, a entrega exige escolher uma e a taxa é a dela; se não tem, vale `lojas.taxa_entrega`
- `categorias`, `produtos` (preco, estoque, ativo, imagem_url)
- `clientes` (id = auth.users.id), `enderecos`
- `pedidos` (status, tipo entrega/retirada, endereco_entrega em jsonb, subtotal, taxa, total, forma_pagamento, pagamento_status)
- `itens_pedido` (guarda nome e preço da hora da compra)
- Funções (security definer): `criar_pedido(..., p_localidade_id uuid default null)` (calcula a taxa no servidor e grava a localidade em `endereco_entrega`), `cancelar_pedido(...)`, `salvar_chave_pix(...)` (dono grava a chave), `chave_pix_do_pedido(...)` (cliente lê a chave só do próprio pedido em Pix)

## Regras de segurança — NÃO QUEBRAR

1. **RLS ligado em todas as tabelas.** Nunca desligar para "fazer funcionar"; corrija a política.
2. **Pedidos só são criados pela função `criar_pedido`** (chamada via `supabase.rpc`). Ela confere preço e estoque no servidor, desconta estoque e grava tudo numa transação. O navegador nunca define preço ou total.
3. **Cancelamento só pela função `cancelar_pedido`**, que devolve o estoque.
4. **Ninguém cria loja pelo sistema.** Só existe política de UPDATE em `lojas` (sem INSERT). Lojas são criadas pelo administrador no SQL Editor.
5. **Só chaves públicas no código do site.** A chave `service_role` (ou "secret") do Supabase **nunca** pode ter prefixo `NEXT_PUBLIC_`, nem ser usada em componente de cliente, nem ir para o Git.
6. Hoje (Pix manual) só o **dono da loja** marca `pagamento_status = 'pago'`, pelo painel. Quando houver Pix automático, só pode virar "pago" por **webhook validado no servidor**, nunca por informação vinda do navegador do cliente.
7. A chave Pix fica na tabela privada `lojas_pagamento`. **Nunca** colocar `chave_pix` em `lojas` nem em nenhum select público; o cliente só a lê pela função `chave_pix_do_pedido`.
8. **Storage:** bucket público `lojas` só para leitura. Escrita e exclusão apenas pelo dono, dentro da pasta `<loja_id>/` (políticas em `storage.objects`); o bucket só aceita JPEG de até 5 MB. Nunca abrir escrita para `anon` nem para qualquer usuário logado.

## Variáveis de ambiente

Local em `.env.local` (já ignorado pelo Git) e na Vercel (Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # chave publishable (sb_publishable_...), feita para ficar no navegador
```

Mudou variável na Vercel? É preciso **Redeploy** para valer. Nunca imprimir os valores no chat.

## Publicação

GitHub → Vercel (importação do repositório, framework Next.js, raiz `./`). Produção: `https://cardapio-online-iota-two.vercel.app`. No Supabase, em Authentication → URL Configuration: Site URL = a URL da Vercel; Redirect URLs com ela (`/**`) e `http://localhost:3000/**`.

## Recuperação de senha (configuração no Supabase)

O app chama `resetPasswordForEmail(email, { redirectTo: <origem>/auth/confirm })`. No Supabase, em Authentication → Email Templates → **Reset Password**, o link do e-mail deve ser:

```
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Redefinir senha</a>
```

`/auth/confirm` valida o token no servidor (`verifyOtp`), grava a sessão em cookie e redireciona para `/redefinir-senha`. Esse formato (token_hash) funciona mesmo se o e-mail for aberto em outro navegador ou aparelho, ao contrário do fluxo com `code` (PKCE). `{{ .RedirectTo }}` precisa estar na lista de Redirect URLs (`<origem>/**`).

**Limitação do Supabase:** só dá para editar os templates de e-mail depois de configurar SMTP próprio. Enquanto isso, o e-mail usa o modelo padrão (`{{ .ConfirmationURL }}`), cujo link chega a `/auth/confirm?code=...` (fluxo PKCE); por isso a rota também aceita `code`. Esse fluxo só funciona se o link for aberto **no mesmo navegador** em que o pedido de recuperação foi feito. Depois de configurar o SMTP próprio, trocar o template para o formato token_hash acima. Atenção: a ramificação `code` leva sempre a `/redefinir-senha`; ao implementar a confirmação de cadastro por e-mail, separar os dois casos.

## Estado atual

**Funcionando (testado, local e online):** cardápio por loja, carrinho respeitando estoque, cadastro/login de cliente com endereço, checkout (entrega ou retirada; dinheiro ou cartão na entrega), página do pedido, painel do dono com pedidos (atualiza a cada 15 s), troca de status e links de WhatsApp, edição de preço/estoque/ativo, cadastro de produto, abrir/fechar loja, cancelamento de pedido com devolução de estoque, **aparência por loja** (cor, textos, logo e capa enviados pelo painel para o Supabase Storage), **fotos dos produtos** (enviadas no card do produto e exibidas no cardápio), **carrinho persistente** (guardado no navegador por loja e restaurado ao voltar do login; limpo ao confirmar o pedido; itens sem estoque ou desativados são descartados ao restaurar), **recuperação de senha** (link por e-mail com token_hash, funciona em qualquer navegador/aparelho; depende do template "Reset Password" do Supabase e de SMTP próprio para clientes reais) e **taxa de entrega por localidade** (código e SQL entregues; conferir se foi aplicado e testado) **acompanhamento do pedido e histórico do cliente** (código entregue; conferir se testado) e **Pix manual** (a loja cadastra a chave na aba Pagamento; o cliente vê a chave, copia e pode enviar o comprovante por WhatsApp; o dono confirma "Pix recebido" no painel).

**Conferir se foi aplicado (o usuário seguiu instruções passo a passo):**
- A **taxa por localidade** foi aplicada: tabela `localidades` + políticas + nova `criar_pedido` com `p_localidade_id` (a versão antiga de 6 parâmetros foi removida com `drop function`). Conferir: `select proname, pronargs from pg_proc where proname = 'criar_pedido';` deve mostrar uma linha só, com 7 argumentos.
- A função `cancelar_pedido` existe no banco (o botão Cancelar já está em `app/admin/Painel.tsx`).
- O **Pix manual** foi aplicado no banco (coluna `lojas.aceita_pix`, tabela `lojas_pagamento`, funções `salvar_chave_pix` e `chave_pix_do_pedido`, nova versão de `criar_pedido`) e no código. Testado ponta a ponta pelo usuário (salvar chave → pedido em Pix → "Pix recebido" → cliente vê "Pagamento confirmado"). Lembrete: a opção Pix só aparece no cardápio depois que a loja cadastra a chave na aba Pagamento (configurar isso ao entregar cada loja nova).
- No Supabase, a política `lojas_dono_atualizar` existe e a antiga `lojas_dono` (que permitia INSERT) foi removida. Conferir com: `select policyname, cmd from pg_policies where tablename = 'lojas';`
- A política `clientes_dono_ver` existe (o dono precisa ver nome/telefone de quem pediu).
- Link "Entrar / Criar conta" visível no topo do cardápio (era opcional).

**Pendente, na ordem sugerida:**
1. **Aparência por loja — evoluções:** 2 ou 3 modelos de layout, fonte por loja, horário de funcionamento. (Cor, textos, logo e capa já funcionam.)
2. **Pix mais completo:** gerar o "copia e cola" (BR Code) com o valor já preenchido, para o cliente não digitar o valor; e, só se algum cliente exigir, Pix automático pelo Mercado Pago (credenciais por loja guardadas apenas no servidor e webhook que valida o pagamento).
3. **Cadastro com confirmação de e-mail:** hoje `entrar/page.tsx` cria `clientes` e `enderecos` logo após o `signUp`, o que exige sessão. Com a confirmação de e-mail ligada não há sessão e esses registros não são criados (o cliente confirma o e-mail e depois não consegue pedir). Mover a criação para um trigger no banco que leia `raw_user_meta_data` (nome, telefone, endereço enviados em `options.data` no `signUp`) e tratar `type=signup` em `/auth/confirm`.
4. **Fotos dos produtos — evoluções:** enviar a foto já na criação do produto e padronizar o recorte. (Envio, troca, exclusão e exibição no cardápio já funcionam.)
5. **Home da plataforma** no lugar da página de teste em `app/page.tsx`.
6. **Tela do administrador** para cadastrar lojas sem usar SQL (só vale a pena a partir de umas 5 lojas).
7. Melhorias: dono com mais de uma loja (o painel hoje usa só a primeira), histórico e relatórios, horário de funcionamento.

## Checklist antes do primeiro cliente real

Obrigatório:
- Assinar **Vercel Pro** e **Supabase Pro**; religar a **confirmação de e-mail** no Supabase.
- **SMTP próprio** no Supabase (Authentication → Emails → SMTP Settings). O e-mail padrão só entrega para membros do time do projeto e limita a 2 mensagens por hora; sem SMTP próprio, nem a recuperação de senha nem a confirmação de e-mail funcionam para clientes reais.
- **Cadastro compatível com confirmação de e-mail** (ver pendência 3) e religar "Confirm email".
- (Feito, conferir no celular) **Aviso de pedido novo** no painel do dono. Só funciona com o painel aberto; para push com o painel fechado seria preciso Web Push.
- **Termos de uso e política de privacidade** (LGPD).
- Testar no **celular** com uma loja piloto.

Logo depois:
- (Feito) histórico e acompanhamento do pedido pelo cliente. Possível evolução: Supabase Realtime em vez de atualizar a cada 10 s, e passo "aceito" separado.
- Cliente cadastrar **mais de um endereço**.
- **Aviso automático ao cliente** quando o status muda: hoje é manual (botão "Avisar cliente" no WhatsApp). Evoluções: Web Push (grátis; no iPhone só com o site instalado na tela inicial) ou WhatsApp Business API (pago, modelos aprovados), possivelmente como plano mais caro.
- **Horário de funcionamento**. (Taxa por localidade já feita.)
- Restringir o que o dono pode alterar em `pedidos` (hoje a política de UPDATE permite qualquer coluna).
- Domínio próprio; home da plataforma; tela do administrador para cadastrar lojas; dono com mais de uma loja; relatórios simples.

## Decisões tomadas

- Um só sistema multi-loja, em vez de um site por cliente. Personalização visual por configuração no banco. Design 100% sob medida só como serviço premium, à parte.
- **Uma única tela de login** (`/entrar`) para cliente e dono; o painel só abre para quem é dono de loja. Não criar `/admin/entrar` por enquanto.
- Pagamento na entrega primeiro; depois **Pix manual** (já implementado). Pix automático só se algum cliente pedir.
- Construir no plano gratuito e migrar para **Supabase Pro e Vercel Pro** quando entrar a primeira receita. Antes de qualquer loja real: assinar os planos pagos (o plano gratuito da Vercel é só para uso não comercial e o do Supabase pausa por inatividade e não tem backup) e **religar a confirmação de e-mail** do Supabase (desligada para facilitar os testes).

## Pontos de atenção conhecidos

- A política `pedidos_dono_atualizar` permite ao dono atualizar qualquer coluna do pedido (inclusive total). Aceitável por ora; considerar restringir a mudança de status a uma função.
- LGPD: a loja é a responsável pelos dados dos clientes dela; a plataforma é operadora. Terão de existir termo de uso e política de privacidade antes de lojas reais.
- Plano gratuito do Supabase não tem backup: manter `supabase/schema.sql` atualizado a cada mudança no banco, e registrar nele qualquer SQL novo executado.
- Chave Pix em CPF expõe o CPF ao cliente que fizer pedido em Pix; orientar as lojas a usar chave aleatória ou telefone.
- `app/admin/Painel.tsx` ainda contém a função antiga `LinhaProduto`, sem uso (trocada por `ProdutoCard`); pode ser apagada. `Aparencia.tsx` tem uma cópia própria de `reduzirImagem` (sem o fundo branco, a menos que o usuário tenha aplicado a correção); unificar com `lib/imagem.ts`.

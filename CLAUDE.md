PedeEasy (cardápio online) — contexto do projeto

Leia este arquivo inteiro antes de mexer em qualquer coisa.

O que é

Plataforma PedeEasy, multi-loja, de cardápio digital e pedidos para restaurantes, lanchonetes e food trucks. O dono do projeto vende o serviço (mensalidade) para pequenos negócios do interior. Uma única aplicação e um único banco atendem todas as lojas; cada loja é uma linha na tabela lojas.

Cliente final: abre o cardápio da loja, monta o carrinho, cria conta (com endereço de entrega) e faz o pedido.
Dono da loja: usa o painel /admin para ver pedidos, mudar status, cancelar, editar preço/estoque, cadastrar produtos e abrir/fechar a loja.
Administrador da plataforma (o usuário): cria as lojas e os logins dos donos manualmente pelo Supabase.
Como trabalhar com o usuário
Responda em português do Brasil, de forma prática e direta (ação primeiro).
O usuário está começando em programação e usa Windows (PowerShell) + VS Code. Explique o que está fazendo e por quê, em linguagem simples, e diga como testar cada mudança.
A pasta do projeto fica dentro do OneDrive (Desktop), que às vezes trava arquivos. Plano B se houver erros estranhos de arquivo: mover o projeto para uma pasta fora do OneDrive (ex.: C:\projetos).
Antes de mudanças grandes, lembre o usuário de fazer git commit. Nunca faça git push --force.
Nunca mostre, grave em arquivo versionado ou envie para o GitHub chaves secretas.
Stack
Next.js 16 (App Router, sem pasta src/), React, TypeScript, Tailwind CSS
Supabase (PostgreSQL + Auth) via @supabase/supabase-js e @supabase/ssr
Hospedagem: Vercel, deploy automático a cada git push na branch main
Código no GitHub (repositório privado ZeroTheOnee/cardapio-online)

Pontos importantes da versão do Next.js:

params das rotas é uma Promise (const { slug } = await params).
Cache Components e Partial Prefetching estão DESLIGADOS de propósito (preço e estoque mudam o tempo todo). Não reative em next.config.ts.
Não alterar o bloco turbopack.rules do next.config.ts (config do Tailwind).
Comandos
npm run dev      # servidor local em http://localhost:3000
npm run build    # build de produção (rode antes de publicar mudanças grandes)
npm run lint
git add . && git commit -m "mensagem" && git push   # publica (a Vercel faz o deploy)

Se o npm run dev avisar que a porta 3000 está em uso, há um servidor antigo rodando: taskkill /PID <número> /F e rodar de novo.

Estrutura de pastas
app/
  page.tsx                  home da plataforma PedeEasy (apresentação para donos de loja; botão de contato usa `lib/legal.ts`: `whatsapp` se preenchido, senão e-mail; link para o cardápio de exemplo `/lanchonete-exemplo` e para o painel). inclui seção de preço (R$ 49/mês, sem comissão, sem fidelidade): manter alinhada ao plano comercial em "Decisões tomadas"
  lib/pix.ts: gera o BR Code (Pix copia e cola com valor) e normaliza a chave; usado em pedido/[id]/page.tsx. Migração: migracao_nome_pix.sql
  [slug]/page.tsx           cardápio público da loja (servidor: busca loja, categorias, produtos e localidades ativas). Também exporta `generateMetadata` (título, descrição, prévia do link/Open Graph com capa ou logo, ícones e `manifest` da loja) e `generateViewport` (theme-color = cor da loja)
  [slug]/Cardapio.tsx       interface do cardápio, carrinho e checkout (cliente); o carrinho é guardado em localStorage na chave `carrinho:<loja_id>` como LISTA de linhas `{chave, produto_id, opcoes[], qtd}` (o mesmo produto com opções diferentes vira linhas separadas; o formato antigo `{produtoId: qtd}` ainda é lido). Produto com opções mostra o botão "Escolher" e abre uma janela (bottom sheet) para marcar as opções; o estoque conta a soma das linhas do produto
  [slug]/manifest.webmanifest/route.ts  PWA DO CLIENTE: manifesto próprio de cada loja em `/<slug>/manifest.webmanifest` (nome, cor, ícones, `start_url` = `/<slug>`, `id` = `/<slug>`). SEM `scope` de propósito: o app instalado cobre o site todo, então /pedido, /entrar e /meus-pedidos abrem dentro do app
  [slug]/icone/[tamanho]/route.tsx  ícone PNG da loja gerado na hora com `next/og` (logo sobre a cor da loja, ou a inicial do nome); tamanhos permitidos 96, 180, 192 e 512; só baixa logo do Storage do próprio projeto; margem de segurança para o recorte "maskable" do Android
  [slug]/InstalarApp.tsx    botão "Instalar app" no cabeçalho do cardápio: Android/Chrome usa `beforeinstallprompt`; iPhone mostra o passo a passo (Compartilhar > Adicionar à Tela de Início); some se o app já está instalado
  [slug]/NovoEndereco.tsx   checkout (cliente logado): "+ Adicionar outro endereço" grava em `enderecos` (rua, número, bairro, cidade, complemento, referência; RLS `enderecos_proprio`) e já seleciona o novo. O select mostra todos os endereços do cliente; "-" (campos que o pedido sem conta não pergunta) não aparece no rótulo. Há também "Apagar o endereço selecionado" (confirma e apaga em `enderecos`; editar = apagar e adicionar de novo). **Localidade no endereço:** `enderecos.localidade_padrao` (texto, nome da localidade; migração `migracao_localidade_endereco.sql`, rodar ANTES do deploy). Escolhida ao cadastrar o endereço (quando a loja tem localidades) ou em "Meus endereços" (`/meus-enderecos?loja=<slug>`, link do cardápio, lista as localidades da loja) ou no checkout (grava no endereço ao escolher). O checkout usa, nesta ordem: `localidade_padrao` (casa pelo NOME com as localidades da loja) > escolha lembrada no aparelho > bairro/cidade parecido > última da loja. Chave `localidade_padrao` (e não `localidade`) de propósito: `criar_pedido` copia a linha do endereço para `endereco_entrega`, onde `localidade` é a da loja. O endereço marcado ao abrir o checkout é o último usado na loja (localStorage `endereco:<loja_id>`), senão o primeiro; nunca fica sem seleção se existir algum. Fallback da localidade: a última usada na loja (`localidade-loja:<loja_id>`) ou a única existente. A localidade da entrega é pré-marcada ao escolher o endereço: primeiro a que o cliente já escolheu para ele (localStorage `localidade:<endereco_id>`), depois por bairro/cidade igual ou parecido (um contém o outro). O pedido guarda uma cópia do endereço em `endereco_entrega`, então endereços podem mudar depois sem afetar pedidos antigos
  meus-pedidos/PedirDeNovo.tsx  botão "Pedir de novo" em cada pedido: guarda `repetir:<loja_id>` no localStorage (produto_id, qtd, opções por NOME de grupo/opção) e abre `/<slug>`. O Cardapio lê essa chave ao abrir, descarta o que saiu do cardápio/sem estoque/opção que mudou, soma ao carrinho e mostra um aviso amarelo listando o que faltou. Preço sempre o ATUAL (o servidor recalcula no `criar_pedido`)
  entrar/page.tsx           login e cadastro do cliente (aceita ?loja=<slug>); o cadastro envia nome, telefone e endereço em `options.data` do signUp (quem grava em clientes/enderecos é o gatilho do banco); tem o link "Esqueci minha senha"
  esqueci-senha/            pede o link de redefinição por e-mail (page.tsx servidor + FormEsqueci.tsx cliente)
  redefinir-senha/          define a nova senha depois do link (page.tsx exige sessão + FormNovaSenha.tsx)
  auth/confirm/route.ts     recebe o link do e-mail (token_hash + type=recovery, ou `code` do modelo padrão), valida no servidor (verifyOtp ou exchangeCodeForSession) e redireciona para /redefinir-senha
  auth/cadastro/route.ts    recebe o link de confirmação de cadastro do cliente (`code` ou token_hash type=signup); abre a sessão e volta ao cardápio (?loja=<slug>); se a sessão não abrir (outro navegador), manda para /entrar?confirmado=1 com aviso "e-mail confirmado"
  termos/page.tsx, privacidade/page.tsx  Termos de uso e Política de privacidade (LGPD) para o cliente final; rascunhos, devem ser revisados por advogado. Os dados do responsável (nome, CPF/CNPJ, e-mail, cidade) vêm de `lib/legal.ts`
  pedido/[id]/page.tsx      acompanhamento do pedido: linha do tempo, atualiza sozinha enquanto em andamento; no Pix mostra a chave, o valor e o botão de WhatsApp
  pedido/[id]/LinhaDoTempo.tsx  passos recebido > em preparo > saiu/pronto > entregue (texto muda em retirada); cancelado mostra aviso
  pedido/[id]/AvisosPedido.tsx  botão "🔔 Avisar quando o pedido mudar" (só com o pedido em andamento): registra /sw.js, pede permissão, assina push e grava em `push_pedidos` (por pedido + aparelho; vale também para quem pediu sem conta). iPhone no Safari comum não tem push: mostra o passo a passo de instalar o app
  api/notificar-status/route.ts  AVISO AO CLIENTE: chamada pelo Database Webhook (pedidos, UPDATE; cabeçalho x-webhook-secret = WEBHOOK_SECRET). Compara `record` e `old_record`: muda status (preparando, saiu/pronto, entregue, cancelado) ou Pix vira "pago" -> push para os aparelhos de `push_pedidos` daquele pedido (ícone da loja, tag por pedido, some sozinho); ao entregar/cancelar apaga as inscrições. Migração: `migracao_avisos_cliente.sql`
  pedido/[id]/AtualizarSozinho.tsx  cliente: chama router.refresh() a cada N s (só com a aba visível e pedido em andamento)
  meus-enderecos/page.tsx + ListaEnderecos.tsx  página "Meus endereços" (cliente logado; funciona com a loja fechada): lista, apaga e adiciona endereços (reusa `[slug]/NovoEndereco.tsx`). Links em "Meus pedidos" e no cabeçalho do cardápio
  meus-pedidos/BotaoSair.tsx  botão "Sair da conta" do cliente (signOut); também há um "Sair da conta" no cabeçalho do cardápio
  meus-pedidos/page.tsx     histórico do cliente logado (até 50 pedidos, mais novos primeiro), com status; leva a /pedido/<id>
  pedido/[id]/CopiarPix.tsx botão de copiar a chave Pix (cliente)
  admin/page.tsx            painel do dono (servidor: exige login e loja do usuário)
  admin/Aparencia.tsx       aba "Aparência" do painel: cor principal, descrição, Instagram, endereço e envio de logo/capa (reduz para JPEG de até 1200 px e envia ao Storage em "<loja_id>/")
  admin/ProdutoCard.tsx     card de edição de um produto (preço, estoque, ativo) com a foto; substituiu a antiga LinhaProduto
  admin/FotoProduto.tsx     envio/troca/exclusão da foto de um produto (JPEG até 800 px no Storage, em "<loja_id>/produto-<id>-<uuid>.jpg")
  admin/Categorias.tsx      dentro da aba Produtos: criar, renomear, reordenar (setas) e apagar categorias; só apaga categoria sem produtos. Produto sem categoria NÃO aparece no cardápio, por isso o formulário de novo produto exige categoria
  admin/Avisos.tsx         aba "Avisos": ativar push neste aparelho (registra /sw.js e grava em push_inscricoes) e "Enviar aviso de teste"
  admin/NomePix.tsx       aba Pagamento: nome de quem recebe o Pix (`lojas.nome_pix`, até 60 caracteres, como aparece no banco). Mostrado ao cliente na página do pedido ("Quem recebe: ...") para ele conferir antes de pagar; também vai (sem acento, até 25) como nome do recebedor dentro do copia e cola. Vazio = não mostra e usa o nome da loja no código
  admin/NomeLoja.tsx     no topo da aba Aparência: o dono troca o nome da loja (2 a 60 caracteres; o slug/link NÃO muda e só se altera por SQL)
  admin/Contato.tsx       no topo da aba Aparência: WhatsApp da loja (grava só dígitos em lojas.telefone). Vira o botão "Falar com a loja no WhatsApp" no cardápio e na página do pedido, e é o número do comprovante Pix. `lojas.telefone` é PÚBLICO (número comercial da loja)
  admin/Conta.tsx          aba "Conta": o dono altera a própria senha (confere a atual com signInWithPassword e depois updateUser), sem depender de e-mail/SMTP
  admin/Grupos.tsx         aba Produtos, quadro "Opções e adicionais": BIBLIOTECA de grupos da loja. O dono CRIA aqui, uma vez, grupos (Tamanho, Adicionais, Ponto da carne) com tipo (escolher 1 obrigatório/opcional, ou marcar várias até N, obrigatório ou não) e as OPÇÕES de cada um com valor extra (pausar/ativar/apagar), reordena e vê "usado em N produtos"
  admin/Opcoes.tsx         abaixo de cada produto: só MARCA (checkbox) quais grupos da biblioteca o produto usa (grava/apaga em `produto_grupos`). `ProdutoCard.tsx` NÃO foi alterado: o `<Opcoes>` é renderizado ao lado dele no Painel
  admin/ApagarProduto.tsx  botão "Apagar produto" (faixa abaixo de cada produto, ao lado de "Opções e adicionais"): confirma, apaga o produto e a foto do Storage (melhor esforço). Pedidos antigos continuam no histórico porque `itens_pedido.produto_id` é `on delete set null` e o item guarda nome/preço; as ligações em `produto_grupos` caem em cascata. Para só esconder do cardápio, usar "Ativo" no card
  admin/Horarios.tsx       aba Aparência: horário de funcionamento. Liga/desliga "Abrir e fechar sozinha pelo horário" e define, para cada dia, 1 ou 2 períodos (ex.: almoço e jantar; fechar depois da meia-noite vale, ex. 18:00 às 02:00), com "Copiar para todos os dias". Grava `lojas.usa_horario` e `lojas.horarios`
  admin/RenomearProduto.tsx botão "Renomear" na faixa abaixo de cada produto (o ProdutoCard não edita o nome): troca `produtos.nome` (1 a 80 caracteres)
  admin/DuplicarProduto.tsx botão "Duplicar produto" (faixa abaixo de cada produto): cria "<nome> (cópia)" DESATIVADO com mesma categoria, descrição, preço, estoque, grupos de opções (`produto_grupos`) e uma CÓPIA própria da foto no Storage (baixa a URL pública e envia para "<loja_id>/produto-<novo id>-<uuid>.jpg"; assim apagar um produto não tira a foto do outro). Não precisa de SQL
  admin/Entrega.tsx         aba "Entrega": taxa padrão da loja e cadastro/edição/exclusão de localidades com taxa própria
  admin/Painel.tsx          interface do painel: pedidos (status, cancelar, "Pix recebido", botão "Avisar cliente" que abre o WhatsApp com mensagem pronta conforme o status; aviso de pedido novo: botão "Ligar som" (o navegador exige um toque; a escolha fica guardada em localStorage `som:<loja_id>` e, ao recarregar, o primeiro toque em qualquer lugar do painel religa o áudio), bipe, faixa verde e título da aba "🔔 Novo pedido!"; o painel atualiza a cada 15 s em qualquer aba), produtos, aba Entrega, aba Pagamento (chave Pix), abrir/fechar loja
  api/notificar/route.ts    chamada pelo Database Webhook (pedidos INSERT, cabeçalho x-webhook-secret = WEBHOOK_SECRET); monta a mensagem e envia por push
  api/avisos/teste/route.ts dono logado dispara um aviso de teste para a própria loja
  manifest.ts (PWA do PAINEL, start_url /admin; o do cliente é por loja, em [slug]/manifest.webmanifest), apple-icon.png, ../public/sw.js, ../public/icon-*.png   PWA: instalar na tela inicial (necessário para push no iPhone) e service worker que mostra a notificação
lib/avisos.ts               enviarAvisos(admin, lojaId, aviso): web-push (apaga inscrições mortas 404/410). SÓ servidor
lib/supabase/
  server.ts                 cliente Supabase para componentes de servidor (cookies)
  client.ts                 cliente Supabase para o navegador
lib/horario.ts              regra do horário no código (`statusHorario`, `lojaAbertaAgora`, `textoDoDia`, `DIAS`); a MESMA regra do banco (`loja_aberta_em`), usada só para mostrar o status na tela. Quem vale de verdade é o banco
lib/loja-meta.ts             `buscarLojaMeta(slug)` (com `cache`), `corSegura`, `textoSobre` e `SITE`; usado no manifesto, no ícone e nos metadados da loja (servidor)
lib/legal.ts                dados do responsável (e `whatsapp` comercial opcional) que aparecem nos Termos e na Privacidade (páginas PÚBLICAS: não colocar CPF; `documento` fica vazio até existir um CNPJ/MEI). E-mail de contato atual é provisório (Gmail); trocar por contato@pedeeasy.com.br quando houver encaminhamento
lib/imagem.ts               reduzirImagem (converte para JPEG com fundo branco) e caminhoDoStorage (URL pública -> caminho no bucket)
supabase/schema.sql         esquema completo do banco (backup e referência)
Banco de dados

Fonte da verdade: supabase/schema.sql. Resumo:

lojas (dono_id → auth.users, slug único, taxa_entrega, aberta, aceita_pix, usa_horario, horarios (jsonb por dia da semana, 0 = domingo), fuso (padrão America/Fortaleza); aparência: cor_principal (hex #RRGGBB, validado por check), logo_url, capa_url, descricao, instagram, endereco_texto)
lojas_pagamento (chave Pix da loja; tabela PRIVADA, só o dono lê)
localidades (loja_id, nome, taxa, ativo; único por loja+nome). Qualquer um lê; só o dono escreve. Se a loja tem localidade ativa, a entrega exige escolher uma e a taxa é a dela; se não tem, vale lojas.taxa_entrega
push_pedidos (pedido_id, cliente_id, endpoint, p256dh, auth; único por pedido+endpoint): aparelhos do CLIENTE inscritos nos avisos de UM pedido. RLS: o cliente só mexe nas dele e de pedido dele; quem lê para enviar é o servidor (service_role)
push_inscricoes (loja_id, endpoint único, p256dh, auth): um registro por aparelho que ativou os avisos; RLS só do dono. Quem LÊ para enviar é o servidor com service_role
categorias, produtos (preco, estoque, ativo, imagem_url)
grupos_opcao (loja_id, nome, minimo, maximo, ordem), opcoes (loja_id, grupo_id, nome, preco_extra, ativo, ordem) e produto_grupos (produto_id, grupo_id, loja_id; liga os grupos aos produtos que os usam): opções e adicionais. O grupo é da LOJA (criado uma vez, reaproveitado em vários produtos). Todos leem; só o dono escreve (as políticas conferem que produto/grupo são da mesma loja). minimo 0 = opcional; maximo 1 = escolhe uma. Migração (serve para banco novo e para quem rodou a 1ª versão): migracao_opcoes.sql
clientes (id = auth.users.id), enderecos
pedidos (status, tipo entrega/retirada, endereco_entrega em jsonb, subtotal, taxa, total, forma_pagamento, pagamento_status)
itens_pedido (guarda nome e preço da hora da compra; preco_unitario já INCLUI os extras das opções; opcoes jsonb = lista de {grupo, nome, preco} escolhida, também foto da hora da compra)
Pedido sem conta (visitante): há um único botão "Finalizar pedido": se o cliente está logado, o pedido vai na conta dele; se não está, o checkout pede nome, telefone, endereço (um campo de texto) e aceite dos termos e o pedido vai sem conta (não há botões separados "sem conta"/"entrar"; quem quer conta usa o link "Entrar / Criar conta" do cabeçalho). Usa supabase.auth.signInAnonymously({ options: { data } }): o Supabase cria um usuário ANÔNIMO (is_anonymous) e o mesmo gatilho abaixo cria clientes/enderecos; depois segue o criar_pedido normal, sem mudar RLS nem funções. Exige Authentication → Sign In / Providers → "Allow anonymous sign-ins" LIGADO no Supabase. A conta anônima vive só naquele navegador: se limpar os dados ou sair, perde o acesso a /meus-pedidos (por isso há aviso ao sair). Limite padrão do Supabase para logins anônimos por IP; se houver abuso, ligar CAPTCHA (Turnstile) em Authentication → Attack Protection.
Gatilho ao_criar_usuario em auth.users → função criar_cliente_do_cadastro(): cria clientes e enderecos a partir de raw_user_meta_data (nome, telefone, rua, numero, bairro, cidade, complemento, referencia). Ignora contas sem nome (donos criados à mão). O navegador NÃO insere mais em clientes/enderecos no cadastro.
Funções (security definer): criar_pedido(..., p_localidade_id uuid default null) (calcula a taxa no servidor e grava a localidade em endereco_entrega; cada item de p_itens é {produto_id, quantidade, opcoes: [ids]}: o servidor confere que as opções são ativas e de um grupo ligado ao produto (produto_grupos), respeita mínimo/máximo de cada grupo e soma os extras ao preço; o navegador nunca define preço), horário: criar_pedido só aceita pedido se loja_aberta_agora(loja) for verdadeiro, ou seja lojas.aberta ligado E (sem usa_horario OU dentro do horário no fuso da loja); o botão manual "Loja aberta/fechada" continua mandando por cima do horário. Funções loja_aberta_em(loja, momento) e loja_aberta_agora(loja) (sem permissão para o público). Migração: migracao_horario.sql. O cardápio recebe a hora do servidor (agoraServidor) e se atualiza a cada 30 s para fechar sozinho na tela, cancelar_pedido(...), salvar_chave_pix(...) (dono grava a chave), chave_pix_do_pedido(...) (cliente lê a chave só do próprio pedido em Pix)
Regras de segurança — NÃO QUEBRAR
RLS ligado em todas as tabelas. Nunca desligar para "fazer funcionar"; corrija a política.
Pedidos só são criados pela função criar_pedido (chamada via supabase.rpc). Ela confere preço e estoque no servidor, desconta estoque e grava tudo numa transação. O navegador nunca define preço ou total.
Cancelamento só pela função cancelar_pedido, que devolve o estoque. O dono não tem UPDATE direto em pedidos: muda o status só por atualizar_status_pedido (apenas recebido→preparando→saiu_entrega→entregue) e confirma o Pix só por marcar_pix_pago. Nunca recriar a política pedidos_dono_atualizar.
Ninguém cria loja pelo sistema. Só existe política de UPDATE em lojas (sem INSERT). Lojas são criadas pelo administrador no SQL Editor.
Só chaves públicas no código do site. A chave service_role (ou "secret") do Supabase nunca pode ter prefixo NEXT_PUBLIC_, nem ser usada em componente de cliente, nem ir para o Git. Único uso permitido: rotas de servidor em app/api/* (avisos), via SUPABASE_SERVICE_ROLE_KEY. Essas rotas sempre validam um segredo (WEBHOOK_SECRET) ou a sessão do dono.
Hoje (Pix manual) só o dono da loja marca pagamento_status = 'pago', pelo painel. Quando houver Pix automático, só pode virar "pago" por webhook validado no servidor, nunca por informação vinda do navegador do cliente.
A chave Pix fica na tabela privada lojas_pagamento. Nunca colocar chave_pix em lojas nem em nenhum select público; o cliente só a lê pela função chave_pix_do_pedido.
Storage: bucket público lojas só para leitura. Escrita e exclusão apenas pelo dono, dentro da pasta <loja_id>/ (políticas em storage.objects); o bucket só aceita JPEG de até 5 MB. Nunca abrir escrita para anon nem para qualquer usuário logado.
Variáveis de ambiente

Local em .env.local (já ignorado pelo Git) e na Vercel (Environment Variables):

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # chave publishable (sb_publishable_...), feita para ficar no navegador

Avisos de pedido novo (só na Vercel e no .env.local; os sem NEXT_PUBLIC_ são secretos): SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...) e a pública NEXT_PUBLIC_VAPID_PUBLIC_KEY. Dependências: web-push e @types/web-push. Configuração única: Database Webhook no Supabase (pedidos, INSERT, POST para /api/notificar com o cabeçalho x-webhook-secret), usando o endereço FINAL do site (sem redirecionamento 308), pois webhooks costumam não seguir redirecionamentos. Telegram foi considerado e descartado por ora (15/11/2026).

Mudou variável na Vercel? É preciso Redeploy para valer. Nunca imprimir os valores no chat.

Publicação

GitHub → Vercel (importação do repositório, framework Next.js, raiz ./). Produção: https://pedeeasy.com.br (domínio registrado no Registro.br, DNS do Registro.br apontando para a Vercel; a Vercel redireciona um dos dois, com ou sem www, para o outro com 308). O endereço antigo https://cardapio-online-iota-two.vercel.app continua válido como backup. No Supabase, em Authentication → URL Configuration: Site URL = o endereço principal do domínio; Redirect URLs com /** para pedeeasy.com.br, www.pedeeasy.com.br, a URL antiga da Vercel e http://localhost:3000/** (nunca remover a de localhost).

Contas: o domínio e o e-mail de contato usam um Gmail só do negócio (com verificação em duas etapas). GitHub, Vercel e Supabase seguem na conta de desenvolvimento original. Registro do domínio no nome do titular (CPF). Lembrar da renovação anual.

Recuperação de senha (configuração no Supabase)

O app chama resetPasswordForEmail(email, { redirectTo: <origem>/auth/confirm }). No Supabase, em Authentication → Email Templates → Reset Password, o link do e-mail deve ser:

<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Redefinir senha</a>

/auth/confirm valida o token no servidor (verifyOtp), grava a sessão em cookie e redireciona para /redefinir-senha. Esse formato (token_hash) funciona mesmo se o e-mail for aberto em outro navegador ou aparelho, ao contrário do fluxo com code (PKCE). {{ .RedirectTo }} precisa estar na lista de Redirect URLs (<origem>/**).

Limitação do Supabase: só dá para editar os templates de e-mail depois de configurar SMTP próprio. Enquanto isso, o e-mail usa o modelo padrão ({{ .ConfirmationURL }}), cujo link chega a /auth/confirm?code=... (fluxo PKCE); por isso a rota também aceita code. Esse fluxo só funciona se o link for aberto no mesmo navegador em que o pedido de recuperação foi feito. Depois de configurar o SMTP próprio, trocar o template para o formato token_hash acima. Atenção: a ramificação code leva sempre a /redefinir-senha; ao implementar a confirmação de cadastro por e-mail, separar os dois casos.

Estado atual

Funcionando (testado, local e online): cardápio por loja, carrinho respeitando estoque, cadastro/login de cliente com endereço, checkout (entrega ou retirada; dinheiro ou cartão na entrega), página do pedido, painel do dono com pedidos (atualiza a cada 15 s), troca de status e links de WhatsApp, edição de preço/estoque/ativo, cadastro de produto, abrir/fechar loja, cancelamento de pedido com devolução de estoque, aparência por loja (cor, textos, logo e capa enviados pelo painel para o Supabase Storage), fotos dos produtos (enviadas no card do produto e exibidas no cardápio), carrinho persistente (guardado no navegador por loja e restaurado ao voltar do login; limpo ao confirmar o pedido; itens sem estoque ou desativados são descartados ao restaurar), recuperação de senha (link por e-mail com token_hash, funciona em qualquer navegador/aparelho; depende do template "Reset Password" do Supabase e de SMTP próprio para clientes reais) e taxa de entrega por localidade (código e SQL entregues; conferir se foi aplicado e testado) acompanhamento do pedido e histórico do cliente (código entregue; conferir se testado) e Pix manual (a loja cadastra a chave na aba Pagamento; o cliente vê a chave, copia e pode enviar o comprovante por WhatsApp; o dono confirma "Pix recebido" no painel).

Conferir se foi aplicado (o usuário seguiu instruções passo a passo):

A taxa por localidade foi aplicada: tabela localidades + políticas + nova criar_pedido com p_localidade_id (a versão antiga de 6 parâmetros foi removida com drop function). Conferir: select proname, pronargs from pg_proc where proname = 'criar_pedido'; deve mostrar uma linha só, com 7 argumentos.
A migração de pedidos seguros foi aplicada: funções atualizar_status_pedido e marcar_pix_pago existem e a política pedidos_dono_atualizar foi removida. Conferir: select policyname from pg_policies where tablename = 'pedidos'; não deve listar pedidos_dono_atualizar.
O gatilho de cadastro foi aplicado (migracao_cadastro_trigger.sql). Conferir: select tgname from pg_trigger where tgname = 'ao_criar_usuario'; deve voltar 1 linha.
A função cancelar_pedido existe no banco (o botão Cancelar já está em app/admin/Painel.tsx).
O Pix manual foi aplicado no banco (coluna lojas.aceita_pix, tabela lojas_pagamento, funções salvar_chave_pix e chave_pix_do_pedido, nova versão de criar_pedido) e no código. Testado ponta a ponta pelo usuário (salvar chave → pedido em Pix → "Pix recebido" → cliente vê "Pagamento confirmado"). Lembrete: a opção Pix só aparece no cardápio depois que a loja cadastra a chave na aba Pagamento (configurar isso ao entregar cada loja nova).
No Supabase, a política lojas_dono_atualizar existe e a antiga lojas_dono (que permitia INSERT) foi removida. Conferir com: select policyname, cmd from pg_policies where tablename = 'lojas';
A política clientes_dono_ver existe (o dono precisa ver nome/telefone de quem pediu).
Link "Entrar / Criar conta" visível no topo do cardápio (era opcional).

Pendente, na ordem sugerida:

Aparência por loja — evoluções: 2 ou 3 modelos de layout, fonte por loja. (Cor, textos, logo, capa e horário de funcionamento já funcionam.)
Pix mais completo: gerar o "copia e cola" (BR Code) com o valor já preenchido, para o cliente não digitar o valor; e, só se algum cliente exigir, Pix automático pelo Mercado Pago (credenciais por loja guardadas apenas no servidor e webhook que valida o pagamento).
Cadastro com confirmação de e-mail — código pronto, falta testar com a confirmação LIGADA (depende de SMTP próprio, pois o e-mail padrão do Supabase só entrega para membros do time). Gatilho no banco + /auth/cadastro já feitos. Se o template "Confirm signup" for editado depois do SMTP, manter o link apontando para {{ .RedirectTo }} (que já traz ?loja=: usar &token_hash=...&type=signup, não ?).
Fotos dos produtos — evoluções: enviar a foto já na criação do produto e padronizar o recorte. (Envio, troca, exclusão e exibição no cardápio já funcionam.)
Home da plataforma no lugar da página de teste em app/page.tsx.
Tela do administrador para cadastrar lojas sem usar SQL (só vale a pena a partir de umas 5 lojas).
Melhorias: dono com mais de uma loja (o painel hoje usa só a primeira), histórico e relatórios.
Checklist antes do primeiro cliente real

Decisão (15/11/2026): SMTP, e-mail de contato com encaminhamento, "Confirm email" ligado e planos Pro ficam para só quando houver cliente real à vista (ainda sem data). Até lá, "Confirm email" fica DESLIGADO e o sistema serve para demonstrações e piloto fechado com contas criadas pelo administrador. Nenhuma loja real sem esses itens. Limitação conhecida nesse período: a recuperação de senha só entrega para e-mails de membros do projeto no Supabase.

Obrigatório:

Assinar Vercel Pro e Supabase Pro; religar a confirmação de e-mail no Supabase.
SMTP próprio no Supabase (Authentication → Emails → SMTP Settings). O e-mail padrão só entrega para membros do time do projeto e limita a 2 mensagens por hora; sem SMTP próprio, nem a recuperação de senha nem a confirmação de e-mail funcionam para clientes reais.
Depois do SMTP próprio: religar "Confirm email" e testar o cadastro ponta a ponta (ver pendência 3).
(Feito, conferir no celular) Aviso de pedido novo: som no painel aberto + push com o navegador fechado (aba Avisos). Testar ponta a ponta com a loja piloto antes de entregar.
Termos de uso e política de privacidade (LGPD): páginas /termos e /privacidade já existem como rascunho, com aceite obrigatório no cadastro. Falta: trocar o e-mail provisório de lib/legal.ts, revisão por advogado e um contrato de prestação de serviço para as lojas (a plataforma vende para o lojista; os termos atuais são do cliente final).
Testar no celular com uma loja piloto.

Logo depois:

(Feito) histórico e acompanhamento do pedido pelo cliente. Possível evolução: Supabase Realtime em vez de atualizar a cada 10 s, e passo "aceito" separado.
(Feito) Cliente com mais de um endereço e pedir de novo.
(Feito, falta configurar o webhook e testar no celular) Aviso automático ao cliente quando o status muda por Web Push (o botão "Avisar cliente" no WhatsApp continua). Configuração única no Supabase: Database Webhook em pedidos, evento UPDATE, POST para https://pedeeasy.com.br/api/notificar-status com o cabeçalho x-webhook-secret (mesmo valor do webhook de INSERT). Evoluções possíveis: Web Push (grátis; no iPhone só com o site instalado na tela inicial) ou WhatsApp Business API (pago, modelos aprovados), possivelmente como plano mais caro.
(Feito) Horário de funcionamento e taxa por localidade. Possível evolução: fechar o pedido de agora para um horário agendado.
(Domínio feito) E-mail contato@pedeeasy.com.br com encaminhamento para o Gmail do negócio e SMTP próprio no domínio; (home da plataforma feita); tela do administrador para cadastrar lojas; dono com mais de uma loja; relatórios simples.
Decisões tomadas
Plano comercial (15/11/2026): mensalidade única de R$ 49/mês, sem comissão por pedido e sem fidelidade/multa; montagem do cardápio grátis no início. Piloto proposto: primeiras 3 lojas com 30 dias grátis e depois R$ 39/mês enquanto permanecerem, em troca de depoimento e de poder usar a loja como exemplo. Extras futuros cobrados à parte (domínio próprio da loja, design sob medida, WhatsApp automático). Cobrança por Pix antecipado, desconto anual (10 meses pagos de 12), suspensão após ~5 dias de atraso. Custo fixo da plataforma estimado em R$ 250–300/mês (Supabase Pro + Vercel Pro + domínio), equilíbrio por volta de 5–6 lojas. Rever o preço depois das primeiras 5–10 lojas. A home (app/page.tsx) mostra o preço de R$ 49 e "sem comissão"; se o plano mudar, atualizar a home e o contrato do lojista.
Nome da plataforma: PedeEasy, domínio pedeeasy.com.br. (pedeja.com.br já tem dono; evitar marca parecida com "Pede Já".) As lojas ficam em pedeeasy.com.br/<slug>; domínio próprio por loja só como serviço extra futuro.
Um só sistema multi-loja, em vez de um site por cliente. Personalização visual por configuração no banco. Design 100% sob medida só como serviço premium, à parte.
Uma única tela de login (/entrar) para cliente e dono; o painel só abre para quem é dono de loja. Não criar /admin/entrar por enquanto.
Pagamento na entrega primeiro; depois Pix manual (já implementado). Pix automático só se algum cliente pedir.
Construir no plano gratuito e migrar para Supabase Pro e Vercel Pro quando entrar a primeira receita. Antes de qualquer loja real: assinar os planos pagos (o plano gratuito da Vercel é só para uso não comercial e o do Supabase pausa por inatividade e não tem backup) e religar a confirmação de e-mail do Supabase (desligada para facilitar os testes).
Pontos de atenção conhecidos
LGPD: a loja é a responsável pelos dados dos clientes dela; a plataforma é operadora. Terão de existir termo de uso e política de privacidade antes de lojas reais.
Plano gratuito do Supabase não tem backup: manter supabase/schema.sql atualizado a cada mudança no banco, e registrar nele qualquer SQL novo executado.
Chave Pix em CPF expõe o CPF ao cliente que fizer pedido em Pix; orientar as lojas a usar chave aleatória ou telefone.
app/admin/Painel.tsx ainda contém a função antiga LinhaProduto, sem uso (trocada por ProdutoCard); pode ser apagada. Aparencia.tsx tem uma cópia própria de reduzirImagem (sem o fundo branco, a menos que o usuário tenha aplicado a correção); unificar com lib/imagem.ts.
-- =====================================================================
-- cardapio-online — esquema completo do banco (Supabase / PostgreSQL)
--
-- Estado final, já com todos os ajustes de segurança.
-- Serve de BACKUP e de REFERÊNCIA do banco.
--
-- Para recriar do zero em um projeto Supabase novo: cole tudo no
-- SQL Editor e rode UMA vez. Rodar de novo em um banco que já tem
-- as tabelas vai dar erro de "already exists" (é esperado).
-- =====================================================================


-- ---------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------

-- Cada estabelecimento. O dono é um usuário do Supabase Auth.
create table lojas (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  slug text not null unique,
  telefone text,
  taxa_entrega numeric(10,2) not null default 0,
  aberta boolean not null default true,
  aceita_pix boolean not null default false,
  -- Horário de funcionamento (migracao_horario.sql): se usa_horario, só recebe pedido dentro dele.
  -- horarios = {"0":[{"abre":"18:00","fecha":"23:00"}], ... "6":[]}  (0 = domingo; vazio = fechado; fecha < abre vira a madrugada)
  usa_horario boolean not null default false,
  horarios jsonb not null default '{}'::jsonb check (jsonb_typeof(horarios) = 'object'),
  fuso text not null default 'America/Fortaleza',
  -- nome de quem recebe o Pix (titular da chave), mostrado ao cliente para conferir; vazio = não mostra
  nome_pix text check (nome_pix is null or char_length(nome_pix) between 1 and 60),
  -- Aparência (personalização visual de cada loja)
  cor_principal text not null default '#111827'
    check (cor_principal ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text,
  capa_url text,
  descricao text,
  instagram text,
  endereco_texto text,
  criado_em timestamptz not null default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  ordem int not null default 0
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  estoque int not null default 0 check (estoque >= 0),
  imagem_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Clientes finais (quem faz pedidos). Mesmo id do usuário no Auth.
create table clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  criado_em timestamptz not null default now()
);

create table enderecos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  rua text not null,
  numero text not null,
  bairro text not null,
  cidade text not null,
  complemento text,
  referencia text,
  -- nome da localidade de entrega escolhida pelo cliente (migracao_localidade_endereco.sql)
  localidade_padrao text check (localidade_padrao is null or char_length(localidade_padrao) between 1 and 60)
);

-- Localidades de entrega de cada loja, cada uma com sua taxa.
-- Se a loja não tiver nenhuma localidade ativa, vale lojas.taxa_entrega.
create table localidades (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  taxa numeric(10,2) not null default 0 check (taxa >= 0),
  ativo boolean not null default true,
  unique (loja_id, nome)
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  cliente_id uuid not null references clientes(id),
  status text not null default 'recebido'
    check (status in ('recebido','preparando','saiu_entrega','entregue','cancelado')),
  tipo text not null check (tipo in ('entrega','retirada')),
  endereco_entrega jsonb,
  subtotal numeric(10,2) not null,
  taxa_entrega numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  forma_pagamento text not null
    check (forma_pagamento in ('pix','dinheiro','cartao_entrega')),
  pagamento_status text not null default 'pendente'
    check (pagamento_status in ('pendente','pago','falhou')),
  observacao text,
  criado_em timestamptz not null default now()
);

-- Guarda nome e preço da hora da compra (mudar o preço depois não altera pedidos antigos).
create table itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  nome text not null,
  preco_unitario numeric(10,2) not null,
  quantidade int not null check (quantidade > 0),
  opcoes jsonb not null default '[]'::jsonb  -- opções escolhidas (foto da hora da compra); preco_unitario já inclui os extras
);

-- Chave Pix da loja. Tabela PRIVADA (só o dono lê). Nunca colocar a chave
-- na tabela lojas, que é de leitura pública.
create table lojas_pagamento (
  loja_id uuid primary key references lojas(id) on delete cascade,
  chave_pix text not null
);


-- ---------------------------------------------------------------------
-- SEGURANÇA (Row Level Security) — NÃO DESLIGAR
-- ---------------------------------------------------------------------

alter table lojas enable row level security;
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table enderecos enable row level security;
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;
alter table lojas_pagamento enable row level security;

-- LOJAS: todos veem; só o dono ATUALIZA. Ninguém cria loja pelo sistema
-- (lojas são criadas manualmente pelo administrador da plataforma).
create policy "lojas_ver" on lojas for select using (true);
create policy "lojas_dono_atualizar" on lojas for update
  using (dono_id = auth.uid())
  with check (dono_id = auth.uid());

-- CATEGORIAS: todos veem; só o dono da loja altera.
create policy "categorias_ver" on categorias for select using (true);
create policy "categorias_dono" on categorias for all
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));

-- PRODUTOS: todos veem; só o dono da loja altera.
create policy "produtos_ver" on produtos for select using (true);
create policy "produtos_dono" on produtos for all
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));

-- CLIENTES: cada um mexe no próprio cadastro; o dono da loja vê os
-- clientes que fizeram pedido na loja dele.
create policy "clientes_proprio" on clientes for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy "clientes_dono_ver" on clientes for select
  using (exists (
    select 1
    from pedidos p
    join lojas l on l.id = p.loja_id
    where p.cliente_id = clientes.id and l.dono_id = auth.uid()
  ));

-- ENDEREÇOS: cada cliente só mexe nos próprios.
create policy "enderecos_proprio" on enderecos for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- PEDIDOS: cliente vê os seus; dono vê e atualiza os da loja dele.
-- Pedidos NÃO são criados por INSERT direto: só pela função criar_pedido().
create policy "pedidos_cliente_ver" on pedidos for select
  using (cliente_id = auth.uid());
create policy "pedidos_dono_ver" on pedidos for select
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));
-- Sem política de UPDATE em pedidos: o dono muda status/pagamento só pelas funções
-- atualizar_status_pedido(), cancelar_pedido() e marcar_pix_pago().

-- LOCALIDADES: qualquer um lê (o cliente escolhe no checkout); só o dono escreve.
alter table localidades enable row level security;
create policy "localidades_ver" on localidades for select using (true);
create policy "localidades_dono_inserir" on localidades for insert
  with check (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));
create policy "localidades_dono_atualizar" on localidades for update
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));
create policy "localidades_dono_apagar" on localidades for delete
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));

-- ITENS DO PEDIDO: visíveis para quem enxerga o pedido (RLS de pedidos se aplica).
create policy "itens_ver" on itens_pedido for select
  using (exists (select 1 from pedidos p where p.id = pedido_id));

-- LOJAS_PAGAMENTO: só o dono lê. Escrita apenas pela função salvar_chave_pix().
create policy "lojas_pagamento_dono_ver" on lojas_pagamento for select
  using (exists (
    select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()
  ));



-- ---------------------------------------------------------------------
-- OPÇÕES E ADICIONAIS DO PRODUTO (migracao_opcoes.sql)
-- ---------------------------------------------------------------------
-- GRUPO = uma pergunta reaproveitável da loja: "Tamanho", "Adicionais", "Ponto da carne".
--   minimo = 0 -> opcional      minimo >= 1 -> o cliente é obrigado a escolher
--   maximo = 1 -> escolhe uma   maximo > 1  -> pode marcar várias (até o máximo)
-- Cada grupo é criado UMA vez e depois ligado aos produtos que o usam.
create table grupos_opcao (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  minimo int not null default 0 check (minimo >= 0),
  maximo int not null default 1 check (maximo >= 1),
  ordem int not null default 0,
  check (minimo <= maximo)
);

-- OPÇÃO = uma resposta do grupo: "Grande (+R$ 4,00)", "Bacon (+R$ 3,00)".
create table opcoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  grupo_id uuid not null references grupos_opcao(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  preco_extra numeric(10,2) not null default 0 check (preco_extra >= 0),
  ativo boolean not null default true,
  ordem int not null default 0
);

-- LIGAÇÃO: quais grupos cada produto usa.
create table produto_grupos (
  produto_id uuid not null references produtos(id) on delete cascade,
  grupo_id uuid not null references grupos_opcao(id) on delete cascade,
  loja_id uuid not null references lojas(id) on delete cascade,
  primary key (produto_id, grupo_id)
);

create index if not exists opcoes_grupo_idx on opcoes (grupo_id);
create index if not exists produto_grupos_grupo_idx on produto_grupos (grupo_id);


-- SEGURANÇA (RLS): todos leem; só o dono da loja escreve, com dados da própria loja.
alter table grupos_opcao enable row level security;
alter table opcoes enable row level security;
alter table produto_grupos enable row level security;

drop policy if exists "grupos_opcao_ver" on grupos_opcao;
create policy "grupos_opcao_ver" on grupos_opcao for select using (true);

create policy "grupos_opcao_dono" on grupos_opcao for all
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));

drop policy if exists "opcoes_ver" on opcoes;
create policy "opcoes_ver" on opcoes for select using (true);

drop policy if exists "opcoes_dono" on opcoes;
create policy "opcoes_dono" on opcoes for all
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (
    exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid())
    and exists (select 1 from grupos_opcao g where g.id = grupo_id and g.loja_id = opcoes.loja_id)
  );

drop policy if exists "produto_grupos_ver" on produto_grupos;
create policy "produto_grupos_ver" on produto_grupos for select using (true);

drop policy if exists "produto_grupos_dono" on produto_grupos;
create policy "produto_grupos_dono" on produto_grupos for all
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (
    exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid())
    and exists (select 1 from produtos p where p.id = produto_id and p.loja_id = produto_grupos.loja_id)
    and exists (select 1 from grupos_opcao g where g.id = grupo_id and g.loja_id = produto_grupos.loja_id)
  );


-- ---------------------------------------------------------------------
-- HORÁRIO DE FUNCIONAMENTO (migracao_horario.sql)
-- ---------------------------------------------------------------------
-- A loja está aberta em um momento específico? (usada nos testes e pela função abaixo)
create or replace function loja_aberta_em(p_loja_id uuid, p_momento timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l lojas%rowtype;
  local_ts timestamp;
  d int;
  ontem int;
  t time;
  p jsonb;
  a time;
  f time;
begin
  select * into l from lojas where id = p_loja_id;
  if not found or not l.aberta then return false; end if;
  if not l.usa_horario then return true; end if;

  local_ts := p_momento at time zone l.fuso;
  d := extract(dow from local_ts)::int;
  ontem := (d + 6) % 7;
  t := local_ts::time;

  -- períodos de hoje
  for p in select v from jsonb_array_elements(coalesce(l.horarios -> d::text, '[]'::jsonb)) as e(v) loop
    a := (p ->> 'abre')::time;
    f := (p ->> 'fecha')::time;
    if (a < f and t >= a and t < f) or (a >= f and t >= a) then return true; end if;
  end loop;

  -- períodos de ontem que viraram a madrugada
  for p in select v from jsonb_array_elements(coalesce(l.horarios -> ontem::text, '[]'::jsonb)) as e(v) loop
    a := (p ->> 'abre')::time;
    f := (p ->> 'fecha')::time;
    if a >= f and t < f then return true; end if;
  end loop;

  return false;
end;
$$;

create or replace function loja_aberta_agora(p_loja_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select loja_aberta_em(p_loja_id, now()) $$;

revoke all on function loja_aberta_em(uuid, timestamptz) from public, anon, authenticated;
revoke all on function loja_aberta_agora(uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- FUNÇÕES
-- ---------------------------------------------------------------------

-- Cria o pedido de forma segura: o servidor confere preço e estoque,
-- desconta o estoque e grava tudo numa transação só (se algo falhar,
-- nada é gravado). O navegador NUNCA define preço ou total.
create or replace function criar_pedido(
  p_loja_id uuid,
  p_tipo text,
  p_endereco_id uuid,
  p_forma_pagamento text,
  p_observacao text,
  p_itens jsonb,
  p_localidade_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := auth.uid();
  v_loja lojas%rowtype;
  v_prod produtos%rowtype;
  v_item jsonb;
  v_qtd int;
  v_pedido uuid;
  v_subtotal numeric(10,2) := 0;
  v_taxa numeric(10,2) := 0;
  v_endereco jsonb := null;
  v_loc localidades%rowtype;
  v_ids uuid[];
  v_achadas int;
  v_extra numeric(10,2);
  v_snap jsonb;
  v_unit numeric(10,2);
  v_g record;
  v_sel int;
begin
  if v_cliente is null then
    raise exception 'Faça login para fazer o pedido';
  end if;
  if not exists (select 1 from clientes where id = v_cliente) then
    raise exception 'Complete seu cadastro para pedir';
  end if;

  select * into v_loja from lojas where id = p_loja_id;
  if not found then raise exception 'Loja não encontrada'; end if;
  if not loja_aberta_agora(p_loja_id) then raise exception 'A loja está fechada no momento'; end if;

  if p_tipo not in ('entrega', 'retirada') then
    raise exception 'Tipo de pedido inválido';
  end if;
  if p_forma_pagamento not in ('dinheiro', 'cartao_entrega', 'pix') then
    raise exception 'Forma de pagamento inválida';
  end if;
  if p_forma_pagamento = 'pix' and not v_loja.aceita_pix then
    raise exception 'Esta loja não aceita Pix no momento';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  if p_tipo = 'entrega' then
    select to_jsonb(e) - 'cliente_id' - 'id' into v_endereco
    from enderecos e
    where e.id = p_endereco_id and e.cliente_id = v_cliente;
    if v_endereco is null then raise exception 'Endereço de entrega inválido'; end if;
    if exists (select 1 from localidades where loja_id = p_loja_id and ativo) then
      select * into v_loc from localidades
      where id = p_localidade_id and loja_id = p_loja_id and ativo;
      if not found then raise exception 'Escolha a localidade da entrega'; end if;
      v_taxa := v_loc.taxa;
      v_endereco := v_endereco || jsonb_build_object('localidade', v_loc.nome);
    else
      v_taxa := v_loja.taxa_entrega;
    end if;
  end if;

  insert into pedidos (
    loja_id, cliente_id, tipo, endereco_entrega,
    subtotal, taxa_entrega, total, forma_pagamento, observacao
  ) values (
    p_loja_id, v_cliente, p_tipo, v_endereco,
    0, v_taxa, 0, p_forma_pagamento, p_observacao
  ) returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'quantidade')::int;
    if v_qtd is null or v_qtd <= 0 then
      raise exception 'Quantidade inválida';
    end if;

    select * into v_prod from produtos
    where id = (v_item->>'produto_id')::uuid
      and loja_id = p_loja_id and ativo
    for update;

    if not found then raise exception 'Produto indisponível'; end if;
    if v_prod.estoque < v_qtd then
      raise exception 'Estoque insuficiente de %', v_prod.nome;
    end if;

    -- opções escolhidas (ids sem repetição)
    if jsonb_typeof(coalesce(v_item->'opcoes', '[]'::jsonb)) <> 'array' then
      raise exception 'Opções inválidas';
    end if;
    select coalesce(array_agg(distinct x::uuid), '{}'::uuid[]) into v_ids
    from jsonb_array_elements_text(coalesce(v_item->'opcoes', '[]'::jsonb)) as t(x);

    -- todas precisam existir, estar ativas e pertencer a um grupo ligado a este produto
    select count(*),
           coalesce(sum(o.preco_extra), 0),
           coalesce(jsonb_agg(jsonb_build_object(
             'grupo', g.nome, 'nome', o.nome, 'preco', o.preco_extra
           ) order by g.ordem, o.ordem), '[]'::jsonb)
      into v_achadas, v_extra, v_snap
    from opcoes o
    join grupos_opcao g on g.id = o.grupo_id
    join produto_grupos pg on pg.grupo_id = g.id and pg.produto_id = v_prod.id
    where o.id = any(v_ids) and o.ativo;

    if v_achadas <> coalesce(array_length(v_ids, 1), 0) then
      raise exception 'Uma das opções escolhidas não está mais disponível. Atualize o cardápio.';
    end if;

    -- regras de cada grupo do produto (mínimo/máximo)
    for v_g in
      select g.id, g.nome, g.minimo, g.maximo,
             (select count(*) from opcoes o where o.grupo_id = g.id and o.ativo) as disponiveis
      from grupos_opcao g
      join produto_grupos pg on pg.grupo_id = g.id and pg.produto_id = v_prod.id
    loop
      select count(*) into v_sel from opcoes o
      where o.grupo_id = v_g.id and o.id = any(v_ids);

      if v_sel > v_g.maximo then
        raise exception 'Em "%" escolha no máximo % opção(ões) (%)', v_g.nome, v_g.maximo, v_prod.nome;
      end if;
      -- se o grupo tem menos opções ativas que o mínimo, não trava o pedido
      if v_sel < least(v_g.minimo, v_g.disponiveis) then
        raise exception 'Escolha % em "%" (%)',
          least(v_g.minimo, v_g.disponiveis), v_g.nome, v_prod.nome;
      end if;
    end loop;

    update produtos set estoque = estoque - v_qtd where id = v_prod.id;

    v_unit := v_prod.preco + v_extra;
    insert into itens_pedido (pedido_id, produto_id, nome, preco_unitario, quantidade, opcoes)
    values (v_pedido, v_prod.id, v_prod.nome, v_unit, v_qtd, v_snap);

    v_subtotal := v_subtotal + v_unit * v_qtd;
  end loop;

  update pedidos
  set subtotal = v_subtotal, total = v_subtotal + v_taxa
  where id = v_pedido;

  return v_pedido;
end;
$$;

revoke all on function criar_pedido(uuid, text, uuid, text, text, jsonb, uuid) from public, anon;
grant execute on function criar_pedido(uuid, text, uuid, text, text, jsonb, uuid) to authenticated;


-- Ao criar uma conta pelo cadastro do site, grava o cliente e o endereço a partir
-- dos dados enviados em options.data do signUp (raw_user_meta_data).
-- Roda mesmo sem sessão, então funciona com a confirmação de e-mail LIGADA.
-- Contas criadas à mão (donos de loja) não têm "nome" nos metadados e são ignoradas.
create or replace function public.criar_cliente_do_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nome text := left(btrim(coalesce(m->>'nome', '')), 120);
  v_fone text := left(btrim(coalesce(m->>'telefone', '')), 30);
  v_rua text := left(btrim(coalesce(m->>'rua', '')), 200);
  v_numero text := left(btrim(coalesce(m->>'numero', '')), 30);
  v_bairro text := left(btrim(coalesce(m->>'bairro', '')), 120);
  v_cidade text := left(btrim(coalesce(m->>'cidade', '')), 120);
begin
  if v_nome = '' then
    return new;
  end if;

  insert into clientes (id, nome, telefone)
  values (new.id, v_nome, nullif(v_fone, ''))
  on conflict (id) do nothing;

  if v_rua <> '' and v_numero <> '' and v_bairro <> '' and v_cidade <> '' then
    insert into enderecos (cliente_id, rua, numero, bairro, cidade, complemento, referencia)
    values (
      new.id, v_rua, v_numero, v_bairro, v_cidade,
      nullif(left(btrim(coalesce(m->>'complemento', '')), 200), ''),
      nullif(left(btrim(coalesce(m->>'referencia', '')), 200), '')
    );
  end if;

  return new;
end;
$$;

revoke all on function public.criar_cliente_do_cadastro() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_cliente_do_cadastro();


-- Muda o status do pedido, só pelo dono da loja e só para o próximo passo.
-- (Cancelar continua sendo pela função cancelar_pedido, que devolve o estoque.)
create or replace function atualizar_status_pedido(p_pedido_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos%rowtype;
begin
  select * into v_pedido from pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;

  if not exists (
    select 1 from lojas where id = v_pedido.loja_id and dono_id = auth.uid()
  ) then
    raise exception 'Sem permissão para alterar este pedido';
  end if;

  if not (
    (v_pedido.status = 'recebido'     and p_status = 'preparando')   or
    (v_pedido.status = 'preparando'   and p_status = 'saiu_entrega') or
    (v_pedido.status = 'saiu_entrega' and p_status = 'entregue')
  ) then
    raise exception 'Mudança de status não permitida';
  end if;

  update pedidos set status = p_status where id = p_pedido_id;
end;
$$;

revoke all on function atualizar_status_pedido(uuid, text) from public, anon;
grant execute on function atualizar_status_pedido(uuid, text) to authenticated;


-- Confirma o Pix recebido, só pelo dono da loja e só em pedido Pix pendente.
create or replace function marcar_pix_pago(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos%rowtype;
begin
  select * into v_pedido from pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;

  if not exists (
    select 1 from lojas where id = v_pedido.loja_id and dono_id = auth.uid()
  ) then
    raise exception 'Sem permissão para alterar este pedido';
  end if;

  if v_pedido.forma_pagamento <> 'pix'
     or v_pedido.pagamento_status <> 'pendente'
     or v_pedido.status = 'cancelado' then
    raise exception 'Este pedido não aguarda confirmação de Pix';
  end if;

  update pedidos set pagamento_status = 'pago' where id = p_pedido_id;
end;
$$;

revoke all on function marcar_pix_pago(uuid) from public, anon;
grant execute on function marcar_pix_pago(uuid) to authenticated;


-- Cancela um pedido (só o dono da loja) e devolve o estoque.
create or replace function cancelar_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido pedidos%rowtype;
begin
  select * into v_pedido from pedidos where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;

  if not exists (
    select 1 from lojas where id = v_pedido.loja_id and dono_id = auth.uid()
  ) then
    raise exception 'Sem permissão para cancelar este pedido';
  end if;

  if v_pedido.status in ('entregue', 'cancelado') then
    raise exception 'Este pedido não pode mais ser cancelado';
  end if;

  update produtos p
  set estoque = p.estoque + i.quantidade
  from itens_pedido i
  where i.pedido_id = p_pedido_id and i.produto_id = p.id;

  update pedidos set status = 'cancelado' where id = p_pedido_id;
end;
$$;

revoke all on function cancelar_pedido(uuid) from public, anon;
grant execute on function cancelar_pedido(uuid) to authenticated;


-- O dono salva (ou remove, enviando texto vazio) a chave Pix da loja.
-- Mantém lojas.aceita_pix em sincronia.
create or replace function salvar_chave_pix(p_loja_id uuid, p_chave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chave text := btrim(coalesce(p_chave, ''));
begin
  if not exists (
    select 1 from lojas where id = p_loja_id and dono_id = auth.uid()
  ) then
    raise exception 'Sem permissão para alterar esta loja';
  end if;

  if v_chave = '' then
    delete from lojas_pagamento where loja_id = p_loja_id;
    update lojas set aceita_pix = false where id = p_loja_id;
  else
    insert into lojas_pagamento (loja_id, chave_pix) values (p_loja_id, v_chave)
    on conflict (loja_id) do update set chave_pix = excluded.chave_pix;
    update lojas set aceita_pix = true where id = p_loja_id;
  end if;
end;
$$;

revoke all on function salvar_chave_pix(uuid, text) from public, anon;
grant execute on function salvar_chave_pix(uuid, text) to authenticated;


-- O cliente lê a chave Pix SOMENTE do próprio pedido em Pix (e não cancelado).
create or replace function chave_pix_do_pedido(p_pedido_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chave text;
begin
  select lp.chave_pix into v_chave
  from pedidos p
  join lojas_pagamento lp on lp.loja_id = p.loja_id
  where p.id = p_pedido_id
    and p.cliente_id = auth.uid()
    and p.forma_pagamento = 'pix'
    and p.status <> 'cancelado';
  return v_chave;
end;
$$;

revoke all on function chave_pix_do_pedido(uuid) from public, anon;
grant execute on function chave_pix_do_pedido(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- STORAGE — imagens das lojas (logo e capa)
-- Bucket público para LEITURA (o cardápio mostra sem login). Só o dono da
-- loja escreve/apaga, e só dentro da pasta "<loja_id>/".
-- O app converte tudo para JPEG de até 1200 px; o bucket reforça isso no servidor.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lojas', 'lojas', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg'];

create policy "lojas_imagens_dono_enviar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lojas'
    and exists (
      select 1 from public.lojas l
      where l.id::text = (storage.foldername(name))[1]
        and l.dono_id = auth.uid()
    )
  );

create policy "lojas_imagens_dono_apagar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lojas'
    and exists (
      select 1 from public.lojas l
      where l.id::text = (storage.foldername(name))[1]
        and l.dono_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------
-- (OPCIONAL) DADOS DE EXEMPLO — loja de demonstração
-- Descomente e rode UMA vez, DEPOIS de criar um usuário em
-- Authentication > Users (a loja é ligada ao primeiro usuário da lista).
-- ---------------------------------------------------------------------
--
-- with nova_loja as (
--   insert into lojas (dono_id, nome, slug, telefone, taxa_entrega)
--   select id, 'Lanchonete Exemplo', 'lanchonete-exemplo', '88999999999', 5.00
--   from auth.users limit 1
--   returning id
-- ),
-- cat_lanches as (
--   insert into categorias (loja_id, nome, ordem)
--   select id, 'Lanches', 1 from nova_loja
--   returning id, loja_id
-- ),
-- cat_bebidas as (
--   insert into categorias (loja_id, nome, ordem)
--   select id, 'Bebidas', 2 from nova_loja
--   returning id, loja_id
-- )
-- insert into produtos (loja_id, categoria_id, nome, descricao, preco, estoque)
-- select loja_id, id, 'X-Burger', 'Pão, hambúrguer, queijo e salada', 18.00, 20 from cat_lanches
-- union all
-- select loja_id, id, 'X-Bacon', 'Pão, hambúrguer, queijo e bacon crocante', 22.00, 15 from cat_lanches
-- union all
-- select loja_id, id, 'Refrigerante lata', '350 ml', 6.00, 50 from cat_bebidas
-- union all
-- select loja_id, id, 'Suco natural', 'Laranja, 400 ml', 8.00, 0 from cat_bebidas;

-- ---------------------------------------------------------------------
-- AVISOS DE PEDIDO NOVO (notificação push)
-- Quem envia os avisos é a rota /api/notificar, chamada por um Database Webhook
-- (Supabase > Database > Webhooks: tabela pedidos, evento INSERT, POST com o
-- cabeçalho x-webhook-secret). O segredo NÃO fica neste arquivo.
-- ---------------------------------------------------------------------
-- Um registro por aparelho/navegador que ativou os avisos.
create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);

alter table push_inscricoes enable row level security;

drop policy if exists "push_dono" on push_inscricoes;
create policy "push_dono" on push_inscricoes for all
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()))
  with check (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));


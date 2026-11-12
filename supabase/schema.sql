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
  referencia text
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
  quantidade int not null check (quantidade > 0)
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
create policy "pedidos_dono_atualizar" on pedidos for update
  using (exists (select 1 from lojas l where l.id = loja_id and l.dono_id = auth.uid()));

-- ITENS DO PEDIDO: visíveis para quem enxerga o pedido (RLS de pedidos se aplica).
create policy "itens_ver" on itens_pedido for select
  using (exists (select 1 from pedidos p where p.id = pedido_id));


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
  p_itens jsonb
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
begin
  if v_cliente is null then
    raise exception 'Faça login para fazer o pedido';
  end if;
  if not exists (select 1 from clientes where id = v_cliente) then
    raise exception 'Complete seu cadastro para pedir';
  end if;

  select * into v_loja from lojas where id = p_loja_id;
  if not found then raise exception 'Loja não encontrada'; end if;
  if not v_loja.aberta then raise exception 'A loja está fechada no momento'; end if;

  if p_tipo not in ('entrega', 'retirada') then
    raise exception 'Tipo de pedido inválido';
  end if;
  if p_forma_pagamento not in ('dinheiro', 'cartao_entrega', 'pix') then
    raise exception 'Forma de pagamento inválida';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  if p_tipo = 'entrega' then
    select to_jsonb(e) - 'cliente_id' - 'id' into v_endereco
    from enderecos e
    where e.id = p_endereco_id and e.cliente_id = v_cliente;
    if v_endereco is null then raise exception 'Endereço de entrega inválido'; end if;
    v_taxa := v_loja.taxa_entrega;
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

    update produtos set estoque = estoque - v_qtd where id = v_prod.id;

    insert into itens_pedido (pedido_id, produto_id, nome, preco_unitario, quantidade)
    values (v_pedido, v_prod.id, v_prod.nome, v_prod.preco, v_qtd);

    v_subtotal := v_subtotal + v_prod.preco * v_qtd;
  end loop;

  update pedidos
  set subtotal = v_subtotal, total = v_subtotal + v_taxa
  where id = v_pedido;

  return v_pedido;
end;
$$;

revoke all on function criar_pedido(uuid, text, uuid, text, text, jsonb) from public, anon;
grant execute on function criar_pedido(uuid, text, uuid, text, text, jsonb) to authenticated;


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
-- STORAGE: imagens públicas das lojas
-- Execute este bloco no SQL Editor do Supabase para habilitar logo e capa.
-- O bucket é público para leitura; somente o dono da loja pode enviar ou
-- apagar arquivos dentro da pasta cujo nome é o id da própria loja.
-- ---------------------------------------------------------------------

alter table public.lojas
  add column if not exists logo_url text,
  add column if not exists capa_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lojas', 'lojas', true, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "imagens_lojas_leitura_publica" on storage.objects
  for select using (bucket_id = 'lojas');

create policy "imagens_lojas_dono_enviar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lojas'
    and (storage.foldername(name))[1] in (
      select l.id::text from public.lojas l where l.dono_id = auth.uid()
    )
  );

create policy "imagens_lojas_dono_apagar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lojas'
    and (storage.foldername(name))[1] in (
      select l.id::text from public.lojas l where l.dono_id = auth.uid()
    )
  );

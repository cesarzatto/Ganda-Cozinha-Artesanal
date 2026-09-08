-- Migração v2 → v3: categorias, rua no cliente, e vendas com vários produtos.
-- Rode este arquivo no SQL Editor do Supabase. Não apaga nenhum dado —
-- só adiciona o que é novo. Sua tabela "vendas" já foi conferida e
-- está vazia, então a reestruturação dela abaixo é segura.

-- 1) Categorias (lista gerenciável de categorias de produto)
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table categorias enable row level security;
drop policy if exists "acesso total categorias" on categorias;
create policy "acesso total categorias" on categorias for all using (true) with check (true);
grant all on categorias to anon, authenticated;

-- 2) Campo "Rua" no cadastro de cliente
alter table clientes add column if not exists rua text;

-- 3) Vendas com vários produtos (itens da venda em tabela separada)
create table if not exists venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_venda_itens_venda on venda_itens (venda_id);
create index if not exists idx_venda_itens_produto on venda_itens (produto_id);

alter table venda_itens enable row level security;
drop policy if exists "acesso total venda_itens" on venda_itens;
create policy "acesso total venda_itens" on venda_itens for all using (true) with check (true);
grant all on venda_itens to anon, authenticated;

-- Remove as colunas antigas de produto único da tabela vendas
-- (sua tabela "vendas" está vazia, então isso não perde nenhum dado)
alter table vendas drop column if exists produto_id;
alter table vendas drop column if exists quantidade;

-- Substitui a função registrar_venda pela versão que aceita vários itens
drop function if exists registrar_venda(uuid, uuid, integer, numeric, numeric, text, date);

create or replace function registrar_venda(
  p_cliente_id uuid,
  p_itens jsonb,
  p_desconto numeric,
  p_valor_total numeric,
  p_forma_contato text,
  p_data_venda date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venda_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade integer;
begin
  if p_cliente_id is null then
    raise exception 'Toda venda precisa estar vinculada a um cliente';
  end if;

  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda precisa ter pelo menos um produto';
  end if;

  insert into vendas (cliente_id, valor_total, desconto, forma_contato, data_venda)
  values (
    p_cliente_id,
    p_valor_total,
    coalesce(p_desconto, 0),
    p_forma_contato,
    coalesce(p_data_venda, current_date)
  )
  returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_produto_id := (v_item ->> 'produto_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;

    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario)
    values (v_venda_id, v_produto_id, v_quantidade, (v_item ->> 'preco_unitario')::numeric);

    update produtos
    set estoque_atual = estoque_atual - v_quantidade
    where id = v_produto_id;

    insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
    values (v_produto_id, 'saida', v_quantidade, 'Venda', v_venda_id);
  end loop;

  return v_venda_id;
end;
$$;

grant execute on function registrar_venda(uuid, jsonb, numeric, numeric, text, date) to anon, authenticated;

-- Migração v6 → v7:
--  1) Insumos/Embalagens: cadastro por "quantidade da embalagem + valor
--     pago" em vez de custo por unidade direto (o sistema calcula).
--  2) Produtos "Sob Demanda": ficam de fora da validação/baixa de estoque.
--  3) Sub-receitas: um produto pode usar outro produto (marcado como
--     "não vendido separadamente") como ingrediente — ex: um brigadeiro
--     dentro de um ovo de Páscoa.
-- Não apaga nenhum dado. Rode este arquivo no SQL Editor do Supabase.

-- 1) Insumos e Embalagens: novas colunas de referência (custo_unitario
--    continua existindo e é o que o resto do sistema usa pra calcular)
alter table insumos add column if not exists quantidade_embalagem numeric(10, 3);
alter table insumos add column if not exists valor_pago numeric(10, 2);

alter table embalagens add column if not exists quantidade_embalagem numeric(10, 3);
alter table embalagens add column if not exists valor_pago numeric(10, 2);

-- 2) Produtos: sob demanda e vendido separadamente
alter table produtos add column if not exists sob_demanda boolean not null default false;
alter table produtos add column if not exists vendido_separadamente boolean not null default true;

-- 3) Ficha técnica: permite referenciar outro produto (sub-receita) em
--    vez de um insumo
alter table ficha_tecnica add column if not exists sub_produto_id uuid references produtos (id) on delete cascade;
alter table ficha_tecnica alter column insumo_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ficha_tecnica_produto_id_sub_produto_id_key'
  ) then
    alter table ficha_tecnica add constraint ficha_tecnica_produto_id_sub_produto_id_key unique (produto_id, sub_produto_id);
  end if;
end $$;

alter table ficha_tecnica drop constraint if exists ficha_tecnica_um_tipo;
alter table ficha_tecnica add constraint ficha_tecnica_um_tipo check (
  (insumo_id is not null and sub_produto_id is null)
  or (insumo_id is null and sub_produto_id is not null)
);

alter table ficha_tecnica drop constraint if exists ficha_tecnica_nao_referencia_a_si_mesmo;
alter table ficha_tecnica add constraint ficha_tecnica_nao_referencia_a_si_mesmo check (sub_produto_id is distinct from produto_id);

create index if not exists idx_ficha_tecnica_sub_produto on ficha_tecnica (sub_produto_id);

-- 4) Funções recursivas de custo (substituem o cálculo antigo, direto na view)
create or replace function custo_mao_obra_produto(p_produto_id uuid)
returns numeric
language sql
stable
as $$
  select (p.tempo_producao_minutos / 60.0) * cfg.valor_hora_trabalho / greatest(p.rendimento_lote, 1)
  from produtos p
  cross join configuracoes cfg
  where p.id = p_produto_id;
$$;

create or replace function custo_embalagens_produto(p_produto_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(pe.quantidade * e.custo_unitario), 0)
  from produto_embalagens pe
  join embalagens e on e.id = pe.embalagem_id
  where pe.produto_id = p_produto_id;
$$;

create or replace function custo_total_produto(p_produto_id uuid, p_profundidade integer default 0)
returns numeric
language plpgsql
stable
as $$
begin
  if p_profundidade > 5 then
    raise exception 'Ficha técnica com referência circular (produtos usando um ao outro)';
  end if;

  return custo_ingredientes_produto(p_produto_id, p_profundidade)
    + custo_embalagens_produto(p_produto_id)
    + custo_mao_obra_produto(p_produto_id)
    + coalesce((select custo_indireto_unidade from produtos where id = p_produto_id), 0);
end;
$$;

create or replace function custo_ingredientes_produto(p_produto_id uuid, p_profundidade integer default 0)
returns numeric
language plpgsql
stable
as $$
declare
  v_total numeric := 0;
  v_item record;
begin
  for v_item in
    select insumo_id, sub_produto_id, quantidade
    from ficha_tecnica
    where produto_id = p_produto_id
  loop
    if v_item.insumo_id is not null then
      v_total := v_total + v_item.quantidade * coalesce((select custo_unitario from insumos where id = v_item.insumo_id), 0);
    elsif v_item.sub_produto_id is not null then
      v_total := v_total + v_item.quantidade * custo_total_produto(v_item.sub_produto_id, p_profundidade + 1);
    end if;
  end loop;
  return v_total;
end;
$$;

-- 5) View produtos_com_custo passa a usar as funções recursivas
-- (drop + create, não "or replace": as novas colunas de produtos entram no
-- meio da expansão de p.*, o que muda a posição das colunas calculadas e o
-- Postgres não permite "or replace" trocar nome/posição de coluna de view)
drop view if exists produtos_com_custo;
create view produtos_com_custo as
select
  p.*,
  custo_ingredientes_produto(p.id)::numeric(10, 2) as custo_ingredientes,
  custo_mao_obra_produto(p.id)::numeric(10, 2) as custo_mao_obra,
  custo_total_produto(p.id)::numeric(10, 2) as custo_total,
  coalesce(p.margem_desejada, cfg.margem_padrao) as margem_usada,
  case
    when coalesce(p.margem_desejada, cfg.margem_padrao) >= 100 then null
    else (custo_total_produto(p.id) / (1 - coalesce(p.margem_desejada, cfg.margem_padrao) / 100.0))::numeric(10, 2)
  end as preco_sugerido,
  custo_embalagens_produto(p.id)::numeric(10, 2) as custo_embalagens
from produtos p
cross join configuracoes cfg;

-- 6) registrar_venda e converter_orcamento_em_venda passam a ignorar
--    estoque para produtos "sob demanda"
create or replace function registrar_venda(
  p_cliente_id uuid,
  p_itens jsonb,
  p_desconto numeric,
  p_valor_total numeric,
  p_forma_contato text,
  p_data_venda date,
  p_data_entrega date default null,
  p_forma_pagamento text default null,
  p_observacao text default null
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
  v_estoque_insuficiente record;
begin
  if p_cliente_id is null then
    raise exception 'Toda venda precisa estar vinculada a um cliente';
  end if;

  if p_forma_contato is null then
    raise exception 'Escolha a forma de contato da venda';
  end if;

  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda precisa ter pelo menos um produto';
  end if;

  select p.nome, p.estoque_atual, pedido.qtd
  into v_estoque_insuficiente
  from (
    select (elem ->> 'produto_id')::uuid as produto_id, sum((elem ->> 'quantidade')::integer) as qtd
    from jsonb_array_elements(p_itens) elem
    group by (elem ->> 'produto_id')::uuid
  ) pedido
  join produtos p on p.id = pedido.produto_id
  where not p.sob_demanda and p.estoque_atual < pedido.qtd
  limit 1;

  if v_estoque_insuficiente.nome is not null then
    raise exception 'Estoque insuficiente de "%": só há % em estoque.',
      v_estoque_insuficiente.nome, v_estoque_insuficiente.estoque_atual;
  end if;

  insert into vendas (cliente_id, valor_total, desconto, forma_contato, data_venda, data_entrega, forma_pagamento, observacao, status)
  values (
    p_cliente_id,
    p_valor_total,
    coalesce(p_desconto, 0),
    p_forma_contato,
    coalesce(p_data_venda, current_date),
    p_data_entrega,
    p_forma_pagamento,
    p_observacao,
    'confirmada'
  )
  returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_produto_id := (v_item ->> 'produto_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;

    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario)
    values (v_venda_id, v_produto_id, v_quantidade, (v_item ->> 'preco_unitario')::numeric);

    if not coalesce((select sob_demanda from produtos where id = v_produto_id), false) then
      update produtos
      set estoque_atual = estoque_atual - v_quantidade
      where id = v_produto_id;

      insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
      values (v_produto_id, 'saida', v_quantidade, 'Venda', v_venda_id);
    end if;
  end loop;

  return v_venda_id;
end;
$$;

create or replace function converter_orcamento_em_venda(
  p_venda_id uuid,
  p_cliente_id uuid default null,
  p_forma_contato text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_cliente_final uuid;
  v_forma_contato_final text;
  v_item record;
  v_estoque_insuficiente record;
begin
  select status, coalesce(p_cliente_id, cliente_id), coalesce(p_forma_contato, forma_contato)
  into v_status, v_cliente_final, v_forma_contato_final
  from vendas where id = p_venda_id;

  if v_status is null then
    raise exception 'Orçamento não encontrado';
  end if;
  if v_status <> 'orcamento' then
    raise exception 'Esse pedido já é uma venda confirmada';
  end if;
  if v_cliente_final is null then
    raise exception 'Escolha o cliente para virar essa venda';
  end if;
  if v_forma_contato_final is null then
    raise exception 'Escolha a forma de contato para virar essa venda';
  end if;

  select p.nome, p.estoque_atual, pedido.qtd
  into v_estoque_insuficiente
  from (
    select produto_id, sum(quantidade) as qtd
    from venda_itens
    where venda_id = p_venda_id
    group by produto_id
  ) pedido
  join produtos p on p.id = pedido.produto_id
  where not p.sob_demanda and p.estoque_atual < pedido.qtd
  limit 1;

  if v_estoque_insuficiente.nome is not null then
    raise exception 'Estoque insuficiente de "%": só há % em estoque.',
      v_estoque_insuficiente.nome, v_estoque_insuficiente.estoque_atual;
  end if;

  update vendas
  set status = 'confirmada',
      cliente_id = v_cliente_final,
      forma_contato = v_forma_contato_final
  where id = p_venda_id;

  for v_item in select produto_id, quantidade from venda_itens where venda_id = p_venda_id
  loop
    continue when coalesce((select sob_demanda from produtos where id = v_item.produto_id), false);

    update produtos
    set estoque_atual = estoque_atual - v_item.quantidade
    where id = v_item.produto_id;

    insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
    values (v_item.produto_id, 'saida', v_item.quantidade, 'Venda', p_venda_id);
  end loop;
end;
$$;

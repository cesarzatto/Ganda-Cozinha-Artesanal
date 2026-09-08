-- Migração v4 → v5: seção Orçamentos (pré-venda), acompanhamento de
-- entregas ("entregue"), e função para virar orçamento em venda.
-- Não apaga nenhum dado. Rode este arquivo no SQL Editor do Supabase.

-- 1) Novas colunas / ajustes em "vendas"
alter table vendas add column if not exists entregue boolean not null default false;
alter table vendas alter column forma_contato drop not null;

-- 2) registrar_venda passa a exigir forma de contato explicitamente
--    (antes vinha do "not null" da coluna, que acabamos de remover
--    para liberar os orçamentos sem forma de contato)
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
  where p.estoque_atual < pedido.qtd
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

    update produtos
    set estoque_atual = estoque_atual - v_quantidade
    where id = v_produto_id;

    insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
    values (v_produto_id, 'saida', v_quantidade, 'Venda', v_venda_id);
  end loop;

  return v_venda_id;
end;
$$;

grant execute on function registrar_venda(uuid, jsonb, numeric, numeric, text, date, date, text, text) to anon, authenticated;

-- 3) Criar orçamento (sem cliente/forma de contato obrigatórios, sem mexer em estoque)
create or replace function criar_orcamento(
  p_titulo text,
  p_cliente_id uuid,
  p_itens jsonb,
  p_desconto numeric,
  p_valor_total numeric,
  p_forma_contato text default null,
  p_data_venda date default null,
  p_data_entrega date default null,
  p_forma_pagamento text default null,
  p_observacao text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento_id uuid;
  v_item jsonb;
begin
  if p_titulo is null or btrim(p_titulo) = '' then
    raise exception 'Dê um título para o orçamento';
  end if;

  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'O orçamento precisa ter pelo menos um produto';
  end if;

  insert into vendas (
    titulo, cliente_id, valor_total, desconto, forma_contato,
    data_venda, data_entrega, forma_pagamento, observacao, status
  )
  values (
    p_titulo, p_cliente_id, p_valor_total, coalesce(p_desconto, 0), p_forma_contato,
    coalesce(p_data_venda, current_date), p_data_entrega, p_forma_pagamento, p_observacao, 'orcamento'
  )
  returning id into v_orcamento_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario)
    values (
      v_orcamento_id,
      (v_item ->> 'produto_id')::uuid,
      (v_item ->> 'quantidade')::integer,
      (v_item ->> 'preco_unitario')::numeric
    );
  end loop;

  return v_orcamento_id;
end;
$$;

grant execute on function criar_orcamento(text, uuid, jsonb, numeric, numeric, text, date, date, text, text) to anon, authenticated;

-- 4) Editar orçamento (só permitido enquanto status = 'orcamento')
create or replace function atualizar_orcamento(
  p_venda_id uuid,
  p_titulo text,
  p_cliente_id uuid,
  p_itens jsonb,
  p_desconto numeric,
  p_valor_total numeric,
  p_forma_contato text,
  p_data_venda date,
  p_data_entrega date,
  p_forma_pagamento text,
  p_observacao text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_status text;
begin
  select status into v_status from vendas where id = p_venda_id;
  if v_status is null then
    raise exception 'Orçamento não encontrado';
  end if;
  if v_status <> 'orcamento' then
    raise exception 'Esse pedido já virou venda e não pode mais ser editado como orçamento';
  end if;

  update vendas
  set titulo = p_titulo,
      cliente_id = p_cliente_id,
      valor_total = p_valor_total,
      desconto = coalesce(p_desconto, 0),
      forma_contato = p_forma_contato,
      data_venda = coalesce(p_data_venda, current_date),
      data_entrega = p_data_entrega,
      forma_pagamento = p_forma_pagamento,
      observacao = p_observacao
  where id = p_venda_id;

  delete from venda_itens where venda_id = p_venda_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario)
    values (
      p_venda_id,
      (v_item ->> 'produto_id')::uuid,
      (v_item ->> 'quantidade')::integer,
      (v_item ->> 'preco_unitario')::numeric
    );
  end loop;
end;
$$;

grant execute on function atualizar_orcamento(uuid, text, uuid, jsonb, numeric, numeric, text, date, date, text, text) to anon, authenticated;

-- 5) Virar orçamento em venda (valida estoque, cliente e forma de contato, dá baixa)
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
  where p.estoque_atual < pedido.qtd
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
    update produtos
    set estoque_atual = estoque_atual - v_item.quantidade
    where id = v_item.produto_id;

    insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
    values (v_item.produto_id, 'saida', v_item.quantidade, 'Venda', p_venda_id);
  end loop;
end;
$$;

grant execute on function converter_orcamento_em_venda(uuid, uuid, text) to anon, authenticated;

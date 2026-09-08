-- Migração v10 → v11:
--  Ajustes no Frete:
--   1) Motoboy vira um valor livre (ela digita quanto custou), sem cálculo.
--   2) Estabelecimento passa a usar um endereço de destino de verdade — o
--      endereço já cadastrado do cliente (CEP/rua/número/complemento) ou um
--      digitado na hora — com um link pronto pro Google Maps pra conferir a
--      distância (sem precisar de nenhuma API paga).
--  Guarda o endereço usado em cada pedido, pra referência futura.
-- Não apaga nenhum dado. Rode este arquivo no SQL Editor do Supabase.

alter table vendas add column if not exists endereco_entrega text;

create or replace function registrar_venda(
  p_cliente_id uuid,
  p_itens jsonb,
  p_desconto numeric,
  p_valor_total numeric,
  p_forma_contato text,
  p_data_venda date,
  p_data_entrega date default null,
  p_forma_pagamento text default null,
  p_observacao text default null,
  p_tipo_frete text default 'retirada',
  p_distancia_km_ida numeric default null,
  p_custo_entrega numeric default null,
  p_pago boolean default true,
  p_endereco_entrega text default null
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

  -- valida estoque de produto final ANTES de gravar qualquer coisa
  -- (produtos "sob demanda" não têm estoque controlado, então ficam de fora)
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

  insert into vendas (
    cliente_id, valor_total, desconto, forma_contato, data_venda, data_entrega,
    forma_pagamento, observacao, status, tipo_frete, distancia_km_ida, custo_entrega, pago,
    endereco_entrega
  )
  values (
    p_cliente_id,
    p_valor_total,
    coalesce(p_desconto, 0),
    p_forma_contato,
    coalesce(p_data_venda, current_date),
    p_data_entrega,
    p_forma_pagamento,
    p_observacao,
    'confirmada',
    coalesce(p_tipo_frete, 'retirada'),
    p_distancia_km_ida,
    p_custo_entrega,
    coalesce(p_pago, true),
    p_endereco_entrega
  )
  returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_produto_id := (v_item ->> 'produto_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;

    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario)
    values (v_venda_id, v_produto_id, v_quantidade, (v_item ->> 'preco_unitario')::numeric);

    -- produtos "sob demanda" não têm estoque controlado: não desconta nem loga movimentação
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

create or replace function atualizar_entrega_venda(
  p_venda_id uuid,
  p_data_entrega date,
  p_forma_pagamento text,
  p_observacao text,
  p_tipo_frete text default 'retirada',
  p_distancia_km_ida numeric default null,
  p_custo_entrega numeric default null,
  p_pago boolean default true,
  p_endereco_entrega text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update vendas
  set data_entrega = p_data_entrega,
      forma_pagamento = p_forma_pagamento,
      observacao = p_observacao,
      tipo_frete = coalesce(p_tipo_frete, 'retirada'),
      distancia_km_ida = p_distancia_km_ida,
      custo_entrega = p_custo_entrega,
      pago = coalesce(p_pago, true),
      endereco_entrega = p_endereco_entrega
  where id = p_venda_id;
end;
$$;

-- Cria um orçamento (pré-venda): sem cliente/forma de contato obrigatórios,
-- sem validar nem mexer em estoque — isso só acontece quando ele vira venda.
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
  p_observacao text default null,
  p_tipo_frete text default 'retirada',
  p_distancia_km_ida numeric default null,
  p_custo_entrega numeric default null,
  p_pago boolean default false,
  p_endereco_entrega text default null
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
    data_venda, data_entrega, forma_pagamento, observacao, status,
    tipo_frete, distancia_km_ida, custo_entrega, pago, endereco_entrega
  )
  values (
    p_titulo, p_cliente_id, p_valor_total, coalesce(p_desconto, 0), p_forma_contato,
    coalesce(p_data_venda, current_date), p_data_entrega, p_forma_pagamento, p_observacao, 'orcamento',
    coalesce(p_tipo_frete, 'retirada'), p_distancia_km_ida, p_custo_entrega, coalesce(p_pago, false),
    p_endereco_entrega
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

-- Atualiza um orçamento que ainda não virou venda (apaga e recria os itens,
-- igual à ficha técnica dos produtos — simples porque não mexe em estoque)
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
  p_observacao text,
  p_tipo_frete text default 'retirada',
  p_distancia_km_ida numeric default null,
  p_custo_entrega numeric default null,
  p_pago boolean default false,
  p_endereco_entrega text default null
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
      observacao = p_observacao,
      tipo_frete = coalesce(p_tipo_frete, 'retirada'),
      distancia_km_ida = p_distancia_km_ida,
      custo_entrega = p_custo_entrega,
      pago = coalesce(p_pago, false),
      endereco_entrega = p_endereco_entrega
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

grant execute on function registrar_venda(uuid, jsonb, numeric, numeric, text, date, date, text, text, text, numeric, numeric, boolean, text) to anon, authenticated;
grant execute on function atualizar_entrega_venda(uuid, date, text, text, text, numeric, numeric, boolean, text) to anon, authenticated;
grant execute on function criar_orcamento(text, uuid, jsonb, numeric, numeric, text, date, date, text, text, text, numeric, numeric, boolean, text) to anon, authenticated;
grant execute on function atualizar_orcamento(uuid, text, uuid, jsonb, numeric, numeric, text, date, date, text, text, text, numeric, numeric, boolean, text) to anon, authenticated;

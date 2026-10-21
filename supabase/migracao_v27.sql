-- Encomendas viram pedido (venda) + "o que falta produzir".
--
-- * encomendas.itens agora aceita dois tipos de linha:
--     {"tipo":"catalogo","produto_id":"...","descricao":"nome","quantidade":2,"valor_unitario":27}
--     {"tipo":"personalizado","descricao":"Bolo","quantidade":1,"valor_unitario":80}
-- * Ao virar pedido, marmita do cardápio baixa do estoque só o que existe;
--   o que falta vai pra venda_itens.qtd_produzir (a produzir).
--   Itens personalizados ficam em vendas.itens_personalizados e entram no total.
-- * atualizar_entrega_venda / atualizar_itens_venda / cancelar_venda passam a
--   considerar itens personalizados e a parte "a produzir".

alter table vendas
  add column if not exists encomenda_id uuid references encomendas(id) on delete set null,
  add column if not exists itens_personalizados jsonb not null default '[]'::jsonb;

alter table venda_itens
  add column if not exists qtd_produzir numeric(10, 3) not null default 0;

alter table encomendas
  add column if not exists venda_id uuid references vendas(id) on delete set null,
  add column if not exists venda_numero integer;

create or replace function converter_encomenda_em_venda(p_encomenda_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enc encomendas%rowtype;
  v_venda_id uuid;
  v_numero integer;
  v_item jsonb;
  v_produto_id uuid;
  v_qtd numeric;
  v_estoque numeric;
  v_sob_demanda boolean;
  v_baixa numeric;
  v_extras jsonb;
begin
  select * into v_enc from encomendas where id = p_encomenda_id for update;
  if not found then
    raise exception 'Encomenda não encontrada';
  end if;
  if v_enc.venda_id is not null then
    raise exception 'Essa encomenda já virou pedido';
  end if;
  if v_enc.cliente_id is null then
    raise exception 'Escolha um cliente para essa encomenda';
  end if;
  if jsonb_array_length(v_enc.itens) = 0 then
    raise exception 'A encomenda não tem itens';
  end if;

  select coalesce(jsonb_agg(e.value), '[]'::jsonb) into v_extras
  from jsonb_array_elements(v_enc.itens) e
  where coalesce(e.value ->> 'tipo', 'personalizado') <> 'catalogo';

  insert into vendas (
    cliente_id, valor_total, desconto, data_venda, data_entrega, forma_pagamento,
    observacao, status, tipo_frete, pago, entregue, endereco_entrega,
    encomenda_id, itens_personalizados
  )
  values (
    v_enc.cliente_id, v_enc.valor_total, 0, current_date, v_enc.data_entrega, v_enc.forma_pagamento,
    v_enc.observacao, 'confirmada', 'retirada', v_enc.pago, v_enc.entregue, v_enc.endereco_entrega,
    v_enc.id, v_extras
  )
  returning id, numero_pedido into v_venda_id, v_numero;

  for v_item in
    select e.value from jsonb_array_elements(v_enc.itens) e where e.value ->> 'tipo' = 'catalogo'
  loop
    v_produto_id := (v_item ->> 'produto_id')::uuid;
    v_qtd := (v_item ->> 'quantidade')::numeric;

    select estoque_atual, sob_demanda into v_estoque, v_sob_demanda
    from produtos where id = v_produto_id;
    if not found then
      raise exception 'Um produto dessa encomenda não existe mais';
    end if;

    -- sob demanda não tem estoque: tudo é produzido. Senão baixa só o que há.
    if v_sob_demanda then
      v_baixa := 0;
    else
      v_baixa := least(v_qtd, greatest(v_estoque, 0));
    end if;

    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario, qtd_produzir)
    values (v_venda_id, v_produto_id, v_qtd, (v_item ->> 'valor_unitario')::numeric, v_qtd - v_baixa);

    if v_baixa > 0 then
      update produtos set estoque_atual = estoque_atual - v_baixa where id = v_produto_id;

      insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
      values (v_produto_id, 'saida', v_baixa, 'Venda', v_venda_id);
    end if;
  end loop;

  update encomendas set venda_id = v_venda_id, venda_numero = v_numero where id = v_enc.id;

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
declare
  v_subtotal_itens numeric;
  v_desconto numeric;
  v_extras numeric;
begin
  select coalesce(sum(vi.preco_unitario * vi.quantidade), 0)
  into v_subtotal_itens
  from venda_itens vi
  where vi.venda_id = p_venda_id;

  select v.desconto,
         coalesce((
           select sum((e.value ->> 'quantidade')::numeric * (e.value ->> 'valor_unitario')::numeric)
           from jsonb_array_elements(v.itens_personalizados) e
         ), 0)
  into v_desconto, v_extras
  from vendas v where v.id = p_venda_id;

  update vendas
  set data_entrega = p_data_entrega,
      forma_pagamento = p_forma_pagamento,
      observacao = p_observacao,
      tipo_frete = coalesce(p_tipo_frete, 'retirada'),
      distancia_km_ida = p_distancia_km_ida,
      custo_entrega = p_custo_entrega,
      pago = coalesce(p_pago, true),
      endereco_entrega = p_endereco_entrega,
      valor_total = greatest(v_subtotal_itens + v_extras - coalesce(v_desconto, 0), 0) + coalesce(p_custo_entrega, 0)
  where id = p_venda_id;
end;
$$;

-- Troca os itens do catálogo de uma venda confirmada e ajusta o estoque.
-- Venda normal: exige estoque (erro se faltar). Venda vinda de encomenda:
-- o que não couber no estoque vira "a produzir" em vez de dar erro.
create or replace function atualizar_itens_venda(
  p_venda_id uuid,
  p_itens jsonb,
  p_desconto numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_custo_entrega numeric;
  v_encomenda_id uuid;
  v_extras numeric;
  v_tem_extras boolean;
  v_novo_subtotal numeric;
  v_diff record;
  v_item jsonb;
  v_pid text;
  v_antiga_baixa numeric;
  v_nova_baixa numeric;
  v_delta numeric;
  v_producao jsonb := '{}'::jsonb;
  v_restante numeric;
  v_linha_qtd numeric;
  v_linha_produzir numeric;
begin
  select v.status, v.custo_entrega, v.encomenda_id,
         coalesce((
           select sum((e.value ->> 'quantidade')::numeric * (e.value ->> 'valor_unitario')::numeric)
           from jsonb_array_elements(v.itens_personalizados) e
         ), 0),
         jsonb_array_length(v.itens_personalizados) > 0
  into v_status, v_custo_entrega, v_encomenda_id, v_extras, v_tem_extras
  from vendas v where v.id = p_venda_id;

  if v_status is null then
    raise exception 'Pedido não encontrado';
  end if;
  if v_status <> 'confirmada' then
    raise exception 'Esse pedido não pode ter os itens editados por aqui';
  end if;

  p_itens := coalesce(p_itens, '[]'::jsonb);
  if jsonb_array_length(p_itens) = 0 and not v_tem_extras then
    raise exception 'O pedido precisa ter pelo menos um produto';
  end if;

  for v_diff in
    select
      coalesce(novo.produto_id, antigo.produto_id) as produto_id,
      coalesce(novo.qtd, 0) as novo_qtd,
      coalesce(antigo.qtd, 0) as antigo_qtd,
      coalesce(antigo.produzir, 0) as antigo_produzir,
      p.nome as produto_nome,
      p.estoque_atual as estoque_atual,
      p.sob_demanda as sob_demanda
    from (
      select produto_id, sum(quantidade) as qtd, sum(qtd_produzir) as produzir
      from venda_itens where venda_id = p_venda_id
      group by produto_id
    ) antigo
    full outer join (
      select (elem ->> 'produto_id')::uuid as produto_id, sum((elem ->> 'quantidade')::numeric) as qtd
      from jsonb_array_elements(p_itens) elem
      group by (elem ->> 'produto_id')::uuid
    ) novo on novo.produto_id = antigo.produto_id
    join produtos p on p.id = coalesce(novo.produto_id, antigo.produto_id)
  loop
    if v_diff.sob_demanda then
      v_producao := v_producao || jsonb_build_object(
        v_diff.produto_id::text,
        case when v_encomenda_id is not null then v_diff.novo_qtd else 0 end
      );
      continue;
    end if;

    v_antiga_baixa := v_diff.antigo_qtd - v_diff.antigo_produzir;

    if v_encomenda_id is not null then
      v_nova_baixa := least(v_diff.novo_qtd, greatest(v_diff.estoque_atual + v_antiga_baixa, 0));
    else
      v_nova_baixa := v_diff.novo_qtd;
    end if;

    v_delta := v_nova_baixa - v_antiga_baixa;

    if v_delta > 0 and v_diff.estoque_atual < v_delta then
      raise exception 'Estoque insuficiente de "%": só há % em estoque.',
        v_diff.produto_nome, v_diff.estoque_atual;
    end if;

    if v_delta <> 0 then
      update produtos
      set estoque_atual = estoque_atual - v_delta
      where id = v_diff.produto_id;

      insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
      values (
        v_diff.produto_id,
        case when v_delta > 0 then 'saida' else 'entrada' end,
        abs(v_delta),
        'Ajuste de pedido',
        p_venda_id
      );
    end if;

    v_producao := v_producao || jsonb_build_object(v_diff.produto_id::text, v_diff.novo_qtd - v_nova_baixa);
  end loop;

  delete from venda_itens where venda_id = p_venda_id;

  -- a parte "a produzir" de cada produto é repartida entre as linhas dele
  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_pid := v_item ->> 'produto_id';
    v_linha_qtd := (v_item ->> 'quantidade')::numeric;
    v_restante := coalesce((v_producao ->> v_pid)::numeric, 0);
    v_linha_produzir := least(v_linha_qtd, v_restante);
    v_producao := v_producao || jsonb_build_object(v_pid, v_restante - v_linha_produzir);

    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario, qtd_produzir)
    values (p_venda_id, v_pid::uuid, v_linha_qtd, (v_item ->> 'preco_unitario')::numeric, v_linha_produzir);
  end loop;

  select coalesce(sum(preco_unitario * quantidade), 0) into v_novo_subtotal
  from venda_itens where venda_id = p_venda_id;

  update vendas
  set desconto = coalesce(p_desconto, 0),
      valor_total = greatest(v_novo_subtotal + v_extras - coalesce(p_desconto, 0), 0) + coalesce(v_custo_entrega, 0)
  where id = p_venda_id;
end;
$$;

-- Cancelar devolve ao estoque só o que foi baixado (o "a produzir" nunca saiu).
create or replace function cancelar_venda(p_venda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_numero integer;
begin
  select numero_pedido into v_numero from vendas where id = p_venda_id;
  if v_numero is null then
    raise exception 'Pedido não encontrado';
  end if;

  for v_item in
    select vi.produto_id, vi.quantidade - vi.qtd_produzir as baixado
    from venda_itens vi
    join produtos p on p.id = vi.produto_id
    where vi.venda_id = p_venda_id and not p.sob_demanda and vi.quantidade - vi.qtd_produzir > 0
  loop
    update produtos
    set estoque_atual = estoque_atual + v_item.baixado
    where id = v_item.produto_id;

    insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo)
    values (v_item.produto_id, 'entrada', v_item.baixado, 'Cancelamento do pedido #' || v_numero);
  end loop;

  delete from vendas where id = p_venda_id;
end;
$$;

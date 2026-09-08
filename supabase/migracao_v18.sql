-- Pedido pela loja pública passa a virar venda de verdade na hora (desconta
-- estoque), tentando casar automaticamente com um cliente já cadastrado
-- pelo telefone. Se não achar, o pedido fica marcado para cadastro manual.
-- Também adiciona uma forma de cancelar uma venda (devolve o estoque).

alter table vendas add column if not exists pedido_online boolean not null default false;
alter table vendas add column if not exists telefone_pedido text;

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
  p_endereco_entrega text default null,
  p_sem_valor boolean default false,
  p_ifood boolean default false,
  p_titulo text default null,
  p_pedido_online boolean default false,
  p_telefone_pedido text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venda_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_estoque_insuficiente record;
begin
  -- pedidos do iFood e da loja online não têm cliente obrigatoriamente
  -- cadastrado de antemão: usam só um nome (titulo) até alguém vincular
  -- um cadastro depois
  if not coalesce(p_ifood, false) and not coalesce(p_pedido_online, false) and p_cliente_id is null then
    raise exception 'Toda venda precisa estar vinculada a um cliente';
  end if;

  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda precisa ter pelo menos um produto';
  end if;

  -- valida estoque de produto final ANTES de gravar qualquer coisa
  -- (produtos "sob demanda" não têm estoque controlado, então ficam de fora)
  select p.nome, p.estoque_atual, pedido.qtd
  into v_estoque_insuficiente
  from (
    select (elem ->> 'produto_id')::uuid as produto_id, sum((elem ->> 'quantidade')::numeric) as qtd
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
    endereco_entrega, sem_valor, ifood, titulo, pedido_online, telefone_pedido
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
    p_endereco_entrega,
    coalesce(p_sem_valor, false),
    coalesce(p_ifood, false),
    p_titulo,
    coalesce(p_pedido_online, false),
    p_telefone_pedido
  )
  returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_produto_id := (v_item ->> 'produto_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::numeric;

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

-- Acha um cliente cadastrado pelo telefone (compara só os dígitos, ignora
-- formatação). Usado pela loja pública para já vincular o pedido a um
-- cadastro existente sem expor a lista inteira de clientes.
create or replace function buscar_cliente_por_telefone(p_telefone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from clientes
  where regexp_replace(p_telefone, '\D', '', 'g') <> ''
    and regexp_replace(telefone, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g')
  order by created_at asc
  limit 1;
$$;

-- Desfaz uma venda: devolve as quantidades ao estoque (produtos "sob
-- demanda" ficam de fora, igual no registro) e apaga o pedido. Usado como
-- rede de segurança para pedidos que vieram errados da loja online (ex:
-- clique duplo) ou qualquer engano manual.
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
    select vi.produto_id, vi.quantidade
    from venda_itens vi
    join produtos p on p.id = vi.produto_id
    where vi.venda_id = p_venda_id and not p.sob_demanda
  loop
    update produtos
    set estoque_atual = estoque_atual + v_item.quantidade
    where id = v_item.produto_id;

    insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo)
    values (v_item.produto_id, 'entrada', v_item.quantidade, 'Cancelamento do pedido #' || v_numero);
  end loop;

  delete from vendas where id = p_venda_id;
end;
$$;

grant execute on function registrar_venda(uuid, jsonb, numeric, numeric, text, date, date, text, text, text, numeric, numeric, boolean, text, boolean, boolean, text, boolean, text) to anon, authenticated;
grant execute on function buscar_cliente_por_telefone(text) to anon, authenticated;
grant execute on function cancelar_venda(uuid) to anon, authenticated;

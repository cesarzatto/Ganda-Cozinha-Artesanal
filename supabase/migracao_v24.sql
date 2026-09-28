-- Permite editar os itens (produtos/quantidades) de um pedido já
-- confirmado — antes só dava para mudar entrega/pagamento. Ajusta o
-- estoque pela diferença entre a quantidade antiga e a nova de cada
-- produto (para mais, tira do estoque; para menos, devolve).

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
  v_novo_subtotal numeric;
  v_diff record;
begin
  select status, custo_entrega into v_status, v_custo_entrega
  from vendas where id = p_venda_id;

  if v_status is null then
    raise exception 'Pedido não encontrado';
  end if;
  if v_status <> 'confirmada' then
    raise exception 'Esse pedido não pode ter os itens editados por aqui';
  end if;

  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido precisa ter pelo menos um produto';
  end if;

  for v_diff in
    select
      coalesce(novo.produto_id, antigo.produto_id) as produto_id,
      coalesce(novo.qtd, 0) - coalesce(antigo.qtd, 0) as delta,
      p.nome as produto_nome,
      p.estoque_atual as estoque_atual,
      p.sob_demanda as sob_demanda
    from (
      select produto_id, sum(quantidade) as qtd
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
    continue when v_diff.delta = 0 or v_diff.sob_demanda;

    if v_diff.delta > 0 and v_diff.estoque_atual < v_diff.delta then
      raise exception 'Estoque insuficiente de "%": só há % em estoque.',
        v_diff.produto_nome, v_diff.estoque_atual;
    end if;

    update produtos
    set estoque_atual = estoque_atual - v_diff.delta
    where id = v_diff.produto_id;

    insert into movimentacoes_produtos (produto_id, tipo, quantidade, motivo, venda_id)
    values (
      v_diff.produto_id,
      case when v_diff.delta > 0 then 'saida' else 'entrada' end,
      abs(v_diff.delta),
      'Ajuste de pedido',
      p_venda_id
    );
  end loop;

  delete from venda_itens where venda_id = p_venda_id;

  insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario)
  select
    p_venda_id,
    (elem ->> 'produto_id')::uuid,
    (elem ->> 'quantidade')::numeric,
    (elem ->> 'preco_unitario')::numeric
  from jsonb_array_elements(p_itens) elem;

  select coalesce(sum(preco_unitario * quantidade), 0) into v_novo_subtotal
  from venda_itens where venda_id = p_venda_id;

  update vendas
  set desconto = coalesce(p_desconto, 0),
      valor_total = greatest(v_novo_subtotal - coalesce(p_desconto, 0), 0) + coalesce(v_custo_entrega, 0)
  where id = p_venda_id;
end;
$$;

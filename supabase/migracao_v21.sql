-- Corrige o total da venda não refletir o frete quando ele é adicionado/
-- editado DEPOIS que a venda já foi registrada (tela "Entrega e
-- pagamento"). Antes, só custo_entrega era salvo; agora valor_total é
-- recalculado (itens - desconto + frete) toda vez que essa tela salva.

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
begin
  select coalesce(sum(vi.preco_unitario * vi.quantidade), 0)
  into v_subtotal_itens
  from venda_itens vi
  where vi.venda_id = p_venda_id;

  select desconto into v_desconto from vendas where id = p_venda_id;

  update vendas
  set data_entrega = p_data_entrega,
      forma_pagamento = p_forma_pagamento,
      observacao = p_observacao,
      tipo_frete = coalesce(p_tipo_frete, 'retirada'),
      distancia_km_ida = p_distancia_km_ida,
      custo_entrega = p_custo_entrega,
      pago = coalesce(p_pago, true),
      endereco_entrega = p_endereco_entrega,
      valor_total = greatest(v_subtotal_itens - coalesce(v_desconto, 0), 0) + coalesce(p_custo_entrega, 0)
  where id = p_venda_id;
end;
$$;

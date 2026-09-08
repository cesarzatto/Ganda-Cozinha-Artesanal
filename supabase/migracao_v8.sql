-- Migração v7 → v8:
--  Financeiro passa a contar como saída de dinheiro:
--   1) Novas entradas de estoque de insumo (já existia)
--   2) Novos registros de insumo (cadastro com "quanto pagou")
--   3) Novos registros de embalagem (cadastro com "quanto pagou")
--   4) Novas entradas de estoque de embalagem (não entrava no Financeiro)
--  Para isso, as movimentações passam a guardar o valor pago (valor_total)
--  em vez de só recalcular via custo_unitario atual do insumo/embalagem
--  (que muda se você editar o custo depois).
-- Não apaga nenhum dado. Rode este arquivo no SQL Editor do Supabase.

alter table movimentacoes_insumos add column if not exists valor_total numeric(10, 2);
alter table movimentacoes_embalagens add column if not exists valor_total numeric(10, 2);

create or replace function registrar_movimentacao_insumo(
  p_insumo_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_motivo text,
  p_valor_total numeric default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov_id uuid;
  v_delta numeric;
begin
  if p_tipo not in ('entrada', 'saida') then
    raise exception 'Tipo de movimentação inválido: %', p_tipo;
  end if;

  v_delta := case when p_tipo = 'entrada' then p_quantidade else -p_quantidade end;

  update insumos
  set quantidade_estoque = quantidade_estoque + v_delta
  where id = p_insumo_id;

  insert into movimentacoes_insumos (insumo_id, tipo, quantidade, motivo, valor_total)
  values (p_insumo_id, p_tipo, p_quantidade, p_motivo, p_valor_total)
  returning id into v_mov_id;

  return v_mov_id;
end;
$$;

create or replace function registrar_movimentacao_embalagem(
  p_embalagem_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_motivo text,
  p_valor_total numeric default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov_id uuid;
  v_delta numeric;
begin
  if p_tipo not in ('entrada', 'saida') then
    raise exception 'Tipo de movimentação inválido: %', p_tipo;
  end if;

  v_delta := case when p_tipo = 'entrada' then p_quantidade else -p_quantidade end;

  update embalagens
  set quantidade_estoque = quantidade_estoque + v_delta
  where id = p_embalagem_id;

  insert into movimentacoes_embalagens (embalagem_id, tipo, quantidade, motivo, valor_total)
  values (p_embalagem_id, p_tipo, p_quantidade, p_motivo, p_valor_total)
  returning id into v_mov_id;

  return v_mov_id;
end;
$$;

grant execute on function registrar_movimentacao_insumo(uuid, text, numeric, text, numeric) to anon, authenticated;
grant execute on function registrar_movimentacao_embalagem(uuid, text, numeric, text, numeric) to anon, authenticated;

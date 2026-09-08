-- Migração v14 — Ganda Cozinha Artesanal
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
--
-- O que muda:
-- Remove por completo a seção de Embalagens (não é mais usada — os produtos
-- não têm mais custo de embalagem calculado). Isso APAGA as tabelas
-- embalagens, movimentacoes_embalagens e produto_embalagens — só rode se
-- tiver certeza que não precisa mais desses dados.

-- ==========================================================
-- 1. Atualiza a view e as funções de custo para não depender mais de embalagens
-- ==========================================================

create or replace function custo_total_produto(p_produto_id uuid, p_profundidade integer default 0)
returns numeric
language plpgsql
stable
as $$
declare
  v_produto record;
  v_ingredientes numeric;
  v_indireto numeric;
begin
  if p_profundidade > 5 then
    raise exception 'Ficha técnica com referência circular (produtos usando um ao outro)';
  end if;

  select vendido_separadamente, rendimento_unidade_medida, rendimento_lote, custo_indireto_unidade
  into v_produto
  from produtos where id = p_produto_id;

  v_ingredientes := custo_ingredientes_produto(p_produto_id, p_profundidade);
  v_indireto := coalesce(v_produto.custo_indireto_unidade, 0);

  if coalesce(v_produto.rendimento_unidade_medida, 'unidade') <> 'unidade' then
    return (v_ingredientes + custo_mao_obra_bruta_produto(p_produto_id) + v_indireto)
      / greatest(coalesce(v_produto.rendimento_lote, 1), 0.001);
  end if;

  return v_ingredientes + custo_mao_obra_produto(p_produto_id) + v_indireto;
end;
$$;

-- Precisa dropar e recriar (não dá pra usar "create or replace") porque a
-- coluna custo_embalagens está saindo — o Postgres não deixa remover
-- colunas de uma view com "or replace", só adicionar no final.
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
  end as preco_sugerido
from produtos p
cross join configuracoes cfg;

-- ==========================================================
-- 2. Remove a função de custo de embalagem e a de movimentação
-- ==========================================================

drop function if exists custo_embalagens_produto(uuid);
drop function if exists registrar_movimentacao_embalagem(uuid, text, numeric, text, numeric);

-- ==========================================================
-- 3. Remove as tabelas (nessa ordem por causa das foreign keys)
-- ==========================================================

drop table if exists produto_embalagens cascade;
drop table if exists movimentacoes_embalagens cascade;
drop table if exists embalagens cascade;

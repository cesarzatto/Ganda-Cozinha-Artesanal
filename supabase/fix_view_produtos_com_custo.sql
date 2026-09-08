-- Correção pontual: a view produtos_com_custo usa "p.*", que é "congelado"
-- no momento em que a view é criada — colunas novas adicionadas à tabela
-- produtos depois (como rendimento_unidade_medida, da migração v9) não
-- aparecem sozinhas na view. Isso recria a view do zero pra ela pegar
-- a coluna nova. Não apaga nenhum dado.
--
-- Só rode este arquivo se você já rodou a migracao_v9.sql antes.

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

-- Migração v8 → v9:
--  Corrige o custo de sub-produtos (ex: Brigadeiro dentro de um Ovo de
--  Páscoa) quando a ficha técnica foi preenchida com as quantidades da
--  RECEITA INTEIRA (o lote), não de uma unidade só.
--
--  Antes: "Rende quantas unidades?" só dividia o custo de mão de obra.
--  O custo de ingredientes nunca era dividido — então usar 1x o
--  "Brigadeiro" dentro de outro produto significava "1x a receita
--  inteira", inflando o custo (ex: R$1.442,15 em vez de uma fração).
--
--  Agora: produtos marcados como "não vendido separadamente" (ou seja,
--  sub-produtos) ganham um campo "unidade de rendimento" (g/kg/ml/L/
--  unidade). Se ela for diferente de "unidade", o sistema entende que
--  a ficha técnica descreve a receita inteira e divide TUDO (ingredientes
--  + mão de obra + embalagem + indireto) pelo rendimento, dando o custo
--  por grama/ml/etc. Produtos normais (vendidos separadamente) continuam
--  funcionando exatamente como antes — nada muda pra eles.
--
-- Não apaga nenhum dado. Rode este arquivo no SQL Editor do Supabase.

alter table produtos add column if not exists rendimento_unidade_medida text not null default 'unidade';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_rendimento_unidade_medida_check'
  ) then
    alter table produtos add constraint produtos_rendimento_unidade_medida_check
      check (rendimento_unidade_medida in ('g', 'kg', 'ml', 'L', 'unidade'));
  end if;
end $$;

create or replace function custo_mao_obra_bruta_produto(p_produto_id uuid)
returns numeric
language sql
stable
as $$
  select (p.tempo_producao_minutos / 60.0) * cfg.valor_hora_trabalho
  from produtos p
  cross join configuracoes cfg
  where p.id = p_produto_id;
$$;

create or replace function custo_total_produto(p_produto_id uuid, p_profundidade integer default 0)
returns numeric
language plpgsql
stable
as $$
declare
  v_produto record;
  v_ingredientes numeric;
  v_embalagens numeric;
  v_indireto numeric;
begin
  if p_profundidade > 5 then
    raise exception 'Ficha técnica com referência circular (produtos usando um ao outro)';
  end if;

  select vendido_separadamente, rendimento_unidade_medida, rendimento_lote, custo_indireto_unidade
  into v_produto
  from produtos where id = p_produto_id;

  v_ingredientes := custo_ingredientes_produto(p_produto_id, p_profundidade);
  v_embalagens := custo_embalagens_produto(p_produto_id);
  v_indireto := coalesce(v_produto.custo_indireto_unidade, 0);

  if not v_produto.vendido_separadamente and coalesce(v_produto.rendimento_unidade_medida, 'unidade') <> 'unidade' then
    -- sub-produto medido (g/kg/ml/L): a ficha técnica descreve a receita
    -- inteira, então soma tudo (com a mão de obra crua, sem dividir por
    -- rendimento_lote como no caso normal) e divide uma vez só pelo rendimento
    return (v_ingredientes + v_embalagens + custo_mao_obra_bruta_produto(p_produto_id) + v_indireto)
      / greatest(coalesce(v_produto.rendimento_lote, 1), 0.001);
  end if;

  -- comportamento normal, sem nenhuma mudança
  return v_ingredientes + v_embalagens + custo_mao_obra_produto(p_produto_id) + v_indireto;
end;
$$;

-- A view produtos_com_custo usa "p.*", e isso é "congelado" no momento em
-- que a view é criada — colunas novas adicionadas à tabela produtos depois
-- (como a rendimento_unidade_medida acima) não aparecem sozinhas na view.
-- Precisa recriar a view pra ela pegar a coluna nova (drop + create, não
-- "or replace": adicionar uma coluna no meio do p.* desloca a posição das
-- colunas calculadas que vêm depois, e o Postgres não deixa o "or replace"
-- trocar nome/posição de coluna de view — mesmo problema que já apareceu
-- nas migrações v6 e v7).
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

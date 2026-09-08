-- Migração v5 → v6: seção Embalagem (estoque próprio, como Insumos) +
-- associação de embalagens por produto, que passa a entrar no custo
-- total e no preço sugerido. Não apaga nenhum dado.
-- Rode este arquivo no SQL Editor do Supabase.

-- 1) Tabelas de embalagens (mesma estrutura de insumos)
create table if not exists embalagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade_medida text not null,
  custo_unitario numeric(10, 4) not null default 0,
  quantidade_estoque numeric(10, 3) not null default 0,
  estoque_minimo numeric(10, 3) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists movimentacoes_embalagens (
  id uuid primary key default gen_random_uuid(),
  embalagem_id uuid not null references embalagens (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade numeric(10, 3) not null check (quantidade > 0),
  motivo text,
  created_at timestamptz not null default now()
);

create index if not exists idx_movimentacoes_embalagens_embalagem on movimentacoes_embalagens (embalagem_id);

create table if not exists produto_embalagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos (id) on delete cascade,
  embalagem_id uuid not null references embalagens (id) on delete cascade,
  quantidade numeric(10, 3) not null,
  created_at timestamptz not null default now(),
  unique (produto_id, embalagem_id)
);

create index if not exists idx_produto_embalagens_produto on produto_embalagens (produto_id);

-- 2) Permissões e RLS (mesmo padrão aberto do resto do sistema)
grant all on embalagens to anon, authenticated;
grant all on movimentacoes_embalagens to anon, authenticated;
grant all on produto_embalagens to anon, authenticated;

alter table embalagens enable row level security;
alter table movimentacoes_embalagens enable row level security;
alter table produto_embalagens enable row level security;

drop policy if exists "acesso total embalagens" on embalagens;
create policy "acesso total embalagens" on embalagens for all using (true) with check (true);

drop policy if exists "acesso total movimentacoes_embalagens" on movimentacoes_embalagens;
create policy "acesso total movimentacoes_embalagens" on movimentacoes_embalagens for all using (true) with check (true);

drop policy if exists "acesso total produto_embalagens" on produto_embalagens;
create policy "acesso total produto_embalagens" on produto_embalagens for all using (true) with check (true);

-- 3) Função de movimentação de estoque de embalagem (igual a insumos)
create or replace function registrar_movimentacao_embalagem(
  p_embalagem_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_motivo text
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

  insert into movimentacoes_embalagens (embalagem_id, tipo, quantidade, motivo)
  values (p_embalagem_id, p_tipo, p_quantidade, p_motivo)
  returning id into v_mov_id;

  return v_mov_id;
end;
$$;

grant execute on function registrar_movimentacao_embalagem(uuid, text, numeric, text) to anon, authenticated;

-- 4) View produtos_com_custo passa a somar também o custo de embalagens
create or replace view produtos_com_custo as
select
  p.*,
  coalesce(ing.custo_ingredientes, 0)::numeric(10, 2) as custo_ingredientes,
  (
    (p.tempo_producao_minutos / 60.0) * cfg.valor_hora_trabalho / greatest(p.rendimento_lote, 1)
  )::numeric(10, 2) as custo_mao_obra,
  (
    coalesce(ing.custo_ingredientes, 0)
    + coalesce(emb.custo_embalagens, 0)
    + (p.tempo_producao_minutos / 60.0) * cfg.valor_hora_trabalho / greatest(p.rendimento_lote, 1)
    + p.custo_indireto_unidade
  )::numeric(10, 2) as custo_total,
  coalesce(p.margem_desejada, cfg.margem_padrao) as margem_usada,
  case
    when coalesce(p.margem_desejada, cfg.margem_padrao) >= 100 then null
    else (
      (
        coalesce(ing.custo_ingredientes, 0)
        + coalesce(emb.custo_embalagens, 0)
        + (p.tempo_producao_minutos / 60.0) * cfg.valor_hora_trabalho / greatest(p.rendimento_lote, 1)
        + p.custo_indireto_unidade
      ) / (1 - coalesce(p.margem_desejada, cfg.margem_padrao) / 100.0)
    )::numeric(10, 2)
  end as preco_sugerido,
  coalesce(emb.custo_embalagens, 0)::numeric(10, 2) as custo_embalagens
from produtos p
left join (
  select ft.produto_id, sum(ft.quantidade * i.custo_unitario) as custo_ingredientes
  from ficha_tecnica ft
  join insumos i on i.id = ft.insumo_id
  group by ft.produto_id
) ing on ing.produto_id = p.id
left join (
  select pe.produto_id, sum(pe.quantidade * e.custo_unitario) as custo_embalagens
  from produto_embalagens pe
  join embalagens e on e.id = pe.embalagem_id
  group by pe.produto_id
) emb on emb.produto_id = p.id
cross join configuracoes cfg;

-- Renumera os pedidos (vendas/orçamentos) em ordem cronológica, começando
-- do 1, e reinicia o contador pra que o próximo pedido continue certinho.
-- Use isso se algum dia os números de pedido "pularem" (ex: depois de
-- apagar um pedido de teste). Não apaga nem altera nenhum outro dado.

with ordenado as (
  select id, row_number() over (order by created_at) as novo_numero
  from vendas
)
update vendas v
set numero_pedido = o.novo_numero
from ordenado o
where v.id = o.id;

select setval('vendas_numero_pedido_seq', coalesce((select max(numero_pedido) from vendas), 0) + 1, false);

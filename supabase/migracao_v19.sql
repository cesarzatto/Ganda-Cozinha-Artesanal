-- Marca se a notinha (recibo térmico) de cada pedido já foi impressa.
-- Vendas que já existiam antes dessa migração são marcadas como "já
-- impressas" pra não gerar aviso retroativo sobre pedidos antigos — só
-- pedidos novos, feitos depois disso, começam como pendentes de verdade.
-- Rode esse arquivo só uma vez: rodar de novo reseta o "já impressa" de
-- qualquer pedido que você tenha marcado como pendente manualmente.

alter table vendas add column if not exists notinha_impressa boolean not null default false;
update vendas set notinha_impressa = true;

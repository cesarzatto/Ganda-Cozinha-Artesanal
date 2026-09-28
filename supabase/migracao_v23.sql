-- CORREÇÃO URGENTE: registrar venda estava quebrado no sistema interno.
--
-- Ao longo de várias migrações anteriores (iFood, loja online, endereço),
-- fui adicionando parâmetros novos em registrar_venda() usando "create or
-- replace function". Isso só substitui de verdade quando os tipos dos
-- parâmetros são EXATAMENTE iguais aos já existentes — como cada vez
-- adicionei parâmetro(s) novo(s) no final, o Postgres não reconheceu como
-- "a mesma função" e foi empilhando 3 versões diferentes lado a lado.
-- Resultado: qualquer chamada que não especifique TODOS os parâmetros dá
-- erro de ambiguidade ("Could not choose the best candidate function"),
-- que é exatamente o que travava o registro de venda no app interno.
--
-- Este script apaga as duas versões antigas/obsoletas, deixando só a
-- versão atual (20 parâmetros, com pedido_online/telefone_pedido/
-- salvar_endereco_principal) — que já é a que o app usa.

drop function if exists registrar_venda(
  uuid, jsonb, numeric, numeric, text, date, date, text, text, text,
  numeric, numeric, boolean, text, boolean, boolean, text
);

drop function if exists registrar_venda(
  uuid, jsonb, numeric, numeric, text, date, date, text, text, text,
  numeric, numeric, boolean, text, boolean, boolean, text, boolean, text
);

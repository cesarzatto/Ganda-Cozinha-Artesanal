-- Adiciona campo para registrar quem indicou o cliente, quando a origem for "Indicação".
alter table clientes add column if not exists indicado_por text;

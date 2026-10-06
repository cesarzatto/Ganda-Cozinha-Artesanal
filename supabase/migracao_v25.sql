-- Guarda o endereço de entrega dos pedidos da loja online separado em
-- campos (CEP, rua, número, complemento), pra já cair certinho nos campos
-- certos quando for cadastrar o cliente — antes tudo ia numa linha só.
-- O texto completo continua em endereco_entrega (usado na notinha etc.).

alter table vendas
  add column if not exists endereco_cep text,
  add column if not exists endereco_rua text,
  add column if not exists endereco_numero text,
  add column if not exists endereco_complemento text;

-- Corrige o alerta do linter do Supabase "Security Definer View" na view
-- produtos_com_custo: faz ela rodar com a permissão de quem consulta
-- (padrão recomendado), em vez de com a permissão de quem criou a view.
-- Não muda nada visível no app: produtos e configuracoes já são
-- totalmente públicas (RLS aberta), então o resultado é idêntico.

alter view produtos_com_custo set (security_invoker = true);

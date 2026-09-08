# Como criar o Supabase da Ganda Cozinha Artesanal

Siga esse passo a passo uma única vez. Depois disso o sistema já fica pronto para usar.

## 1. Criar a conta e o projeto

1. Acesse **https://supabase.com** e clique em **Start your project**.
2. Entre com sua conta do Google (ou crie uma conta com e-mail).
3. Clique em **New project**.
4. Preencha:
   - **Name**: `ganda-cozinha-artesanal`
   - **Database Password**: crie uma senha forte e **guarde em local seguro** (não é a mesma coisa da chave que vamos usar no sistema, mas é importante não perder).
   - **Region**: escolha a opção mais próxima do Brasil (ex: `South America (São Paulo)`).
5. Clique em **Create new project** e aguarde alguns minutos até o projeto ficar pronto.

## 2. Rodar o schema (criar as tabelas)

> Se você já tinha criado esse projeto Supabase e rodado uma versão anterior deste arquivo, abra o `schema.sql` e descomente o bloco **RESET** no topo antes de rodar — a estrutura mudou (clientes, estoque de produto separado de insumos, fórmula de preço) e isso recria as tabelas do zero.

1. No menu lateral do projeto, clique em **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo [`schema.sql`](./schema.sql) deste projeto, copie **todo o conteúdo** e cole no editor.
4. Clique em **Run** (ou `Ctrl+Enter`).
5. Deve aparecer "Success. No rows returned" — pronto, as tabelas foram criadas.

## 3. Pegar a URL e a chave do projeto

1. No menu lateral, clique no ícone de engrenagem **Project Settings**.
2. Clique em **Data API** (ou **API**, dependendo da versão).
3. Copie:
   - **Project URL** → algo como `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key** (na seção "Project API keys") → uma chave longa

## 4. Colar no sistema

Na pasta `ganda-cozinha-artesanal`, crie um arquivo chamado `.env` (copie o `.env.example` e renomeie) com:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=cole-a-chave-anon-aqui
```

Salve o arquivo e reinicie o `npm run dev` se ele já estiver rodando. O sistema já deve conseguir salvar e ler os dados.

## Sobre segurança

Este sistema não tem tela de login (foi uma escolha para manter o uso simples no dia a dia). Isso significa que qualquer pessoa que descobrir o link do site consegue ver e alterar os dados do negócio — não é diferente, por exemplo, de uma planilha compartilhada sem senha. Não compartilhe o link publicamente, apenas com quem for usar o sistema.

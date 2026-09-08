# Ganda Cozinha Artesanal — Sistema de Gestão

Sistema simples para gerenciar produtos (com ficha técnica e preço calculado automaticamente), estoque de produtos prontos, estoque de insumos, clientes e vendas da Ganda Cozinha Artesanal. Pensado para uso principalmente pelo celular.

## Como rodar

```bash
npm install
npm run dev
```

Antes de usar de verdade, siga o passo a passo em [`supabase/README.md`](./supabase/README.md) para criar o banco de dados gratuito no Supabase e configurar o arquivo `.env`.

## Stack

- React + Vite + React Router
- Tailwind CSS v4 (tokens de cor/tipografia da marca em `src/index.css`)
- Supabase (banco de dados + storage de fotos), sem autenticação — uso familiar

## Estrutura

```
src/
  lib/            # cliente Supabase, formatação de moeda/data, formas de contato
  components/     # UI reutilizável (Layout, SideMenuProvider, Card, Button, ClienteForm, ...)
  hooks/          # acesso a dados (produtos, insumos, clientes, vendas, configurações, dashboard)
  pages/          # telas, organizadas por módulo (produtos, estoque, insumos, clientes, vendas, config, dashboard)
supabase/
  schema.sql      # tabelas, view, funções e políticas de acesso
  README.md       # passo a passo para criar o projeto Supabase
```

## Aviso de segurança

O sistema não tem login — qualquer pessoa com o link acessa os dados. É uma escolha consciente para manter o uso simples (uso familiar, dispositivos de confiança). Veja mais detalhes em [`supabase/README.md`](./supabase/README.md).

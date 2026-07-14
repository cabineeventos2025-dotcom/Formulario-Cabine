# Cabine Só Alegria

Sistema de formulários e gestão de eventos para a Cabine Só Alegria.

## Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL)
- **Backup**: Google Sheets (Apps Script)
- **Deploy**: Netlify

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

> No Netlify, configure essas variáveis em **Site Settings → Environment Variables**.

## Rodar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Deploy

O deploy é automático via Netlify. Todo push na branch `main` dispara um novo deploy.

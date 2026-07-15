-- ============================================================
-- CABINE SO ALEGRIA - Migration 007: Colunas financeiras em formularios_eventos
-- PROBLEMA: controle_recebimentos tem RLS que bloqueia inserts.
-- SOLUCAO: guardar valores financeiros em formularios_eventos
--          (que tem INSERT aberto para authenticated) e corrigir RLS.
--
-- Execute no SQL Editor do Supabase (Dashboard -> SQL Editor -> Run)
-- ============================================================

-- 1. Corrigir RLS de controle_recebimentos (remove bloqueio)
drop policy if exists "admin_tudo_recebimentos" on controle_recebimentos;
create policy "authenticated_tudo_recebimentos"
  on controle_recebimentos
  for all
  to authenticated
  using (true)
  with check (true);

-- 2. Adicionar colunas financeiras em formularios_eventos
alter table formularios_eventos
  add column if not exists valor_pago_importado    numeric not null default 0,
  add column if not exists valor_a_pagar_importado numeric not null default 0;

-- 3. Garantir politica de delete em formularios_eventos para authenticated
drop policy if exists "admin_deletar_formularios" on formularios_eventos;
create policy "admin_deletar_formularios"
  on formularios_eventos
  for delete
  to authenticated
  using (true);

-- 4. Index para consultas financeiras rapidas
create index if not exists idx_form_valor_pago    on formularios_eventos (valor_pago_importado);
create index if not exists idx_form_valor_a_pagar on formularios_eventos (valor_a_pagar_importado);

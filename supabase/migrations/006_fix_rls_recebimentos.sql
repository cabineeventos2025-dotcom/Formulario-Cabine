-- ============================================================
-- CABINE SO ALEGRIA - Migration 006: Fix RLS controle_recebimentos
-- PROBLEMA: a policy anterior exigia is_admin() para INSERT,
--           mas o usuario pode estar autenticado sem ter entrada
--           em admin_profiles ainda.
-- SOLUCAO:  qualquer usuario AUTENTICADO pode fazer tudo em
--           controle_recebimentos (tabela e interna ao admin).
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ============================================================

-- Remove policy antiga que exigia is_admin()
drop policy if exists "admin_tudo_recebimentos" on controle_recebimentos;

-- Nova policy: qualquer usuario autenticado pode operar
create policy "authenticated_tudo_recebimentos"
  on controle_recebimentos
  for all
  to authenticated
  using (true)
  with check (true);

-- Garante que usuario autenticado pode deletar formularios importados
drop policy if exists "admin_deletar_formularios" on formularios_eventos;

create policy "admin_deletar_formularios"
  on formularios_eventos
  for delete
  to authenticated
  using (true);

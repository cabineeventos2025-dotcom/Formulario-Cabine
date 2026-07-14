-- ============================================================
-- CABINE SO ALEGRIA - Migration 002: Row Level Security (RLS)
-- Execute APOS a migration 001
-- ============================================================

-- Ativar RLS em todas as tabelas
alter table formularios_eventos    enable row level security;
alter table pacotes                enable row level security;
alter table equipamentos           enable row level security;
alter table controle_recebimentos  enable row level security;
alter table admin_profiles         enable row level security;

-- ============================================================
-- FUNCAO AUXILIAR: verificar se o usuario e admin
-- ============================================================
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from admin_profiles
    where user_id = auth.uid()
      and is_admin = true
  );
$$;

-- ============================================================
-- POLICIES: formularios_eventos
-- ============================================================

-- Qualquer pessoa (inclusive anonima) pode inserir um formulario
create policy "permitir_insert_formulario"
  on formularios_eventos
  for insert
  to anon, authenticated
  with check (true);

-- Somente admins podem ler formularios
create policy "admin_ler_formularios"
  on formularios_eventos
  for select
  to authenticated
  using (is_admin());

-- Somente admins podem atualizar formularios (ex: marcar sincronizado)
create policy "admin_atualizar_formularios"
  on formularios_eventos
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- POLICIES: pacotes
-- ============================================================

-- Qualquer pessoa pode ler pacotes ativos (necessario para o formulario)
create policy "publico_ler_pacotes_ativos"
  on pacotes
  for select
  to anon, authenticated
  using (ativo = true);

-- Admins podem ler todos os pacotes (inclusive inativos)
create policy "admin_ler_todos_pacotes"
  on pacotes
  for select
  to authenticated
  using (is_admin());

-- Admins podem inserir pacotes
create policy "admin_inserir_pacotes"
  on pacotes
  for insert
  to authenticated
  with check (is_admin());

-- Admins podem atualizar pacotes
create policy "admin_atualizar_pacotes"
  on pacotes
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- POLICIES: equipamentos
-- ============================================================

create policy "publico_ler_equipamentos_ativos"
  on equipamentos
  for select
  to anon, authenticated
  using (ativo = true);

create policy "admin_ler_todos_equipamentos"
  on equipamentos
  for select
  to authenticated
  using (is_admin());

create policy "admin_inserir_equipamentos"
  on equipamentos
  for insert
  to authenticated
  with check (is_admin());

create policy "admin_atualizar_equipamentos"
  on equipamentos
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- POLICIES: controle_recebimentos
-- ============================================================

create policy "admin_tudo_recebimentos"
  on controle_recebimentos
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- POLICIES: admin_profiles
-- ============================================================

-- Usuarios autenticados podem ler o proprio perfil
create policy "ler_proprio_perfil"
  on admin_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

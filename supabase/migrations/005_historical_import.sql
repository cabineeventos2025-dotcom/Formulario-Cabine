-- ============================================================
-- CABINE SO ALEGRIA - Migration 005: Historical Import Support
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Adicionar colunas de controle de importacao em formularios_eventos
alter table formularios_eventos
  add column if not exists is_imported   boolean     not null default false,
  add column if not exists imported_at   timestamptz,
  add column if not exists source_row    integer;

-- Adicionar colunas de NF em controle_recebimentos
alter table controle_recebimentos
  add column if not exists nota_fiscal_emitida boolean not null default false,
  add column if not exists data_emissao_nf     date,
  add column if not exists numero_nf           text;

-- Index para filtrar rapido por is_imported
create index if not exists idx_form_is_imported on formularios_eventos (is_imported);

-- View materializada: resumo financeiro por NF
create or replace view vw_resumo_financeiro as
select
  coalesce(cr.nota_fiscal_emitida, false) as nota_fiscal_emitida,
  count(distinct fe.id)                   as total_eventos,
  coalesce(sum(cr.valor_pago), 0)         as total_pago,
  coalesce(sum(cr.valor_a_pagar), 0)      as total_a_pagar,
  coalesce(sum(cr.valor_total_contrato), 0) as total_contrato
from formularios_eventos fe
left join controle_recebimentos cr on cr.formulario_evento_id = fe.id
group by coalesce(cr.nota_fiscal_emitida, false);

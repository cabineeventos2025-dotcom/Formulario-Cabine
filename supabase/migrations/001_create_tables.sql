-- ============================================================
-- CABINE SO ALEGRIA - Migration 001: Criar Tabelas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Extensao para gerar UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- FUNCAO: atualizar updated_at automaticamente
-- ============================================================
create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABELA: pacotes
-- ============================================================
create table if not exists pacotes (
  id           uuid        primary key default gen_random_uuid(),
  nome         text        not null,
  descricao    text,
  imagem_url   text,
  tamanho_foto text,
  permite_pf   boolean     not null default true,
  permite_pj   boolean     not null default true,
  ativo        boolean     not null default true,
  ordem        integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_pacotes_updated_at
  before update on pacotes
  for each row execute procedure fn_set_updated_at();

-- ============================================================
-- TABELA: equipamentos
-- ============================================================
create table if not exists equipamentos (
  id         uuid        primary key default gen_random_uuid(),
  nome       text        not null,
  descricao  text,
  imagem_url text,
  ativo      boolean     not null default true,
  ordem      integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_equipamentos_updated_at
  before update on equipamentos
  for each row execute procedure fn_set_updated_at();

-- ============================================================
-- SEQUENCIA: numeracao do protocolo
-- ============================================================
create sequence if not exists seq_protocolo start with 1;

-- ============================================================
-- FUNCAO: gerar protocolo CSA-YYYY-NNNNNN
-- ============================================================
create or replace function fn_gerar_protocolo()
returns trigger
language plpgsql
as $$
begin
  if new.protocolo is null or new.protocolo = '' then
    new.protocolo := 'CSA-'
      || to_char(now(), 'YYYY')
      || '-'
      || lpad(nextval('seq_protocolo')::text, 6, '0');
  end if;
  return new;
end;
$$;

-- ============================================================
-- TABELA: formularios_eventos
-- ============================================================
create table if not exists formularios_eventos (
  id                        uuid        primary key default gen_random_uuid(),
  submission_id             uuid        not null,
  protocolo                 text,

  tipo_pessoa               text        not null check (tipo_pessoa in ('PF', 'PJ')),

  -- Pessoa Fisica
  nome_contratante          text,
  data_nascimento           date,
  cpf                       text,
  rg                        text,

  -- Pessoa Juridica
  nome_fantasia             text,
  razao_social              text,
  cnpj                      text,
  nome_responsavel          text,

  -- Endereco do contratante
  cep                       text,
  logradouro                text,
  numero                    text,
  complemento               text,
  bairro                    text,
  cidade                    text,
  estado                    text,

  -- Contatos
  telefone                  text,
  email                     text,
  contato_cerimonial        text,

  -- Dados do evento
  nome_evento               text,
  cep_evento                text,
  logradouro_evento         text,
  numero_evento             text,
  complemento_evento        text,
  bairro_evento             text,
  cidade_evento             text,
  estado_evento             text,
  referencia_evento         text,
  data_evento               date,
  horario_inicio_evento     time,
  horario_inicio_fotos      time,

  -- Pagamento
  forma_pagamento           text,
  forma_pagamento_outro     text,

  -- Horas contratadas
  quantidade_horas          text,
  quantidade_horas_outro    text,

  -- Pacote (snapshot para historico)
  pacote_id                 uuid,
  pacote_nome_snapshot      text,
  pacote_outro              text,

  -- Equipamento (snapshot)
  equipamento_id            uuid,
  equipamento_nome_snapshot text,

  -- Autorizacoes
  autoriza_publicacao_fotos boolean,
  solicita_nota_fiscal      boolean     not null default false,

  -- Observacoes
  comentarios               text,
  consentimento_dados       boolean     not null default false,

  -- Meta
  origem                    text,
  user_agent                text,
  data_inicio               timestamptz,
  data_envio                timestamptz,
  sincronizado_planilha     boolean     not null default false,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint uq_submission_id unique (submission_id),
  constraint uq_protocolo     unique (protocolo)
);

-- Trigger para gerar protocolo automaticamente
create trigger trg_protocolo
  before insert on formularios_eventos
  for each row execute procedure fn_gerar_protocolo();

-- Trigger para atualizar updated_at
create trigger trg_formularios_updated_at
  before update on formularios_eventos
  for each row execute procedure fn_set_updated_at();

-- Indices
create index if not exists idx_form_submission  on formularios_eventos (submission_id);
create index if not exists idx_form_protocolo   on formularios_eventos (protocolo);
create index if not exists idx_form_cpf         on formularios_eventos (cpf);
create index if not exists idx_form_cnpj        on formularios_eventos (cnpj);
create index if not exists idx_form_email       on formularios_eventos (email);
create index if not exists idx_form_data_evento on formularios_eventos (data_evento);
create index if not exists idx_form_created_at  on formularios_eventos (created_at);
create index if not exists idx_form_tipo_pessoa on formularios_eventos (tipo_pessoa);

-- ============================================================
-- TABELA: controle_recebimentos
-- ============================================================
create table if not exists controle_recebimentos (
  id                             uuid        primary key default gen_random_uuid(),
  formulario_evento_id           uuid        not null references formularios_eventos(id) on delete cascade,
  valor_total_contrato           numeric(12,2),
  valor_pago                     numeric(12,2) default 0,
  valor_a_pagar                  numeric(12,2) default 0,
  forma_pagamento_administrativa text,
  quantidade_parcelas            integer,
  parcelas_pagas                 integer     default 0,
  data_primeiro_vencimento       date,
  proximo_vencimento             date,
  observacoes_financeiras        text,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),

  constraint chk_valor_pago_positivo  check (valor_pago  >= 0),
  constraint chk_valor_total_positivo check (valor_total_contrato >= 0)
);

create trigger trg_recebimentos_updated_at
  before update on controle_recebimentos
  for each row execute procedure fn_set_updated_at();

create index if not exists idx_receb_formulario on controle_recebimentos (formulario_evento_id);

-- ============================================================
-- TABELA: admin_profiles
-- ============================================================
create table if not exists admin_profiles (
  user_id    uuid        primary key,
  is_admin   boolean     not null default false,
  created_at timestamptz not null default now()
);

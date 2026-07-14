-- ================================================================
-- MIGRATION: Módulo de Contratos
-- Cabine Só Alegria
-- ================================================================

-- 1. Tabela de configurações do locador (dados fixos da empresa)
CREATE TABLE IF NOT EXISTS config_empresa_contrato (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresarial        TEXT NOT NULL DEFAULT '45.072.735 LINCOLN CRISTIANO DELFINO',
  nome_fantasia           TEXT NOT NULL DEFAULT 'CABINE SÓ ALEGRIA',
  cnpj                    TEXT NOT NULL DEFAULT '45.072.735/0001-69',
  endereco                TEXT NOT NULL DEFAULT 'Alameda das palmeiras nº1022, bloco C apto 102, bairro Masterville, Sarzedo-MG',
  cidade_assinatura       TEXT NOT NULL DEFAULT 'Sarzedo',
  estado_assinatura       TEXT NOT NULL DEFAULT 'MG',
  foro                    TEXT NOT NULL DEFAULT 'Comarca de Belo Horizonte, Estado de Minas Gerais',
  chave_pix               TEXT NOT NULL DEFAULT '45.072.735/0001-69',
  tipo_chave_pix          TEXT NOT NULL DEFAULT 'CNPJ',
  nome_representante      TEXT NOT NULL DEFAULT 'LINCOLN CRISTIANO DELFINO',
  cpf_representante       TEXT,
  website                 TEXT DEFAULT 'www.cabinesoalegria.com.br',
  instagram               TEXT DEFAULT '@cabinesoalegria',
  assinatura_imagem_url   TEXT,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações iniciais
INSERT INTO config_empresa_contrato (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- 2. Tabela de modelos de contrato
CREATE TABLE IF NOT EXISTS modelos_contrato (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  equipamento_id        UUID REFERENCES equipamentos(id) ON DELETE SET NULL,
  tipo_pessoa           TEXT NOT NULL DEFAULT 'AMBOS' CHECK (tipo_pessoa IN ('PF','PJ','AMBOS')),
  conteudo_html         TEXT NOT NULL,  -- template HTML com marcadores {{CAMPO}}
  versao                INTEGER NOT NULL DEFAULT 1,
  ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
  modelo_padrao         BOOLEAN NOT NULL DEFAULT FALSE,
  campos_detectados     JSONB,  -- lista de marcadores encontrados no template
  data_inicio_vigencia  DATE,
  observacoes           TEXT,
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de cláusulas reutilizáveis
CREATE TABLE IF NOT EXISTS clausulas_contrato (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT 'geral',
  conteudo       TEXT NOT NULL,
  equipamento_id UUID REFERENCES equipamentos(id) ON DELETE SET NULL,
  tipo_pessoa    TEXT,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  versao         INTEGER NOT NULL DEFAULT 1,
  created_by     UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de opcionais de serviço
CREATE TABLE IF NOT EXISTS opcionais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  clausula_padrao TEXT,
  unidade         TEXT DEFAULT 'unidade',
  valor_padrao    NUMERIC(12,2),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  ordem           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir opcionais iniciais
INSERT INTO opcionais (nome, descricao, clausula_padrao, ordem) VALUES
  ('Ímã',
   'Ímãs fotográficos para aplicação nas fotografias',
   'Também estão incluídas neste contrato unidades de ímã para aplicação nas fotografias, conforme quantidade e condições definidas no resumo comercial.',
   1),
  ('Monóculos',
   'Monóculos fotográficos para os convidados',
   'Também estão incluídos monóculos fotográficos, na quantidade definida entre as partes, observadas as características apresentadas previamente ao LOCATÁRIO.',
   2),
  ('Scrapbook',
   'Scrapbook personalizado para o evento',
   'Também está incluída a disponibilização de scrapbook para o evento, nas condições, quantidade de páginas, materiais e forma de utilização previamente acordadas entre as partes.',
   3)
ON CONFLICT DO NOTHING;

-- 5. Tabela de contratos gerados
CREATE TABLE IF NOT EXISTS contratos_gerados (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_evento_id  UUID NOT NULL REFERENCES formularios_eventos(id) ON DELETE RESTRICT,
  modelo_contrato_id    UUID REFERENCES modelos_contrato(id) ON DELETE SET NULL,
  modelo_versao         INTEGER NOT NULL DEFAULT 1,
  numero_versao         INTEGER NOT NULL DEFAULT 1,
  nome_arquivo          TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'rascunho'
                        CHECK (status IN ('rascunho','previa','finalizado','substituido','cancelado')),
  dados_snapshot        JSONB NOT NULL DEFAULT '{}',  -- snapshot de todos os dados usados
  opcionais_snapshot    JSONB DEFAULT '[]',
  dados_extras          JSONB DEFAULT '{}',  -- campos complementados pelo admin
  gerado_por            UUID,
  gerado_em             TIMESTAMPTZ,
  finalizado_em         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de opcionais vinculados a um contrato
CREATE TABLE IF NOT EXISTS contrato_opcionais (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id             UUID NOT NULL REFERENCES contratos_gerados(id) ON DELETE CASCADE,
  opcional_id             UUID REFERENCES opcionais(id) ON DELETE SET NULL,
  nome_snapshot           TEXT NOT NULL,
  descricao_snapshot      TEXT,
  clausula_snapshot       TEXT,
  quantidade              NUMERIC DEFAULT 1,
  valor_unitario          NUMERIC(12,2),
  valor_total             NUMERIC(12,2),
  incluido_no_valor_total BOOLEAN DEFAULT TRUE,
  observacao              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de auditoria de contratos
CREATE TABLE IF NOT EXISTS contratos_auditoria (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id          UUID REFERENCES contratos_gerados(id) ON DELETE SET NULL,
  modelo_id            UUID,
  formulario_evento_id UUID,
  acao                 TEXT NOT NULL,
  descricao            TEXT,
  usuario_id           UUID,
  dados_anteriores     JSONB,
  dados_novos          JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- RLS (Row Level Security)
-- ================================================================
ALTER TABLE config_empresa_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos_contrato        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clausulas_contrato      ENABLE ROW LEVEL SECURITY;
ALTER TABLE opcionais               ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_gerados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_opcionais      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_auditoria     ENABLE ROW LEVEL SECURITY;

-- Políticas: somente usuários autenticados (admins)
CREATE POLICY "admin_config_empresa"    ON config_empresa_contrato  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_modelos"           ON modelos_contrato         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_clausulas"         ON clausulas_contrato       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_opcionais"         ON opcionais                FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_contratos_gerados" ON contratos_gerados        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_contrato_opcionais" ON contrato_opcionais      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_auditoria"         ON contratos_auditoria      FOR ALL USING (auth.role() = 'authenticated');

-- Pública para opcionais (formulário público pode precisar ler)
CREATE POLICY "public_read_opcionais" ON opcionais FOR SELECT USING (ativo = TRUE);

-- ================================================================
-- Triggers para updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_modelos_contrato_updated_at
  BEFORE UPDATE ON modelos_contrato
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contratos_gerados_updated_at
  BEFORE UPDATE ON contratos_gerados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_clausulas_contrato_updated_at
  BEFORE UPDATE ON clausulas_contrato
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_opcionais_updated_at
  BEFORE UPDATE ON opcionais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_config_empresa_updated_at
  BEFORE UPDATE ON config_empresa_contrato
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

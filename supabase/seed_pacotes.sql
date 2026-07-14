-- ================================================================
-- SEED: Pacotes e Modelos de Contrato — Cabine Só Alegria
-- Execute no Supabase SQL Editor (Settings → SQL Editor)
-- ================================================================

-- ─── 1. Atualizar nomes dos pacotes ─────────────────────────────
-- Atualiza os 3 pacotes existentes com nomes e tamanhos corretos.
-- Se não existirem, insere novos.

-- Verificar pacotes existentes:
-- SELECT id, nome, tamanho_foto, ordem FROM pacotes ORDER BY ordem;

-- Opção A: UPDATE nos pacotes pelo nome atual (ajuste conforme necessário)
UPDATE pacotes SET
  nome = 'Pacote 1',
  tamanho_foto = '10x15 cm',
  descricao = 'Tamanho 10x15 cm',
  ordem = 1
WHERE nome ILIKE '%pacote 1%' OR (ordem = 1 AND nome NOT ILIKE '%totem%');

UPDATE pacotes SET
  nome = 'Pacote 2',
  tamanho_foto = '5x15 cm',
  descricao = 'Tamanho 5x15 cm',
  ordem = 2
WHERE nome ILIKE '%pacote 2%' OR ordem = 2;

UPDATE pacotes SET
  nome = 'Pacote 3',
  tamanho_foto = '7,5x10 cm',
  descricao = 'Tamanho 7,5x10 cm',
  ordem = 3
WHERE nome ILIKE '%pacote 3%' OR ordem = 3;

-- Opção B: Se quiser resetar TODOS os pacotes (cuidado: apaga os existentes)
-- DELETE FROM pacotes;
-- INSERT INTO pacotes (nome, tamanho_foto, descricao, permite_pf, permite_pj, ativo, ordem)
-- VALUES
--   ('Pacote 1', '10x15 cm', 'Tamanho 10x15 cm', true, true, true, 1),
--   ('Pacote 2', '5x15 cm',  'Tamanho 5x15 cm',  true, true, true, 2),
--   ('Pacote 3', '7,5x10 cm','Tamanho 7,5x10 cm',true, true, true, 3);

-- ─── 2. Resultado esperado ───────────────────────────────────────
-- Pacote 1 | 10x15 cm
-- Pacote 2 | 5x15 cm
-- Pacote 3 | 7,5x10 cm

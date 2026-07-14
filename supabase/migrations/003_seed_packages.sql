-- ============================================================
-- CABINE SO ALEGRIA - Migration 003: Dados iniciais de Pacotes
-- Execute APOS as migrations 001 e 002
-- ============================================================

insert into pacotes (nome, descricao, tamanho_foto, permite_pf, permite_pj, ativo, ordem)
values
  (
    'Pacote 1',
    'Impressao termica japonesa de alta qualidade. Formato classico horizontal, perfeito para molduras e porta-retratos.',
    '10x15 cm',
    true,
    true,
    true,
    1
  ),
  (
    'Pacote 2',
    'Duas fotos em tira vertical por sessao. Ideal para molduras criativas e eventos tematicos.',
    '5x15 cm',
    true,
    true,
    true,
    2
  ),
  (
    'Pacote 3',
    'Estilo Polaroid retro. Perfeito para festas tematicas, casamentos e eventos especiais.',
    '7,5x10 cm',
    true,
    false,
    true,
    3
  ),
  (
    'Pacote 3',
    'Fotos no estilo Polaroid. Otimo para eventos corporativos e confraternizacoes.',
    '7,5x10 cm - Polaroid',
    false,
    true,
    true,
    3
  );

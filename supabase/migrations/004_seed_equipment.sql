-- ============================================================
-- CABINE SO ALEGRIA - Migration 004: Dados iniciais de Equipamentos
-- Execute APOS as migrations 001, 002 e 003
-- ============================================================

insert into equipamentos (nome, descricao, ativo, ordem)
values
  (
    'Cabine de Fotos',
    'Nossa cabine tradicional com cortinas, espelho e acessorios. Os convidados entram em grupo, se divertem com as plaquinhas e saem com a foto impressa em 12 segundos!',
    true,
    1
  ),
  (
    'Totem Personalizado',
    'Totem moderno com tela touch de 20 polegadas. Sem restricao de numero de pessoas. Ideal para eventos externos e grandes espacos.',
    true,
    2
  ),
  (
    'Totem Retro - Lambe-Lambe',
    'Equipamento retro que remete as antigas cabines de fotografia. Charme e nostalgia para deixar seu evento unico e inesquecivel.',
    true,
    3
  );

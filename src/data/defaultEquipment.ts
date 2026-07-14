import type { Equipamento } from '../types/form.types';

export const DEFAULT_EQUIPMENT: Equipamento[] = [
  {
    id: 'eq-cabine',
    nome: 'Cabine de Fotos',
    descricao: 'Nossa cabine tradicional com cortinas, espelho e acessórios. Os convidados entram em grupo, se divertem e saem com a foto impressa em 12 segundos!',
    imagem_url: '',
    ativo: true,
    ordem: 1,
  },
  {
    id: 'eq-totem',
    nome: 'Totem Personalizado',
    descricao: 'Totem moderno com tela touch de 20\'. Sem restrição de número de pessoas. Ideal para eventos externos e grandes espaços.',
    imagem_url: '',
    ativo: true,
    ordem: 2,
  },
  {
    id: 'eq-lambe',
    nome: 'Totem Retrô — Lambe-Lambe',
    descricao: 'Equipamento retrô que remete às antigas cabines de fotografia. Charme e nostalgia para deixar seu evento único.',
    imagem_url: '',
    ativo: true,
    ordem: 3,
  },
];

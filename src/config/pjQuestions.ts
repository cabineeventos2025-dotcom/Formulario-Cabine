import type { StepConfig } from '../types/form.types';

export const PJ_STEPS: StepConfig[] = [
  { id: 'tipo',        label: 'Tipo de contratação', forPF: false, forPJ: true, enabled: true },
  { id: 'dados_pj',   label: 'Dados da empresa',    forPF: false, forPJ: true, enabled: true },
  { id: 'endereco',   label: 'Endereço da empresa', forPF: false, forPJ: true, enabled: true },
  { id: 'contatos',   label: 'Responsável e contatos', forPF: false, forPJ: true, enabled: true },
  { id: 'evento',     label: 'Dados do evento',     forPF: false, forPJ: true, enabled: true },
  { id: 'pagamento',  label: 'Forma de pagamento',  forPF: false, forPJ: true, enabled: true },
  { id: 'horas',      label: 'Horas contratadas',   forPF: false, forPJ: true, enabled: true },
  { id: 'pacote',     label: 'Pacote escolhido',    forPF: false, forPJ: true, enabled: true },
  { id: 'equipamento',label: 'Equipamento',         forPF: false, forPJ: true, enabled: true },
  { id: 'publicacao', label: 'Autorização',          forPF: false, forPJ: true, enabled: true },
  { id: 'comentarios',label: 'Comentários',         forPF: false, forPJ: true, enabled: true },
  { id: 'nota_fiscal',label: 'Nota fiscal',         forPF: false, forPJ: true, enabled: true },
  { id: 'revisao',    label: 'Revisão',             forPF: false, forPJ: true, enabled: true },
  { id: 'consentimento', label: 'Consentimento',    forPF: false, forPJ: true, enabled: true },
];

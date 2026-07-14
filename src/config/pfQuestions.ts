import type { StepConfig } from '../types/form.types';

export const PF_STEPS: StepConfig[] = [
  { id: 'tipo',        label: 'Tipo de contratação', forPF: true, forPJ: true,  enabled: true },
  { id: 'dados_pf',   label: 'Dados pessoais',       forPF: true, forPJ: false, enabled: true },
  { id: 'endereco',   label: 'Endereço',             forPF: true, forPJ: false, enabled: true },
  { id: 'contatos',   label: 'Contatos',             forPF: true, forPJ: false, enabled: true },
  { id: 'evento',     label: 'Dados do evento',      forPF: true, forPJ: false, enabled: true },
  { id: 'pagamento',  label: 'Forma de pagamento',   forPF: true, forPJ: false, enabled: true },
  { id: 'horas',      label: 'Horas contratadas',    forPF: true, forPJ: false, enabled: true },
  { id: 'pacote',     label: 'Pacote escolhido',     forPF: true, forPJ: false, enabled: true },
  { id: 'equipamento',label: 'Equipamento',          forPF: true, forPJ: false, enabled: true },
  { id: 'publicacao', label: 'Autorização',           forPF: true, forPJ: false, enabled: true },
  { id: 'comentarios',label: 'Comentários',          forPF: true, forPJ: false, enabled: true },
  { id: 'revisao',    label: 'Revisão',              forPF: true, forPJ: false, enabled: true },
  { id: 'consentimento', label: 'Consentimento',     forPF: true, forPJ: false, enabled: true },
];

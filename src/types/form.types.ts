// ═══════════════════════════════════════════
// TYPES — Form & Domain
// ═══════════════════════════════════════════

export type TipoPessoa = 'PF' | 'PJ';

export interface EnderecoFields {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface EnderecoEventoFields extends EnderecoFields {
  referencia: string;
}

export type FormaPagamentoPF =
  | 'boleto'
  | 'cartao_credito'
  | 'pix'
  | 'deposito_bancario'
  | 'outro';

export type FormaPagamentoPJ =
  | 'boleto'
  | 'cartao_credito'
  | 'pix'
  | 'deposito_bancario'
  | 'faturado_15_21_30'
  | 'outro';

export type FormaPagamento = FormaPagamentoPF | FormaPagamentoPJ;

export type QuantidadeHoras = '2' | '3' | '4' | '5' | '6' | 'outro';

export interface Pacote {
  id: string;
  nome: string;
  descricao: string;
  imagem_url: string;
  tamanho_foto: string;
  permite_pf: boolean;
  permite_pj: boolean;
  ativo: boolean;
  ordem: number;
}

export interface Equipamento {
  id: string;
  nome: string;
  descricao: string;
  imagem_url: string;
  ativo: boolean;
  ordem: number;
}

// Full form data shape
export interface FormData {
  // Meta
  submission_id: string;
  tipo_pessoa: TipoPessoa | '';

  // PF
  nome_contratante: string;
  data_nascimento: string;
  cpf: string;
  rg: string;

  // PJ
  nome_fantasia: string;
  razao_social: string; // optional/disabled
  cnpj: string;
  nome_responsavel: string;

  // Address (contratante/empresa)
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  // Contacts
  telefone: string;
  telefone_whatsapp: boolean;
  email: string;
  contato_cerimonial: string; // PF only

  // Event
  nome_evento: string;
  cep_evento: string;
  logradouro_evento: string;
  numero_evento: string;
  complemento_evento: string;
  bairro_evento: string;
  cidade_evento: string;
  estado_evento: string;
  referencia_evento: string;
  data_evento: string;
  horario_inicio_evento: string;
  horario_inicio_fotos: string;

  // Payment
  forma_pagamento: FormaPagamento | '';
  forma_pagamento_outro: string;

  // Hours
  quantidade_horas: QuantidadeHoras | '';
  quantidade_horas_outro: string;

  // Package
  pacote_id: string;
  pacote_nome_snapshot: string;
  pacote_outro: string;

  // Equipment
  equipamento_id: string;
  equipamento_nome_snapshot: string;

  // Permissions
  autoriza_publicacao_fotos: boolean | null;
  solicita_nota_fiscal: boolean;

  // Misc
  comentarios: string;
  consentimento_dados: boolean;

  // Meta
  data_inicio: string;
}

export const defaultFormData: FormData = {
  submission_id: '',
  tipo_pessoa: '',
  nome_contratante: '',
  data_nascimento: '',
  cpf: '',
  rg: '',
  nome_fantasia: '',
  razao_social: '',
  cnpj: '',
  nome_responsavel: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  telefone: '',
  telefone_whatsapp: false,
  email: '',
  contato_cerimonial: '',
  nome_evento: '',
  cep_evento: '',
  logradouro_evento: '',
  numero_evento: '',
  complemento_evento: '',
  bairro_evento: '',
  cidade_evento: '',
  estado_evento: '',
  referencia_evento: '',
  data_evento: '',
  horario_inicio_evento: '',
  horario_inicio_fotos: '',
  forma_pagamento: '',
  forma_pagamento_outro: '',
  quantidade_horas: '',
  quantidade_horas_outro: '',
  pacote_id: '',
  pacote_nome_snapshot: '',
  pacote_outro: '',
  equipamento_id: '',
  equipamento_nome_snapshot: '',
  autoriza_publicacao_fotos: null,
  solicita_nota_fiscal: false,
  comentarios: '',
  consentimento_dados: false,
  data_inicio: '',
};

// Step definitions
export type StepId =
  | 'tipo'
  | 'dados_pf'
  | 'dados_pj'
  | 'endereco'
  | 'contatos'
  | 'evento'
  | 'pagamento'
  | 'horas'
  | 'pacote'
  | 'equipamento'
  | 'publicacao'
  | 'comentarios'
  | 'nota_fiscal'
  | 'revisao'
  | 'consentimento';

export interface StepConfig {
  id: StepId;
  label: string;
  forPF: boolean;
  forPJ: boolean;
  enabled: boolean;
}

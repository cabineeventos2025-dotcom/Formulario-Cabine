// ================================================================
// Serviço de Contratos — Cabine Só Alegria
// ================================================================
import { supabase } from '../lib/supabase';
import {
  TEMPLATE_CABINE_FOTOGRARICA,
  TEMPLATE_CABINE_PJ,
  TEMPLATE_TOTEM_PF,
  TEMPLATE_TOTEM_PJ,
  TEMPLATE_TOTEM_RETRO_PF,
  TEMPLATE_PAPARAZZI_PF,
  TEMPLATE_PAPARAZZI_PJ,
} from '../templates/contratoTemplates';

// ─── Tipos ──────────────────────────────────────────────────────

export interface ConfigEmpresa {
  id: string;
  nome_empresarial: string;
  nome_fantasia: string;
  cnpj: string;
  endereco: string;
  cidade_assinatura: string;
  estado_assinatura: string;
  foro: string;
  chave_pix: string;
  tipo_chave_pix: string;
  nome_representante: string;
  cpf_representante?: string;
  website?: string;
  instagram?: string;
  assinatura_imagem_url?: string;
}

export interface ModeloContrato {
  id: string;
  nome: string;
  descricao?: string;
  equipamento_id?: string;
  tipo_pessoa: 'PF' | 'PJ' | 'AMBOS';
  conteudo_html: string;
  versao: number;
  ativo: boolean;
  modelo_padrao: boolean;
  campos_detectados?: string[];
  data_inicio_vigencia?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface Opcional {
  id: string;
  nome: string;
  descricao?: string;
  clausula_padrao?: string;
  unidade?: string;
  valor_padrao?: number;
  ativo: boolean;
  ordem: number;
}

export interface OpcionalSelecionado {
  opcional_id?: string;
  nome_snapshot: string;
  descricao_snapshot?: string;
  clausula_snapshot?: string;
  quantidade: number;
  valor_unitario?: number;
  valor_total?: number;
  incluido_no_valor_total: boolean;
  observacao?: string;
}

export interface ContratoGerado {
  id: string;
  formulario_evento_id: string;
  modelo_contrato_id?: string;
  modelo_versao: number;
  numero_versao: number;
  nome_arquivo: string;
  status: 'rascunho' | 'previa' | 'finalizado' | 'substituido' | 'cancelado';
  dados_snapshot: Record<string, unknown>;
  opcionais_snapshot: OpcionalSelecionado[];
  dados_extras: Record<string, unknown>;
  gerado_por?: string;
  gerado_em?: string;
  finalizado_em?: string;
  created_at: string;
  updated_at: string;
}

export interface DadosContrato {
  // Locador (empresa)
  locador_nome_empresarial: string;
  locador_nome_fantasia: string;
  locador_cnpj: string;
  locador_endereco: string;
  locador_chave_pix: string;
  locador_tipo_chave_pix: string;
  locador_nome_representante: string;
  locador_website: string;

  // Locatário PF
  nome_contratante?: string;
  cpf?: string;
  rg?: string;
  endereco_contratante?: string;

  // Locatário PJ
  nome_fantasia_pj?: string;
  razao_social?: string;
  cnpj_pj?: string;
  responsavel_contrato?: string;
  endereco_empresa?: string;

  // Contato
  telefone?: string;
  email?: string;
  tipo_pessoa: 'PF' | 'PJ';

  // Evento
  nome_evento?: string;
  data_evento?: string;          // YYYY-MM-DD
  horario_evento?: string;
  horario_inicio_fotos?: string;
  endereco_evento?: string;

  // Serviço
  equipamento?: string;
  quantidade_horas?: string;
  pacote?: string;
  formato_foto?: string;
  valor_total?: number;
  valor_total_extenso?: string;
  forma_pagamento?: string;
  data_vencimento?: string;
  valor_hora_adicional?: number;
  valor_hora_adicional_extenso?: string;
  desconto_pix?: number;            // ex: 10 (representa 10%)

  // Publicação
  autoriza_publicacao?: boolean;

  // Assinatura
  cidade_assinatura?: string;
  data_contrato?: string;        // Data por extenso: "09 de julho de 2026"
  foro?: string;
}

// ─── Utilitários ─────────────────────────────────────────────────

/** Converte número para valor por extenso em pt-BR */
export function valorPorExtenso(valor: number): string {
  if (valor === 0) return 'zero reais';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
    'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const partes: string[] = [];

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function numToWords(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    if (n < 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return dezenas[d] + (u > 0 ? ' e ' + unidades[u] : '');
    }
    const c = Math.floor(n / 100);
    const resto = n % 100;
    return centenas[c] + (resto > 0 ? ' e ' + numToWords(resto) : '');
  }

  if (inteiro >= 1000) {
    const mil = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;
    if (mil === 1) partes.push('mil');
    else partes.push(numToWords(mil) + ' mil');
    if (resto > 0) partes.push(numToWords(resto));
  } else if (inteiro > 0) {
    partes.push(numToWords(inteiro));
  }

  const textoInteiro = partes.join(' e ');
  const sufixoInteiro = inteiro === 1 ? 'real' : 'reais';

  if (centavos === 0) {
    return textoInteiro + ' ' + sufixoInteiro;
  }

  const textoCentavos = numToWords(centavos);
  const sufixoCentavos = centavos === 1 ? 'centavo' : 'centavos';

  if (inteiro === 0) {
    return textoCentavos + ' ' + sufixoCentavos;
  }

  return textoInteiro + ' ' + sufixoInteiro + ' e ' + textoCentavos + ' ' + sufixoCentavos;
}

/** Data por extenso: "09 de julho de 2026" */
export function dataPorExtenso(isoDate: string): string {
  const meses = ['janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro'];
  const d = new Date(isoDate + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Data formatada DD/MM/AAAA */
export function formatDateBR(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

/** Detecta marcadores {{CAMPO}} no template */
export function detectarMarcadores(html: string): string[] {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const found = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found).sort();
}

/** Substitui marcadores no template HTML */
export function preencherTemplate(template: string, dados: Record<string, string>): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, campo) => {
    return dados[campo] !== undefined ? dados[campo] : match;
  });
}

/** Monta o mapa de marcadores a partir dos DadosContrato */
export function buildMarcadores(d: DadosContrato): Record<string, string> {
  // Autorização: apenas texto simples sem "X"
  const autoPublicacao = d.autoriza_publicacao ? 'AUTORIZA' : 'NÃO AUTORIZA';

  // Forma de pagamento com desconto Pix
  let formaPgto = d.forma_pagamento || '';
  if (d.desconto_pix && d.desconto_pix > 0) {
    formaPgto = `${formaPgto} (com ${d.desconto_pix}% de desconto)`;
  }

  return {
    // Locador
    NOME_EMPRESARIAL_LOCADOR:   d.locador_nome_empresarial || '',
    NOME_FANTASIA_LOCADOR:      d.locador_nome_fantasia || '',
    CNPJ_LOCADOR:               d.locador_cnpj || '',
    ENDERECO_LOCADOR:           d.locador_endereco || '',
    CHAVE_PIX:                  d.locador_chave_pix || '',
    TIPO_CHAVE_PIX:             d.locador_tipo_chave_pix || '',
    NOME_REPRESENTANTE_LOCADOR: d.locador_nome_representante || '',
    WEBSITE:                    d.locador_website || '',
    FORO:                       d.foro || '',

    // Locatário PF
    NOME_CONTRATANTE:    d.nome_contratante || d.nome_fantasia_pj || '',
    CPF:                 d.cpf || '',
    RG:                  d.rg || '',
    CNPJ:                d.cnpj_pj || '',
    RAZAO_SOCIAL:        d.razao_social || '',
    NOME_FANTASIA:       d.nome_fantasia_pj || '',
    RESPONSAVEL_CONTRATO: d.responsavel_contrato || d.nome_contratante || '',
    ENDERECO_CONTRATANTE: d.endereco_contratante || d.endereco_empresa || '',
    TELEFONE:            d.telefone || '',
    EMAIL:               d.email || '',

    // Evento
    NOME_EVENTO:          d.nome_evento || '',
    DATA_EVENTO:          d.data_evento ? formatDateBR(d.data_evento) : '',
    HORARIO_EVENTO:       d.horario_evento || '',
    HORARIO_INICIO_FOTOS: d.horario_inicio_fotos || '',
    ENDERECO_EVENTO:      d.endereco_evento || '',

    // Serviço
    EQUIPAMENTO:                   d.equipamento || '',
    QUANTIDADE_HORAS:              d.quantidade_horas || '',
    // PACOTE: mostra o formato da foto (ex: "5 X 15") — derivado do nome do pacote
    PACOTE:                        d.formato_foto || d.pacote || '',
    FORMATO_FOTO:                  d.formato_foto || d.pacote || '',
    VALOR_TOTAL:                   d.valor_total ? `R$ ${d.valor_total.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '',
    VALOR_TOTAL_EXTENSO:           d.valor_total_extenso || (d.valor_total ? valorPorExtenso(d.valor_total).toUpperCase() : ''),
    FORMA_PAGAMENTO:               formaPgto,
    DATA_VENCIMENTO:               d.data_vencimento || '',
    VALOR_HORA_ADICIONAL:          d.valor_hora_adicional ? `R$ ${d.valor_hora_adicional.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '',
    VALOR_HORA_ADICIONAL_EXTENSO:  d.valor_hora_adicional_extenso || (d.valor_hora_adicional ? valorPorExtenso(d.valor_hora_adicional) : ''),

    // Publicação
    AUTORIZACAO_PUBLICACAO: autoPublicacao,
    AUTORIZA: d.autoriza_publicacao ? 'AUTORIZA' : 'NÃO AUTORIZA',

    // Assinatura
    CIDADE_ASSINATURA:     d.cidade_assinatura || 'Sarzedo',
    DATA_CONTRATO:         d.data_contrato || '',
    DATA_CONTRATO_EXTENSO: d.data_contrato || '',

    // Extras
    DESCONTO_PIX: d.desconto_pix ? `${d.desconto_pix}%` : '10%',
  };
}

/** Gera o nome de arquivo padrão do contrato */
export function gerarNomeArquivo(dados: {
  nome: string;
  data_evento: string;
  equipamento: string;
  versao?: number;
}): string {
  const nome = dados.nome.split(' ')[0]; // Primeiro nome
  const data = dados.data_evento ? formatDateBR(dados.data_evento).replace(/\//g, '-') : 'sem-data';
  const equip = dados.equipamento || 'Cabine';
  const v = dados.versao && dados.versao > 1 ? ` - v${dados.versao}` : '';
  return `Contrato - ${nome} - ${data} - ${equip}${v}.pdf`
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── CRUD Supabase ────────────────────────────────────────────────

export async function getConfigEmpresa(): Promise<ConfigEmpresa | null> {
  const { data } = await supabase.from('config_empresa_contrato').select('*').limit(1).single();
  return data as ConfigEmpresa | null;
}

export async function updateConfigEmpresa(id: string, updates: Partial<ConfigEmpresa>): Promise<void> {
  await supabase.from('config_empresa_contrato').update(updates).eq('id', id);
}

export async function getModelos(): Promise<ModeloContrato[]> {
  const { data } = await supabase
    .from('modelos_contrato')
    .select('*')
    .order('created_at', { ascending: false });
  return (data || []) as ModeloContrato[];
}

export async function getModeloById(id: string): Promise<ModeloContrato | null> {
  const { data } = await supabase.from('modelos_contrato').select('*').eq('id', id).single();
  return data as ModeloContrato | null;
}

export async function sugerirModelo(equipamentoId: string | undefined, tipoPessoa: 'PF' | 'PJ'): Promise<ModeloContrato | null> {
  let query = supabase
    .from('modelos_contrato')
    .select('*')
    .eq('ativo', true)
    .in('tipo_pessoa', [tipoPessoa, 'AMBOS']);

  if (equipamentoId) {
    query = query.eq('equipamento_id', equipamentoId);
  }

  const { data } = await query.order('modelo_padrao', { ascending: false }).limit(1);
  if (data && data.length > 0) return data[0] as ModeloContrato;
  // Fallback: qualquer modelo ativo
  const { data: fallback } = await supabase
    .from('modelos_contrato')
    .select('*')
    .eq('ativo', true)
    .order('modelo_padrao', { ascending: false })
    .limit(1);
  return fallback?.[0] as ModeloContrato | null;
}

export async function createModelo(modelo: Omit<ModeloContrato, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const campos = detectarMarcadores(modelo.conteudo_html);
  const { data, error } = await supabase
    .from('modelos_contrato')
    .insert({ ...modelo, campos_detectados: campos })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateModelo(id: string, updates: Partial<ModeloContrato>): Promise<void> {
  if (updates.conteudo_html) {
    updates.campos_detectados = detectarMarcadores(updates.conteudo_html) as unknown as string[];
  }
  await supabase.from('modelos_contrato').update(updates).eq('id', id);
}

export async function getOpcionais(): Promise<Opcional[]> {
  const { data } = await supabase
    .from('opcionais')
    .select('*')
    .eq('ativo', true)
    .order('ordem');
  return (data || []) as Opcional[];
}

export async function getContratosDoFormulario(formularioId: string): Promise<ContratoGerado[]> {
  const { data } = await supabase
    .from('contratos_gerados')
    .select('*')
    .eq('formulario_evento_id', formularioId)
    .order('numero_versao', { ascending: false });
  return (data || []) as ContratoGerado[];
}

export async function createContrato(contrato: {
  formulario_evento_id: string;
  modelo_contrato_id?: string;
  modelo_versao: number;
  numero_versao: number;
  nome_arquivo: string;
  dados_snapshot: Record<string, unknown>;
  dados_extras: Record<string, unknown>;
  opcionais_snapshot: OpcionalSelecionado[];
}): Promise<string> {
  const { data, error } = await supabase
    .from('contratos_gerados')
    .insert({ ...contrato, status: 'rascunho' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateContratoStatus(id: string, status: ContratoGerado['status']): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'finalizado') updates.finalizado_em = new Date().toISOString();
  if (status === 'previa' || status === 'finalizado') updates.gerado_em = new Date().toISOString();
  await supabase.from('contratos_gerados').update(updates).eq('id', id);
}

export async function logAuditoria(entry: {
  contrato_id?: string;
  modelo_id?: string;
  formulario_evento_id?: string;
  acao: string;
  descricao?: string;
  dados_novos?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from('contratos_auditoria').insert(entry);
}

export async function getProximaVersao(formularioId: string): Promise<number> {
  const { data } = await supabase
    .from('contratos_gerados')
    .select('numero_versao')
    .eq('formulario_evento_id', formularioId)
    .neq('status', 'cancelado')
    .order('numero_versao', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return 1;
  return (data[0].numero_versao || 0) + 1;
}

// ─── Seed: Insere modelos padrão no banco ────────────────────────────────────

export async function seedModelosPadrao(): Promise<{ ok: number; erros: string[] }> {
  // Templates já importados estaticamente no topo do arquivo
  const modelos = [
    {
      nome: 'Cabine Fotográfica — PF',
      descricao: 'Contrato padrão Cabine para Pessoa Física',
      tipo_pessoa: 'PF',
      equipamento_nome: 'cabine',
      conteudo_html: TEMPLATE_CABINE_FOTOGRARICA,
      ativo: true,
      modelo_padrao: true,
      versao: 1,
    },
    {
      nome: 'Cabine Fotográfica — PJ',
      descricao: 'Contrato padrão Cabine para Pessoa Jurídica',
      tipo_pessoa: 'PJ',
      equipamento_nome: 'cabine',
      conteudo_html: TEMPLATE_CABINE_PJ,
      ativo: true,
      modelo_padrao: true,
      versao: 1,
    },
    {
      nome: 'Totem Personalizado — PF',
      descricao: 'Contrato padrão Totem Personalizado para Pessoa Física',
      tipo_pessoa: 'PF',
      equipamento_nome: 'totem',
      conteudo_html: TEMPLATE_TOTEM_PF,
      ativo: true,
      modelo_padrao: false,
      versao: 1,
    },
    {
      nome: 'Totem Personalizado — PJ',
      descricao: 'Contrato padrão Totem Personalizado para Pessoa Jurídica',
      tipo_pessoa: 'PJ',
      equipamento_nome: 'totem',
      conteudo_html: TEMPLATE_TOTEM_PJ,
      ativo: true,
      modelo_padrao: false,
      versao: 1,
    },
    {
      nome: 'Totem Retrô — PF',
      descricao: 'Contrato padrão Totem Retrô para Pessoa Física',
      tipo_pessoa: 'PF',
      equipamento_nome: 'totem_retro',
      conteudo_html: TEMPLATE_TOTEM_RETRO_PF,
      ativo: true,
      modelo_padrao: false,
      versao: 1,
    },
    {
      nome: 'Paparazzi — PF',
      descricao: 'Contrato padrão Cabine Paparazzi para Pessoa Física',
      tipo_pessoa: 'PF',
      equipamento_nome: 'paparazzi',
      conteudo_html: TEMPLATE_PAPARAZZI_PF,
      ativo: true,
      modelo_padrao: false,
      versao: 1,
    },
    {
      nome: 'Paparazzi — PJ',
      descricao: 'Contrato padrão Cabine Paparazzi para Pessoa Jurídica',
      tipo_pessoa: 'PJ',
      equipamento_nome: 'paparazzi',
      conteudo_html: TEMPLATE_PAPARAZZI_PJ,
      ativo: true,
      modelo_padrao: false,
      versao: 1,
    },
  ];

  let ok = 0;
  const erros: string[] = [];

  for (const modelo of modelos) {
    // Verifica se já existe pelo nome
    const { data: exists } = await supabase
      .from('modelos_contrato')
      .select('id')
      .eq('nome', modelo.nome)
      .maybeSingle();

    if (exists) {
      // Atualiza se já existe
      const { error } = await supabase
        .from('modelos_contrato')
        .update({ conteudo_html: modelo.conteudo_html, descricao: modelo.descricao, ativo: modelo.ativo })
        .eq('id', exists.id);
      if (error) erros.push(`${modelo.nome}: ${error.message}`);
      else ok++;
    } else {
      const { error } = await supabase.from('modelos_contrato').insert(modelo);
      if (error) erros.push(`${modelo.nome}: ${error.message}`);
      else ok++;
    }
  }

  return { ok, erros };
}

// ─── Seed: Atualiza pacotes padrão ───────────────────────────────────────────

export async function seedPacotesPadrao(): Promise<{ ok: number; erros: string[] }> {
  const pacotes = [
    { ordem: 1, nome: 'Pacote 1', tamanho_foto: '10x15 cm', descricao: 'Tamanho 10x15 cm' },
    { ordem: 2, nome: 'Pacote 2', tamanho_foto: '5x15 cm',  descricao: 'Tamanho 5x15 cm' },
    { ordem: 3, nome: 'Pacote 3', tamanho_foto: '7,5x10 cm',descricao: 'Tamanho 7,5x10 cm' },
  ];

  let ok = 0;
  const erros: string[] = [];

  for (const p of pacotes) {
    const { data: exists } = await supabase
      .from('pacotes')
      .select('id')
      .eq('ordem', p.ordem)
      .maybeSingle();

    if (exists) {
      const { error } = await supabase
        .from('pacotes')
        .update({ nome: p.nome, tamanho_foto: p.tamanho_foto, descricao: p.descricao })
        .eq('id', exists.id);
      if (error) erros.push(`Pacote ${p.ordem}: ${error.message}`);
      else ok++;
    } else {
      const { error } = await supabase.from('pacotes').insert({
        ...p, permite_pf: true, permite_pj: true, ativo: true,
      });
      if (error) erros.push(`Pacote ${p.ordem}: ${error.message}`);
      else ok++;
    }
  }

  return { ok, erros };
}


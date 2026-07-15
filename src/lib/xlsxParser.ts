// ============================================================
// XLSX PARSER — Cabine Só Alegria
// Parses the historical Google Forms spreadsheet (.xlsx)
// 22 columns from the original form
// ============================================================

export interface ParsedHistoricalRow {
  // Identificacao
  tipo_pessoa: 'PF' | 'PJ';
  nome_contratante: string;
  data_nascimento: string | null;
  cpf: string | null;   // used for PF
  cnpj: string | null;  // used for PJ (detected by 14 digits)
  rg: string | null;

  // Contato
  logradouro: string | null; // Endereco Residencial (free text)
  telefone: string | null;
  email: string | null;
  contato_cerimonial: string | null;

  // Evento
  nome_evento: string | null;
  logradouro_evento: string | null;
  horario_inicio_evento: string | null;
  data_evento: string | null;
  horario_inicio_fotos: string | null;

  // Contrato
  forma_pagamento: string | null;
  quantidade_horas: string | null;
  autoriza_publicacao_fotos: boolean;
  comentarios: string | null;
  pacote_nome_snapshot: string | null;
  equipamento_nome_snapshot: string | null;

  // Financeiro
  valor_pago: number;
  valor_a_pagar: number;

  // Meta
  carimbo_data_hora: string | null;
  source_row: number;
}

export interface ParseResult {
  rows: ParsedHistoricalRow[];
  errors: { row: number; message: string }[];
  totalRows: number;
  skipped: number;
  detectedColumns: Record<string, string>; // raw header → internal key, for debugging
}

// ── Column name mapping (normalized: lowercase + sem acentos) ──
const COL_MAP_NORMALIZED: Record<string, string> = {
  // Carimbo
  'carimbo de data/hora': 'carimbo',
  'carimbo': 'carimbo',
  'timestamp': 'carimbo',
  'data hora': 'carimbo',
  // Nome
  'nome do contratante': 'nome',
  'nome contratante': 'nome',
  'nome': 'nome',
  'nome completo': 'nome',
  // Nascimento
  'data de nascimento': 'data_nasc',
  'nascimento': 'data_nasc',
  'data nascimento': 'data_nasc',
  // Documentos
  'cpf': 'cpf',
  'cpf/cnpj': 'cpf',
  'cnpj': 'cpf',
  'rg': 'rg',
  // Endereço
  'seu endereco residencial': 'endereco',
  'endereco residencial': 'endereco',
  'endereco': 'endereco',
  'residencia': 'endereco',
  // Telefone
  'telefones para contato': 'telefone',
  'telefone': 'telefone',
  'celular': 'telefone',
  'whatsapp': 'telefone',
  // Email
  'e-mail': 'email',
  'email': 'email',
  // Cerimonial
  'contato cerimonial / comentarios': 'cerimonial',
  'contato cerimonial': 'cerimonial',
  'cerimonial': 'cerimonial',
  // Evento
  'nome do evento': 'nome_evento',
  'nome evento': 'nome_evento',
  'evento': 'nome_evento',
  'endereco do evento': 'endereco_evento',
  'local do evento': 'endereco_evento',
  'local evento': 'endereco_evento',
  'horario de inicio do evento': 'horario_evento',
  'horario inicio evento': 'horario_evento',
  'horario do evento': 'horario_evento',
  'horario inicio': 'horario_evento',
  'horario de inicio das fotos': 'horario_fotos',
  'horario inicio fotos': 'horario_fotos',
  'horario fotos': 'horario_fotos',
  'data do evento': 'data_evento',
  'data evento': 'data_evento',
  // Pagamento
  'forma de pagamento desejada': 'forma_pgto',
  'forma de pagamento': 'forma_pgto',
  'forma pagamento': 'forma_pgto',
  'pagamento': 'forma_pgto',
  // Horas
  'quantidade de horas contratada': 'qtd_horas',
  'quantidade de horas': 'qtd_horas',
  'qtd horas': 'qtd_horas',
  'horas': 'qtd_horas',
  // Comentários
  'comentarios': 'comentarios',
  'observacoes': 'comentarios',
  'obs': 'comentarios',
  // Pacote
  'pacote escolhido': 'pacote',
  'pacote': 'pacote',
  // Equipamento
  'equipamento escolhido': 'equipamento',
  'equipamento': 'equipamento',
  // Financeiro — PAGO (muitas variações possíveis)
  'pago': 'pago',
  'valor pago': 'pago',
  'ja pago': 'pago',
  'total pago': 'pago',
  'valor ja pago': 'pago',
  'recebido': 'pago',
  'valor recebido': 'pago',
  'entrada': 'pago',
  'sinal': 'pago',
  // Financeiro — FALTA PAGAR (muitas variações possíveis)
  'ainda falta pagar': 'falta_pagar',
  'falta pagar': 'falta_pagar',
  'valor a pagar': 'falta_pagar',
  'a pagar': 'falta_pagar',
  'restante': 'falta_pagar',
  'saldo': 'falta_pagar',
  'falta': 'falta_pagar',
  'pendente': 'falta_pagar',
  'valor pendente': 'falta_pagar',
  'valor restante': 'falta_pagar',
};

/** Remove acentos e converte para minúsculo para comparação tolerante */
function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accent marks
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveColKey(raw: string): string | undefined {
  const norm = normalizeHeader(raw);
  // Exact match first
  if (COL_MAP_NORMALIZED[norm]) return COL_MAP_NORMALIZED[norm];
  // Partial match for AUTORIZA column (long text)
  if (norm.startsWith('autoriza')) return 'autoriza';
  // Contains match for financial columns
  if (norm.includes('falta') || norm.includes('restante') || norm.includes('saldo a pagar')) return 'falta_pagar';
  if (norm === 'pago' || norm.endsWith(' pago') || norm.startsWith('pago ')) return 'pago';
  return undefined;
}

// ── Helpers ────────────────────────────────────────────────

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

/**
 * Parse BRL currency string to number.
 * Handles: "R$ 1.500,00", "1500,00", "1500.00", "1.500", 1500 (number)
 */
function parseBRL(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : Math.max(0, raw);
  const s = String(raw)
    .replace(/R\$\s*/gi, '')
    .trim();
  // Remove thousand separators (dot before 3 digits) and replace comma decimal
  const normalized = s
    .replace(/\.(\d{3})/g, '$1') // remove BRL thousand dot
    .replace(',', '.');          // convert decimal comma to dot
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : Math.max(0, n);
}

/**
 * Parse date from various formats to ISO yyyy-mm-dd string.
 * Handles: Excel serial numbers, dd/mm/yyyy, dd/mm/yy, yyyy-mm-dd
 *
 * ⚠️  IMPORTANT: We NEVER call new Date("YYYY-MM-DD") here because
 * JavaScript treats that as UTC midnight, which becomes the PREVIOUS day
 * when displayed in Brazil (UTC-3). All date-only values are assembled
 * purely as strings to avoid any timezone shift.
 */
function parseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Excel serial date number (e.g. 46032 = 2026-01-10)
  if (typeof raw === 'number') {
    if (raw < 1) return null; // time fraction only, no date
    // Convert Excel serial to UTC ms.
    // Note: 25569 = days from Excel epoch (Dec 30 1899) to Unix epoch (Jan 1 1970).
    // The Excel 1900 leap-year bug (serial 60 = fake Feb 29 1900) is already absorbed
    // into the offset constant 25569 — do NOT apply an extra -1 adjustment here,
    // as that incorrectly shifts all modern dates back by 1 day.
    const utcMs = (raw - 25569) * 86400 * 1000;
    const d = new Date(utcMs);
    if (isNaN(d.getTime())) return null;
    // Build YYYY-MM-DD from UTC components to avoid local-timezone shift
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const s = String(raw).trim();
  if (!s) return null;

  // dd/mm/yyyy or dd/mm/yy  (Brazilian format from Google Forms)
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const year = y.length === 2 ? (parseInt(y) > 30 ? `19${y}` : `20${y}`) : y;
    const dayN  = parseInt(d, 10);
    const monN  = parseInt(m, 10);
    const yearN = parseInt(year, 10);
    // Basic sanity check without creating a Date object
    if (monN < 1 || monN > 12 || dayN < 1 || dayN > 31 || yearN < 1900) return null;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // yyyy-mm-dd (already ISO) — return directly, no Date object needed
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return s.slice(0, 10);

  // Excel date/time string "MM/DD/YYYY HH:MM:SS" (some locales)
  // Parse components to avoid UTC shift
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const [, m2, d2, y2] = usMatch;
    const monN = parseInt(m2, 10);
    const dayN = parseInt(d2, 10);
    if (monN >= 1 && monN <= 12 && dayN >= 1 && dayN <= 31) {
      return `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`;
    }
  }

  return null;
}


/**
 * Parse time string to HH:MM:SS.
 * Handles: Excel time fraction, "19:00", "19:00:00", "7:30:00 PM"
 */
function parseTime(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;

  if (typeof raw === 'number') {
    if (raw < 0 || raw > 1) return null; // not a time fraction
    const totalSeconds = Math.round(raw * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Handle AM/PM format: "7:30:00 PM"
  const ampmMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1]);
    const min = ampmMatch[2];
    const sec = ampmMatch[3] || '00';
    const period = ampmMatch[4].toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}:${sec}`;
  }

  // HH:MM or HH:MM:SS
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, h, min, sec = '00'] = match;
    return `${h.padStart(2, '0')}:${min}:${sec}`;
  }

  return null;
}

function parseBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  const s = String(raw || '').toLowerCase().trim();
  return ['sim', 'yes', 'true', '1', 's', 'autorizo'].includes(s);
}

function detectTipoPessoa(cpfRaw: string | null | undefined): { tipo: 'PF' | 'PJ'; cpf: string | null; cnpj: string | null } {
  if (!cpfRaw) return { tipo: 'PF', cpf: null, cnpj: null };
  const digits = onlyDigits(cpfRaw);
  if (digits.length === 14) {
    return { tipo: 'PJ', cpf: null, cnpj: cpfRaw.trim() };
  }
  return { tipo: 'PF', cpf: cpfRaw.trim(), cnpj: null };
}

// ── Main parser ────────────────────────────────────────────

/**
 * Parse an xlsx ArrayBuffer into structured rows.
 * Uses the SheetJS (xlsx) library loaded via CDN or npm.
 */
export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<ParseResult> {
  // Dynamic import of SheetJS
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays (raw mode) to preserve types
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as unknown[][];

  if (rawRows.length < 2) {
    return { rows: [], errors: [], totalRows: 0, skipped: 0, detectedColumns: {} };
  }

  // Build column index map — tolerante a variações de acento e capitalização
  const headerRow = rawRows[0] as string[];
  const colIndex: Record<string, number> = {};

  headerRow.forEach((h, i) => {
    if (!h) return;
    const key = resolveColKey(String(h));
    if (key && colIndex[key] === undefined) colIndex[key] = i;
  });

  // Debug: log detected columns (visible in browser console)
  console.debug('[xlsxParser] Colunas detectadas:', colIndex);

  const get = (row: unknown[], key: string): unknown => {
    const idx = colIndex[key];
    return idx !== undefined ? row[idx] : null;
  };

  const rows: ParsedHistoricalRow[] = [];
  const errors: { row: number; message: string }[] = [];
  let skipped = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 1; // 1-indexed, row 1 is header

    try {
      const nome = String(get(row, 'nome') || '').trim();
      if (!nome) {
        skipped++;
        continue; // skip completely empty rows
      }

      const cpfRaw = get(row, 'cpf');
      const cpfStr = cpfRaw ? String(cpfRaw).trim() : null;
      const { tipo, cpf, cnpj } = detectTipoPessoa(cpfStr);

      const parsed: ParsedHistoricalRow = {
        tipo_pessoa: tipo,
        nome_contratante: nome,
        data_nascimento: parseDate(get(row, 'data_nasc')),
        cpf,
        cnpj,
        rg: get(row, 'rg') ? String(get(row, 'rg')).trim() : null,
        logradouro: get(row, 'endereco') ? String(get(row, 'endereco')).trim() : null,
        telefone: get(row, 'telefone') ? String(get(row, 'telefone')).trim() : null,
        email: get(row, 'email') ? String(get(row, 'email')).trim().toLowerCase() : null,
        contato_cerimonial: get(row, 'cerimonial') ? String(get(row, 'cerimonial')).trim() : null,
        nome_evento: get(row, 'nome_evento') ? String(get(row, 'nome_evento')).trim() : null,
        logradouro_evento: get(row, 'endereco_evento') ? String(get(row, 'endereco_evento')).trim() : null,
        horario_inicio_evento: parseTime(get(row, 'horario_evento')),
        data_evento: parseDate(get(row, 'data_evento')),
        horario_inicio_fotos: parseTime(get(row, 'horario_fotos')),
        forma_pagamento: get(row, 'forma_pgto') ? String(get(row, 'forma_pgto')).trim() : null,
        quantidade_horas: get(row, 'qtd_horas') ? String(get(row, 'qtd_horas')).trim() : null,
        autoriza_publicacao_fotos: parseBool(get(row, 'autoriza')),
        comentarios: get(row, 'comentarios') ? String(get(row, 'comentarios')).trim() : null,
        pacote_nome_snapshot: get(row, 'pacote') ? String(get(row, 'pacote')).trim() : null,
        equipamento_nome_snapshot: get(row, 'equipamento') ? String(get(row, 'equipamento')).trim() : null,
        valor_pago: parseBRL(get(row, 'pago')),
        valor_a_pagar: parseBRL(get(row, 'falta_pagar')),
        carimbo_data_hora: parseDate(get(row, 'carimbo')), // parseDate handles Excel serial safely
        source_row: rowNum,
      };

      rows.push(parsed);
    } catch (err) {
      errors.push({ row: rowNum, message: String(err) });
    }
  }

  // Build human-readable detected columns map for debugging
  const detectedColumns: Record<string, string> = {};
  headerRow.forEach((h) => {
    if (!h) return;
    const key = resolveColKey(String(h));
    if (key) detectedColumns[String(h)] = key;
  });
  console.debug('[xlsxParser] Colunas detectadas:', detectedColumns);

  return {
    rows,
    errors,
    totalRows: rawRows.length - 1,
    skipped,
    detectedColumns,
  };
}

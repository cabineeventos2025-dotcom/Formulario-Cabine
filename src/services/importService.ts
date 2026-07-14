import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import type { ParsedHistoricalRow } from '../lib/xlsxParser';

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: { row: number; message: string }[];
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Sanitize a time string by stripping any timezone offset suffix.
 * "19:30:00-08:00" → "19:30:00", "7:30:00 PM" handled in xlsxParser already.
 */
function sanitizeTime(v: string | null): string | null {
  if (!v) return null;
  // Strip timezone suffix like -08:00 or +03:00
  const clean = v.replace(/[+-]\d{2}:\d{2}$/, '').trim();
  // Validate HH:MM or HH:MM:SS
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(clean)) return clean;
  return null;
}

/**
 * Build the base formularios_eventos record (all fields).
 */
function buildFormRecord(row: ParsedHistoricalRow, submission_id: string) {
  return {
    submission_id,
    tipo_pessoa: row.tipo_pessoa,

    // PF
    nome_contratante: row.nome_contratante,
    data_nascimento: row.data_nascimento || null,
    cpf: row.cpf || null,
    rg: row.rg || null,

    // PJ
    nome_fantasia: row.tipo_pessoa === 'PJ' ? row.nome_contratante : null,
    cnpj: row.cnpj || null,
    nome_responsavel: row.tipo_pessoa === 'PJ' ? row.nome_contratante : null,

    // Address
    logradouro: row.logradouro ? row.logradouro.slice(0, 500) : null,

    // Contacts
    telefone: row.telefone ? row.telefone.slice(0, 50) : null,
    email: row.email ? row.email.slice(0, 200) : null,
    contato_cerimonial: row.contato_cerimonial ? row.contato_cerimonial.slice(0, 500) : null,

    // Event
    nome_evento: row.nome_evento || null,
    logradouro_evento: row.logradouro_evento ? row.logradouro_evento.slice(0, 500) : null,
    horario_inicio_evento: sanitizeTime(row.horario_inicio_evento),
    data_evento: row.data_evento || null,
    horario_inicio_fotos: sanitizeTime(row.horario_inicio_fotos),

    // Contract
    forma_pagamento: row.forma_pagamento || null,
    quantidade_horas: row.quantidade_horas || null,
    autoriza_publicacao_fotos: row.autoriza_publicacao_fotos,
    comentarios: row.comentarios ? row.comentarios.slice(0, 2000) : null,
    pacote_nome_snapshot: row.pacote_nome_snapshot || null,
    equipamento_nome_snapshot: row.equipamento_nome_snapshot || null,

    consentimento_dados: true,
    solicita_nota_fiscal: false,
    sincronizado_planilha: true,

    // Import metadata
    is_imported: true,
    imported_at: new Date().toISOString(),
    source_row: row.source_row,
    data_envio: safeISODate(row.carimbo_data_hora),
  };
}

/**
 * Convert a yyyy-mm-dd string to a safe ISO timestamp.
 * Never throws.
 */
function safeISODate(ymd: string | null): string {
  try {
    if (!ymd) return new Date().toISOString();
    const d = new Date(ymd + 'T12:00:00Z');
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Build a safe/minimal record with potentially problematic date/time fields nulled.
 * Used as fallback when the full record insert fails.
 */
function buildSafeRecord(full: ReturnType<typeof buildFormRecord>) {
  return {
    ...full,
    // Null out the fields most likely to cause "time zone displacement" errors
    data_nascimento: null,
    horario_inicio_evento: null,
    horario_inicio_fotos: null,
    // Keep data_evento as text only, with extra safety
    data_evento: full.data_evento?.match(/^\d{4}-\d{2}-\d{2}$/)
      ? full.data_evento
      : null,
  };
}

// ── Main export ───────────────────────────────────────────────

/**
 * Import historical rows into Supabase.
 * - Deduplication: skips if (nome_contratante + data_evento) OR (nome_contratante + telefone) already imported.
 * - Retry: if full insert fails, retries with safe/minimal record.
 * - Considers repeated data as 1 (duplicate).
 */
export async function importHistoricalRows(
  rows: ParsedHistoricalRow[]
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, duplicates: 0, errors: [] };

  for (const row of rows) {
    try {
      // ── Duplicate check ──────────────────────────────────────
      // Strategy 1: same name + same event date
      let isDuplicate = false;

      if (row.data_evento) {
        const { data: ex1 } = await supabase
          .from('formularios_eventos')
          .select('id')
          .eq('nome_contratante', row.nome_contratante)
          .eq('data_evento', row.data_evento)
          .eq('is_imported', true)
          .maybeSingle();
        if (ex1) isDuplicate = true;
      }

      // Strategy 2: same name + same phone (catches re-submissions without date)
      if (!isDuplicate && row.telefone) {
        const { data: ex2 } = await supabase
          .from('formularios_eventos')
          .select('id')
          .eq('nome_contratante', row.nome_contratante)
          .eq('telefone', row.telefone)
          .eq('is_imported', true)
          .maybeSingle();
        if (ex2) isDuplicate = true;
      }

      if (isDuplicate) {
        result.duplicates++;
        continue;
      }

      // ── Build record ─────────────────────────────────────────
      const submission_id = uuidv4();
      const formRecord = buildFormRecord(row, submission_id);

      // ── Insert (with retry) ───────────────────────────────────
      let inserted: { id: string } | null = null;
      let finalError: string | null = null;

      // Attempt 1: full record
      const { data: d1, error: e1 } = await supabase
        .from('formularios_eventos')
        .insert(formRecord)
        .select('id')
        .single();

      if (!e1 && d1) {
        inserted = d1;
      } else {
        // Attempt 2: safe/minimal record (null out problematic date/time fields)
        const safeRecord = buildSafeRecord(formRecord);
        const { data: d2, error: e2 } = await supabase
          .from('formularios_eventos')
          .insert(safeRecord)
          .select('id')
          .single();

        if (!e2 && d2) {
          inserted = d2;
        } else {
          finalError = e2?.message || e1?.message || 'Erro desconhecido';
        }
      }

      if (!inserted) {
        result.errors.push({
          row: row.source_row,
          message: finalError || 'Falha ao inserir',
        });
        continue;
      }

      // ── Create controle_recebimentos ──────────────────────────
      const valorTotal = (row.valor_pago || 0) + (row.valor_a_pagar || 0);
      if (valorTotal > 0) {
        const { error: recError } = await supabase
          .from('controle_recebimentos')
          .insert({
            formulario_evento_id: inserted.id,
            valor_total_contrato: valorTotal,
            valor_pago: row.valor_pago || 0,
            valor_a_pagar: row.valor_a_pagar || 0,
            // PJ: NF marcada como emitida por padrao (pode ser alterado manualmente no painel)
            nota_fiscal_emitida: row.tipo_pessoa === 'PJ',
          });

        if (recError) {
          console.warn('[importService] recebimento error:', recError.message);
        }
      }

      result.imported++;
    } catch (err) {
      result.errors.push({
        row: row.source_row,
        message: String(err),
      });
    }
  }

  return result;
}

// ── Financial summary ─────────────────────────────────────────

export interface FinancialSummaryRow {
  nota_fiscal_emitida: boolean;
  total_eventos: number;
  total_pago: number;
  total_a_pagar: number;
  total_contrato: number;
}

export async function loadFinancialSummary(): Promise<FinancialSummaryRow[]> {
  const { data, error } = await supabase
    .from('controle_recebimentos')
    .select(`
      nota_fiscal_emitida,
      valor_pago,
      valor_a_pagar,
      valor_total_contrato,
      formulario_evento_id
    `);

  if (error) throw error;

  const grouped: Record<string, FinancialSummaryRow> = {};

  for (const row of data || []) {
    const key = row.nota_fiscal_emitida ? 'true' : 'false';
    if (!grouped[key]) {
      grouped[key] = {
        nota_fiscal_emitida: row.nota_fiscal_emitida ?? false,
        total_eventos: 0,
        total_pago: 0,
        total_a_pagar: 0,
        total_contrato: 0,
      };
    }
    grouped[key].total_eventos++;
    grouped[key].total_pago += Number(row.valor_pago || 0);
    grouped[key].total_a_pagar += Number(row.valor_a_pagar || 0);
    grouped[key].total_contrato += Number(row.valor_total_contrato || 0);
  }

  return Object.values(grouped);
}

export async function toggleNotaFiscal(
  recebimentoId: string,
  emitida: boolean,
  extras?: { data_emissao_nf?: string; numero_nf?: string }
): Promise<void> {
  const { error } = await supabase
    .from('controle_recebimentos')
    .update({
      nota_fiscal_emitida: emitida,
      data_emissao_nf: extras?.data_emissao_nf || null,
      numero_nf: extras?.numero_nf || null,
    })
    .eq('id', recebimentoId);

  if (error) throw error;
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { formatBRL } from '../../utils/formatters';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CRRecord {
  id: string;
  nota_fiscal_emitida: boolean;
  numero_nf: string | null;
  data_emissao_nf: string | null;
  valor_pago: number;
  valor_a_pagar: number;
  valor_total_contrato: number;
}

interface FinRow {
  id: string;
  protocolo: string;
  nome_contratante: string;
  nome_fantasia: string | null;
  tipo_pessoa: string;
  data_evento: string | null;
  valor_pago_importado: number;
  valor_a_pagar_importado: number;
  controle_recebimentos: CRRecord[];
}

type NFFilter     = 'all' | 'com_nf' | 'sem_nf';
type PagoFilter   = 'all' | 'a_receber' | 'quitado';
type SortField    = 'data_evento' | 'pago' | 'a_pagar' | 'total' | 'protocolo';
type SortDir      = 'asc' | 'desc';
type DatePreset   = 'este_ano' | '3m' | '6m' | '12m' | 'custom';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—';
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : val;
}

function dateKey(val: string | null | undefined): string {
  if (!val) return '00000000';
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}${m[2]}${m[3]}` : '00000000';
}

/** toYMD: Date → 'YYYY-MM-DD' sem fuso */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Calcula dateFrom/dateTo para cada preset */
function presetRange(preset: DatePreset): { from: string; to: string } | null {
  if (preset === 'custom') return null;
  const today = new Date();
  if (preset === 'este_ano') {
    return {
      from: `${today.getFullYear()}-01-01`,
      to:   `${today.getFullYear()}-12-31`,
    };
  }
  const months = preset === '3m' ? 3 : preset === '6m' ? 6 : 12;
  const from = new Date(today);
  from.setMonth(from.getMonth() - months);
  return { from: toYMD(from), to: toYMD(today) };
}

/** Valores financeiros: controle_recebimentos tem prioridade se não-zero */
function getValores(row: FinRow): { pago: number; aPagar: number; total: number } {
  const cr = row.controle_recebimentos?.[0];
  const pago   = (cr && cr.valor_pago   > 0) ? cr.valor_pago   : (row.valor_pago_importado   ?? 0);
  const aPagar = (cr && cr.valor_a_pagar > 0) ? cr.valor_a_pagar : (row.valor_a_pagar_importado ?? 0);
  return { pago, aPagar, total: pago + aPagar };
}

function nfEmitida(row: FinRow): boolean {
  return row.controle_recebimentos?.[0]?.nota_fiscal_emitida ?? false;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FinancialSummary() {
  const [rows,    setRows]    = useState<FinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  // Filters
  const [search,      setSearch]      = useState('');
  const [nfFilter,    setNfFilter]    = useState<NFFilter>('all');
  const [pagoFilter,  setPagoFilter]  = useState<PagoFilter>('all');
  const [datePreset,  setDatePreset]  = useState<DatePreset>('este_ano');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('data_evento');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  // NF editing
  const [editingNF, setEditingNF] = useState<string | null>(null);
  const [nfForm,    setNfForm]    = useState({ numero_nf: '', data_emissao_nf: '' });
  const [savingNF,  setSavingNF]  = useState(false);

  // Value editing
  const [editingVal, setEditingVal] = useState<string | null>(null); // row.id
  const [valForm,    setValForm]    = useState({ pago: '', a_pagar: '' });
  const [savingVal,  setSavingVal]  = useState(false);

  // Delete
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  // Zerar
  const [confirmZerar, setConfirmZerar] = useState(false);
  const [zerando,      setZerando]      = useState(false);

  // ── Computed date range from preset ────────────────────────────────────────

  const activeDateRange = useMemo((): { from: string; to: string } => {
    if (datePreset === 'custom') return { from: customFrom, to: customTo };
    return presetRange(datePreset) ?? { from: '', to: '' };
  }, [datePreset, customFrom, customTo]);

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const { data, error } = await supabase
        .from('formularios_eventos')
        .select(`
          id, protocolo, nome_contratante, nome_fantasia, tipo_pessoa, data_evento,
          valor_pago_importado, valor_a_pagar_importado,
          controle_recebimentos (
            id, nota_fiscal_emitida, numero_nf, data_emissao_nf,
            valor_pago, valor_a_pagar, valor_total_contrato
          )
        `)
        .eq('is_imported', true)
        .order('data_evento', { ascending: false })
        .limit(2000);

      if (error) { setLoadErr(error.message); return; }
      setRows((data || []) as unknown as FinRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const { from, to } = activeDateRange;
    return rows.filter(row => {
      const { aPagar } = getValores(row);
      const nome = row.tipo_pessoa === 'PF'
        ? (row.nome_contratante || '')
        : (row.nome_fantasia || row.nome_contratante || '');

      if (search) {
        const q = search.toLowerCase();
        if (!nome.toLowerCase().includes(q) && !row.protocolo?.toLowerCase().includes(q)) return false;
      }
      if (nfFilter === 'com_nf' && !nfEmitida(row)) return false;
      if (nfFilter === 'sem_nf' &&  nfEmitida(row)) return false;
      if (pagoFilter === 'quitado'   && aPagar >  0) return false;
      if (pagoFilter === 'a_receber' && aPagar <= 0) return false;

      const key = dateKey(row.data_evento);
      if (from && key < from.replace(/-/g, '')) return false;
      if (to   && key > to.replace(/-/g, ''))   return false;

      return true;
    });
  }, [rows, search, nfFilter, pagoFilter, activeDateRange]);

  // ── Sorting ────────────────────────────────────────────────────────────────

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (sortField) {
      case 'data_evento': va = dateKey(a.data_evento); vb = dateKey(b.data_evento); break;
      case 'pago':        va = getValores(a).pago;     vb = getValores(b).pago;     break;
      case 'a_pagar':     va = getValores(a).aPagar;   vb = getValores(b).aPagar;   break;
      case 'total':       va = getValores(a).total;    vb = getValores(b).total;    break;
      case 'protocolo':   va = a.protocolo || '';      vb = b.protocolo || '';      break;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  }), [filtered, sortField, sortDir]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalPago   = filtered.reduce((s, r) => s + getValores(r).pago,   0);
  const totalAPagar = filtered.reduce((s, r) => s + getValores(r).aPagar, 0);
  const totalGeral  = filtered.reduce((s, r) => s + getValores(r).total,  0);

  const comNFRows = rows.filter(nfEmitida);
  const semNFRows = rows.filter(r => !nfEmitida(r));

  // ── Actions ───────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // NF toggle
  const handleToggleNF = async (row: FinRow) => {
    const cr = row.controle_recebimentos?.[0];
    const current = cr?.nota_fiscal_emitida ?? false;
    if (!cr) {
      const { pago, aPagar, total } = getValores(row);
      await supabase.from('controle_recebimentos').insert({
        formulario_evento_id: row.id, nota_fiscal_emitida: !current,
        valor_pago: pago, valor_a_pagar: aPagar, valor_total_contrato: total,
      });
    } else {
      await supabase.from('controle_recebimentos')
        .update({ nota_fiscal_emitida: !current }).eq('id', cr.id);
    }
    await load();
  };

  // NF form
  const openEditNF = (row: FinRow) => {
    const cr = row.controle_recebimentos?.[0];
    setNfForm({ numero_nf: cr?.numero_nf || '', data_emissao_nf: cr?.data_emissao_nf || '' });
    setEditingNF(row.id);
  };

  const handleSaveNF = async (row: FinRow) => {
    setSavingNF(true);
    try {
      const cr = row.controle_recebimentos?.[0];
      const payload = {
        nota_fiscal_emitida: true,
        numero_nf: nfForm.numero_nf || null,
        data_emissao_nf: nfForm.data_emissao_nf || null,
      };
      if (!cr) {
        const { pago, aPagar, total } = getValores(row);
        await supabase.from('controle_recebimentos').insert({
          formulario_evento_id: row.id,
          valor_pago: pago, valor_a_pagar: aPagar, valor_total_contrato: total, ...payload,
        });
      } else {
        await supabase.from('controle_recebimentos').update(payload).eq('id', cr.id);
      }
      setEditingNF(null);
      await load();
    } finally { setSavingNF(false); }
  };

  // Value editing
  const openEditVal = (row: FinRow) => {
    const { pago, aPagar } = getValores(row);
    setValForm({ pago: pago > 0 ? String(pago) : '', a_pagar: aPagar > 0 ? String(aPagar) : '' });
    setEditingVal(row.id);
  };

  const handleSaveVal = async (row: FinRow) => {
    setSavingVal(true);
    try {
      const pago   = parseFloat(valForm.pago.replace(',', '.'))   || 0;
      const aPagar = parseFloat(valForm.a_pagar.replace(',', '.')) || 0;
      const total  = pago + aPagar;

      // Update formularios_eventos (primary storage)
      await supabase.from('formularios_eventos').update({
        valor_pago_importado: pago,
        valor_a_pagar_importado: aPagar,
      }).eq('id', row.id);

      // Update controle_recebimentos if it exists
      const cr = row.controle_recebimentos?.[0];
      if (cr) {
        await supabase.from('controle_recebimentos').update({
          valor_pago: pago, valor_a_pagar: aPagar, valor_total_contrato: total,
        }).eq('id', cr.id);
      } else {
        await supabase.from('controle_recebimentos').insert({
          formulario_evento_id: row.id,
          valor_pago: pago, valor_a_pagar: aPagar, valor_total_contrato: total,
          nota_fiscal_emitida: false,
        });
      }
      setEditingVal(null);
      await load();
    } finally { setSavingVal(false); }
  };

  // Delete
  const handleDelete = async (row: FinRow) => {
    setDeleting(true);
    try {
      await supabase.from('controle_recebimentos').delete().eq('formulario_evento_id', row.id);
      await supabase.from('formularios_eventos').delete().eq('id', row.id);
      setConfirmDel(null);
      setRows(prev => prev.filter(r => r.id !== row.id));
    } finally { setDeleting(false); }
  };

  // Zerar
  const handleZerar = async () => {
    setZerando(true);
    try {
      const { data: ids } = await supabase
        .from('formularios_eventos').select('id').eq('is_imported', true);
      if (ids?.length) {
        await supabase.from('controle_recebimentos')
          .delete().in('formulario_evento_id', ids.map((r: any) => r.id));
      }
      await supabase.from('formularios_eventos').delete().eq('is_imported', true);
      setRows([]);
      setConfirmZerar(false);
    } finally { setZerando(false); }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────

  const Th = ({ field, label, style }: { field: SortField; label: string; style?: React.CSSProperties }) => (
    <th onClick={() => toggleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}>
      {label}&nbsp;{sortField === field
        ? (sortDir === 'asc' ? '↑' : '↓')
        : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );

  const presetLabels: { id: DatePreset; label: string }[] = [
    { id: 'este_ano', label: 'Este ano' },
    { id: '3m',       label: '3 meses'  },
    { id: '6m',       label: '6 meses'  },
    { id: '12m',      label: '12 meses' },
    { id: 'custom',   label: '📅 Personalizado' },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="admin-page-title">Financeiro / NF</div>
          <div className="admin-page-subtitle">Controle financeiro e emissão de notas fiscais.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.82rem' }}>
            🔄 Atualizar
          </button>
          {rows.length > 0 && (
            <button onClick={() => setConfirmZerar(true)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              🗑️ Zerar painel
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {loadErr && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: '0.85rem', color: '#ef4444' }}>
          <strong>⚠️ Erro:</strong> {loadErr}
          <br /><span style={{ fontSize: '0.78rem' }}>Execute a migration <strong>007_financial_columns.sql</strong> no Supabase SQL Editor.</span>
        </div>
      )}

      {/* NF Cards */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>✅ Com Nota Fiscal</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{comNFRows.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.82rem' }}>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Recebido</div>
                <div style={{ fontWeight: 700, color: '#22c55e' }}>{formatBRL(comNFRows.reduce((s,r)=>s+getValores(r).pago,0))}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>A receber</div>
                <div style={{ fontWeight: 700 }}>{formatBRL(comNFRows.reduce((s,r)=>s+getValores(r).aPagar,0))}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Total contratos</div>
                <div style={{ fontWeight: 700 }}>{formatBRL(comNFRows.reduce((s,r)=>s+getValores(r).total,0))}</div></div>
            </div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: '#ef4444' }}>✗ Sem Nota Fiscal</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{semNFRows.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.82rem' }}>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Recebido</div>
                <div style={{ fontWeight: 700, color: '#22c55e' }}>{formatBRL(semNFRows.reduce((s,r)=>s+getValores(r).pago,0))}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>A receber</div>
                <div style={{ fontWeight: 700, color: '#ef4444' }}>{formatBRL(semNFRows.reduce((s,r)=>s+getValores(r).aPagar,0))}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Total contratos</div>
                <div style={{ fontWeight: 700 }}>{formatBRL(semNFRows.reduce((s,r)=>s+getValores(r).total,0))}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>

        {/* Row 1: search + situação + NF */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input type="text" placeholder="Buscar nome ou protocolo..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 160, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem' }} />

          {/* Situação */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all','a_receber','quitado'] as PagoFilter[]).map(f => (
              <button key={f} onClick={() => setPagoFilter(f)}
                style={{ padding: '6px 11px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600,
                  background: pagoFilter === f ? 'var(--color-secondary)' : 'var(--color-surface)',
                  color: pagoFilter === f ? '#fff' : 'var(--color-text-secondary)' }}>
                {f === 'all' ? 'Todos' : f === 'a_receber' ? '● A receber' : '✔ Quitado'}
              </button>
            ))}
          </div>

          {/* NF */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all','com_nf','sem_nf'] as NFFilter[]).map(f => (
              <button key={f} onClick={() => setNfFilter(f)}
                style={{ padding: '6px 11px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600,
                  background: nfFilter === f ? 'var(--color-secondary)' : 'var(--color-surface)',
                  color: nfFilter === f ? '#fff' : 'var(--color-text-secondary)' }}>
                {f === 'all' ? 'Todos NF' : f === 'com_nf' ? '✅ Com NF' : '✗ Sem NF'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: date preset pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginRight: 4 }}>Período:</span>
          {presetLabels.map(({ id, label }) => (
            <button key={id} onClick={() => setDatePreset(id)}
              style={{ padding: '6px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                background: datePreset === id ? 'var(--color-secondary)' : 'var(--color-surface)',
                color: datePreset === id ? '#fff' : 'var(--color-text-secondary)' }}>
              {label}
            </button>
          ))}

          {/* Custom pickers — shown only when 'custom' selected */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 4 }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.78rem' }} />
              <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem' }}>até</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.78rem' }} />
            </div>
          )}
        </div>

        {/* Totals bar */}
        {filtered.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-surface-border)', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>{filtered.length} de {rows.length} registro(s)</span>
            <span>Pago: <strong style={{ color: '#22c55e' }}>{formatBRL(totalPago)}</strong></span>
            <span>A receber: <strong style={{ color: '#ef4444' }}>{formatBRL(totalAPagar)}</strong></span>
            <span>Total: <strong style={{ color: 'var(--color-secondary)' }}>{formatBRL(totalGeral)}</strong></span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />Carregando...
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Nenhum registro</div>
          <div style={{ fontSize: '0.85rem' }}>Importe a planilha na aba <strong>Histórico</strong>.</div>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Nenhum registro para o filtro selecionado.
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <Th field="protocolo"   label="Protocolo" />
                <th>Contratante</th>
                <Th field="data_evento" label="Data Evento" />
                <Th field="pago"        label="Pago" style={{ color: '#22c55e' }} />
                <Th field="a_pagar"     label="A Receber" />
                <Th field="total"       label="Total" />
                <th>NF</th>
                <th>Nº NF</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const { pago, aPagar, total } = getValores(row);
                const cr = row.controle_recebimentos?.[0];
                const nf = nfEmitida(row);
                const nome = row.tipo_pessoa === 'PF'
                  ? row.nome_contratante
                  : (row.nome_fantasia || row.nome_contratante);
                const isEditNF  = editingNF  === row.id;
                const isEditVal = editingVal === row.id;
                const isConfDel = confirmDel  === row.id;

                // Preview total while editing
                const editPago   = parseFloat(valForm.pago.replace(',','.'))   || 0;
                const editAPagar = parseFloat(valForm.a_pagar.replace(',','.')) || 0;
                const editTotal  = editPago + editAPagar;

                return (
                  <tr key={row.id}>
                    {/* Protocolo */}
                    <td><code style={{ fontSize: '0.72rem', color: 'var(--color-secondary)', fontWeight: 600 }}>{row.protocolo}</code></td>

                    {/* Nome */}
                    <td style={{ maxWidth: 180, fontWeight: 500, fontSize: '0.875rem' }}>{nome}</td>

                    {/* Data */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{fmtDate(row.data_evento)}</td>

                    {/* PAGO — inline edit */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isEditVal ? (
                        <input
                          type="number" step="0.01" min="0"
                          value={valForm.pago}
                          onChange={e => setValForm(p => ({ ...p, pago: e.target.value }))}
                          style={{ width: 110, padding: '5px 8px', borderRadius: 6, border: '1px solid #22c55e', background: 'var(--color-surface)', color: '#22c55e', fontWeight: 700, fontSize: '0.85rem' }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span style={{ fontWeight: 700, color: '#22c55e' }}>{formatBRL(pago)}</span>
                      )}
                    </td>

                    {/* A PAGAR — inline edit */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isEditVal ? (
                        <input
                          type="number" step="0.01" min="0"
                          value={valForm.a_pagar}
                          onChange={e => setValForm(p => ({ ...p, a_pagar: e.target.value }))}
                          style={{ width: 110, padding: '5px 8px', borderRadius: 6, border: '1px solid #ef4444', background: 'var(--color-surface)', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: aPagar > 0 ? '#ef4444' : 'var(--color-muted)' }}>{formatBRL(aPagar)}</span>
                      )}
                    </td>

                    {/* TOTAL — live update while editing */}
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                      {isEditVal ? (
                        <span style={{ color: 'var(--color-secondary)', fontWeight: 800 }}>
                          {formatBRL(editTotal)}
                        </span>
                      ) : formatBRL(total)}
                    </td>

                    {/* NF */}
                    <td>
                      {isEditNF ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 180 }}>
                          <input type="text" placeholder="Nº NF"
                            value={nfForm.numero_nf}
                            onChange={e => setNfForm(p => ({ ...p, numero_nf: e.target.value }))}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem' }} />
                          <input type="date"
                            value={nfForm.data_emissao_nf}
                            onChange={e => setNfForm(p => ({ ...p, data_emissao_nf: e.target.value }))}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem' }} />
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => handleSaveNF(row)} disabled={savingNF}
                              style={{ flex: 1, padding: '4px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                              {savingNF ? '...' : '✓ Salvar'}
                            </button>
                            <button onClick={() => setEditingNF(null)}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                          </div>
                        </div>
                      ) : nf ? (
                        <button onClick={() => handleToggleNF(row)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                          ✅ Emitida
                        </button>
                      ) : (
                        <button onClick={() => openEditNF(row)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                          ✗ Não emitida
                        </button>
                      )}
                    </td>

                    {/* Nº NF */}
                    <td style={{ fontSize: '0.8rem' }}>
                      {cr?.numero_nf ? (
                        <span style={{ fontWeight: 600 }}>{cr.numero_nf}</span>
                      ) : nf ? (
                        <button onClick={() => openEditNF(row)}
                          style={{ padding: '2px 7px', borderRadius: 4, border: '1px dashed var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--color-muted)' }}>
                          + Nº
                        </button>
                      ) : '—'}
                      {cr?.data_emissao_nf && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: 1 }}>{fmtDate(cr.data_emissao_nf)}</div>
                      )}
                    </td>

                    {/* Ações */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isEditVal ? (
                        /* Save / Cancel value editing */
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleSaveVal(row)} disabled={savingVal}
                            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'var(--color-secondary)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                            {savingVal ? '...' : '💾'}
                          </button>
                          <button onClick={() => setEditingVal(null)}
                            style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                        </div>
                      ) : isConfDel ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleDelete(row)} disabled={deleting}
                            style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                            {deleting ? '...' : 'Confirmar'}
                          </button>
                          <button onClick={() => setConfirmDel(null)}
                            style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={() => { setEditingNF(null); openEditVal(row); }}
                            title="Editar valores"
                            style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
                            ✏️
                          </button>
                          <button onClick={() => setConfirmDel(row.id)}
                            title="Excluir" style={{ padding: '3px 7px', borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem' }}>
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Zerar modal ── */}
      {confirmZerar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 16, padding: 32, maxWidth: 440, width: '100%' }}>
            <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textAlign: 'center', marginBottom: 8 }}>Zerar todo o painel?</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 24, lineHeight: 1.7 }}>
              Remove <strong>todos os {rows.length} registros</strong> e dados financeiros.<br />
              <strong style={{ color: '#ef4444' }}>Ação irreversível.</strong>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmZerar(false)} disabled={zerando}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={handleZerar} disabled={zerando}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: zerando ? '#888' : '#ef4444', color: '#fff', cursor: zerando ? 'wait' : 'pointer', fontWeight: 700 }}>
                {zerando ? '⏳ Apagando...' : '🗑️ Sim, zerar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

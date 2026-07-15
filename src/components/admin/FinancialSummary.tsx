import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { formatBRL } from '../../utils/formatters';

// ─── Types ─────────────────────────────────────────────────────────────────

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

type NFFilter   = 'all' | 'com_nf' | 'sem_nf';
type PagoFilter = 'all' | 'a_receber' | 'quitado';
type SortField  = 'data_evento' | 'pago' | 'a_pagar' | 'total' | 'protocolo';
type SortDir    = 'asc' | 'desc';

// ─── Pure helpers ───────────────────────────────────────────────────────────

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

/** Returns financial values for a row.
 *  Priority: controle_recebimentos (if non-zero) → valor_pago_importado */
function getValores(row: FinRow): { pago: number; aPagar: number; total: number } {
  const cr = row.controle_recebimentos?.[0];
  // Use controle_recebimentos values if they are non-zero (manually set)
  const pago   = (cr && cr.valor_pago   > 0) ? cr.valor_pago   : (row.valor_pago_importado   ?? 0);
  const aPagar = (cr && cr.valor_a_pagar > 0) ? cr.valor_a_pagar : (row.valor_a_pagar_importado ?? 0);
  return { pago, aPagar, total: pago + aPagar };
}

function nfEmitida(row: FinRow): boolean {
  return row.controle_recebimentos?.[0]?.nota_fiscal_emitida ?? false;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FinancialSummary() {
  const [rows,     setRows]     = useState<FinRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState('');

  // Filters
  const [search,     setSearch]     = useState('');
  const [nfFilter,   setNfFilter]   = useState<NFFilter>('all');
  const [pagoFilter, setPagoFilter] = useState<PagoFilter>('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('data_evento');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  // NF editing
  const [editingNF, setEditingNF] = useState<string | null>(null);
  const [nfForm,    setNfForm]    = useState({ numero_nf: '', data_emissao_nf: '' });
  const [savingNF,  setSavingNF]  = useState(false);

  // Delete
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  // Zerar
  const [confirmZerar, setConfirmZerar] = useState(false);
  const [zerando,      setZerando]      = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const { data, error } = await supabase
        .from('formularios_eventos')
        .select(`
          id,
          protocolo,
          nome_contratante,
          nome_fantasia,
          tipo_pessoa,
          data_evento,
          valor_pago_importado,
          valor_a_pagar_importado,
          controle_recebimentos (
            id,
            nota_fiscal_emitida,
            numero_nf,
            data_emissao_nf,
            valor_pago,
            valor_a_pagar,
            valor_total_contrato
          )
        `)
        .eq('is_imported', true)
        .order('data_evento', { ascending: false })
        .limit(2000);

      if (error) {
        setLoadErr(error.message);
        console.error('[FinancialSummary] load error:', error);
      }
      setRows((data || []) as unknown as FinRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = rows.filter(row => {
    const { pago, aPagar } = getValores(row);
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

    if (dateFrom) {
      const fromKey = dateFrom.replace(/-/g, '');
      if (dateKey(row.data_evento) < fromKey) return false;
    }
    if (dateTo) {
      const toKey = dateTo.replace(/-/g, '');
      if (dateKey(row.data_evento) > toKey) return false;
    }
    return true;
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  const sorted = [...filtered].sort((a, b) => {
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
  });

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalPago   = filtered.reduce((s, r) => s + getValores(r).pago,   0);
  const totalAPagar = filtered.reduce((s, r) => s + getValores(r).aPagar, 0);
  const totalGeral  = filtered.reduce((s, r) => s + getValores(r).total,  0);

  const comNFRows = rows.filter(nfEmitida);
  const semNFRows = rows.filter(r => !nfEmitida(r));
  const totalPagoComNF   = comNFRows.reduce((s, r) => s + getValores(r).pago,   0);
  const totalPagoSemNF   = semNFRows.reduce((s, r) => s + getValores(r).pago,   0);
  const totalAPagarComNF = comNFRows.reduce((s, r) => s + getValores(r).aPagar, 0);
  const totalAPagarSemNF = semNFRows.reduce((s, r) => s + getValores(r).aPagar, 0);
  const totalContratoComNF = comNFRows.reduce((s, r) => s + getValores(r).total, 0);
  const totalContratoSemNF = semNFRows.reduce((s, r) => s + getValores(r).total, 0);

  // ── Actions ───────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleToggleNF = async (row: FinRow) => {
    const cr = row.controle_recebimentos?.[0];
    const current = cr?.nota_fiscal_emitida ?? false;
    if (!cr) {
      const { pago, aPagar, total } = getValores(row);
      await supabase.from('controle_recebimentos').insert({
        formulario_evento_id: row.id,
        nota_fiscal_emitida: !current,
        valor_pago: pago, valor_a_pagar: aPagar, valor_total_contrato: total,
      });
    } else {
      await supabase.from('controle_recebimentos')
        .update({ nota_fiscal_emitida: !current })
        .eq('id', cr.id);
    }
    await load();
  };

  const openEditNF = (row: FinRow) => {
    const cr = row.controle_recebimentos?.[0];
    setNfForm({
      numero_nf: cr?.numero_nf || '',
      data_emissao_nf: cr?.data_emissao_nf || '',
    });
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
          valor_pago: pago, valor_a_pagar: aPagar, valor_total_contrato: total,
          ...payload,
        });
      } else {
        await supabase.from('controle_recebimentos').update(payload).eq('id', cr.id);
      }
      setEditingNF(null);
      await load();
    } finally {
      setSavingNF(false);
    }
  };

  const handleDelete = async (row: FinRow) => {
    setDeleting(true);
    try {
      await supabase.from('controle_recebimentos').delete().eq('formulario_evento_id', row.id);
      await supabase.from('formularios_eventos').delete().eq('id', row.id);
      setConfirmDel(null);
      setRows(prev => prev.filter(r => r.id !== row.id));
    } finally {
      setDeleting(false);
    }
  };

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
    } finally {
      setZerando(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const Th = ({ field, label, style }: { field: SortField; label: string; style?: React.CSSProperties }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
    >
      {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.4 }}>↕</span>}
    </th>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="admin-page-title">Financeiro / NF</div>
          <div className="admin-page-subtitle">Controle financeiro de eventos históricos importados.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={load}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.82rem' }}
          >🔄 Atualizar</button>
          {rows.length > 0 && (
            <button
              onClick={() => setConfirmZerar(true)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
            >🗑️ Zerar painel</button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {loadErr && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: '0.85rem', color: '#ef4444' }}>
          <strong>⚠️ Erro ao carregar:</strong> {loadErr}
          <br />
          <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>
            Execute a migration <strong>007_financial_columns.sql</strong> no Supabase SQL Editor e tente novamente.
          </span>
        </div>
      )}

      {/* NF Summary cards */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Com NF */}
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#22c55e' }}>✅ Com Nota Fiscal</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>{comNFRows.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Recebido</div><div style={{ fontWeight: 700, color: '#22c55e' }}>{formatBRL(totalPagoComNF)}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>A receber</div><div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{formatBRL(totalAPagarComNF)}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Total contratos</div><div style={{ fontWeight: 700 }}>{formatBRL(totalContratoComNF)}</div></div>
            </div>
          </div>
          {/* Sem NF */}
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ef4444' }}>✗ Sem Nota Fiscal</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>{semNFRows.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Recebido</div><div style={{ fontWeight: 700, color: '#22c55e' }}>{formatBRL(totalPagoSemNF)}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>A receber</div><div style={{ fontWeight: 700, color: '#ef4444' }}>{formatBRL(totalAPagarSemNF)}</div></div>
              <div><div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Total contratos</div><div style={{ fontWeight: 700 }}>{formatBRL(totalContratoSemNF)}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar nome ou protocolo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 180, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.85rem' }}
          />

          {/* Situação filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'a_receber', 'quitado'] as PagoFilter[]).map(f => (
              <button key={f} onClick={() => setPagoFilter(f)}
                style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  background: pagoFilter === f ? 'var(--color-secondary)' : 'var(--color-surface)',
                  color: pagoFilter === f ? '#fff' : 'var(--color-text-secondary)' }}
              >{f === 'all' ? 'Todos' : f === 'a_receber' ? '● A receber' : '✔ Quitado'}</button>
            ))}
          </div>

          {/* NF filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'com_nf', 'sem_nf'] as NFFilter[]).map(f => (
              <button key={f} onClick={() => setNfFilter(f)}
                style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  background: nfFilter === f ? 'var(--color-secondary)' : 'var(--color-surface)',
                  color: nfFilter === f ? '#fff' : 'var(--color-text-secondary)' }}
              >{f === 'all' ? 'Todos NF' : f === 'com_nf' ? '✅ Com NF' : '✗ Sem NF'}</button>
            ))}
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>Evento:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.78rem' }} />
            <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem' }}>até</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.78rem' }} />
          </div>
        </div>

        {/* Totals bar */}
        {filtered.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-surface-border)', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>{filtered.length} registro(s) filtrado(s)</span>
            <span>Pago: <strong style={{ color: '#22c55e' }}>{formatBRL(totalPago)}</strong></span>
            <span>A receber: <strong style={{ color: '#ef4444' }}>{formatBRL(totalAPagar)}</strong></span>
            <span>Total: <strong style={{ color: 'var(--color-secondary)' }}>{formatBRL(totalGeral)}</strong></span>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Carregando...
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Nenhum registro financeiro</div>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            Importe a planilha na aba <strong>Histórico</strong> para ver os dados aqui.
          </div>
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
                <th>NF Emitida</th>
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
                const isEditingThis = editingNF === row.id;
                const isConfirmDel  = confirmDel  === row.id;

                return (
                  <tr key={row.id}>
                    {/* Protocolo */}
                    <td>
                      <code style={{ fontSize: '0.72rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                        {row.protocolo}
                      </code>
                    </td>

                    {/* Nome */}
                    <td style={{ maxWidth: 200, fontWeight: 500, fontSize: '0.875rem' }}>{nome}</td>

                    {/* Data evento */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{fmtDate(row.data_evento)}</td>

                    {/* Pago */}
                    <td style={{ fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap' }}>
                      {formatBRL(pago)}
                    </td>

                    {/* A receber */}
                    <td style={{ fontWeight: 600, color: aPagar > 0 ? '#ef4444' : 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {formatBRL(aPagar)}
                    </td>

                    {/* Total */}
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatBRL(total)}</td>

                    {/* NF */}
                    <td>
                      {isEditingThis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                          <input
                            type="text"
                            placeholder="Nº NF"
                            value={nfForm.numero_nf}
                            onChange={e => setNfForm(p => ({ ...p, numero_nf: e.target.value }))}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem' }}
                          />
                          <input
                            type="date"
                            value={nfForm.data_emissao_nf}
                            onChange={e => setNfForm(p => ({ ...p, data_emissao_nf: e.target.value }))}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.8rem' }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleSaveNF(row)}
                              disabled={savingNF}
                              style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                            >{savingNF ? '...' : '✓ Salvar'}</button>
                            <button
                              onClick={() => setEditingNF(null)}
                              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}
                            >✕</button>
                          </div>
                        </div>
                      ) : nf ? (
                        <button
                          onClick={() => handleToggleNF(row)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                        >✅ Emitida</button>
                      ) : (
                        <button
                          onClick={() => openEditNF(row)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                        >✗ Não emitida</button>
                      )}
                    </td>

                    {/* Nº NF */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                      {cr?.numero_nf ? (
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{cr.numero_nf}</span>
                      ) : nf ? (
                        <button onClick={() => openEditNF(row)}
                          style={{ padding: '2px 8px', borderRadius: 4, border: '1px dashed var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-muted)' }}
                        >+ Nº</button>
                      ) : '—'}
                      {cr?.data_emissao_nf && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: 2 }}>
                          {fmtDate(cr.data_emissao_nf)}
                        </div>
                      )}
                    </td>

                    {/* Ações */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isConfirmDel ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleDelete(row)}
                            disabled={deleting}
                            style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                          >{deleting ? '...' : 'Confirmar'}</button>
                          <button
                            onClick={() => setConfirmDel(null)}
                            style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem' }}
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDel(row.id)}
                          style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem' }}
                          title="Excluir registro"
                        >🗑️</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Zerar confirmation modal ───────────────────────────────────────── */}
      {confirmZerar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 16, padding: 32, maxWidth: 440, width: '100%' }}>
            <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textAlign: 'center', marginBottom: 8 }}>Zerar todo o painel financeiro?</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 24, lineHeight: 1.7 }}>
              Apaga <strong>todos os {rows.length} registros</strong> financeiros e seus formulários importados.<br />
              <strong style={{ color: '#ef4444' }}>Ação irreversível.</strong>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmZerar(false)}
                disabled={zerando}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
              >Cancelar</button>
              <button
                onClick={handleZerar}
                disabled={zerando}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: zerando ? '#888' : '#ef4444', color: '#fff', cursor: zerando ? 'wait' : 'pointer', fontWeight: 700 }}
              >{zerando ? '⏳ Apagando...' : '🗑️ Sim, zerar tudo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

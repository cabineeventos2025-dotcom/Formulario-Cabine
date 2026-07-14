import React, { useState, useEffect } from 'react';
import { loadFinancialSummary, toggleNotaFiscal, type FinancialSummaryRow } from '../../services/importService';
import { supabase } from '../../lib/supabase';
import { formatBRL } from '../../utils/formatters';

type NFFilter  = 'all' | 'com_nf' | 'sem_nf';
type SortField = 'data_evento' | 'valor_total_contrato' | 'valor_pago' | 'valor_a_pagar' | 'protocolo';
type SortDir   = 'asc' | 'desc';

interface RecebimentoRecord {
  id: string;
  formulario_evento_id: string;
  valor_total_contrato: number;
  valor_pago: number;
  valor_a_pagar: number;
  nota_fiscal_emitida: boolean;
  data_emissao_nf: string | null;
  numero_nf: string | null;
  formularios_eventos: {
    protocolo: string;
    nome_contratante: string;
    nome_fantasia: string;
    data_evento: string;
    tipo_pessoa: string;
  };
}

function parseDateBR(val: string | null | undefined): Date | null {
  if (!val) return null;
  // ISO format YYYY-MM-DD from Supabase
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return null;
}

function formatDateBR(val: string | null | undefined): string {
  const d = parseDateBR(val);
  return d ? d.toLocaleDateString('pt-BR') : '—';
}

export function FinancialSummary() {
  const [nfFilter,   setNfFilter]   = useState<NFFilter>('all');
  const [summary,    setSummary]    = useState<FinancialSummaryRow[]>([]);
  const [recebimentos, setRecebimentos] = useState<RecebimentoRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toggling,   setToggling]   = useState<string | null>(null);
  const [editingNF,  setEditingNF]  = useState<string | null>(null);
  const [nfForm,     setNfForm]     = useState({ data_emissao_nf: '', numero_nf: '' });
  const [confirmDelRec, setConfirmDelRec] = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  // Date / period filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('data_evento');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [sumData, recData] = await Promise.all([
        loadFinancialSummary(),
        supabase
          .from('controle_recebimentos')
          .select(`
            id,
            formulario_evento_id,
            valor_total_contrato,
            valor_pago,
            valor_a_pagar,
            nota_fiscal_emitida,
            data_emissao_nf,
            numero_nf,
            formularios_eventos (
              protocolo,
              nome_contratante,
              nome_fantasia,
              data_evento,
              tipo_pessoa
            )
          `)
          .order('formulario_evento_id', { ascending: false }),
      ]);
      setSummary(sumData);
      setRecebimentos((recData.data || []) as unknown as RecebimentoRecord[]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNF = async (rec: RecebimentoRecord) => {
    if (rec.nota_fiscal_emitida) {
      setToggling(rec.id);
      try {
        await toggleNotaFiscal(rec.id, false);
        await load();
      } finally { setToggling(null); }
    } else {
      setEditingNF(rec.id);
      setNfForm({ data_emissao_nf: '', numero_nf: '' });
    }
  };

  const handleSaveNF = async (recId: string) => {
    setToggling(recId);
    try {
      await toggleNotaFiscal(recId, true, {
        data_emissao_nf: nfForm.data_emissao_nf || undefined,
        numero_nf: nfForm.numero_nf || undefined,
      });
      setEditingNF(null);
      await load();
    } finally { setToggling(null); }
  };

  const handleDeleteRec = async (id: string) => {
    setDeleting(true);
    try {
      await supabase.from('controle_recebimentos').delete().eq('id', id);
      setConfirmDelRec(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}> ⇅</span>;
    return <span style={{ color: 'var(--color-secondary)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  // ── Apply filters ──
  const filtered = recebimentos.filter(r => {
    // NF filter
    if (nfFilter === 'com_nf' && !r.nota_fiscal_emitida) return false;
    if (nfFilter === 'sem_nf' && r.nota_fiscal_emitida)  return false;

    // Date/period filter (by data_evento)
    const fe = r.formularios_eventos as any;
    const evDate = parseDateBR(fe?.data_evento);
    if (dateFrom && evDate) {
      const from = new Date(dateFrom + 'T00:00:00');
      if (evDate < from) return false;
    }
    if (dateTo && evDate) {
      const to = new Date(dateTo + 'T23:59:59');
      if (evDate > to) return false;
    }

    return true;
  });

  // ── Apply sort ──
  const sorted = [...filtered].sort((a, b) => {
    const feA = a.formularios_eventos as any;
    const feB = b.formularios_eventos as any;
    let valA: any;
    let valB: any;

    switch (sortField) {
      case 'data_evento':
        valA = parseDateBR(feA?.data_evento)?.getTime() ?? 0;
        valB = parseDateBR(feB?.data_evento)?.getTime() ?? 0;
        break;
      case 'protocolo':
        valA = feA?.protocolo || '';
        valB = feB?.protocolo || '';
        break;
      case 'valor_total_contrato':
        valA = Number(a.valor_total_contrato || 0);
        valB = Number(b.valor_total_contrato || 0);
        break;
      case 'valor_pago':
        valA = Number(a.valor_pago || 0);
        valB = Number(b.valor_pago || 0);
        break;
      case 'valor_a_pagar':
        valA = Number(a.valor_a_pagar || 0);
        valB = Number(b.valor_a_pagar || 0);
        break;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // ── Totals ──
  const comNF  = summary.find(s => s.nota_fiscal_emitida);
  const semNF  = summary.find(s => !s.nota_fiscal_emitida);
  const totals = {
    total_pago:     (comNF?.total_pago || 0) + (semNF?.total_pago || 0),
    total_a_pagar:  (comNF?.total_a_pagar || 0) + (semNF?.total_a_pagar || 0),
    total_contrato: (comNF?.total_contrato || 0) + (semNF?.total_contrato || 0),
    total_eventos:  (comNF?.total_eventos || 0) + (semNF?.total_eventos || 0),
  };

  const filteredTotals = {
    pago:  sorted.reduce((s, r) => s + Number(r.valor_pago || 0), 0),
    falta: sorted.reduce((s, r) => s + Number(r.valor_a_pagar || 0), 0),
    total: sorted.reduce((s, r) => s + Number(r.valor_total_contrato || 0), 0),
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--color-surface-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '0.83rem',
    height: 34,
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px',
    borderRadius: 20,
    border: '1px solid',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    fontSize: '0.83rem',
    background: active ? 'var(--color-secondary)' : 'transparent',
    borderColor: active ? 'var(--color-secondary)' : 'var(--color-surface-border)',
    color: active ? '#000' : 'var(--color-text-secondary)',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div>
      <div className="admin-page-title">Painel Financeiro</div>
      <div className="admin-page-subtitle">Subtotais de recebimentos com controle de Nota Fiscal.</div>

      {/* Big summary cards */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {[
          { label: 'Total de eventos', value: totals.total_eventos },
          { label: 'Total recebido',   value: formatBRL(totals.total_pago) },
          { label: 'Ainda a receber',  value: formatBRL(totals.total_a_pagar), highlight: true },
          { label: 'Total contratos',  value: formatBRL(totals.total_contrato) },
        ].map(c => (
          <div key={c.label} className="stat-card" style={c.highlight ? { borderColor: '#ef4444' } : {}}>
            <div className="stat-value" style={c.highlight ? { color: '#ef4444' } : {}}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* NF breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {[
          { label: '✅ Com Nota Fiscal', data: comNF, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)' },
          { label: '❌ Sem Nota Fiscal', data: semNF, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontWeight: 700, color: card.color, marginBottom: 12, fontSize: '0.95rem' }}>{card.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>Eventos</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>{card.data?.total_eventos || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>Recebido</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>{formatBRL(card.data?.total_pago || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>A receber</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{formatBRL(card.data?.total_a_pagar || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>Total contratos</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: card.color }}>{formatBRL(card.data?.total_contrato || 0)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTERS BAR ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-surface-border)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'flex-end',
      }}>
        {/* NF filter chips */}
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Nota Fiscal
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { id: 'all',    label: 'Todos' },
              { id: 'com_nf', label: '✅ Com NF' },
              { id: 'sem_nf', label: '❌ Sem NF' },
            ] as { id: NFFilter; label: string }[]).map(f => (
              <button key={f.id} onClick={() => setNfFilter(f.id)} style={chipStyle(nfFilter === f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period: from */}
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Evento: de
          </div>
          <input
            type="date"
            style={inputStyle}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>

        {/* Period: to */}
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Evento: até
          </div>
          <input
            type="date"
            style={inputStyle}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        {/* Clear button */}
        {(dateFrom || dateTo || nfFilter !== 'all') && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setNfFilter('all'); }}
            style={{
              ...chipStyle(false),
              borderColor: 'rgba(239,68,68,0.4)',
              color: '#ef4444',
              alignSelf: 'flex-end',
            }}
          >
            ✕ Limpar filtros
          </button>
        )}

        {/* Subtotals */}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-end', textAlign: 'right' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''} filtrado{sorted.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-muted)' }}>
              Pago: <strong style={{ color: '#22c55e' }}>{formatBRL(filteredTotals.pago)}</strong>
            </span>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-muted)' }}>
              A receber: <strong style={{ color: '#ef4444' }}>{formatBRL(filteredTotals.falta)}</strong>
            </span>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-muted)' }}>
              Total: <strong style={{ color: 'var(--color-secondary)' }}>{formatBRL(filteredTotals.total)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              {([
                { label: 'Protocolo',    field: 'protocolo'            },
                { label: 'Contratante',  field: null                   },
                { label: 'Data Evento',  field: 'data_evento'          },
                { label: 'Pago',         field: 'valor_pago'           },
                { label: 'A Receber',    field: 'valor_a_pagar'        },
                { label: 'Total',        field: 'valor_total_contrato' },
                { label: 'NF Emitida',   field: null                   },
                { label: 'Nº NF',        field: null                   },
                { label: 'Ações',        field: null                   },
              ] as { label: string; field: SortField | null }[]).map(h => (
                <th
                  key={h.label}
                  onClick={h.field ? () => handleSort(h.field!) : undefined}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'var(--color-surface-hover)',
                    color: sortField === h.field ? 'var(--color-secondary)' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                    borderBottom: '1px solid var(--color-surface-border)',
                    whiteSpace: 'nowrap',
                    cursor: h.field ? 'pointer' : 'default',
                    userSelect: 'none',
                    transition: 'color 0.15s',
                  }}
                >
                  {h.label}{h.field && <SortIcon field={h.field} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)' }}>
                  Nenhum registro encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {sorted.map(rec => {
              const fe = rec.formularios_eventos as any;
              const nome = fe?.tipo_pessoa === 'PF' ? fe?.nome_contratante : fe?.nome_fantasia;
              return (
                <React.Fragment key={rec.id}>
                  <tr style={{
                    borderBottom: '1px solid var(--color-surface-border)',
                    background: editingNF === rec.id ? 'rgba(247,148,29,0.05)' : undefined,
                    transition: 'background 0.15s',
                  }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-secondary)' }}>
                      {fe?.protocolo || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text)', fontWeight: 500 }}>
                      {nome || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {formatDateBR(fe?.data_evento)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#22c55e', fontWeight: 600 }}>
                      {formatBRL(rec.valor_pago)}
                    </td>
                    <td style={{ padding: '10px 12px', color: rec.valor_a_pagar > 0 ? '#ef4444' : 'var(--color-muted)', fontWeight: rec.valor_a_pagar > 0 ? 600 : 400 }}>
                      {formatBRL(rec.valor_a_pagar)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {formatBRL(rec.valor_total_contrato)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        disabled={toggling === rec.id}
                        onClick={() => handleToggleNF(rec)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 6,
                          border: '1px solid',
                          cursor: toggling === rec.id ? 'wait' : 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: rec.nota_fiscal_emitida ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                          borderColor: rec.nota_fiscal_emitida ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)',
                          color: rec.nota_fiscal_emitida ? '#22c55e' : '#ef4444',
                          transition: 'all 0.2s',
                        }}
                      >
                        {toggling === rec.id ? '...' : rec.nota_fiscal_emitida ? '✅ Emitida' : '❌ Não emitida'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted)', fontSize: '0.78rem' }}>
                      {rec.numero_nf || (rec.nota_fiscal_emitida ? '—' : '')}
                      {rec.data_emissao_nf && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                          {new Date(rec.data_emissao_nf + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {confirmDelRec === rec.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#ef4444', whiteSpace: 'nowrap' }}>Confirmar?</span>
                          <button
                            onClick={() => handleDeleteRec(rec.id)}
                            disabled={deleting}
                            style={{ padding: '2px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            {deleting ? '...' : 'Sim'}
                          </button>
                          <button
                            onClick={() => setConfirmDelRec(null)}
                            style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid var(--color-surface-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelRec(rec.id)}
                          style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}
                          title="Excluir registro financeiro"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Inline NF form */}
                  {editingNF === rec.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: '0 12px 12px 12px' }}>
                        <div style={{
                          background: 'rgba(247,148,29,0.08)',
                          border: '1px solid rgba(247,148,29,0.3)',
                          borderRadius: 8, padding: '16px',
                          display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
                        }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 6 }}>Nº da Nota Fiscal</div>
                            <input
                              type="text"
                              className="field-input"
                              style={{ width: 160 }}
                              placeholder="Ex: 001234"
                              value={nfForm.numero_nf}
                              onChange={e => setNfForm(f => ({ ...f, numero_nf: e.target.value }))}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 6 }}>Data de emissão</div>
                            <input
                              type="date"
                              className="field-input"
                              style={{ width: 160 }}
                              value={nfForm.data_emissao_nf}
                              onChange={e => setNfForm(f => ({ ...f, data_emissao_nf: e.target.value }))}
                            />
                          </div>
                          <button className="btn btn-primary" disabled={toggling === rec.id} onClick={() => handleSaveNF(rec.id)} style={{ padding: '8px 20px' }}>
                            {toggling === rec.id ? 'Salvando...' : '✅ Marcar como emitida'}
                          </button>
                          <button className="btn btn-ghost" onClick={() => setEditingNF(null)} style={{ padding: '8px 16px' }}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

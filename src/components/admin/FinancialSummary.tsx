import React, { useState, useEffect } from 'react';
import { loadFinancialSummary, toggleNotaFiscal, type FinancialSummaryRow } from '../../services/importService';
import { supabase } from '../../lib/supabase';
import { formatBRL } from '../../utils/formatters';

type NFFilter = 'all' | 'com_nf' | 'sem_nf';

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

export function FinancialSummary() {
  const [filter, setFilter] = useState<NFFilter>('all');
  const [summary, setSummary] = useState<FinancialSummaryRow[]>([]);
  const [recebimentos, setRecebimentos] = useState<RecebimentoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingNF, setEditingNF] = useState<string | null>(null);
  const [nfForm, setNfForm] = useState({ data_emissao_nf: '', numero_nf: '' });

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
      // Desmarcar diretamente
      setToggling(rec.id);
      try {
        await toggleNotaFiscal(rec.id, false);
        await load();
      } finally { setToggling(null); }
    } else {
      // Abrir formulário para preencher dados da NF
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

  // Compute totals
  const comNF  = summary.find(s => s.nota_fiscal_emitida);
  const semNF  = summary.find(s => !s.nota_fiscal_emitida);
  const totals = {
    total_pago:     (comNF?.total_pago || 0) + (semNF?.total_pago || 0),
    total_a_pagar:  (comNF?.total_a_pagar || 0) + (semNF?.total_a_pagar || 0),
    total_contrato: (comNF?.total_contrato || 0) + (semNF?.total_contrato || 0),
    total_eventos:  (comNF?.total_eventos || 0) + (semNF?.total_eventos || 0),
  };

  const filteredRec = recebimentos.filter(r => {
    if (filter === 'com_nf') return r.nota_fiscal_emitida === true;
    if (filter === 'sem_nf') return r.nota_fiscal_emitida === false;
    return true;
  });

  const filteredTotals = {
    pago:    filteredRec.reduce((s, r) => s + Number(r.valor_pago || 0), 0),
    falta:   filteredRec.reduce((s, r) => s + Number(r.valor_a_pagar || 0), 0),
    total:   filteredRec.reduce((s, r) => s + Number(r.valor_total_contrato || 0), 0),
  };

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
          { label: 'Total de eventos', value: totals.total_eventos, suffix: '' },
          { label: 'Total recebido', value: formatBRL(totals.total_pago), suffix: '' },
          { label: 'Ainda a receber', value: formatBRL(totals.total_a_pagar), suffix: '', highlight: true },
          { label: 'Valor total contratos', value: formatBRL(totals.total_contrato), suffix: '' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={c.highlight ? { borderColor: '#ef4444' } : {}}>
            <div className="stat-value" style={c.highlight ? { color: '#ef4444' } : {}}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* NF breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {[
          {
            label: '✅ Com Nota Fiscal',
            data: comNF,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.08)',
            border: 'rgba(34,197,94,0.3)',
          },
          {
            label: '❌ Sem Nota Fiscal',
            data: semNF,
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.08)',
            border: 'rgba(239,68,68,0.3)',
          },
        ].map(card => (
          <div key={card.label} style={{
            background: card.bg,
            border: `1px solid ${card.border}`,
            borderRadius: 12,
            padding: '20px 24px',
          }}>
            <div style={{ fontWeight: 700, color: card.color, marginBottom: 12, fontSize: '0.95rem' }}>
              {card.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>Eventos</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {card.data?.total_eventos || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>Recebido</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>
                  {formatBRL(card.data?.total_pago || 0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>A receber</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>
                  {formatBRL(card.data?.total_a_pagar || 0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 4 }}>Total contratos</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: card.color }}>
                  {formatBRL(card.data?.total_contrato || 0)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + subtotal */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        flexWrap: 'wrap', marginBottom: 16,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.95rem', flex: '0 0 auto' }}>
          Filtrar registros:
        </div>
        {([
          { id: 'all', label: 'Todos' },
          { id: 'com_nf', label: '✅ Com NF' },
          { id: 'sem_nf', label: '❌ Sem NF' },
        ] as { id: NFFilter; label: string }[]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: '1px solid',
              cursor: 'pointer',
              fontWeight: filter === f.id ? 700 : 400,
              fontSize: '0.85rem',
              background: filter === f.id ? 'var(--color-secondary)' : 'transparent',
              borderColor: filter === f.id ? 'var(--color-secondary)' : 'var(--color-surface-border)',
              color: filter === f.id ? '#000' : 'var(--color-text-secondary)',
              transition: 'all 0.2s',
            }}
          >{f.label}</button>
        ))}

        {/* Subtotal for filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Subtotal pago: <strong style={{ color: '#22c55e' }}>{formatBRL(filteredTotals.pago)}</strong>
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            A receber: <strong style={{ color: '#ef4444' }}>{formatBRL(filteredTotals.falta)}</strong>
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Total: <strong style={{ color: 'var(--color-secondary)' }}>{formatBRL(filteredTotals.total)}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              {['Protocolo', 'Contratante', 'Data Evento', 'Pago', 'A Receber', 'Total', 'NF Emitida', 'Nº NF'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', textAlign: 'left',
                  background: 'var(--color-surface-hover)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  borderBottom: '1px solid var(--color-surface-border)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRec.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)' }}>
                  Nenhum recebimento encontrado.
                </td>
              </tr>
            )}
            {filteredRec.map(rec => {
              const fe = rec.formularios_eventos as any;
              const nome = fe?.tipo_pessoa === 'PF' ? fe?.nome_contratante : fe?.nome_fantasia;
              return (
                <React.Fragment key={rec.id}>
                  <tr style={{
                    borderBottom: '1px solid var(--color-surface-border)',
                    background: editingNF === rec.id ? 'rgba(247,148,29,0.05)' : undefined,
                  }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-secondary)' }}>
                      {fe?.protocolo || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text)', fontWeight: 500 }}>
                      {nome || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      {fe?.data_evento ? new Date(fe.data_evento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
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
                  </tr>

                  {/* Inline NF form */}
                  {editingNF === rec.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: '0 12px 12px 12px' }}>
                        <div style={{
                          background: 'rgba(247,148,29,0.08)',
                          border: '1px solid rgba(247,148,29,0.3)',
                          borderRadius: 8, padding: '16px', display: 'flex',
                          gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
                        }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 6 }}>
                              Nº da Nota Fiscal
                            </div>
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
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 6 }}>
                              Data de emissão
                            </div>
                            <input
                              type="date"
                              className="field-input"
                              style={{ width: 160 }}
                              value={nfForm.data_emissao_nf}
                              onChange={e => setNfForm(f => ({ ...f, data_emissao_nf: e.target.value }))}
                            />
                          </div>
                          <button
                            className="btn btn-primary"
                            disabled={toggling === rec.id}
                            onClick={() => handleSaveNF(rec.id)}
                            style={{ padding: '8px 20px' }}
                          >
                            {toggling === rec.id ? 'Salvando...' : '✅ Marcar como emitida'}
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => setEditingNF(null)}
                            style={{ padding: '8px 16px' }}
                          >
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

import React, { useRef, useState } from 'react';
import { parseXlsxBuffer, type ParseResult } from '../../lib/xlsxParser';
import { importHistoricalRows, type ImportResult } from '../../services/importService';
import { formatBRL } from '../../utils/formatters';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseXlsxBuffer(buffer);
      if (result.rows.length === 0) {
        setError('Nenhum dado encontrado na planilha. Verifique se as colunas estão corretas.');
        return;
      }
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      setError(`Erro ao ler o arquivo: ${String(err)}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!parseResult) return;
    setStep('importing');
    setProgress(0);

    const batchSize = 10;
    const rows = parseResult.rows;
    const totalBatches = Math.ceil(rows.length / batchSize);
    let allImported = 0;
    let allDuplicates = 0;
    let allRecebimentoErrors = 0;
    const allErrors: ImportResult['errors'] = [];

    for (let i = 0; i < totalBatches; i++) {
      const batch = rows.slice(i * batchSize, (i + 1) * batchSize);
      const res = await importHistoricalRows(batch);
      allImported += res.imported;
      allDuplicates += res.duplicates;
      allRecebimentoErrors += res.recebimento_errors || 0;
      allErrors.push(...res.errors);
      setProgress(Math.round(((i + 1) / totalBatches) * 100));
    }

    setImportResult({ imported: allImported, duplicates: allDuplicates, errors: allErrors, recebimento_errors: allRecebimentoErrors });
    setStep('done');
    if (allImported > 0) onSuccess();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-surface-border)',
        borderRadius: 16,
        padding: 32,
        width: '100%',
        maxWidth: 620,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              📥 Importar histórico
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: 4 }}>
              Planilha do Google Forms (.xlsx)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >✕</button>
        </div>

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed var(--color-surface-border)',
                borderRadius: 12,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-surface-border)')}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
              <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
                Arraste o arquivo .xlsx aqui
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: 16 }}>
                ou clique para selecionar
              </div>
              <span className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                Selecionar arquivo
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.ods,.csv"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {error && (
              <div style={{
                marginTop: 16, padding: 12, borderRadius: 8,
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                color: '#ef4444', fontSize: '0.875rem'
              }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              <strong>Colunas esperadas (22):</strong> Carimbo de data/hora, Nome do contratante, CPF, Data de Nascimento, RG, Endereço Residencial, Telefone, E-mail, Contato Cerimonial, Nome do Evento, Endereço do evento, Horário início evento, Data do evento, Horário início fotos, Forma de pagamento, Qtd horas, AUTORIZA, COMENTÁRIOS, Pacote, Equipamento, PAGO, AINDA FALTA PAGAR
            </div>
          </div>
        )}

        {/* STEP: PREVIEW */}
        {step === 'preview' && parseResult && (
          <div>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Linhas encontradas', value: parseResult.totalRows, color: 'var(--color-secondary)' },
                { label: 'Válidas para importar', value: parseResult.rows.length, color: '#22c55e' },
                { label: 'Ignoradas/erros', value: parseResult.skipped + parseResult.errors.length, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--color-surface-hover)',
                  borderRadius: 8, padding: '12px 16px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div style={{ marginBottom: 16, fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>
              Pré-visualização (primeiros 5 registros):
            </div>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    {['Tipo', 'Nome', 'CPF/CNPJ', 'Data Evento', 'Pacote', 'PAGO', 'FALTA'].map(h => (
                      <th key={h} style={{
                        padding: '8px 10px', textAlign: 'left',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-text-secondary)',
                        fontWeight: 600,
                        borderBottom: '1px solid var(--color-surface-border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                          background: row.tipo_pessoa === 'PF' ? 'rgba(34,197,94,0.15)' : 'rgba(139,92,246,0.15)',
                          color: row.tipo_pessoa === 'PF' ? '#22c55e' : '#a78bfa',
                        }}>{row.tipo_pessoa}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-text)' }}>{row.nome_contratante}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                        {row.cpf || row.cnpj || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>{row.data_evento || '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>{row.pacote_nome_snapshot || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600 }}>{formatBRL(row.valor_pago)}</td>
                      <td style={{ padding: '8px 10px', color: row.valor_a_pagar > 0 ? '#ef4444' : 'var(--color-muted)' }}>
                        {formatBRL(row.valor_a_pagar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.rows.length > 5 && (
                <div style={{ textAlign: 'center', padding: '8px', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                  + {parseResult.rows.length - 5} registro(s) adicionais
                </div>
              )}
            </div>

            {/* Financial column detection status */}
            {(() => {
              const detCols = parseResult.detectedColumns || {};
              const hasPago = Object.values(detCols).includes('pago');
              const hasFalta = Object.values(detCols).includes('falta_pagar');
              const totalPago = parseResult.rows.reduce((s, r) => s + r.valor_pago, 0);
              const allZero = totalPago === 0 && parseResult.rows.length > 0;
              return (
                <div style={{
                  background: (hasPago && hasFalta) ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${(hasPago && hasFalta) ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem',
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>🔍 Colunas financeiras detectadas:</div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: hasPago && hasFalta && !allZero ? 0 : 8 }}>
                    <span style={{ color: hasPago ? '#22c55e' : '#ef4444' }}>
                      {hasPago ? '✅' : '❌'} PAGO: {hasPago ? `"${Object.keys(detCols).find(k => detCols[k] === 'pago')}"` : 'não encontrado'}
                    </span>
                    <span style={{ color: hasFalta ? '#22c55e' : '#ef4444' }}>
                      {hasFalta ? '✅' : '❌'} FALTA PAGAR: {hasFalta ? `"${Object.keys(detCols).find(k => detCols[k] === 'falta_pagar')}"` : 'não encontrado'}
                    </span>
                  </div>
                  {(!hasPago || !hasFalta || allZero) && (
                    <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>
                      ⚠️ {allZero && hasPago ? 'Coluna detectada mas todos os valores são R$0,00 — verifique o formato dos valores na planilha.' : 'Renomeie as colunas na planilha para exatamente "PAGO" e "AINDA FALTA PAGAR" e reimporte.'}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Financial totals */}
            <div style={{
              background: 'var(--color-surface-hover)', borderRadius: 10,
              padding: '16px 20px', marginBottom: 24,
              display: 'flex', gap: 32, flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 4 }}>Total PAGO na planilha</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e' }}>
                  {formatBRL(parseResult.rows.reduce((s, r) => s + r.valor_pago, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 4 }}>Total FALTA PAGAR</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                  {formatBRL(parseResult.rows.reduce((s, r) => s + r.valor_a_pagar, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 4 }}>Total Contratos</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                  {formatBRL(parseResult.rows.reduce((s, r) => s + r.valor_pago + r.valor_a_pagar, 0))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep('upload')} style={{ flex: 1 }}>
                ← Voltar
              </button>
              <button className="btn btn-primary" onClick={handleImport} style={{ flex: 2 }}>
                ✅ Confirmar e importar {parseResult.rows.length} registro(s)
              </button>
            </div>
          </div>
        )}

        {/* STEP: IMPORTING */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>⏳</div>
            <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
              Importando registros...
            </div>
            <div style={{ color: 'var(--color-muted)', marginBottom: 20, fontSize: '0.875rem' }}>
              {progress}% concluído
            </div>
            <div style={{
              height: 8, background: 'var(--color-surface-hover)',
              borderRadius: 4, overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'var(--color-secondary)',
                transition: 'width 0.3s ease',
                borderRadius: 4,
              }} />
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && importResult && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>
                {importResult.errors.length === 0 ? '🎉' : '⚠️'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                Importação concluída!
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Importados', value: importResult.imported, color: '#22c55e' },
                { label: 'Duplicatas', value: importResult.duplicates, color: 'var(--color-muted)' },
                { label: 'Erros', value: importResult.errors.length, color: importResult.errors.length > 0 ? '#ef4444' : 'var(--color-muted)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--color-surface-hover)',
                  borderRadius: 8, padding: '12px 16px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* RLS warning: controle_recebimentos insert failed */}
            {(importResult.recebimento_errors || 0) > 0 && (
              <div style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 8, padding: '14px 16px', marginBottom: 16,
                fontSize: '0.82rem', color: '#f59e0b',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  ⚠️ {importResult.recebimento_errors} registro(s) importados mas sem dados financeiros
                </div>
                <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Os formulários foram salvos, mas os valores de PAGO e FALTA PAGAR não puderam ser gravados
                  (erro de permissão no banco de dados — política RLS).<br />
                  <strong>Para corrigir:</strong> Execute o SQL abaixo no <strong>Dashboard do Supabase → SQL Editor</strong>
                  e depois reimporte a planilha:
                </div>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '10px 12px',
                  marginTop: 10, fontSize: '0.75rem', overflowX: 'auto',
                  color: '#fbbf24', whiteSpace: 'pre-wrap',
                }}>
{`drop policy if exists "admin_tudo_recebimentos" on controle_recebimentos;
create policy "authenticated_tudo_recebimentos"
  on controle_recebimentos for all to authenticated
  using (true) with check (true);`}
                </pre>
              </div>
            )}

            <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
              Fechar e ver histórico
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

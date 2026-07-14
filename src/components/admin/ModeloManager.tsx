import React, { useState, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import { supabase } from '../../lib/supabase';
import {
  getModelos,
  getOpcionais,
  createModelo,
  updateModelo,
  detectarMarcadores,
  seedModelosPadrao,
  seedPacotesPadrao,
  type ModeloContrato,
  type Opcional,
} from '../../services/contractService';
import { sanitizarHtmlMammoth } from './ContractTab';


// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Equipamento {
  id: string;
  nome: string;
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-surface-border)',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 20,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-surface-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.875rem',
};

const fieldLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-muted)',
  marginBottom: 4,
  fontWeight: 600,
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function ModeloManager() {
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [opcionais, setOpcionais] = useState<Opcional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'converting' | 'done'>('idle');
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Seed state
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  // Form state
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    equipamento_id: '',
    tipo_pessoa: 'AMBOS' as 'PF' | 'PJ' | 'AMBOS',
    conteudo_html: '',
    versao: 1,
    ativo: true,
    modelo_padrao: false,
    observacoes: '',
  });

  const load = async () => {
    setLoading(true);
    const [ms, eqs, ops] = await Promise.all([
      getModelos(),
      supabase.from('equipamentos').select('id, nome').eq('ativo', true).order('ordem'),
      getOpcionais(),
    ]);
    setModelos(ms);
    setEquipamentos((eqs.data || []) as Equipamento[]);
    setOpcionais(ops);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ─── Upload de DOCX via mammoth ──────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica extensão
    if (!file.name.endsWith('.docx')) {
      setUploadError('Por favor, selecione um arquivo .docx');
      return;
    }

    setUploadError('');
    setUploadStep('converting');
    setUploading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Converte DOCX → HTML usando mammoth
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h2:fresh",
            "p[style-name='Heading 2'] => h3:fresh",
            "b => strong",
            "i => em",
            "u => u",
          ],
        },
      );

      let html = result.value;

      // 1. Remove tags desnecessárias que mammoth cria
      html = html
        .replace(/<img[^>]*>/gi, '') // remove imagens
        .replace(/<a[^>]*>(<br>|<\/br>|\s)*<\/a>/gi, '') // links vazios
        .trim();

      // 2. CRÍTICO: Reagrupa marcadores {{CAMPO}} que o Word fragmentou em
      //    múltiplos <span>/<strong> durante a conversão DOCX → HTML.
      //    Sem isso, {{NOME_CON + TRATANTE}} não são reconhecidos.
      html = sanitizarHtmlMammoth(html);

      // Tenta pré-preencher nome a partir do arquivo
      if (!form.nome) {
        const nomeSugerido = file.name
          .replace('.docx', '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .trim();
        setForm(f => ({ ...f, nome: nomeSugerido, conteudo_html: html }));
      } else {
        setForm(f => ({ ...f, conteudo_html: html }));
      }

      setUploadStep('done');

      if (result.messages.length > 0) {
        console.warn('[mammoth] Warnings:', result.messages);
      }
    } catch (err) {
      console.error('[Upload DOCX]', err);
      setUploadError(`Erro ao converter o arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setUploadStep('idle');
    } finally {
      setUploading(false);
    }
  };

  // ─── Salvar modelo ───────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.nome.trim()) { alert('Informe o nome do modelo.'); return; }
    if (!form.conteudo_html.trim()) { alert('O modelo precisa ter conteúdo. Faça o upload do DOCX.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        equipamento_id: form.equipamento_id || undefined,
        campos_detectados: detectarMarcadores(form.conteudo_html) as unknown as string[],
      };

      if (editingId) {
        await updateModelo(editingId, payload);
      } else {
        await createModelo(payload);
      }

      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  // ─── Excluir modelo ──────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('modelos_contrato').delete().eq('id', id);
      if (error) { alert(`Erro ao excluir: ${error.message}`); return; }
      setConfirmDel(null);
      await load();
    } finally {
      setDeleting(null);
    }
  };

  // ─── Editar modelo ───────────────────────────────────────────────────────

  const handleEdit = (m: ModeloContrato) => {
    setForm({
      nome: m.nome,
      descricao: m.descricao || '',
      equipamento_id: m.equipamento_id || '',
      tipo_pessoa: m.tipo_pessoa,
      conteudo_html: m.conteudo_html,
      versao: m.versao,
      ativo: m.ativo,
      modelo_padrao: m.modelo_padrao,
      observacoes: m.observacoes || '',
    });
    setEditingId(m.id);
    setShowForm(true);
    setUploadStep(m.conteudo_html ? 'done' : 'idle');
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setForm({ nome: '', descricao: '', equipamento_id: '', tipo_pessoa: 'AMBOS', conteudo_html: '', versao: 1, ativo: true, modelo_padrao: false, observacoes: '' });
    setEditingId(null);
    setShowForm(false);
    setUploadStep('idle');
    setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ─── Marcadores detectados ───────────────────────────────────────────────

  const marcadoresDetectados = form.conteudo_html ? detectarMarcadores(form.conteudo_html) : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="admin-page-title">Modelos de Contrato</div>
          <div className="admin-page-subtitle">
            Faça o upload dos DOCX do Drive. O sistema converte automaticamente e usa como template.
          </div>
        </div>
        {!showForm && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Novo modelo
            </button>
            <button
              className="btn btn-ghost"
              disabled={seeding}
              title="Insere/atualiza todos os modelos padrão (Cabine, Totem, Paparazzi) no banco"
              onClick={async () => {
                setSeeding(true);
                setSeedMsg('');
                try {
                  const res = await seedModelosPadrao();
                  const pkgRes = await seedPacotesPadrao();
                  const total = res.ok + pkgRes.ok;
                  const errs = [...res.erros, ...pkgRes.erros];
                  if (errs.length > 0) {
                    setSeedMsg(`⚠️ ${total} item(s) atualizados. Erros: ${errs.join('; ')}`);
                  } else {
                    setSeedMsg(`✅ ${total} item(s) atualizados com sucesso!`);
                  }
                  await load();
                } catch (e: any) {
                  setSeedMsg(`❌ Erro: ${e.message}`);
                } finally {
                  setSeeding(false);
                }
              }}
            >
              {seeding ? '...' : '🔄 Inicializar Padrões'}
            </button>
          </div>
        )}
      </div>

      {seedMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: seedMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: seedMsg.startsWith('✅') ? '#22c55e' : '#ef4444',
          fontSize: '0.85rem', fontWeight: 600,
        }}>
          {seedMsg}
        </div>
      )}

      {/* ─── Formulário de upload ─────────────────────────────────────────── */}
      {showForm && (
        <div style={{ ...cardStyle, border: '1px solid rgba(var(--color-secondary-rgb),0.4)', background: 'rgba(var(--color-secondary-rgb),0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-secondary)' }}>
              {editingId ? '✏️ Editar modelo' : '+ Novo modelo'}
            </div>
            <button className="btn btn-ghost" onClick={resetForm}>✕</button>
          </div>

          {/* Upload DOCX */}
          <div style={{ marginBottom: 20 }}>
            <div style={fieldLabel}>📄 Upload do arquivo DOCX</div>
            <div style={{
              border: `2px dashed ${uploadStep === 'done' ? '#22c55e' : 'var(--color-surface-border)'}`,
              borderRadius: 10,
              padding: '20px 24px',
              textAlign: 'center',
              background: uploadStep === 'done' ? 'rgba(34,197,94,0.05)' : 'var(--color-surface-hover)',
              transition: 'all 0.2s',
            }}>
              {uploadStep === 'idle' && (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                  <div style={{ marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Faça o upload do modelo .docx salvo do Google Drive
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="docx-upload"
                  />
                  <label htmlFor="docx-upload" className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    Selecionar arquivo .docx
                  </label>
                </>
              )}
              {uploadStep === 'converting' && (
                <div style={{ color: 'var(--color-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 10px' }} />
                  <div>Convertendo DOCX para HTML...</div>
                </div>
              )}
              {uploadStep === 'done' && (
                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✅</div>
                  <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>
                    Arquivo convertido com sucesso!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 12 }}>
                    {marcadoresDetectados.length} marcador(es) detectado(s):{' '}
                    {marcadoresDetectados.length > 0
                      ? marcadoresDetectados.map(m => <code key={m} style={{ background: 'rgba(var(--color-secondary-rgb),0.1)', padding: '1px 4px', borderRadius: 3, marginRight: 3, fontSize: '0.72rem' }}>{`{{${m}}}`}</code>)
                      : 'nenhum'
                    }
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".docx"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="docx-upload-replace"
                  />
                  <label htmlFor="docx-upload-replace" className="btn btn-ghost" style={{ cursor: 'pointer', fontSize: '0.8rem', display: 'inline-block' }}>
                    🔄 Substituir arquivo
                  </label>
                </div>
              )}
              {uploadError && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 10 }}>⚠️ {uploadError}</div>
              )}
            </div>
          </div>

          {/* Campos do modelo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={fieldLabel}>Nome do modelo *</div>
              <input type="text" style={inputStyle} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Cabine Fotográfica PF" />
            </div>
            <div>
              <div style={fieldLabel}>Equipamento (opcional)</div>
              <select style={inputStyle} value={form.equipamento_id} onChange={e => setForm(f => ({ ...f, equipamento_id: e.target.value }))}>
                <option value="">— Todos os equipamentos —</option>
                {equipamentos.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
              </select>
            </div>
            <div>
              <div style={fieldLabel}>Tipo de pessoa</div>
              <select style={inputStyle} value={form.tipo_pessoa} onChange={e => setForm(f => ({ ...f, tipo_pessoa: e.target.value as 'PF'|'PJ'|'AMBOS' }))}>
                <option value="AMBOS">PF e PJ</option>
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>
            <div>
              <div style={fieldLabel}>Versão</div>
              <input type="number" style={inputStyle} value={form.versao} min={1} onChange={e => setForm(f => ({ ...f, versao: Number(e.target.value) }))} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Descrição</div>
            <input type="text" style={inputStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição breve do modelo" />
          </div>

          <div style={{ marginBottom: 16, display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
              Ativo
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.modelo_padrao} onChange={e => setForm(f => ({ ...f, modelo_padrao: e.target.checked }))} />
              Modelo padrão (sugerido automaticamente)
            </label>
          </div>

          {/* Preview do HTML convertido */}
          {form.conteudo_html && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 8 }}>
                👁️ Ver conteúdo HTML convertido
              </summary>
              <div style={{
                background: '#fff',
                color: '#000',
                border: '1px solid var(--color-surface-border)',
                borderRadius: 8,
                padding: '20px 32px',
                fontFamily: 'Times New Roman, serif',
                fontSize: '10pt',
                lineHeight: 1.5,
                maxHeight: 400,
                overflowY: 'auto',
              }} dangerouslySetInnerHTML={{ __html: form.conteudo_html }} />
            </details>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.conteudo_html}>
              {saving ? 'Salvando...' : editingId ? '✓ Atualizar modelo' : '+ Salvar modelo'}
            </button>
            <button className="btn btn-ghost" onClick={resetForm}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ─── Lista de modelos ─────────────────────────────────────────────── */}
      {modelos.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--color-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Nenhum modelo cadastrado</div>
          <div style={{ fontSize: '0.875rem', marginBottom: 20 }}>
            Faça o download dos .docx do Google Drive e faça upload aqui.
          </div>
          <div style={{ fontSize: '0.82rem', background: 'var(--color-surface-hover)', borderRadius: 8, padding: '12px 16px', display: 'inline-block', textAlign: 'left' }}>
            <strong>Como fazer:</strong><br />
            1. Acesse a pasta do Google Drive compartilhada<br />
            2. Clique com o botão direito no .docx → <em>Baixar</em><br />
            3. Clique em "+ Novo modelo" aqui e faça o upload do arquivo
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modelos.map(m => {
            const eq = equipamentos.find(e => e.id === m.equipamento_id);
            const campos = (m.campos_detectados as unknown as string[]) || [];
            return (
              <div key={m.id} style={{ ...cardStyle, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.nome}</div>
                      {m.modelo_padrao && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>PADRÃO</span>
                      )}
                      {!m.ativo && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(100,116,139,0.15)', color: '#94a3b8', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>INATIVO</span>
                      )}
                      <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: 6, padding: '2px 8px' }}>v{m.versao}</span>
                      <span style={{ fontSize: '0.7rem', background: 'var(--color-surface-hover)', borderRadius: 6, padding: '2px 8px', color: 'var(--color-muted)' }}>{m.tipo_pessoa}</span>
                      {eq && <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: 6, padding: '2px 8px' }}>{eq.nome}</span>}
                    </div>
                    {m.descricao && <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: 6 }}>{m.descricao}</div>}
                    {campos.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {campos.map(c => (
                          <code key={c} style={{ fontSize: '0.68rem', background: 'rgba(var(--color-secondary-rgb),0.1)', color: 'var(--color-secondary)', borderRadius: 4, padding: '1px 5px' }}>
                            {`{{${c}}}`}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      onClick={() => setPreviewId(previewId === m.id ? null : m.id)}
                    >
                      {previewId === m.id ? '▲ Ocultar' : '👁️ Prévia'}
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => handleEdit(m)}>
                      ✏️ Editar
                    </button>
                    {confirmDel === m.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                        >
                          {deleting === m.id ? '...' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => setConfirmDel(null)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDel(m.id)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview inline */}
                {previewId === m.id && (
                  <div style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid var(--color-surface-border)',
                    background: '#fff',
                    color: '#000',
                    borderRadius: 8,
                    padding: '20px 40px',
                    fontFamily: 'Times New Roman, serif',
                    fontSize: '10pt',
                    lineHeight: 1.5,
                    maxHeight: 500,
                    overflowY: 'auto',
                  }} dangerouslySetInnerHTML={{ __html: m.conteudo_html }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPCIONAIS MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

export function OpcionaisManager() {
  const [opcionais, setOpcionais] = useState<Opcional[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Opcional | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', clausula_padrao: '', unidade: 'unidade', valor_padrao: '', ativo: true, ordem: 0 });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('opcionais').select('*').order('ordem');
    setOpcionais((data || []) as Opcional[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { alert('Informe o nome.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, valor_padrao: form.valor_padrao ? Number(form.valor_padrao) : null };
      if (editing) {
        await supabase.from('opcionais').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('opcionais').insert(payload);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ nome: '', descricao: '', clausula_padrao: '', unidade: 'unidade', valor_padrao: '', ativo: true, ordem: 0 });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (op: Opcional) => {
    setForm({ nome: op.nome, descricao: op.descricao || '', clausula_padrao: op.clausula_padrao || '', unidade: op.unidade || 'unidade', valor_padrao: op.valor_padrao?.toString() || '', ativo: op.ativo, ordem: op.ordem });
    setEditing(op);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await supabase.from('opcionais').delete().eq('id', id);
      setConfirmDel(null);
      await load();
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="admin-page-title">Opcionais de Serviço</div>
          <div className="admin-page-subtitle">Ímã, Monóculos, Scrapbook e outros itens adicionais.</div>
        </div>
        {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Novo opcional</button>}
      </div>

      {showForm && (
        <div style={{ ...cardStyle, borderColor: 'rgba(var(--color-secondary-rgb),0.4)' }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>{editing ? 'Editar opcional' : 'Novo opcional'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><div style={fieldLabel}>Nome *</div><input type="text" style={inputStyle} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><div style={fieldLabel}>Unidade</div><input type="text" style={inputStyle} value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} placeholder="unidade, kit, par..." /></div>
            <div><div style={fieldLabel}>Valor padrão (R$)</div><input type="number" style={inputStyle} value={form.valor_padrao} onChange={e => setForm(f => ({ ...f, valor_padrao: e.target.value }))} /></div>
            <div><div style={fieldLabel}>Ordem</div><input type="number" style={inputStyle} value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><div style={fieldLabel}>Descrição</div><input type="text" style={inputStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Cláusula padrão (texto que aparece no contrato)</div>
            <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={form.clausula_padrao} onChange={e => setForm(f => ({ ...f, clausula_padrao: e.target.value }))} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, cursor: 'pointer', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
            Ativo
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : '✓ Salvar'}</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opcionais.map(op => (
          <div key={op.id} style={{ ...cardStyle, padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{op.nome} {!op.ativo && <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 6 }}>(inativo)</span>}</div>
              {op.descricao && <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: 4 }}>{op.descricao}</div>}
              {op.clausula_padrao && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', borderLeft: '2px solid var(--color-surface-border)', paddingLeft: 8 }}>
                  {op.clausula_padrao.length > 120 ? op.clausula_padrao.slice(0, 120) + '...' : op.clausula_padrao}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => handleEdit(op)}>✏️</button>
              {confirmDel === op.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => handleDelete(op.id)} disabled={deleting === op.id} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>{deleting === op.id ? '...' : 'Sim'}</button>
                  <button onClick={() => setConfirmDel(null)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-surface-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}>Não</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(op.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}>🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

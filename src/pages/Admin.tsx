import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/app.config';
import { formatDate, formatDateTime, formatPhone, formatCPFDisplay, formatCNPJDisplay, formatBRL } from '../utils/formatters';
import { LogoArea } from '../components/layout/LogoArea';
import { ImportModal } from '../components/admin/ImportModal';
import { FinancialSummary } from '../components/admin/FinancialSummary';

type AdminTab = 'formularios' | 'historico' | 'pacotes' | 'equipamentos' | 'recebimentos' | 'financeiro';

interface FormRecord {
  id: string;
  protocolo: string;
  tipo_pessoa: string;
  nome_contratante: string;
  nome_fantasia: string;
  nome_responsavel: string;
  cpf: string;
  cnpj: string;
  email: string;
  telefone: string;
  data_evento: string;
  cidade_evento: string;
  nome_evento: string;
  forma_pagamento: string;
  quantidade_horas: string;
  pacote_nome_snapshot: string;
  equipamento_nome_snapshot: string;
  autoriza_publicacao_fotos: boolean | null;
  comentarios: string;
  data_envio: string;
  created_at: string;
}

export function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('formularios');
  const [user, setUser] = useState<any>(null);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [historico, setHistorico] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedForm, setSelectedForm] = useState<FormRecord | null>(null);
  const [totalFaturado, setTotalFaturado] = useState(0);
  const [stats, setStats] = useState({ total: 0, pf: 0, pj: 0, thisMonth: 0 });
  const [showImportModal, setShowImportModal] = useState(false);
  const [historicoSearch, setHistoricoSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/admin/login');
      } else {
        setUser(data.session.user);
        loadForms();
      }
    });
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('formularios_eventos')
        .select('*')
        .eq('is_imported', false)
        .order('created_at', { ascending: false })
        .limit(500);
      const list = (data || []) as FormRecord[];
      setForms(list);
      const now = new Date();
      const thisMonth = list.filter(f => {
        const d = new Date(f.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      setStats({
        total: list.length,
        pf: list.filter(f => f.tipo_pessoa === 'PF').length,
        pj: list.filter(f => f.tipo_pessoa === 'PJ').length,
        thisMonth,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHistorico = async () => {
    const { data } = await supabase
      .from('formularios_eventos')
      .select('*')
      .eq('is_imported', true)
      .order('data_evento', { ascending: false })
      .limit(500);
    setHistorico((data || []) as FormRecord[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleDeleteForm = async (id: string) => {
    setDeleteLoading(true);
    try {
      await supabase.from('controle_recebimentos').delete().eq('formulario_evento_id', id);
      await supabase.from('formularios_eventos').delete().eq('id', id);
      setConfirmDelete(null);
      setSelectedForm(null);
      loadForms();
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Protocolo','Tipo','Nome/Empresa','Email','Telefone','Data Evento','Cidade','Pacote','Equipamento','Enviado em'];
    const rows = filteredForms.map(f => [
      f.protocolo,
      f.tipo_pessoa,
      f.tipo_pessoa === 'PF' ? f.nome_contratante : f.nome_fantasia,
      f.email,
      f.telefone,
      f.data_evento,
      f.cidade_evento,
      f.pacote_nome_snapshot,
      f.equipamento_nome_snapshot,
      f.created_at,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cabine-so-alegria-formularios-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredForms = forms.filter(f => {
    const q = search.toLowerCase();
    const name = f.tipo_pessoa === 'PF' ? f.nome_contratante : (f.nome_fantasia || f.nome_responsavel);
    const matchSearch = !q || (name?.toLowerCase().includes(q)) || f.protocolo?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q);
    const matchTipo = !filterTipo || f.tipo_pessoa === filterTipo;
    return matchSearch && matchTipo;
  });

  const navItems: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'formularios', label: 'Formulários', icon: '📋' },
    { id: 'historico', label: 'Histórico', icon: '🗂️' },
    { id: 'pacotes', label: 'Pacotes', icon: '📦' },
    { id: 'equipamentos', label: 'Equipamentos', icon: '📸' },
    { id: 'recebimentos', label: 'Recebimentos', icon: '💰' },
    { id: 'financeiro', label: 'Financeiro / NF', icon: '📊' },
  ];

  // Load historico when tab opens
  useEffect(() => {
    if (activeTab === 'historico' && historico.length === 0) loadHistorico();
  }, [activeTab]);

  const filteredHistorico = historico.filter(f => {
    const q = historicoSearch.toLowerCase();
    if (!q) return true;
    const nome = f.tipo_pessoa === 'PF' ? f.nome_contratante : (f.nome_fantasia || f.nome_responsavel);
    return nome?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q) || f.data_evento?.includes(q);
  });

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {APP_CONFIG.companyName}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: 2 }}>
            Painel Administrativo
          </div>
        </div>

        <nav style={{ padding: '8px 0', flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setSelectedForm(null); }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-surface-border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: 8 }}>
            {user?.email}
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 0' }} onClick={handleLogout}>
            🚪 Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {/* ─── FORMULÁRIOS ─── */}
        {activeTab === 'formularios' && !selectedForm && (
          <>
            <div className="admin-page-title">Formulários recebidos</div>
            <div className="admin-page-subtitle">
              Visualize e gerencie as informações enviadas pelos clientes.
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.pf}</div>
                <div className="stat-label">Pessoa Física</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.pj}</div>
                <div className="stat-label">Pessoa Jurídica</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.thisMonth}</div>
                <div className="stat-label">Este mês</div>
              </div>
            </div>

            <div className="admin-search">
              <input
                id="admin-search"
                type="text"
                className="field-input"
                placeholder="Buscar por nome, protocolo ou e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                id="admin-filter-tipo"
                className="field-input"
                style={{ maxWidth: 160 }}
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
              >
                <option value="">Todos os tipos</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
              <button className="btn btn-secondary" onClick={exportCSV} id="btn-export-csv">
                ⬇ Exportar CSV
              </button>
              <button className="btn btn-ghost" onClick={loadForms} id="btn-refresh">
                🔄
              </button>
            </div>

            {loading ? (
              <div className="loading-overlay"><div className="spinner" /><span>Carregando...</span></div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Protocolo</th>
                      <th>Tipo</th>
                      <th>Nome / Empresa</th>
                      <th>Data Evento</th>
                      <th>Cidade</th>
                      <th>Pacote</th>
                      <th>Enviado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForms.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 32 }}>
                          Nenhum formulário encontrado.
                        </td>
                      </tr>
                    ) : filteredForms.map(f => (
                      <tr key={f.id}>
                        <td onClick={() => setSelectedForm(f)} style={{ cursor: 'pointer' }}>
                          <code style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>
                            {f.protocolo}
                          </code>
                        </td>
                        <td onClick={() => setSelectedForm(f)} style={{ cursor: 'pointer' }}>
                          <span className={`badge badge-${f.tipo_pessoa?.toLowerCase()}`}>
                            {f.tipo_pessoa}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200, cursor: 'pointer' }} onClick={() => setSelectedForm(f)}>
                          {f.tipo_pessoa === 'PF' ? f.nome_contratante : (f.nome_fantasia || f.nome_responsavel)}
                        </td>
                        <td onClick={() => setSelectedForm(f)} style={{ cursor: 'pointer' }}>{formatDate(f.data_evento)}</td>
                        <td onClick={() => setSelectedForm(f)} style={{ cursor: 'pointer' }}>{f.cidade_evento || '—'}</td>
                        <td onClick={() => setSelectedForm(f)} style={{ fontSize: '0.8rem', cursor: 'pointer' }}>{f.pacote_nome_snapshot || '—'}</td>
                        <td onClick={() => setSelectedForm(f)} style={{ fontSize: '0.8rem', color: 'var(--color-muted)', cursor: 'pointer' }}>
                          {formatDateTime(f.created_at)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => setSelectedForm(f)}
                            title="Ver / editar"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#ef4444' }}
                            onClick={() => setConfirmDelete(f.id)}
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ─── DETALHE DO FORMULÁRIO ─── */}
        {activeTab === 'formularios' && selectedForm && (
          <FormDetail
            form={selectedForm}
            onBack={() => setSelectedForm(null)}
            onDelete={(id) => handleDeleteForm(id)}
          />
        )}

        {/* ─── HISTÓRICO ─── */}
        {activeTab === 'historico' && (
          <>
            <div className="admin-page-title">Histórico de Eventos</div>
            <div className="admin-page-subtitle">
              Eventos importados da planilha anterior. Não editados via formulário.
            </div>

            <div className="admin-search">
              <input
                id="historico-search"
                type="text"
                className="field-input"
                placeholder="Buscar por nome, e-mail ou data..."
                value={historicoSearch}
                onChange={e => setHistoricoSearch(e.target.value)}
              />
              <button
                className="btn btn-primary"
                id="btn-import-xlsx"
                onClick={() => setShowImportModal(true)}
              >
                📅 Importar planilha (.xlsx)
              </button>
              <button className="btn btn-ghost" onClick={loadHistorico} id="btn-refresh-historico">
                🔄
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nome / Empresa</th>
                    <th>CPF / CNPJ</th>
                    <th>Data Evento</th>
                    <th>Pacote</th>
                    <th>Equipamento</th>
                    <th>Forma Pgto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistorico.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 40 }}>
                        {historico.length === 0
                          ? 'Nenhum histórico importado ainda. Clique em "Importar planilha" para começar.'
                          : 'Nenhum registro encontrado com esse filtro.'}
                      </td>
                    </tr>
                  ) : filteredHistorico.map(f => (
                    <tr key={f.id}>
                      <td>
                        <span className={`badge badge-${f.tipo_pessoa?.toLowerCase()}`}>
                          {f.tipo_pessoa}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200, fontWeight: 500 }}>
                        {f.tipo_pessoa === 'PF' ? f.nome_contratante : (f.nome_fantasia || f.nome_responsavel)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        {f.cpf ? formatCPFDisplay(f.cpf) : f.cnpj ? formatCNPJDisplay(f.cnpj) : '—'}
                      </td>
                      <td>{formatDate(f.data_evento)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{f.pacote_nome_snapshot || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{f.equipamento_nome_snapshot || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        {f.forma_pagamento || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {historico.length > 0 && (
              <div style={{ padding: '12px 0', fontSize: '0.8rem', color: 'var(--color-muted)', textAlign: 'right' }}>
                {filteredHistorico.length} de {historico.length} registro(s)
              </div>
            )}
          </>
        )}

        {/* ─── PACOTES ─── */}
        {activeTab === 'pacotes' && <PackageManager />}

        {/* ─── EQUIPAMENTOS ─── */}
        {activeTab === 'equipamentos' && <EquipmentManager />}

        {/* ─── RECEBIMENTOS ─── */}
        {activeTab === 'recebimentos' && <RecebimentosPanel forms={forms} />}

        {/* ─── FINANCEIRO / NF ─── */}
        {activeTab === 'financeiro' && <FinancialSummary />}

      </main>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { loadHistorico(); setActiveTab('historico'); }}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 16,
            padding: '28px 32px', maxWidth: 420, width: '100%',
            border: '1px solid var(--color-surface-border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: 8 }}>
              Excluir registro?
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
              Esta ação é permanente. O formulário e os dados financeiros vinculados serão excluídos.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => handleDeleteForm(confirmDelete)}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Excluindo...' : '✕ Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Form Detail Component (com edição e exclusão)
// ─────────────────────────────────────────────────────────
function FormDetail({
  form, onBack, onDelete,
}: {
  form: FormRecord;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const isPF = form.tipo_pessoa === 'PF';
  const fa = form as any;

  // edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [edited, setEdited] = useState({
    nome_evento:    form.nome_evento    || '',
    data_evento:    fa.data_evento      || '',
    horario_inicio_evento: fa.horario_inicio_evento || '',
    horario_inicio_fotos:  fa.horario_inicio_fotos  || '',
    cidade_evento:  form.cidade_evento  || '',
    logradouro_evento: fa.logradouro_evento || '',
    numero_evento:  fa.numero_evento    || '',
    complemento_evento: fa.complemento_evento || '',
    bairro_evento:  fa.bairro_evento    || '',
    forma_pagamento: form.forma_pagamento || '',
    quantidade_horas: form.quantidade_horas || '',
    pacote_nome_snapshot: form.pacote_nome_snapshot || '',
    equipamento_nome_snapshot: form.equipamento_nome_snapshot || '',
    comentarios:    form.comentarios    || '',
    email:          form.email          || '',
    telefone:       form.telefone       || '',
    contato_cerimonial: fa.contato_cerimonial || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('formularios_eventos').update(edited).eq('id', form.id);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof typeof edited; type?: string }) => (
    <div className="review-field">
      <span className="review-field-label">{label}</span>
      {editing ? (
        <input
          type={type}
          className="field-input"
          style={{ fontSize: '0.85rem', padding: '4px 8px', maxWidth: 320 }}
          value={edited[field]}
          onChange={e => setEdited(p => ({ ...p, [field]: e.target.value }))}
        />
      ) : (
        <span className="review-field-value">{(edited[field] as string) || '—'}</span>
      )}
    </div>
  );

  const Row = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="review-field">
        <span className="review-field-label">{label}</span>
        <span className="review-field-value">{value}</span>
      </div>
    );
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={onBack}>← Voltar à lista</button>
        <div style={{ flex: 1 }} />
        {!editing ? (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setEditing(true)}
            >
              ✏️ Editar
            </button>
            <button
              className="btn btn-ghost"
              style={{ color: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => setConfirmDel(true)}
            >
              🗑️ Excluir
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : '✓ Salvar alterações'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
          </>
        )}
      </div>

      {/* Confirm delete inline */}
      {confirmDel && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '16px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#ef4444', fontWeight: 600, flex: 1 }}>
            Tem certeza? Esta ação é permanente e removerá também os dados financeiros.
          </span>
          <button
            className="btn btn-primary"
            style={{ background: '#ef4444', borderColor: '#ef4444' }}
            onClick={() => onDelete(form.id)}
          >
            ✕ Excluir
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirmDel(false)}>Cancelar</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <span className={`badge badge-${form.tipo_pessoa?.toLowerCase()}`}>{form.tipo_pessoa}</span>
        <code style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>{form.protocolo}</code>
        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', marginLeft: 8 }}>
          {isPF ? form.nome_contratante : form.nome_fantasia}
        </span>
      </div>

      {/* Dados pessoais / empresa (read-only) */}
      <div className="admin-card">
        <div className="review-section-title" style={{ marginBottom: 10 }}>
          {isPF ? 'Dados pessoais' : 'Dados da empresa'}
        </div>
        {isPF ? (
          <>
            <Row label="Nome" value={form.nome_contratante} />
            <Row label="CPF" value={formatCPFDisplay(fa.cpf)} />
            <Row label="RG" value={fa.rg} />
            <Row label="Nascimento" value={formatDate(fa.data_nascimento)} />
          </>
        ) : (
          <>
            <Row label="Nome Fantasia" value={form.nome_fantasia} />
            <Row label="CNPJ" value={formatCNPJDisplay(fa.cnpj)} />
            <Row label="Responsável" value={form.nome_responsavel} />
          </>
        )}
        <Field label="E-mail" field="email" type="email" />
        <Field label="Telefone" field="telefone" />
        <Field label="Contato cerimonial" field="contato_cerimonial" />
      </div>

      {/* Dados do evento */}
      <div className="admin-card">
        <div className="review-section-title" style={{ marginBottom: 10 }}>Dados do evento</div>
        <Field label="Nome do evento" field="nome_evento" />
        <Field label="Data" field="data_evento" type="date" />
        <Field label="Início evento" field="horario_inicio_evento" type="time" />
        <Field label="Início fotos" field="horario_inicio_fotos" type="time" />
        <Field label="Cidade" field="cidade_evento" />
        <Field label="Logradouro" field="logradouro_evento" />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><Field label="Número" field="numero_evento" /></div>
          <div style={{ flex: 2 }}><Field label="Complemento" field="complemento_evento" /></div>
        </div>
        <Field label="Bairro" field="bairro_evento" />
        <Field label="Forma de pagamento" field="forma_pagamento" />
        <Field label="Horas" field="quantidade_horas" />
        <Field label="Pacote" field="pacote_nome_snapshot" />
        <Field label="Equipamento" field="equipamento_nome_snapshot" />
        <Row label="Publicação fotos" value={
          form.autoriza_publicacao_fotos === true ? 'Autorizado' :
          form.autoriza_publicacao_fotos === false ? 'Não autorizado' : '—'
        } />
      </div>

      {/* Comentários */}
      <div className="admin-card">
        <div className="review-section-title" style={{ marginBottom: 10 }}>Comentários</div>
        {editing ? (
          <textarea
            className="field-input"
            rows={4}
            style={{ fontSize: '0.85rem' }}
            value={edited.comentarios}
            onChange={e => setEdited(p => ({ ...p, comentarios: e.target.value }))}
          />
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {edited.comentarios || '—'}
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="admin-card">
        <div className="review-section-title" style={{ marginBottom: 10 }}>Metadata</div>
        <Row label="Protocolo" value={form.protocolo} />
        <Row label="Enviado em" value={formatDateTime(form.created_at)} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Package Manager
// ─────────────────────────────────────────────────────────
function PackageManager() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', tamanho_foto: '', imagem_url: '', permite_pf: true, permite_pj: true, ativo: true, ordem: 1 });
  const [imgPreviewError, setImgPreviewError] = useState(false);
  const [confirmDelPkg, setConfirmDelPkg] = useState<string | null>(null);
  const [deletingPkg,   setDeletingPkg]   = useState(false);

  // Detect Google Photos PAGE links (not embeddable)
  const isGooglePhotosPageLink = (url: string) =>
    /photos\.app\.goo\.gl|photos\.google\.com\/photo|photos\.google\.com\/album/i.test(url.trim());

  // A valid direct image URL ends with an image extension or is from a known image CDN
  const isDirectImageUrl = (url: string) => {
    if (!url) return false;
    return /lh3\.googleusercontent\.com|\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url.trim());
  };

  const handleImageUrl = (raw: string) => {
    setImgPreviewError(false);
    setForm(f => ({ ...f, imagem_url: raw }));
  };

  useEffect(() => { loadPackages(); }, []);

  const loadPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from('pacotes').select('*').order('ordem');
    setPackages(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (editing?.id) {
      await supabase.from('pacotes').update(form).eq('id', editing.id);
    } else {
      await supabase.from('pacotes').insert(form);
    }
    setEditing(null);
    setForm({ nome: '', descricao: '', tamanho_foto: '', imagem_url: '', permite_pf: true, permite_pj: true, ativo: true, ordem: 1 });
    loadPackages();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from('pacotes').update({ ativo: !ativo }).eq('id', id);
    loadPackages();
  };

  const deletePkg = async (id: string) => {
    setDeletingPkg(true);
    try {
      await supabase.from('pacotes').delete().eq('id', id);
      setConfirmDelPkg(null);
      loadPackages();
    } finally {
      setDeletingPkg(false);
    }
  };

  return (
    <div>
      <div className="admin-page-title">Pacotes</div>
      <div className="admin-page-subtitle">Gerencie os pacotes disponíveis para os clientes.</div>

      <button
        id="btn-new-package"
        className="btn btn-primary"
        style={{ marginBottom: 16 }}
        onClick={() => { setEditing({}); setForm({ nome: '', descricao: '', tamanho_foto: '', imagem_url: '', permite_pf: true, permite_pj: true, ativo: true, ordem: packages.length + 1 }); }}
      >
        + Novo pacote
      </button>

      {editing !== null && (
        <div className="admin-card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>{editing.id ? 'Editar pacote' : 'Novo pacote'}</div>
          <div className="field-group">
            <div className="field-row">
              <div className="field-wrapper">
                <label className="field-label">Nome *</label>
                <input className="field-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field-wrapper">
                <label className="field-label">Tamanho da foto</label>
                <input className="field-input" value={form.tamanho_foto} onChange={e => setForm(f => ({ ...f, tamanho_foto: e.target.value }))} placeholder="Ex: 10x15 cm" />
              </div>
            </div>
            <div className="field-wrapper">
              <label className="field-label">Descrição</label>
              <textarea className="field-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="field-wrapper">
              <label className="field-label">URL da imagem</label>
              <input
                className="field-input"
                value={form.imagem_url}
                onChange={e => handleImageUrl(e.target.value)}
                placeholder="Cole o link lh3.googleusercontent.com aqui"
              />
              {/* Google Photos PAGE link warning */}
              {form.imagem_url && isGooglePhotosPageLink(form.imagem_url) && (
                <div style={{
                  marginTop: 8, padding: '12px 14px',
                  background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.3)',
                  borderRadius: 8, fontSize: '0.82rem', color: '#4285f4', lineHeight: 1.6,
                }}>
                  ⚠️ Este é o link da <strong>página</strong> do Google Fotos, não da imagem.<br />
                  Para obter o link direto da imagem:<br />
                  1. Abra a foto no Google Fotos no <strong>computador</strong><br />
                  2. Clique com o botão direito na imagem<br />
                  3. Clique em <strong>“Copiar endereço da imagem”</strong> (Chrome/Edge)<br />
                  4. O link começará com <code>https://lh3.googleusercontent.com/</code><br />
                  Cole esse link aqui.
                </div>
              )}
              {/* Live preview - only for non-page links */}
              {form.imagem_url && !isGooglePhotosPageLink(form.imagem_url) && (
                <div style={{ marginTop: 10 }}>
                  {imgPreviewError ? (
                    <div style={{
                      padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                      fontSize: '0.82rem', color: '#ef4444',
                    }}>
                      ⚠️ Imagem não carregou. Verifique se o link é o endereço direto da imagem (começa com <code>lh3.googleusercontent.com</code>).
                    </div>
                  ) : (
                    <img
                      src={form.imagem_url}
                      alt="Preview"
                      onError={() => setImgPreviewError(true)}
                      onLoad={() => setImgPreviewError(false)}
                      style={{
                        maxHeight: 160, maxWidth: '100%', borderRadius: 8,
                        border: '1px solid var(--color-surface-border)', objectFit: 'cover',
                      }}
                    />
                  )}
                </div>
              )}
              <span className="field-helper" style={{ marginTop: 6 }}>
                Clique com o botão direito na foto no Google Fotos → <strong>"Copiar endereço da imagem"</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.permite_pf} onChange={e => setForm(f => ({ ...f, permite_pf: e.target.checked }))} style={{ accentColor: 'var(--color-secondary)' }} />
                Exibir para PF
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.permite_pj} onChange={e => setForm(f => ({ ...f, permite_pj: e.target.checked }))} style={{ accentColor: 'var(--color-secondary)' }} />
                Exibir para PJ
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} style={{ accentColor: 'var(--color-secondary)' }} />
                Ativo
              </label>
            </div>
            <div className="field-wrapper" style={{ maxWidth: 120 }}>
              <label className="field-label">Ordem</label>
              <input type="number" className="field-input" value={form.ordem} min={1} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={save}>Salvar</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Img</th><th>Ordem</th><th>Nome</th><th>Tamanho</th><th>PF</th><th>PJ</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(p => (
                <tr key={p.id}>
                  <td style={{ width: 52 }}>
                    {p.imagem_url ? (
                      <img
                        src={p.imagem_url}
                        alt={p.nome}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-surface-border)' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, background: 'var(--color-surface-hover)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                    )}
                  </td>
                  <td>{p.ordem}</td>
                  <td>{p.nome}</td>
                  <td>{p.tamanho_foto}</td>
                  <td>{p.permite_pf ? '✅' : '—'}</td>
                  <td>{p.permite_pj ? '✅' : '—'}</td>
                  <td><span className={`badge ${p.ativo ? 'badge-ok' : 'badge-warn'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => { setImgPreviewError(false); setEditing(p); setForm({ nome: p.nome, descricao: p.descricao || '', tamanho_foto: p.tamanho_foto || '', imagem_url: p.imagem_url || '', permite_pf: p.permite_pf, permite_pj: p.permite_pj, ativo: p.ativo, ordem: p.ordem }); }}>
                      ✏️
                    </button>
                    <button className="btn btn-ghost" onClick={() => toggleAtivo(p.id, p.ativo)}>
                      {p.ativo ? '🔴' : '🟢'}
                    </button>
                    {confirmDelPkg === p.id ? (
                      <>
                        <button onClick={() => deletePkg(p.id)} disabled={deletingPkg}
                          style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, marginLeft: 4 }}>
                          {deletingPkg ? '...' : 'Confirmar'}
                        </button>
                        <button onClick={() => setConfirmDelPkg(null)}
                          style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid var(--color-surface-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.78rem', marginLeft: 4 }}>
                          Não
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-ghost" style={{ color: '#ef4444' }}
                        onClick={() => setConfirmDelPkg(p.id)} title="Excluir pacote">
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Equipment Manager
// ─────────────────────────────────────────────────────────
function EquipmentManager() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', imagem_url: '', ativo: true, ordem: 1 });
  const [imgEqPreviewError, setImgEqPreviewError] = useState(false);
  const [confirmDelEq,  setConfirmDelEq]  = useState<string | null>(null);
  const [deletingEq,    setDeletingEq]    = useState(false);

  const isGooglePhotosPageLinkEq = (url: string) =>
    /photos\.app\.goo\.gl|photos\.google\.com\/photo|photos\.google\.com\/album/i.test(url.trim());

  useEffect(() => { loadEquipments(); }, []);

  const loadEquipments = async () => {
    setLoading(true);
    const { data } = await supabase.from('equipamentos').select('*').order('ordem');
    setEquipments(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (editing?.id) {
      await supabase.from('equipamentos').update(form).eq('id', editing.id);
    } else {
      await supabase.from('equipamentos').insert(form);
    }
    setEditing(null);
    loadEquipments();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from('equipamentos').update({ ativo: !ativo }).eq('id', id);
    loadEquipments();
  };

  const deleteEq = async (id: string) => {
    setDeletingEq(true);
    try {
      await supabase.from('equipamentos').delete().eq('id', id);
      setConfirmDelEq(null);
      loadEquipments();
    } finally {
      setDeletingEq(false);
    }
  };

  return (
    <div>
      <div className="admin-page-title">Equipamentos</div>
      <div className="admin-page-subtitle">Gerencie os equipamentos oferecidos.</div>

      <button
        id="btn-new-equipment"
        className="btn btn-primary"
        style={{ marginBottom: 16 }}
        onClick={() => { setEditing({}); setForm({ nome: '', descricao: '', imagem_url: '', ativo: true, ordem: equipments.length + 1 }); }}
      >
        + Novo equipamento
      </button>

      {editing !== null && (
        <div className="admin-card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>{editing.id ? 'Editar equipamento' : 'Novo equipamento'}</div>
          <div className="field-group">
            <div className="field-wrapper">
              <label className="field-label">Nome *</label>
              <input className="field-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="field-wrapper">
              <label className="field-label">Descrição</label>
              <textarea className="field-input" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="field-wrapper">
              <label className="field-label">URL da imagem</label>
              <input className="field-input" value={form.imagem_url}
                onChange={e => { setImgEqPreviewError(false); setForm(f => ({ ...f, imagem_url: e.target.value })); }}
                placeholder="Cole o link lh3.googleusercontent.com aqui"
              />
              {form.imagem_url && isGooglePhotosPageLinkEq(form.imagem_url) && (
                <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.3)', borderRadius: 8, fontSize: '0.82rem', color: '#4285f4', lineHeight: 1.6 }}>
                  ⚠️ Este é o link da <strong>página</strong> do Google Fotos, não da imagem.<br />
                  1. Abra a foto no Google Fotos no <strong>computador</strong><br />
                  2. Clique com o botão direito na imagem<br />
                  3. Clique em <strong>"Copiar endereço da imagem"</strong><br />
                  4. Cole o link que começa com <code>https://lh3.googleusercontent.com/</code>
                </div>
              )}
              {form.imagem_url && !isGooglePhotosPageLinkEq(form.imagem_url) && (
                <div style={{ marginTop: 8 }}>
                  {imgEqPreviewError
                    ? <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>⚠️ Imagem não carregou. Verifique se é o endereço direto (<code>lh3.googleusercontent.com</code>)</span>
                    : <img src={form.imagem_url} alt="Preview" onError={() => setImgEqPreviewError(true)} onLoad={() => setImgEqPreviewError(false)}
                        style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--color-surface-border)', objectFit: 'cover' }} />
                  }
                </div>
              )}
              <span className="field-helper" style={{ marginTop: 6 }}>
                Clique com o botão direito na foto no Google Fotos → <strong>"Copiar endereço da imagem"</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} style={{ accentColor: 'var(--color-secondary)' }} />
                Ativo
              </label>
            </div>
            <div className="field-wrapper" style={{ maxWidth: 120 }}>
              <label className="field-label">Ordem</label>
              <input type="number" className="field-input" value={form.ordem} min={1} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={save}>Salvar</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}


      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>Img</th><th>Ordem</th><th>Nome</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {equipments.map(eq => (
                <tr key={eq.id}>
                  <td style={{ width: 52 }}>
                    {eq.imagem_url && !isGooglePhotosPageLinkEq(eq.imagem_url) ? (
                      <img src={eq.imagem_url} alt={eq.nome}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-surface-border)' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, background: 'var(--color-surface-hover)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📸</div>
                    )}
                  </td>
                  <td>{eq.ordem}</td>
                  <td>{eq.nome}</td>
                  <td><span className={`badge ${eq.ativo ? 'badge-ok' : 'badge-warn'}`}>{eq.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => { setImgEqPreviewError(false); setEditing(eq); setForm({ nome: eq.nome, descricao: eq.descricao || '', imagem_url: eq.imagem_url || '', ativo: eq.ativo, ordem: eq.ordem }); }}>✏️</button>
                    <button className="btn btn-ghost" onClick={() => toggleAtivo(eq.id, eq.ativo)}>{eq.ativo ? '🔴' : '🟢'}</button>
                    {confirmDelEq === eq.id ? (
                      <>
                        <button onClick={() => deleteEq(eq.id)} disabled={deletingEq}
                          style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, marginLeft: 4 }}>
                          {deletingEq ? '...' : 'Confirmar'}
                        </button>
                        <button onClick={() => setConfirmDelEq(null)}
                          style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid var(--color-surface-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.78rem', marginLeft: 4 }}>
                          Não
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-ghost" style={{ color: '#ef4444' }}
                        onClick={() => setConfirmDelEq(eq.id)} title="Excluir equipamento">
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Recebimentos Panel (basic structure)
// ─────────────────────────────────────────────────────────
function RecebimentosPanel({ forms }: { forms: FormRecord[] }) {
  const [selectedFormId, setSelectedFormId] = useState('');
  const [recebimento, setRecebimento] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formRec, setFormRec] = useState({
    valor_total_contrato: '',
    valor_pago: '',
    forma_pagamento_administrativa: '',
    quantidade_parcelas: '',
    parcelas_pagas: '',
    data_primeiro_vencimento: '',
    proximo_vencimento: '',
    observacoes_financeiras: '',
  });

  const loadRecebimento = async (formularioId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('controle_recebimentos')
      .select('*')
      .eq('formulario_evento_id', formularioId)
      .single();
    if (data) {
      setRecebimento(data);
      setFormRec({
        valor_total_contrato: data.valor_total_contrato?.toString() || '',
        valor_pago: data.valor_pago?.toString() || '',
        forma_pagamento_administrativa: data.forma_pagamento_administrativa || '',
        quantidade_parcelas: data.quantidade_parcelas?.toString() || '',
        parcelas_pagas: data.parcelas_pagas?.toString() || '',
        data_primeiro_vencimento: data.data_primeiro_vencimento || '',
        proximo_vencimento: data.proximo_vencimento || '',
        observacoes_financeiras: data.observacoes_financeiras || '',
      });
    } else {
      setRecebimento(null);
      setFormRec({ valor_total_contrato: '', valor_pago: '', forma_pagamento_administrativa: '', quantidade_parcelas: '', parcelas_pagas: '', data_primeiro_vencimento: '', proximo_vencimento: '', observacoes_financeiras: '' });
    }
    setLoading(false);
  };

  const saveRecebimento = async () => {
    const total = parseFloat(formRec.valor_total_contrato) || 0;
    const pago = parseFloat(formRec.valor_pago) || 0;
    const payload = {
      formulario_evento_id: selectedFormId,
      valor_total_contrato: total,
      valor_pago: pago,
      valor_a_pagar: total - pago,
      forma_pagamento_administrativa: formRec.forma_pagamento_administrativa || null,
      quantidade_parcelas: parseInt(formRec.quantidade_parcelas) || null,
      parcelas_pagas: parseInt(formRec.parcelas_pagas) || null,
      data_primeiro_vencimento: formRec.data_primeiro_vencimento || null,
      proximo_vencimento: formRec.proximo_vencimento || null,
      observacoes_financeiras: formRec.observacoes_financeiras || null,
    };
    if (recebimento?.id) {
      await supabase.from('controle_recebimentos').update(payload).eq('id', recebimento.id);
    } else {
      await supabase.from('controle_recebimentos').insert(payload);
    }
    loadRecebimento(selectedFormId);
  };

  const total = parseFloat(formRec.valor_total_contrato) || 0;
  const pago = parseFloat(formRec.valor_pago) || 0;
  const restante = total - pago;
  const pct = total > 0 ? Math.round((pago / total) * 100) : 0;
  const parcelas = parseInt(formRec.quantidade_parcelas) || 0;
  const parcelasPagas = parseInt(formRec.parcelas_pagas) || 0;

  return (
    <div>
      <div className="admin-page-title">Recebimentos</div>
      <div className="admin-page-subtitle">
        Controle financeiro vinculado aos formulários recebidos.
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>
          Selecionar evento
        </label>
        <select
          id="select-evento-recebimento"
          className="field-input"
          value={selectedFormId}
          onChange={e => { setSelectedFormId(e.target.value); if (e.target.value) loadRecebimento(e.target.value); }}
        >
          <option value="">— Selecione um formulário —</option>
          {forms.map(f => (
            <option key={f.id} value={f.id}>
              {f.protocolo} — {f.tipo_pessoa === 'PF' ? f.nome_contratante : f.nome_fantasia} — {formatDate(f.data_evento)}
            </option>
          ))}
        </select>
      </div>

      {selectedFormId && !loading && (
        <>
          {/* Summary */}
          {total > 0 && (
            <div className="admin-card" style={{ marginBottom: 16 }}>
              <div className="financial-summary">
                <div className="financial-item">
                  <div className="financial-item-value">{formatBRL(total)}</div>
                  <div className="financial-item-label">Valor total</div>
                </div>
                <div className="financial-item">
                  <div className="financial-item-value" style={{ color: 'var(--color-success)' }}>{formatBRL(pago)}</div>
                  <div className="financial-item-label">Valor pago</div>
                </div>
                <div className="financial-item">
                  <div className="financial-item-value" style={{ color: restante > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {formatBRL(restante)}
                  </div>
                  <div className="financial-item-label">Restante</div>
                </div>
              </div>
              <div className="progress-bar-financial">
                <div className="progress-bar-financial-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                <span>{pct}% pago</span>
                {parcelas > 0 && <span>{parcelasPagas} de {parcelas} parcelas pagas</span>}
              </div>
              {restante <= 0 && (
                <div style={{ marginTop: 12, textAlign: 'center', color: 'var(--color-success)', fontWeight: 700 }}>
                  ✅ Pagamento concluído
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="admin-card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Controle de recebimento</div>
            <div className="field-group">
              <div className="field-row">
                <div className="field-wrapper">
                  <label className="field-label">Valor total do contrato (R$)</label>
                  <input
                    id="rec-valor-total"
                    type="number"
                    step="0.01"
                    min="0"
                    className="field-input"
                    value={formRec.valor_total_contrato}
                    onChange={e => setFormRec(f => ({ ...f, valor_total_contrato: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="field-wrapper">
                  <label className="field-label">Valor pago (R$)</label>
                  <input
                    id="rec-valor-pago"
                    type="number"
                    step="0.01"
                    min="0"
                    className="field-input"
                    value={formRec.valor_pago}
                    onChange={e => setFormRec(f => ({ ...f, valor_pago: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="field-wrapper">
                <label className="field-label">Forma de pagamento</label>
                <select className="field-input" value={formRec.forma_pagamento_administrativa} onChange={e => setFormRec(f => ({ ...f, forma_pagamento_administrativa: e.target.value }))}>
                  <option value="">Selecione</option>
                  <option value="avista">À vista</option>
                  <option value="parcelado">Parcelado</option>
                  <option value="faturado">Faturado</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {formRec.forma_pagamento_administrativa === 'parcelado' && (
                <div className="field-row">
                  <div className="field-wrapper">
                    <label className="field-label">Quantidade de parcelas</label>
                    <input type="number" min="1" className="field-input" value={formRec.quantidade_parcelas} onChange={e => setFormRec(f => ({ ...f, quantidade_parcelas: e.target.value }))} />
                  </div>
                  <div className="field-wrapper">
                    <label className="field-label">Parcelas pagas</label>
                    <input type="number" min="0" className="field-input" value={formRec.parcelas_pagas} onChange={e => setFormRec(f => ({ ...f, parcelas_pagas: e.target.value }))} />
                  </div>
                </div>
              )}

              <div className="field-row">
                <div className="field-wrapper">
                  <label className="field-label">Primeiro vencimento</label>
                  <input type="date" className="field-input" value={formRec.data_primeiro_vencimento} onChange={e => setFormRec(f => ({ ...f, data_primeiro_vencimento: e.target.value }))} />
                </div>
                <div className="field-wrapper">
                  <label className="field-label">Próximo vencimento</label>
                  <input type="date" className="field-input" value={formRec.proximo_vencimento} onChange={e => setFormRec(f => ({ ...f, proximo_vencimento: e.target.value }))} />
                </div>
              </div>

              <div className="field-wrapper">
                <label className="field-label">Observações financeiras</label>
                <textarea className="field-input" rows={3} value={formRec.observacoes_financeiras} onChange={e => setFormRec(f => ({ ...f, observacoes_financeiras: e.target.value }))} placeholder="Observações sobre o pagamento..." />
              </div>

              <button id="btn-save-recebimento" className="btn btn-primary" onClick={saveRecebimento}>
                💾 Salvar controle de recebimento
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Faturamento MEI
// ─────────────────────────────────────────────────────────
function FaturamentoMEI() {
  const [forms, setForms] = useState<any[]>([]);
  const [recebimentos, setRecebimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: recs } = await supabase
        .from('controle_recebimentos')
        .select('*, formularios_eventos(data_evento, protocolo)');
      setRecebimentos(recs || []);
      setLoading(false);
    }
    load();
  }, []);

  const yearRecs = recebimentos.filter(r => {
    const date = r.formularios_eventos?.data_evento;
    return date && new Date(date).getFullYear() === year;
  });

  const totalPago = yearRecs.reduce((sum, r) => sum + (r.valor_pago || 0), 0);
  const limit = APP_CONFIG.meiAnnualLimit;
  const pct = Math.min((totalPago / limit) * 100, 100);
  const restante = limit - totalPago;

  return (
    <div>
      <div className="admin-page-title">Faturamento MEI</div>
      <div className="admin-page-subtitle">
        Acompanhe o faturamento anual do MEI (limite: {formatBRL(limit)}/ano).
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <label className="field-label">Ano:</label>
        <select className="field-input" style={{ maxWidth: 120 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="financial-summary">
          <div className="financial-item">
            <div className="financial-item-value" style={{ color: 'var(--color-secondary)' }}>{formatBRL(totalPago)}</div>
            <div className="financial-item-label">Faturado em {year}</div>
          </div>
          <div className="financial-item">
            <div className="financial-item-value">{formatBRL(limit)}</div>
            <div className="financial-item-label">Limite anual MEI</div>
          </div>
          <div className="financial-item">
            <div className="financial-item-value" style={{ color: restante < limit * 0.1 ? 'var(--color-error)' : 'var(--color-success)' }}>
              {formatBRL(Math.max(restante, 0))}
            </div>
            <div className="financial-item-label">Margem disponível</div>
          </div>
        </div>

        <div className="progress-bar-financial" style={{ height: 12, marginTop: 16 }}>
          <div
            className="progress-bar-financial-fill"
            style={{
              width: `${pct}%`,
              background: pct > 90 ? 'linear-gradient(90deg,var(--color-warning),var(--color-error))' :
                          pct > 70 ? 'linear-gradient(90deg,var(--color-success),var(--color-warning))' :
                          'linear-gradient(90deg,var(--color-success),#81C784)',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: 6 }}>
          <span>{pct.toFixed(1)}% do limite utilizado</span>
          <span>{yearRecs.length} evento(s) no ano</span>
        </div>

        {pct >= 90 && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: '0.875rem',
          }}>
            ⚠️ Atenção: você está próximo do limite anual do MEI ({pct.toFixed(0)}% utilizado).
            Consulte seu contador.
          </div>
        )}
        {pct >= 70 && pct < 90 && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-warning)',
            fontSize: '0.875rem',
          }}>
            💛 Você utilizou {pct.toFixed(0)}% do limite anual do MEI.
          </div>
        )}
      </div>
    </div>
  );
}

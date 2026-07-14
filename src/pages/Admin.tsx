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
                      <tr key={f.id} onClick={() => setSelectedForm(f)}>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>
                            {f.protocolo}
                          </code>
                        </td>
                        <td>
                          <span className={`badge badge-${f.tipo_pessoa?.toLowerCase()}`}>
                            {f.tipo_pessoa}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          {f.tipo_pessoa === 'PF' ? f.nome_contratante : (f.nome_fantasia || f.nome_responsavel)}
                        </td>
                        <td>{formatDate(f.data_evento)}</td>
                        <td>{f.cidade_evento || '—'}</td>
                        <td style={{ fontSize: '0.8rem' }}>{f.pacote_nome_snapshot || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          {formatDate(f.created_at)}
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
          <FormDetail form={selectedForm} onBack={() => setSelectedForm(null)} />
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Form Detail Component
// ─────────────────────────────────────────────────────────
function FormDetail({ form, onBack }: { form: FormRecord; onBack: () => void }) {
  const isPF = form.tipo_pessoa === 'PF';
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
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Voltar à lista
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {isPF ? form.nome_contratante : form.nome_fantasia}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
            <span className={`badge badge-${form.tipo_pessoa?.toLowerCase()}`}>{form.tipo_pessoa}</span>
            <code style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>{form.protocolo}</code>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="review-section-title" style={{ marginBottom: 10 }}>
          {isPF ? 'Dados pessoais' : 'Dados da empresa'}
        </div>
        {isPF ? (
          <>
            <Row label="Nome" value={form.nome_contratante} />
            <Row label="CPF" value={formatCPFDisplay((form as any).cpf)} />
            <Row label="RG" value={(form as any).rg} />
            <Row label="Nascimento" value={formatDate((form as any).data_nascimento)} />
          </>
        ) : (
          <>
            <Row label="Nome Fantasia" value={form.nome_fantasia} />
            <Row label="CNPJ" value={formatCNPJDisplay((form as any).cnpj)} />
            <Row label="Responsável" value={form.nome_responsavel} />
          </>
        )}
        <Row label="E-mail" value={form.email} />
        <Row label="Telefone" value={formatPhone(form.telefone)} />
      </div>

      <div className="admin-card">
        <div className="review-section-title" style={{ marginBottom: 10 }}>Dados do evento</div>
        <Row label="Nome do evento" value={form.nome_evento} />
        <Row label="Data" value={formatDate(form.data_evento)} />
        <Row label="Início" value={(form as any).horario_inicio_evento} />
        <Row label="Início fotos" value={(form as any).horario_inicio_fotos} />
        <Row label="Cidade" value={form.cidade_evento} />
        <Row label="Forma pag." value={form.forma_pagamento} />
        <Row label="Horas" value={form.quantidade_horas} />
        <Row label="Pacote" value={form.pacote_nome_snapshot} />
        <Row label="Equipamento" value={form.equipamento_nome_snapshot} />
        <Row label="Publicação fotos" value={
          form.autoriza_publicacao_fotos === true ? 'Autorizado' :
          form.autoriza_publicacao_fotos === false ? 'Não autorizado' : '—'
        } />
      </div>

      {form.comentarios && (
        <div className="admin-card">
          <div className="review-section-title" style={{ marginBottom: 10 }}>Comentários</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {form.comentarios}
          </p>
        </div>
      )}

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
              <input className="field-input" value={form.imagem_url} onChange={e => setForm(f => ({ ...f, imagem_url: e.target.value }))} placeholder="https://..." />
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
                <th>Ordem</th><th>Nome</th><th>Tamanho</th><th>PF</th><th>PJ</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(p => (
                <tr key={p.id}>
                  <td>{p.ordem}</td>
                  <td>{p.nome}</td>
                  <td>{p.tamanho_foto}</td>
                  <td>{p.permite_pf ? '✅' : '—'}</td>
                  <td>{p.permite_pj ? '✅' : '—'}</td>
                  <td><span className={`badge ${p.ativo ? 'badge-ok' : 'badge-warn'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => { setEditing(p); setForm({ nome: p.nome, descricao: p.descricao || '', tamanho_foto: p.tamanho_foto || '', imagem_url: p.imagem_url || '', permite_pf: p.permite_pf, permite_pj: p.permite_pj, ativo: p.ativo, ordem: p.ordem }); }}>
                      ✏️
                    </button>
                    <button className="btn btn-ghost" onClick={() => toggleAtivo(p.id, p.ativo)}>
                      {p.ativo ? '🔴' : '🟢'}
                    </button>
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
              <input className="field-input" value={form.imagem_url} onChange={e => setForm(f => ({ ...f, imagem_url: e.target.value }))} placeholder="https://..." />
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
              <tr><th>Ordem</th><th>Nome</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {equipments.map(eq => (
                <tr key={eq.id}>
                  <td>{eq.ordem}</td>
                  <td>{eq.nome}</td>
                  <td><span className={`badge ${eq.ativo ? 'badge-ok' : 'badge-warn'}`}>{eq.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => { setEditing(eq); setForm({ nome: eq.nome, descricao: eq.descricao || '', imagem_url: eq.imagem_url || '', ativo: eq.ativo, ordem: eq.ordem }); }}>✏️</button>
                    <button className="btn btn-ghost" onClick={() => toggleAtivo(eq.id, eq.ativo)}>{eq.ativo ? '🔴' : '🟢'}</button>
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

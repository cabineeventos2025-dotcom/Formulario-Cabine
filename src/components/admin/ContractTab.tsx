import React, { useState, useEffect, useCallback } from 'react';
import {
  getContratosDoFormulario,
  getModelos,
  getOpcionais,
  getConfigEmpresa,
  createContrato,
  updateContratoStatus,
  logAuditoria,
  getProximaVersao,
  sugerirModelo,
  preencherTemplate,
  buildMarcadores,
  detectarMarcadores,
  gerarNomeArquivo,
  valorPorExtenso,
  dataPorExtenso,
  formatDateBR,
  type ContratoGerado,
  type ModeloContrato,
  type Opcional,
  type OpcionalSelecionado,
  type DadosContrato,
  type ConfigEmpresa,
} from '../../services/contractService';
import { TEMPLATE_CABINE_FOTOGRARICA, TEMPLATE_CABINE_PJ, MARCADORES_OBRIGATORIOS_PF, MARCADORES_OBRIGATORIOS_PJ } from '../../templates/contratoTemplates';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ContractTabProps {
  formulario: Record<string, unknown>;
  formularioId: string;
}

// ─── Wizard steps ────────────────────────────────────────────────────────────

type WizardStep = 'historico' | 'modelo' | 'dados' | 'opcionais' | 'revisao' | 'preview' | 'confirmacao';

// ─── Auxiliar: meses ─────────────────────────────────────────────────────────

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// ─── Estilos inline compartilhados ───────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-surface-border)',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 20,
};

const sectionTitle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: 'var(--color-muted)',
  marginBottom: 12,
};

const fieldRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 12,
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

const pendingInputStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#f59e0b',
  background: 'rgba(245,158,11,0.05)',
};

const badgeStyle = (status: string): React.CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    rascunho:   { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
    previa:     { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
    finalizado: { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
    substituido:{ bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    cancelado:  { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  };
  const c = map[status] || map.rascunho;
  return { padding: '2px 10px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, ...c };
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function ContractTab({ formulario, formularioId }: ContractTabProps) {
  const [step, setStep] = useState<WizardStep>('historico');
  const [contratos, setContratos] = useState<ContratoGerado[]>([]);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [opcionaisLista, setOpcionaisLista] = useState<Opcional[]>([]);
  const [configEmpresa, setConfigEmpresa] = useState<ConfigEmpresa | null>(null);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloContrato | null>(null);
  const [dadosExtras, setDadosExtras] = useState<Partial<DadosContrato>>({});
  const [opcionaisSelecionados, setOpcionaisSelecionados] = useState<OpcionalSelecionado[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [confirmChecks, setConfirmChecks] = useState<boolean[]>([false,false,false,false,false]);
  const [confirmText, setConfirmText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editandoBloco, setEditandoBloco] = useState<string | null>(null);
  const [contratoHtml, setContratoHtml] = useState('');

  const fe = formulario as Record<string, unknown>;
  const tipoPessoa = (fe.tipo_pessoa as string) === 'PJ' ? 'PJ' : 'PF';

  const load = useCallback(async () => {
    setLoading(true);
    const [cs, ms, ops, cfg] = await Promise.all([
      getContratosDoFormulario(formularioId),
      getModelos(),
      getOpcionais(),
      getConfigEmpresa(),
    ]);
    setContratos(cs);
    setModelos(ms);
    setOpcionaisLista(ops);
    setConfigEmpresa(cfg);
    setLoading(false);
  }, [formularioId]);

  useEffect(() => { load(); }, [load]);

  // Detecta scrapbook nos comentários
  const scrapbookNosComentarios = String(fe.comentarios || '').toLowerCase().includes('scrapbook')
    || Boolean(fe.possui_scrapbook);

  // ─── Monta DadosContrato completo ─────────────────────────────────────────

  const getDadosCompletos = (): DadosContrato => {
    const cfg = configEmpresa;
    const d: DadosContrato = {
      // Locador
      locador_nome_empresarial: cfg?.nome_empresarial || '45.072.735 LINCOLN CRISTIANO DELFINO',
      locador_nome_fantasia:    cfg?.nome_fantasia || 'CABINE SÓ ALEGRIA',
      locador_cnpj:             cfg?.cnpj || '45.072.735/0001-69',
      locador_endereco:         cfg?.endereco || 'Alameda das palmeiras nº1022, bloco C apto 102, bairro Masterville, Sarzedo-MG',
      locador_chave_pix:        cfg?.chave_pix || '45.072.735/0001-69',
      locador_tipo_chave_pix:   cfg?.tipo_chave_pix || 'CNPJ',
      locador_nome_representante: cfg?.nome_representante || 'LINCOLN CRISTIANO DELFINO',
      locador_website:          cfg?.website || 'www.cabinesoalegria.com.br',
      foro:                     cfg?.foro || 'Comarca de Belo Horizonte, Estado de Minas Gerais',
      tipo_pessoa:              tipoPessoa,

      // Dados do formulário
      nome_contratante:  (fe.nome_contratante as string) || '',
      cpf:               (fe.cpf as string) || '',
      rg:                (fe.rg as string) || '',
      nome_fantasia_pj:  (fe.nome_fantasia as string) || '',
      razao_social:      (fe.razao_social as string) || '',
      cnpj_pj:           (fe.cnpj as string) || '',
      responsavel_contrato: (fe.responsavel_contrato as string) || (fe.nome_contratante as string) || '',

      // Endereços
      endereco_contratante: [
        fe.endereco_rua, fe.endereco_numero, fe.endereco_complemento,
        fe.endereco_bairro, fe.endereco_cidade, fe.endereco_estado, fe.endereco_cep
      ].filter(Boolean).join(', '),
      endereco_empresa: [
        fe.empresa_rua, fe.empresa_numero, fe.empresa_complemento,
        fe.empresa_bairro, fe.empresa_cidade, fe.empresa_estado
      ].filter(Boolean).join(', '),

      // Contato
      telefone: (fe.telefone as string) || (fe.celular as string) || '',
      email:    (fe.email as string) || '',

      // Evento
      nome_evento:          (fe.nome_evento as string) || '',
      data_evento:          (fe.data_evento as string) || '',
      horario_evento:       (fe.horario_evento as string) || (fe.horario_inicio as string) || '',
      horario_inicio_fotos: (fe.horario_inicio_fotos as string) || (fe.horario_inicio as string) || '',
      endereco_evento: [
        fe.local_rua || fe.local_evento_rua,
        fe.local_numero || fe.local_evento_numero,
        fe.local_complemento,
        fe.local_bairro || fe.local_evento_bairro,
        fe.local_cidade || fe.local_evento_cidade,
        fe.local_estado || fe.local_evento_estado,
        fe.local_cep,
      ].filter(Boolean).join(', '),

      // Serviço
      equipamento:       (fe.equipamento as string) || '',
      quantidade_horas:  (fe.quantidade_horas as string) || (fe.horas as string) || '',
      pacote:            (fe.pacote as string) || (fe.nome_pacote as string) || '',
      formato_foto:      (fe.formato_foto as string) || (fe.tamanho_foto as string) || '',
      valor_total:       Number(fe.valor_total) || undefined,
      forma_pagamento:   (fe.forma_pagamento as string) || '',

      // Publicação
      autoriza_publicacao: Boolean(fe.autoriza_publicacao ?? fe.autorizacao_publicacao),

      // Assinatura
      cidade_assinatura: cfg?.cidade_assinatura || 'Sarzedo',
      data_contrato: fe.data_evento
        ? dataPorExtenso(fe.data_evento as string)
        : '',

      // Extras do admin
      ...dadosExtras,
    };

    // Valor por extenso automático
    if (d.valor_total && !d.valor_total_extenso) {
      d.valor_total_extenso = valorPorExtenso(d.valor_total).toUpperCase();
    }
    if (d.valor_hora_adicional && !d.valor_hora_adicional_extenso) {
      d.valor_hora_adicional_extenso = valorPorExtenso(d.valor_hora_adicional);
    }

    return d;
  };

  // ─── Monta HTML final do contrato ─────────────────────────────────────────

  const renderContratoHtml = (dados: DadosContrato): string => {
    const template = modeloSelecionado?.conteudo_html
      || (tipoPessoa === 'PJ' ? TEMPLATE_CABINE_PJ : TEMPLATE_CABINE_FOTOGRARICA);

    // Monta cláusula de opcionais
    let clausulaOpcionais = '';
    if (opcionaisSelecionados.length > 0) {
      clausulaOpcionais = opcionaisSelecionados
        .map((op, i) => `<p>Parágrafo ${i === 0 ? 'quarto' : 'quinto'}: ${op.clausula_snapshot || op.nome_snapshot}</p>`)
        .join('');
    }

    const marcadores = {
      ...buildMarcadores(dados),
      CLAUSULA_OPCIONAIS: clausulaOpcionais,
    };

    return preencherTemplate(template, marcadores);
  };

  // ─── Campos pendentes ────────────────────────────────────────────────────

  const getCamposPendentes = (dados: DadosContrato): string[] => {
    const obrigatorios = tipoPessoa === 'PJ' ? MARCADORES_OBRIGATORIOS_PJ : MARCADORES_OBRIGATORIOS_PF;
    const marcadores = buildMarcadores(dados);
    return obrigatorios.filter(campo => !marcadores[campo]);
  };

  // ─── Iniciar wizard ──────────────────────────────────────────────────────

  const iniciarWizard = async () => {
    const sugerido = await sugerirModelo(
      (fe.equipamento_id as string) || undefined,
      tipoPessoa,
    );
    setModeloSelecionado(sugerido);

    // Detecta scrapbook
    if (scrapbookNosComentarios) {
      const scrapOp = opcionaisLista.find(o => o.nome.toLowerCase().includes('scrapbook'));
      if (scrapOp) {
        setOpcionaisSelecionados([{
          opcional_id: scrapOp.id,
          nome_snapshot: scrapOp.nome,
          clausula_snapshot: scrapOp.clausula_padrao,
          quantidade: 1,
          incluido_no_valor_total: true,
        }]);
      }
    } else {
      setOpcionaisSelecionados([]);
    }

    setDadosExtras({});
    setConfirmChecks([false,false,false,false,false]);
    setConfirmText('');
    setEditandoBloco(null);
    setStep('modelo');
  };

  // ─── Gerar contrato final ────────────────────────────────────────────────

  const gerarContrato = async () => {
    if (confirmText !== 'GERAR CONTRATO') return;
    setSaving(true);
    try {
      const dados = getDadosCompletos();
      const versao = await getProximaVersao(formularioId);
      const nomeArq = nomeArquivo || gerarNomeArquivo({
        nome: tipoPessoa === 'PJ'
          ? (dados.nome_fantasia_pj || dados.razao_social || 'Empresa')
          : (dados.nome_contratante || 'Cliente'),
        data_evento: dados.data_evento || '',
        equipamento: dados.equipamento || 'Cabine',
        versao,
      });

      const html = renderContratoHtml(dados);
      const id = await createContrato({
        formulario_evento_id: formularioId,
        modelo_contrato_id: modeloSelecionado?.id,
        modelo_versao: modeloSelecionado?.versao || 1,
        numero_versao: versao,
        nome_arquivo: nomeArq,
        dados_snapshot: dados as unknown as Record<string, unknown>,
        dados_extras: dadosExtras as Record<string, unknown>,
        opcionais_snapshot: opcionaisSelecionados,
      });

      await updateContratoStatus(id, 'finalizado');
      await logAuditoria({
        contrato_id: id,
        formulario_evento_id: formularioId,
        acao: 'gerado',
        descricao: `Contrato gerado: ${nomeArq}`,
        dados_novos: { nome_arquivo: nomeArq, versao },
      });

      // Abre janela de impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(buildPrintHtml(html, nomeArq));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 600);
      }

      await load();
      setStep('historico');
    } finally {
      setSaving(false);
    }
  };

  const buildPrintHtml = (body: string, titulo: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #fff; }
  .contrato-page { max-width: 21cm; margin: 0 auto; padding: 2.5cm 3cm; }
  .contrato-titulo { text-align: center; font-weight: bold; font-size: 14pt; text-transform: uppercase; margin-bottom: 24pt; letter-spacing: 1px; }
  .contrato-corpo p { text-align: justify; margin-bottom: 10pt; line-height: 1.5; }
  .contrato-corpo .alinea { padding-left: 20pt; }
  .contrato-local-data { margin-top: 30pt; margin-bottom: 40pt; text-align: center; }
  .contrato-assinaturas { display: flex; justify-content: space-between; margin-top: 30pt; gap: 40pt; }
  .assinatura-bloco { flex: 1; text-align: center; }
  .assinatura-linha { border-top: 1px solid #000; margin-bottom: 6pt; }
  .assinatura-nome { font-weight: bold; font-size: 10pt; }
  .assinatura-detalhe { font-size: 9pt; }
  @media print {
    body { -webkit-print-color-adjust: exact; }
    .contrato-page { margin: 0; padding: 2cm 2.5cm; }
    @page { margin: 2cm 2.5cm; size: A4 portrait; }
  }
</style>
</head>
<body>${body}</body>
</html>`;

  // ─── Render preview do contrato ──────────────────────────────────────────

  const handlePreview = () => {
    const dados = getDadosCompletos();
    const html = renderContratoHtml(dados);
    setContratoHtml(html);
    setNomeArquivo(nomeArquivo || gerarNomeArquivo({
      nome: tipoPessoa === 'PJ'
        ? (dados.nome_fantasia_pj || dados.razao_social || 'Empresa')
        : (dados.nome_contratante || 'Cliente'),
      data_evento: dados.data_evento || '',
      equipamento: dados.equipamento || 'Cabine',
    }));
    setStep('preview');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  // ── Histórico ──────────────────────────────────────────────────────────────

  if (step === 'historico') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div className="admin-page-title" style={{ fontSize: '1.1rem', marginBottom: 4 }}>Contratos</div>
            <div className="admin-page-subtitle">Gerencie os contratos deste evento.</div>
          </div>
          <button className="btn btn-primary" onClick={iniciarWizard}>
            {contratos.length === 0 ? '+ Preparar contrato' : '+ Nova versão'}
          </button>
        </div>

        {scrapbookNosComentarios && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: '0.875rem', color: '#f59e0b' }}>
            📔 <strong>Scrapbook identificado</strong> nos comentários/dados deste evento. Será pré-selecionado na preparação do contrato.
          </div>
        )}

        {contratos.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px', color: 'var(--color-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Nenhum contrato gerado ainda</div>
            <div style={{ fontSize: '0.875rem' }}>Clique em "Preparar contrato" para iniciar.</div>
          </div>
        ) : (
          <div style={{ ...cardStyle }}>
            <div style={sectionTitle}>Contratos gerados</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Versão','Nome do arquivo','Status','Gerado em','Ações'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', background: 'var(--color-surface-hover)', fontWeight: 600, borderBottom: '1px solid var(--color-surface-border)', color: 'var(--color-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contratos.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                    <td style={{ padding: '10px 12px' }}>v{c.numero_versao}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{c.nome_arquivo}</td>
                    <td style={{ padding: '10px 12px' }}><span style={badgeStyle(c.status)}>{c.status}</span></td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted)', fontSize: '0.78rem' }}>
                      {c.gerado_em ? new Date(c.gerado_em).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '6px 12px' }}>
                      <button
                        className="btn btn-ghost"
                        title="Reimprimir"
                        onClick={() => {
                          const snap = c.dados_snapshot as unknown as DadosContrato;
                          const html = renderContratoHtml(snap);
                          const w = window.open('', '_blank');
                          if (w) { w.document.write(buildPrintHtml(html, c.nome_arquivo)); w.document.close(); w.focus(); setTimeout(() => w.print(), 600); }
                        }}
                      >
                        🖨️
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

  // ── Seleção de modelo ──────────────────────────────────────────────────────

  if (step === 'modelo') {
    const modelosCompativeis = modelos.filter(m => m.ativo && (m.tipo_pessoa === tipoPessoa || m.tipo_pessoa === 'AMBOS'));
    return (
      <div>
        <StepHeader title="1. Escolher modelo de contrato" onBack={() => setStep('historico')} />
        <div style={cardStyle}>
          <div style={sectionTitle}>Modelos disponíveis para {tipoPessoa}</div>
          {modelosCompativeis.length === 0 ? (
            <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
              Nenhum modelo cadastrado. O sistema usará o template padrão de Cabine Fotográfica.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, border: '1px solid var(--color-surface-border)', cursor: 'pointer', background: !modeloSelecionado ? 'rgba(var(--color-secondary-rgb),0.08)' : 'transparent' }}>
                <input type="radio" checked={!modeloSelecionado} onChange={() => setModeloSelecionado(null)} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Template padrão — Cabine Fotográfica ({tipoPessoa})</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Contrato baseado no modelo de referência</div>
                </div>
              </label>
              {modelosCompativeis.map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, border: '1px solid var(--color-surface-border)', cursor: 'pointer', background: modeloSelecionado?.id === m.id ? 'rgba(var(--color-secondary-rgb),0.08)' : 'transparent' }}>
                  <input type="radio" checked={modeloSelecionado?.id === m.id} onChange={() => setModeloSelecionado(m)} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.nome} {m.modelo_padrao && <span style={{ fontSize: '0.72rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 6, padding: '1px 6px', marginLeft: 6 }}>Padrão</span>}</div>
                    {m.descricao && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{m.descricao}</div>}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 4 }}>v{m.versao} · {m.tipo_pessoa}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setStep('dados')}>Continuar →</button>
            <button className="btn btn-ghost" onClick={() => setStep('historico')}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Completar dados ────────────────────────────────────────────────────────

  if (step === 'dados') {
    const dados = getDadosCompletos();
    const pendentes = getCamposPendentes(dados);
    const isPending = (valor: unknown) => !valor;

    const field = (label: string, key: keyof DadosContrato, type: 'text'|'date'|'number' = 'text') => {
      const val = (dadosExtras[key] !== undefined ? dadosExtras[key] : dados[key]) as string | number | undefined;
      const pend = isPending(val);
      return (
        <div>
          <div style={{ fontSize: '0.75rem', color: pend ? '#f59e0b' : 'var(--color-muted)', marginBottom: 4, fontWeight: 600 }}>
            {label}{pend ? ' ⚠️' : ''}
          </div>
          <input
            type={type}
            style={pend ? pendingInputStyle : inputStyle}
            value={String(val || '')}
            onChange={e => setDadosExtras(prev => ({ ...prev, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
          />
        </div>
      );
    };

    return (
      <div>
        <StepHeader title="2. Completar dados do contrato" onBack={() => setStep('modelo')} />
        {pendentes.length > 0 && (
          <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#f59e0b' }}>
            ⚠️ {pendentes.length} campo(s) pendente(s): {pendentes.join(', ')}
          </div>
        )}

        <div style={cardStyle}>
          <div style={sectionTitle}>
            {tipoPessoa === 'PF' ? 'Dados do contratante (PF)' : 'Dados da empresa (PJ)'}
          </div>
          <div style={fieldRow}>
            {tipoPessoa === 'PF' ? (
              <>
                {field('Nome completo *', 'nome_contratante')}
                {field('CPF *', 'cpf')}
                {field('RG', 'rg')}
                {field('Endereço completo *', 'endereco_contratante')}
              </>
            ) : (
              <>
                {field('Razão social *', 'razao_social')}
                {field('Nome fantasia', 'nome_fantasia_pj')}
                {field('CNPJ *', 'cnpj_pj')}
                {field('Responsável pelo contrato *', 'responsavel_contrato')}
                {field('Endereço da empresa *', 'endereco_empresa')}
              </>
            )}
            {field('Telefone', 'telefone')}
            {field('E-mail', 'email')}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>Dados do evento</div>
          <div style={fieldRow}>
            {field('Nome do evento *', 'nome_evento')}
            {field('Data do evento *', 'data_evento', 'date')}
            {field('Horário do evento', 'horario_evento')}
            {field('Horário de início das fotos *', 'horario_inicio_fotos')}
            {field('Endereço do evento *', 'endereco_evento')}
            {field('Equipamento *', 'equipamento')}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitle}>Valores e pagamento</div>
          <div style={fieldRow}>
            {field('Qtde de horas *', 'quantidade_horas')}
            {field('Pacote', 'pacote')}
            {field('Formato da foto *', 'formato_foto')}
            {field('Valor total (R$) *', 'valor_total', 'number')}
            {field('Valor por extenso *', 'valor_total_extenso')}
            {field('Forma de pagamento *', 'forma_pagamento')}
            {field('Valor hora adicional (R$) *', 'valor_hora_adicional', 'number')}
            {field('Hora adicional por extenso *', 'valor_hora_adicional_extenso')}
          </div>
          <div style={fieldRow}>
            {field('Data do contrato (por extenso) *', 'data_contrato')}
            {field('Cidade da assinatura', 'cidade_assinatura')}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600 }}>
              Autorização de publicação de fotos
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[true, false].map(v => (
                <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    checked={(dadosExtras.autoriza_publicacao ?? dados.autoriza_publicacao) === v}
                    onChange={() => setDadosExtras(prev => ({ ...prev, autoriza_publicacao: v }))}
                  />
                  {v ? '✅ Autoriza' : '❌ Não autoriza'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setStep('opcionais')}>Continuar →</button>
          <button className="btn btn-ghost" onClick={() => setStep('modelo')}>← Voltar</button>
        </div>
      </div>
    );
  }

  // ── Opcionais ──────────────────────────────────────────────────────────────

  if (step === 'opcionais') {
    const toggleOpcional = (op: Opcional) => {
      setOpcionaisSelecionados(prev => {
        const existe = prev.find(o => o.opcional_id === op.id);
        if (existe) return prev.filter(o => o.opcional_id !== op.id);
        return [...prev, {
          opcional_id: op.id,
          nome_snapshot: op.nome,
          descricao_snapshot: op.descricao,
          clausula_snapshot: op.clausula_padrao,
          quantidade: 1,
          valor_unitario: op.valor_padrao,
          valor_total: op.valor_padrao,
          incluido_no_valor_total: true,
        }];
      });
    };

    const updateOpcional = (id: string, updates: Partial<OpcionalSelecionado>) => {
      setOpcionaisSelecionados(prev =>
        prev.map(o => o.opcional_id === id ? { ...o, ...updates } : o)
      );
    };

    return (
      <div>
        <StepHeader title="3. Opcionais do contrato" onBack={() => setStep('dados')} />
        {scrapbookNosComentarios && (
          <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#f59e0b' }}>
            📔 Scrapbook identificado. Confirme se deve ser incluído neste contrato.
          </div>
        )}
        <div style={cardStyle}>
          <div style={sectionTitle}>Selecione os opcionais contratados</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {opcionaisLista.map(op => {
              const sel = opcionaisSelecionados.find(o => o.opcional_id === op.id);
              return (
                <div key={op.id} style={{ border: `1px solid ${sel ? 'rgba(var(--color-secondary-rgb),0.4)' : 'var(--color-surface-border)'}`, borderRadius: 10, overflow: 'hidden' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', background: sel ? 'rgba(var(--color-secondary-rgb),0.05)' : 'transparent' }}>
                    <input type="checkbox" checked={!!sel} onChange={() => toggleOpcional(op)} style={{ accentColor: 'var(--color-secondary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{op.nome}</div>
                      {op.descricao && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{op.descricao}</div>}
                    </div>
                  </label>
                  {sel && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-surface-border)', background: 'var(--color-surface-hover)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 4 }}>Cláusula</div>
                        <textarea
                          style={{ ...inputStyle, height: 72, resize: 'vertical' }}
                          value={sel.clausula_snapshot || ''}
                          onChange={e => updateOpcional(op.id, { clausula_snapshot: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 4 }}>Quantidade</div>
                          <input type="number" style={inputStyle} value={sel.quantidade} onChange={e => updateOpcional(op.id, { quantidade: Number(e.target.value) })} min={1} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 4 }}>Valor unit.</div>
                          <input type="number" style={inputStyle} value={sel.valor_unitario || ''} onChange={e => updateOpcional(op.id, { valor_unitario: Number(e.target.value) })} placeholder="R$" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={sel.incluido_no_valor_total} onChange={e => updateOpcional(op.id, { incluido_no_valor_total: e.target.checked })} />
                            Incluso no total
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setStep('revisao')}>Continuar →</button>
            <button className="btn btn-ghost" onClick={() => setStep('dados')}>← Voltar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Revisão ────────────────────────────────────────────────────────────────

  if (step === 'revisao') {
    const dados = getDadosCompletos();
    const pendentes = getCamposPendentes(dados);

    const Bloco = ({ titulo, campos }: { titulo: string; campos: [string, unknown][] }) => (
      <div style={{ marginBottom: 16, padding: '14px 18px', background: 'var(--color-surface-hover)', borderRadius: 10, border: '1px solid var(--color-surface-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{titulo}</div>
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '3px 10px' }} onClick={() => setStep('dados')}>Editar</button>
        </div>
        {campos.map(([label, valor]) => (
          <div key={label} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--color-muted)', minWidth: 180 }}>{label}:</span>
            <span style={{ color: valor ? 'var(--color-text)' : '#ef4444', fontWeight: valor ? 400 : 600 }}>
              {valor ? String(valor) : '⚠️ Não preenchido'}
            </span>
          </div>
        ))}
      </div>
    );

    return (
      <div>
        <StepHeader title="4. Revisão do contrato" onBack={() => setStep('opcionais')} />

        {pendentes.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#ef4444' }}>
            ❌ {pendentes.length} campo(s) obrigatório(s) não preenchido(s): <strong>{pendentes.join(', ')}</strong>
          </div>
        )}

        <div style={cardStyle}>
          <Bloco titulo="Contratante" campos={[
            ['Nome', tipoPessoa === 'PF' ? dados.nome_contratante : dados.razao_social],
            [tipoPessoa === 'PF' ? 'CPF' : 'CNPJ', tipoPessoa === 'PF' ? dados.cpf : dados.cnpj_pj],
            ['Endereço', tipoPessoa === 'PF' ? dados.endereco_contratante : dados.endereco_empresa],
            ['Telefone', dados.telefone],
            ['E-mail', dados.email],
          ]} />

          <Bloco titulo="Evento" campos={[
            ['Nome do evento', dados.nome_evento],
            ['Data', dados.data_evento ? formatDateBR(dados.data_evento) : ''],
            ['Horário início fotos', dados.horario_inicio_fotos],
            ['Endereço do evento', dados.endereco_evento],
          ]} />

          <Bloco titulo="Serviço e valores" campos={[
            ['Equipamento', dados.equipamento],
            ['Horas', dados.quantidade_horas],
            ['Pacote', dados.pacote],
            ['Formato', dados.formato_foto],
            ['Valor total', dados.valor_total ? `R$ ${dados.valor_total.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : ''],
            ['Por extenso', dados.valor_total_extenso],
            ['Forma pagamento', dados.forma_pagamento],
            ['Hora adicional', dados.valor_hora_adicional ? `R$ ${dados.valor_hora_adicional}` : ''],
          ]} />

          <Bloco titulo="Opcionais" campos={
            opcionaisSelecionados.length === 0
              ? [['Opcionais', 'Nenhum opcional selecionado']]
              : opcionaisSelecionados.map(o => [o.nome_snapshot, `${o.quantidade}x`] as [string, unknown])
          } />

          <Bloco titulo="Autorização e assinatura" campos={[
            ['Publicação', dados.autoriza_publicacao ? '✅ AUTORIZADA' : '❌ NÃO AUTORIZADA'],
            ['Cidade', dados.cidade_assinatura],
            ['Data do contrato', dados.data_contrato],
          ]} />

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600 }}>Nome do arquivo</div>
            <input
              type="text"
              style={inputStyle}
              value={nomeArquivo}
              placeholder={gerarNomeArquivo({ nome: dados.nome_contratante || 'Cliente', data_evento: dados.data_evento || '', equipamento: dados.equipamento || 'Cabine' })}
              onChange={e => setNomeArquivo(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handlePreview} disabled={pendentes.length > 0}>
              👁️ Ver prévia
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('opcionais')}>← Voltar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  if (step === 'preview') {
    return (
      <div>
        <StepHeader title="5. Prévia do contrato" onBack={() => setStep('revisao')} />
        <div style={{ marginBottom: 12, padding: '10px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#60a5fa' }}>
          📋 Esta é uma prévia. O contrato ainda não foi finalizado.
        </div>
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div
            style={{ padding: '40px 60px', background: '#fff', color: '#000', fontFamily: 'Times New Roman, serif', fontSize: '11pt', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: contratoHtml }}
          />
        </div>
        {/* Check for remaining markers */}
        {/\{\{[A-Z_]+\}\}/.test(contratoHtml) && (
          <div style={{ margin: '12px 0', padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#ef4444' }}>
            ❌ O contrato ainda possui marcadores não preenchidos. Volte e preencha os campos obrigatórios.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={() => setStep('confirmacao')}
            disabled={/\{\{[A-Z_]+\}\}/.test(contratoHtml)}
          >
            ✅ Aprovar e gerar →
          </button>
          <button className="btn btn-ghost" onClick={() => setStep('revisao')}>← Voltar e editar</button>
        </div>
      </div>
    );
  }

  // ── Confirmação ──────────────────────────────────────────────────────────────

  if (step === 'confirmacao') {
    const checks = [
      'Revisei os dados do contratante.',
      'Revisei data, horário e endereço do evento.',
      'Revisei equipamento, pacote e opcionais.',
      'Revisei valores e forma de pagamento.',
      'Revisei as cláusulas que serão inseridas.',
    ];
    const allChecked = confirmChecks.every(Boolean);

    return (
      <div>
        <StepHeader title="6. Confirmar geração" onBack={() => setStep('preview')} />
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Etapa 1 — Confirmação dos dados</div>
          {checks.map((c, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={confirmChecks[i]}
                onChange={() => setConfirmChecks(prev => prev.map((v, j) => j === i ? !v : v))}
                style={{ accentColor: 'var(--color-secondary)', width: 16, height: 16 }}
              />
              {c}
            </label>
          ))}
        </div>

        {allChecked && (
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Etapa 2 — Confirmação final</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 16 }}>
              Após gerar, o documento será salvo como versão finalizada. Digite <strong>GERAR CONTRATO</strong> para confirmar.
            </div>
            <input
              type="text"
              style={{ ...inputStyle, letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}
              placeholder="GERAR CONTRATO"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value.toUpperCase())}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ background: '#22c55e', borderColor: '#22c55e' }}
                disabled={confirmText !== 'GERAR CONTRATO' || saving}
                onClick={gerarContrato}
              >
                {saving ? '⏳ Gerando...' : '🖨️ Gerar PDF do contrato'}
              </button>
              <button className="btn btn-ghost" onClick={() => setStep('preview')}>← Voltar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Step Header ─────────────────────────────────────────────────────────────

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ padding: '6px 12px' }}>←</button>
      <div className="admin-page-title" style={{ fontSize: '1.05rem', marginBottom: 0 }}>{title}</div>
    </div>
  );
}

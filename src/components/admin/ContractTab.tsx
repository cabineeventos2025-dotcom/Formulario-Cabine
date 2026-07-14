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
import {
  TEMPLATE_CABINE_FOTOGRARICA,
  TEMPLATE_CABINE_PJ,
  MARCADORES_OBRIGATORIOS_PF,
  MARCADORES_OBRIGATORIOS_PJ,
  detectarTipoEquipamento,
  getTemplatePadrao,
  formatarHoras,
  formatoFromPacote,
} from '../../templates/contratoTemplates';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ContractTabProps {
  formulario: Record<string, unknown>;
  formularioId: string;
}

// ─── Wizard steps (sem confirmação) ──────────────────────────────────────────
type WizardStep = 'historico' | 'modelo' | 'dados' | 'opcionais' | 'revisao' | 'preview';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Data de hoje por extenso: "14 de julho de 2026" */
function hojeExtenso(): string {
  const meses = ['janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro'];
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Formata horário HH:MM para "HH:MM" ou mantém como está */
function formatHora(h: string | undefined): string {
  if (!h) return '';
  // Se vier como "HH:MM:SS" corta os segundos
  return h.slice(0, 5);
}

/**
 * Limpa HTML gerado pelo mammoth para que marcadores {{CAMPO}} que o Word
 * fragmentou em múltiplos <span> ou <strong> sejam reunidos como texto puro.
 *
 * Problema: Word salva cada "run" em tag separada. Após conversão:
 *   <p><span>{{NOME_CON</span><span>TRATANTE}}</span></p>
 * precisa virar: <p>{{NOME_CONTRATANTE}}</p>
 *
 * Estratégia: extrai texto de cada parágrafo/bloco, aplica regex de marcador
 * no texto puro, depois reconstrói o HTML.
 */
export function sanitizarHtmlMammoth(html: string): string {
  // 1. Remove tags vazias/desnecessárias
  let out = html
    .replace(/<(strong|em|u|span)[^>]*>\s*<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');

  // 2. Colapsa fragmentos de marcadores espalhados em várias tags
  //    Estratégia: dentro de qualquer bloco de tag, remove todas as tags
  //    que dividem um marcador e une o texto
  out = reunirMarcadoresFragmentados(out);

  return out;
}

/**
 * Percorre o HTML e, dentro de cada "bloco inline" (conteúdo entre tags de bloco),
 * detecta e reconstrói marcadores {{...}} que foram divididos por tags HTML.
 */
function reunirMarcadoresFragmentados(html: string): string {
  // Regex que captura o conteúdo de um elemento de bloco (p, li, td, h1-h6)
  return html.replace(
    /(<(?:p|li|td|th|h[1-6])[^>]*>)([\s\S]*?)(<\/(?:p|li|td|th|h[1-6])>)/gi,
    (_match, open, inner, close) => {
      // Extrai texto puro do bloco, preservando \n
      const textoPlano = inner.replace(/<[^>]+>/g, '');

      // Verifica se há fragmento de marcador (tem {{ ou }} no texto)
      if (textoPlano.includes('{{') || textoPlano.includes('}}')) {
        // Reconstrói o inner substituindo todo conteúdo pelo texto puro
        // (mantendo apenas a formatação de bloco)
        return open + textoPlano + close;
      }
      return _match;
    },
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

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
  const [saving, setSaving] = useState(false);
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
  const scrapbookNosComentarios =
    String(fe.comentarios || '').toLowerCase().includes('scrapbook') ||
    Boolean(fe.possui_scrapbook);

  // ─── Monta endereço do evento ──────────────────────────────────────────────

  const montarEnderecoEvento = (): string => {
    const partes = [
      fe.logradouro_evento || fe.local_rua || fe.local_evento_rua,
      fe.numero_evento    || fe.local_numero || fe.local_evento_numero,
      fe.complemento_evento || fe.local_complemento,
      fe.bairro_evento    || fe.local_bairro || fe.local_evento_bairro,
      fe.cidade_evento    || fe.local_cidade || fe.local_evento_cidade,
      fe.estado_evento    || fe.local_estado || fe.local_evento_estado,
      fe.cep_evento       || fe.local_cep,
    ].filter(Boolean);
    return partes.join(', ');
  };

  const montarEnderecoContratante = (): string => {
    const partes = [
      fe.endereco_rua    || fe.logradouro,
      fe.endereco_numero || fe.numero,
      fe.endereco_complemento || fe.complemento,
      fe.endereco_bairro || fe.bairro,
      fe.endereco_cidade || fe.cidade,
      fe.endereco_estado || fe.estado,
      fe.endereco_cep    || fe.cep,
    ].filter(Boolean);
    return partes.join(', ');
  };

  // ─── Monta DadosContrato completo ─────────────────────────────────────────

  const getDadosCompletos = useCallback((): DadosContrato => {
    const cfg = configEmpresa;
    const hoje = hojeExtenso();

    const d: DadosContrato = {
      // Locador
      locador_nome_empresarial: cfg?.nome_empresarial || '45.072.735 LINCOLN CRISTIANO DELFINO',
      locador_nome_fantasia:    cfg?.nome_fantasia    || 'CABINE SÓ ALEGRIA',
      locador_cnpj:             cfg?.cnpj             || '45.072.735/0001-69',
      locador_endereco:         cfg?.endereco         || 'Alameda das palmeiras nº1022, bloco C apto 102, bairro Masterville, Sarzedo-MG',
      locador_chave_pix:        cfg?.chave_pix        || '45.072.735/0001-69',
      locador_tipo_chave_pix:   cfg?.tipo_chave_pix   || 'CNPJ',
      locador_nome_representante: cfg?.nome_representante || 'LINCOLN CRISTIANO DELFINO',
      locador_website:          cfg?.website          || 'www.cabinesoalegria.com.br',
      foro:                     cfg?.foro             || 'Comarca de Belo Horizonte, Estado de Minas Gerais',
      tipo_pessoa:              tipoPessoa,

      // Dados do formulário — PF
      nome_contratante: (fe.nome_contratante as string) || '',
      cpf:              (fe.cpf as string)              || '',
      rg:               (fe.rg  as string)              || '',

      // Dados do formulário — PJ
      razao_social:        (fe.razao_social    as string) || '',
      nome_fantasia_pj:    (fe.nome_fantasia   as string) || '',
      cnpj_pj:             (fe.cnpj            as string) || '',
      responsavel_contrato:(fe.responsavel_contrato as string) || (fe.nome_responsavel as string) || (fe.nome_contratante as string) || '',

      // Endereços (monta na hora, aceita override via dadosExtras)
      endereco_contratante: montarEnderecoContratante(),
      endereco_empresa:     [
        fe.empresa_rua, fe.empresa_numero, fe.empresa_complemento,
        fe.empresa_bairro, fe.empresa_cidade, fe.empresa_estado,
      ].filter(Boolean).join(', '),

      // Contato
      telefone: (fe.telefone as string) || (fe.celular as string) || '',
      email:    (fe.email    as string) || '',

      // Evento — puxado do formulário
      nome_evento:          (fe.nome_evento as string)  || '',
      data_evento:          (fe.data_evento as string)  || '',
      horario_evento:       formatHora(fe.horario_inicio_evento as string || fe.horario_evento as string),
      horario_inicio_fotos: formatHora(fe.horario_inicio_fotos as string || fe.horario_inicio as string),
      endereco_evento:      montarEnderecoEvento(),

      // Serviço — puxado do formulário
      // Equipamento: usa nome do snapshot
      equipamento:      (fe.equipamento_nome_snapshot as string) || (fe.equipamento as string) || '',
      // Horas: sempre com "HORAS" no final
      quantidade_horas: formatarHoras((fe.quantidade_horas as string) || (fe.horas as string) || ''),
      pacote:           (fe.pacote_nome_snapshot as string) || (fe.pacote as string) || (fe.nome_pacote as string) || '',
      // Formato derivado do pacote automaticamente (sem campo separado)
      formato_foto:     formatoFromPacote((fe.pacote_nome_snapshot as string) || (fe.pacote as string) || ''),
      valor_total:      Number(fe.valor_total) || undefined,
      forma_pagamento:  (fe.forma_pagamento as string) || 'Pix',

      // Hora adicional padrão R$ 450,00 (editável)
      valor_hora_adicional: 450,
      valor_hora_adicional_extenso: 'quatrocentos e cinquenta reais',

      // Desconto Pix padrão 10%
      desconto_pix: 10,

      // Publicação — puxada do formulário
      autoriza_publicacao: Boolean(fe.autoriza_publicacao_fotos ?? fe.autoriza_publicacao ?? false),

      // Assinatura — data de hoje automaticamente
      cidade_assinatura: cfg?.cidade_assinatura || 'Sarzedo',
      data_contrato:     hoje,

      // Override com dados extras digitados no wizard
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configEmpresa, dadosExtras, fe, tipoPessoa]);

  // ─── Renderiza HTML final do contrato ─────────────────────────────────────

  const renderContratoHtml = (dados: DadosContrato): string => {
    // Detecta tipo de equipamento para escolher o template certo
    const tipoEquip = detectarTipoEquipamento(dados.equipamento || '');
    let template = modeloSelecionado?.conteudo_html
      || getTemplatePadrao(tipoEquip, tipoPessoa);

    // Limpa fragmentação de marcadores gerada pelo mammoth/Word
    template = sanitizarHtmlMammoth(template);

    // Cláusula opcionais
    let clausulaOpcionais = '';
    if (opcionaisSelecionados.length > 0) {
      clausulaOpcionais = opcionaisSelecionados
        .map((op, i) => {
          const ord = ['quarto','quinto','sexto','sétimo'][i] || `${i+4}º`;
          return `<p>Parágrafo ${ord}: ${op.clausula_snapshot || op.nome_snapshot}</p>`;
        })
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

    // Pré-seleciona scrapbook se detectado
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
    setNomeArquivo('');
    setStep('modelo');
  };

  // ─── Gerar e imprimir contrato (direto, sem confirmação extra) ───────────

  const gerarContrato = async () => {
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

  // ─── CSS de impressão A4 — texto até a borda, máx 3/4 páginas ────────────

  const buildPrintHtml = (body: string, titulo: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    color: #000;
    background: #fff;
    line-height: 1.45;
  }
  .contrato-titulo {
    text-align: center;
    font-weight: bold;
    font-size: 13pt;
    text-transform: uppercase;
    margin-bottom: 14pt;
    text-decoration: underline;
  }
  p {
    text-align: justify;
    margin-bottom: 7pt;
    line-height: 1.45;
    orphans: 2;
    widows: 2;
  }
  h1,h2,h3 { font-size: 12pt; font-weight: bold; margin-bottom: 5pt; }
  @page {
    size: A4 portrait;
    margin: 1.5cm 1.8cm;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    p { margin-bottom: 6pt; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;



  // ─── Preview do contrato no wizard ────────────────────────────────────────

  const handlePreview = () => {
    const dados = getDadosCompletos();
    const html = renderContratoHtml(dados);
    setContratoHtml(html);
    if (!nomeArquivo) {
      setNomeArquivo(gerarNomeArquivo({
        nome: tipoPessoa === 'PJ'
          ? (dados.nome_fantasia_pj || dados.razao_social || 'Empresa')
          : (dados.nome_contratante || 'Cliente'),
        data_evento: dados.data_evento || '',
        equipamento: dados.equipamento || 'Cabine',
      }));
    }
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
            📔 <strong>Scrapbook identificado</strong> nos comentários. Será pré-selecionado.
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
                          if (w) {
                            w.document.write(buildPrintHtml(html, c.nome_arquivo));
                            w.document.close();
                            w.focus();
                            setTimeout(() => w.print(), 600);
                          }
                        }}
                      >🖨️</button>
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
        <StepHeader title="1. Escolher modelo" onBack={() => setStep('historico')} step={1} total={4} />
        <div style={cardStyle}>
          <div style={sectionTitle}>Modelos disponíveis para {tipoPessoa}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, border: `1px solid ${!modeloSelecionado ? 'var(--color-secondary)' : 'var(--color-surface-border)'}`, cursor: 'pointer', background: !modeloSelecionado ? 'rgba(var(--color-secondary-rgb),0.06)' : 'transparent' }}>
              <input type="radio" checked={!modeloSelecionado} onChange={() => setModeloSelecionado(null)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600 }}>Template padrão — {tipoPessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Template base embutido no sistema</div>
              </div>
            </label>
            {modelosCompativeis.map(m => (
              <label key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, border: `1px solid ${modeloSelecionado?.id === m.id ? 'var(--color-secondary)' : 'var(--color-surface-border)'}`, cursor: 'pointer', background: modeloSelecionado?.id === m.id ? 'rgba(var(--color-secondary-rgb),0.06)' : 'transparent' }}>
                <input type="radio" checked={modeloSelecionado?.id === m.id} onChange={() => setModeloSelecionado(m)} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{m.nome}{m.modelo_padrao && <span style={{ fontSize: '0.72rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 6, padding: '1px 6px', marginLeft: 6 }}>Padrão</span>}</div>
                  {m.descricao && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{m.descricao}</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 4 }}>v{m.versao} · {m.tipo_pessoa}</div>
                </div>
              </label>
            ))}
          </div>
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

    const field = (
      label: string,
      key: keyof DadosContrato,
      type: 'text' | 'date' | 'number' = 'text',
      placeholder?: string,
    ) => {
      const val = (dadosExtras[key] !== undefined ? dadosExtras[key] : dados[key]) as string | number | undefined;
      const pend = !val && !String(val || '');
      return (
        <div>
          <div style={{ fontSize: '0.75rem', color: pend ? '#f59e0b' : 'var(--color-muted)', marginBottom: 4, fontWeight: 600 }}>
            {label}
          </div>
          <input
            type={type}
            style={pend ? pendingInputStyle : inputStyle}
            value={String(val ?? '')}
            placeholder={placeholder}
            onChange={e => setDadosExtras(prev => ({ ...prev, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
          />
        </div>
      );
    };

    return (
      <div>
        <StepHeader title="2. Dados do contrato" onBack={() => setStep('modelo')} step={2} total={4} />

        {pendentes.length > 0 && (
          <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#f59e0b' }}>
            ⚠️ {pendentes.length} campo(s) pendente(s): {pendentes.join(', ')}
          </div>
        )}

        {/* Dados já preenchidos pelo cliente */}
        <div style={{ ...cardStyle, borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.03)' }}>
          <div style={sectionTitle}>✅ Preenchido pelo cliente</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.82rem' }}>
            {[
              ['Contratante', tipoPessoa === 'PF' ? dados.nome_contratante : dados.razao_social],
              [tipoPessoa === 'PF' ? 'CPF' : 'CNPJ', tipoPessoa === 'PF' ? dados.cpf : dados.cnpj_pj],
              ['E-mail', dados.email],
              ['Telefone', dados.telefone],
              ['Endereço do contratante', dados.endereco_contratante],
              ['Nome do evento', dados.nome_evento],
              ['Data do evento', dados.data_evento ? formatDateBR(dados.data_evento) : ''],
              ['Horário do evento', dados.horario_evento],
              ['Horário início fotos', dados.horario_inicio_fotos],
              ['Endereço do evento', dados.endereco_evento],
              ['Equipamento', dados.equipamento],
              ['Pacote', dados.pacote],
              ['Quantidade de horas', dados.quantidade_horas],
              ['Forma de pagamento', dados.forma_pagamento],
              ['Autorização de fotos', dados.autoriza_publicacao ? '✅ Autoriza' : '❌ Não autoriza'],
            ].map(([label, val]) => val ? (
              <div key={label} style={{ padding: '6px 10px', background: 'var(--color-surface-hover)', borderRadius: 6 }}>
                <div style={{ color: 'var(--color-muted)', fontSize: '0.7rem', fontWeight: 600 }}>{label}</div>
                <div style={{ color: 'var(--color-text)', marginTop: 2 }}>{val}</div>
              </div>
            ) : null)}
          </div>
        </div>

        {/* Campos financeiros (editáveis) */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Valores (editáveis)</div>
          <div style={fieldRow}>
            {field('Valor total (R$)', 'valor_total', 'number')}
            {field('Valor por extenso', 'valor_total_extenso', 'text', 'DOIS MIL E DUZENTOS REAIS')}
            {field('Hora adicional (R$)', 'valor_hora_adicional', 'number', '450')}
            {field('Hora adicional por extenso', 'valor_hora_adicional_extenso', 'text', 'quatrocentos e cinquenta reais')}
          </div>
          <div style={fieldRow}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 4, fontWeight: 600 }}>Desconto Pix (%)</div>
              <input
                type="number"
                style={inputStyle}
                value={String((dadosExtras.desconto_pix ?? dados.desconto_pix) ?? 10)}
                min={0}
                max={100}
                onChange={e => setDadosExtras(prev => ({ ...prev, desconto_pix: Number(e.target.value) }))}
              />
            </div>
            {field('Endereço do contratante', 'endereco_contratante')}
          </div>
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--color-surface-hover)', borderRadius: 8, fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>Autorização de fotos (respondida pelo cliente):</span>{' '}
            <strong style={{ color: dados.autoriza_publicacao ? '#22c55e' : '#ef4444' }}>
              {dados.autoriza_publicacao ? '✅ AUTORIZA' : '❌ NÃO AUTORIZA'}
            </strong>
          </div>
          <div style={fieldRow}>
            {field('Data do contrato (por extenso)', 'data_contrato', 'text')}
            {field('Cidade da assinatura', 'cidade_assinatura')}
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
        prev.map(o => o.opcional_id === id ? { ...o, ...updates } : o),
      );
    };

    return (
      <div>
        <StepHeader title="3. Opcionais" onBack={() => setStep('dados')} step={3} total={4} />
        <div style={cardStyle}>
          <div style={sectionTitle}>Selecione os opcionais contratados</div>
          {opcionaisLista.length === 0 ? (
            <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
              Nenhum opcional cadastrado. Vá em "➕ Opcionais" para cadastrar.
            </div>
          ) : (
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
                      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-surface-border)', background: 'var(--color-surface-hover)' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: 4 }}>Cláusula</div>
                          <textarea
                            style={{ ...inputStyle, height: 68, resize: 'vertical' }}
                            value={sel.clausula_snapshot || ''}
                            onChange={e => updateOpcional(op.id, { clausula_snapshot: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
      <div style={{ marginBottom: 14, padding: '12px 16px', background: 'var(--color-surface-hover)', borderRadius: 10, border: '1px solid var(--color-surface-border)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10 }}>{titulo}</div>
        {campos.map(([label, valor]) => (
          <div key={label} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--color-muted)', minWidth: 200 }}>{label}:</span>
            <span style={{ color: valor ? 'var(--color-text)' : '#ef4444', fontWeight: valor ? 400 : 600 }}>
              {valor ? String(valor) : '⚠️ Não preenchido'}
            </span>
          </div>
        ))}
      </div>
    );

    return (
      <div>
        <StepHeader title="4. Revisar e gerar" onBack={() => setStep('opcionais')} step={4} total={4} />

        {pendentes.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#ef4444' }}>
            ❌ {pendentes.length} campo(s) obrigatório(s) faltando: <strong>{pendentes.join(', ')}</strong>
          </div>
        )}

        <div style={cardStyle}>
          <Bloco titulo="Contratante" campos={[
            ['Nome', tipoPessoa === 'PF' ? dados.nome_contratante : dados.razao_social],
            [tipoPessoa === 'PF' ? 'CPF' : 'CNPJ', tipoPessoa === 'PF' ? dados.cpf : dados.cnpj_pj],
            ['Endereço', tipoPessoa === 'PF' ? dados.endereco_contratante : dados.endereco_empresa],
          ]} />
          <Bloco titulo="Evento" campos={[
            ['Nome do evento', dados.nome_evento],
            ['Data', dados.data_evento ? formatDateBR(dados.data_evento) : ''],
            ['Horário evento', dados.horario_evento],
            ['Horário início fotos', dados.horario_inicio_fotos],
            ['Endereço', dados.endereco_evento],
            ['Equipamento', dados.equipamento],
            ['Pacote', dados.pacote],
            ['Formato', dados.formato_foto],
            ['Horas', dados.quantidade_horas],
          ]} />
          <Bloco titulo="Financeiro" campos={[
            ['Valor total', dados.valor_total ? `R$ ${dados.valor_total.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : ''],
            ['Forma de pagamento', dados.forma_pagamento],
            ['Desconto Pix', `${dados.desconto_pix || 10}%`],
            ['Hora adicional', `R$ ${dados.valor_hora_adicional || 450}`],
          ]} />
          <Bloco titulo="Assinatura" campos={[
            ['Data do contrato', dados.data_contrato],
            ['Cidade', dados.cidade_assinatura],
            ['Autorização', dados.autoriza_publicacao ? 'AUTORIZA' : 'NÃO AUTORIZA'],
          ]} />

          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600 }}>Nome do arquivo</div>
            <input
              type="text"
              style={inputStyle}
              value={nomeArquivo}
              placeholder={gerarNomeArquivo({ nome: dados.nome_contratante || 'Cliente', data_evento: dados.data_evento || '', equipamento: dados.equipamento || 'Cabine' })}
              onChange={e => setNomeArquivo(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handlePreview}>
              👁️ Ver prévia do contrato
            </button>
            <button
              className="btn btn-primary"
              style={{ background: '#22c55e', borderColor: '#22c55e' }}
              disabled={saving}
              onClick={gerarContrato}
            >
              {saving ? '⏳ Gerando...' : '🖨️ Gerar e imprimir PDF'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('opcionais')}>← Voltar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  if (step === 'preview') {
    const temMarcadoresPendentes = /\{\{[A-Z_]+\}\}/.test(contratoHtml);
    return (
      <div>
        <StepHeader title="Prévia do contrato" onBack={() => setStep('revisao')} step={4} total={4} />
        <div style={{ marginBottom: 12, padding: '10px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#60a5fa' }}>
          📋 Prévia — confira os dados antes de imprimir.
        </div>
        {temMarcadoresPendentes && (
          <div style={{ marginBottom: 12, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#ef4444' }}>
            ⚠️ Existem marcadores <code style={{ background: 'rgba(239,68,68,0.1)', padding: '1px 4px', borderRadius: 3 }}>{'{{...}}'}</code> não substituídos. Volte e preencha os campos ou verifique o template.
          </div>
        )}

        {/* Preview com estilo igual ao PDF */}
        <div style={{
          background: '#fff',
          color: '#000',
          border: '1px solid var(--color-surface-border)',
          borderRadius: 8,
          padding: '28px 60px',
          fontFamily: 'Times New Roman, serif',
          fontSize: '11pt',
          lineHeight: 1.45,
          marginBottom: 16,
        }}
          dangerouslySetInnerHTML={{ __html: contratoHtml }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ background: '#22c55e', borderColor: '#22c55e' }}
            disabled={saving}
            onClick={gerarContrato}
          >
            {saving ? '⏳ Gerando...' : '🖨️ Gerar e imprimir PDF'}
          </button>
          <button className="btn btn-ghost" onClick={() => setStep('revisao')}>← Voltar e editar</button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Step Header ─────────────────────────────────────────────────────────────

function StepHeader({ title, onBack, step, total }: { title: string; onBack: () => void; step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ padding: '6px 12px' }}>←</button>
      <div style={{ flex: 1 }}>
        <div className="admin-page-title" style={{ fontSize: '1rem', marginBottom: 2 }}>{title}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} style={{ height: 3, width: 24, borderRadius: 2, background: i < step ? 'var(--color-secondary)' : 'var(--color-surface-border)', transition: 'background 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

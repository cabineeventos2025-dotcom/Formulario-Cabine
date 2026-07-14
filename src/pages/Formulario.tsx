import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoArea } from '../components/layout/LogoArea';
import { ProgressBar } from '../components/layout/ProgressBar';
import { ToastContainer } from '../components/feedback/Toast';
import { Modal } from '../components/feedback/Modal';
import { AddressFields } from '../components/form/AddressFields';
import { useToast } from '../hooks/useToast';
import { usePackages } from '../hooks/usePackages';
import { useEquipments } from '../hooks/useEquipments';
import { saveDraft, loadDraft, clearDraft } from '../lib/storage';
import { submitForm } from '../services/formService';
import { sendToGoogleSheets } from '../lib/googleSheets';
import { maskCPF, maskCNPJ, maskPhone, maskCEP, onlyDigits, maskDate, isValidDate, isDatePastOrToday, dateToISO } from '../lib/masks';
import { validateCPF, validateCNPJ } from '../lib/validators';
import { APP_CONFIG } from '../config/app.config';
import { PF_STEPS } from '../config/pfQuestions';
import { PJ_STEPS } from '../config/pjQuestions';
import type { FormData, TipoPessoa, StepId } from '../types/form.types';
import { defaultFormData } from '../types/form.types';
import { formasPagamentoLabel, formatDate } from '../utils/formatters';

// ─────────────────────────────────────────────────────────
// Helper: get first name from full name
// ─────────────────────────────────────────────────────────
function firstName(name: string): string {
  return name?.trim().split(' ')[0] || '';
}

// ─────────────────────────────────────────────────────────
// Step IDs in order
// ─────────────────────────────────────────────────────────
const PF_STEP_IDS: StepId[] = [
  'tipo','dados_pf','endereco','contatos','evento',
  'pagamento','horas','pacote','equipamento','publicacao',
  'comentarios','revisao','consentimento',
];
const PJ_STEP_IDS: StepId[] = [
  'tipo','dados_pj','endereco','contatos','evento',
  'pagamento','horas','pacote','equipamento','publicacao',
  'comentarios','nota_fiscal','revisao','consentimento',
];

function getSteps(tipo: TipoPessoa | '') {
  if (tipo === 'PF') return PF_STEP_IDS;
  if (tipo === 'PJ') return PJ_STEP_IDS;
  return ['tipo'] as StepId[];
}

function getStepLabel(step: StepId): string {
  const labels: Record<StepId, string> = {
    tipo: 'Tipo de contratação',
    dados_pf: 'Dados pessoais',
    dados_pj: 'Dados da empresa',
    endereco: 'Endereço',
    contatos: 'Contatos',
    evento: 'Dados do evento',
    pagamento: 'Forma de pagamento',
    horas: 'Horas contratadas',
    pacote: 'Pacote escolhido',
    equipamento: 'Equipamento',
    publicacao: 'Autorização de publicação',
    comentarios: 'Comentários',
    nota_fiscal: 'Nota fiscal',
    revisao: 'Revisão dos dados',
    consentimento: 'Consentimento',
  };
  return labels[step] || step;
}

// Payment options
const PF_PAYMENT = [
  { value: 'boleto', label: 'Boleto até a data do evento', icon: '🧾' },
  { value: 'cartao_credito', label: 'Cartão de crédito', icon: '💳' },
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'deposito_bancario', label: 'Depósito bancário', icon: '🏦' },
  { value: 'outro', label: 'Outro', icon: '📝' },
];
const PJ_PAYMENT = [
  { value: 'boleto', label: 'Boleto até a data do evento', icon: '🧾' },
  { value: 'cartao_credito', label: 'Cartão de crédito', icon: '💳' },
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'deposito_bancario', label: 'Depósito bancário', icon: '🏦' },
  { value: 'faturado_15_21_30', label: 'Faturado 15-21-30 dias', icon: '📅' },
  { value: 'outro', label: 'Outro', icon: '📝' },
];
const HORAS = ['2','3','4','5','6','outro'];

export function Formulario() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    ...defaultFormData,
    submission_id: crypto.randomUUID(),
    data_inicio: new Date().toISOString(),
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Modals
  const [showResumeDraft, setShowResumeDraft] = useState(false);
  const [showChangeTipo, setShowChangeTipo] = useState(false);
  const [pendingTipo, setPendingTipo] = useState<TipoPessoa | null>(null);
  const [showConfirmClearDraft, setShowConfirmClearDraft] = useState(false);
  const [comeFromReview, setComeFromReview] = useState(false);

  const steps = getSteps(formData.tipo_pessoa);
  const currentStep = steps[currentStepIndex] as StepId;
  const totalSteps = steps.length;

  const { packages, loading: packagesLoading } = usePackages(
    formData.tipo_pessoa as 'PF' | 'PJ' | ''
  );
  const { equipments, loading: equipmentsLoading } = useEquipments();

  // ── Load draft on mount ─────────────────
  useEffect(() => {
    const draft = loadDraft();
    // Restore automatically if there's a valid draft (skip modal on re-visit)
    if (draft && draft.formData.submission_id && (draft.currentStep || 0) > 0) {
      setFormData({ ...defaultFormData, ...(draft.formData as FormData) });
      setCurrentStepIndex(draft.currentStep || 0);
    } else if (draft && draft.formData.submission_id) {
      setShowResumeDraft(true);
    }
  }, []);

  // ── Auto-save draft ─────────────────────────────
  useEffect(() => {
    if (!submitted) {
      saveDraft(formData, currentStepIndex);
    }
  }, [formData, currentStepIndex, submitted]);

  // ── Scroll to top on step change ────────────────
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStepIndex]);

  // ── Update field ────────────────────────────────
  const update = useCallback((field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }, []);

  const updateAddress = useCallback((prefix: string, field: string, value: string) => {
    const key = prefix ? `${prefix}${field}` : field;
    update(key as keyof FormData, value);
  }, [update]);

  // ── Tipo de pessoa change ───────────────────────
  const handleTipoChange = (tipo: TipoPessoa) => {
    if (formData.tipo_pessoa && formData.tipo_pessoa !== tipo) {
      setPendingTipo(tipo);
      setShowChangeTipo(true);
    } else {
      applyTipoChange(tipo);
    }
  };

  const applyTipoChange = (tipo: TipoPessoa) => {
    setFormData((prev) => ({
      ...defaultFormData,
      submission_id: prev.submission_id,
      data_inicio: prev.data_inicio,
      tipo_pessoa: tipo,
      // Keep shared fields
      telefone: prev.telefone,
      email: prev.email,
      nome_evento: prev.nome_evento,
      data_evento: prev.data_evento,
    }));
    setCurrentStepIndex(1);
    setErrors({});
  };

  // ── Validate current step ───────────────────────
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'tipo') {
      if (!formData.tipo_pessoa) newErrors.tipo_pessoa = 'Escolha o tipo de contratação.';
    }

    if (currentStep === 'dados_pf') {
      if (!formData.nome_contratante || formData.nome_contratante.trim().length < 3)
        newErrors.nome_contratante = 'Nome muito curto (mínimo 3 caracteres).';
      if (/^\d+$/.test(formData.nome_contratante))
        newErrors.nome_contratante = 'Nome inválido.';
      if (!formData.data_nascimento || !isValidDate(formData.data_nascimento))
        newErrors.data_nascimento = 'Informe a data no formato DD/MM/AAAA.';
      else if (!isDatePastOrToday(formData.data_nascimento))
        newErrors.data_nascimento = 'Data não pode ser futura.';
      if (!formData.cpf)
        newErrors.cpf = 'Informe o CPF.';
      else if (!validateCPF(formData.cpf))
        newErrors.cpf = 'Informe um CPF válido.';
    }

    if (currentStep === 'dados_pj') {
      if (!formData.nome_fantasia || formData.nome_fantasia.trim().length < 2)
        newErrors.nome_fantasia = 'Informe o nome da empresa.';
      if (!formData.cnpj)
        newErrors.cnpj = 'Informe o CNPJ.';
      else if (!validateCNPJ(formData.cnpj))
        newErrors.cnpj = 'Confira o CNPJ informado.';
    }

    if (currentStep === 'endereco') {
      // CEP opcional — preenche automaticamente quando digitado
      if (formData.cep && onlyDigits(formData.cep).length > 0 && onlyDigits(formData.cep).length !== 8)
        newErrors.cep = 'CEP inválido (8 dígitos).';
      if (!formData.logradouro) newErrors.logradouro = 'Informe o logradouro.';
      if (!formData.numero) newErrors.numero = 'Informe o número.';
      if (!formData.bairro) newErrors.bairro = 'Informe o bairro.';
      if (!formData.cidade) newErrors.cidade = 'Informe a cidade.';
      // estado sempre 'MG' — não precisa validar
    }

    if (currentStep === 'contatos') {
      if (!formData.telefone || onlyDigits(formData.telefone).length < 10)
        newErrors.telefone = 'Informe um telefone válido (mínimo 10 dígitos).';
      if (formData.tipo_pessoa === 'PJ') {
        if (!formData.email) newErrors.email = 'Informe o e-mail.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          newErrors.email = 'Informe um e-mail válido.';
        if (!formData.nome_responsavel)
          newErrors.nome_responsavel = 'Informe o nome do responsável.';
      } else {
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          newErrors.email = 'Informe um e-mail válido.';
      }
    }

    if (currentStep === 'evento') {
      // CEP evento opcional — preenche automaticamente quando digitado
      if (formData.cep_evento && onlyDigits(formData.cep_evento).length > 0 && onlyDigits(formData.cep_evento).length !== 8)
        newErrors.cep_evento = 'CEP inválido (8 dígitos).';
      if (!formData.logradouro_evento) newErrors.logradouro_evento = 'Informe o logradouro.';
      if (!formData.numero_evento) newErrors.numero_evento = 'Informe o número.';
      if (!formData.bairro_evento) newErrors.bairro_evento = 'Informe o bairro.';
      if (!formData.cidade_evento) newErrors.cidade_evento = 'Informe a cidade.';
      if (!formData.data_evento) newErrors.data_evento = 'Informe a data do evento.';
      if (formData.tipo_pessoa === 'PJ' && !formData.horario_inicio_evento)
        newErrors.horario_inicio_evento = 'Informe o horário de início.';
    }

    if (currentStep === 'pagamento') {
      if (!formData.forma_pagamento)
        newErrors.forma_pagamento = 'Escolha a forma de pagamento.';
      if (formData.forma_pagamento === 'outro' && !formData.forma_pagamento_outro)
        newErrors.forma_pagamento_outro = 'Informe a forma de pagamento.';
    }

    if (currentStep === 'horas') {
      if (!formData.quantidade_horas)
        newErrors.quantidade_horas = 'Escolha a quantidade de horas.';
      if (formData.quantidade_horas === 'outro' && !formData.quantidade_horas_outro)
        newErrors.quantidade_horas_outro = 'Informe a quantidade de horas.';
    }

    if (currentStep === 'pacote') {
      if (!formData.pacote_id && !formData.pacote_outro)
        newErrors.pacote_id = 'Escolha um pacote.';
      if (formData.pacote_id === 'outro' && !formData.pacote_outro)
        newErrors.pacote_outro = 'Informe o pacote contratado.';
    }

    if (currentStep === 'publicacao') {
      if (formData.tipo_pessoa === 'PJ' && formData.autoriza_publicacao_fotos === null)
        newErrors.autoriza_publicacao_fotos = 'Informe sua autorização.';
    }

    if (currentStep === 'consentimento') {
      if (!formData.consentimento_dados)
        newErrors.consentimento_dados = 'Você precisa concordar para continuar.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstField = Object.keys(newErrors)[0];
      const el = document.getElementById(`field-${firstField}`) ||
                 document.getElementById(firstField);
      if (el) el.focus();
      addToast(Object.values(newErrors)[0], 'warning');
      return false;
    }
    return true;
  };

  // ── Navigation ──────────────────────────────────
  const goNext = () => {
    if (!validateStep()) return;
    if (comeFromReview && currentStep !== 'consentimento') {
      const reviewIdx = steps.indexOf('revisao');
      setCurrentStepIndex(reviewIdx);
      setComeFromReview(false);
    } else {
      setCurrentStepIndex((i) => Math.min(i + 1, totalSteps - 1));
    }
  };

  const goBack = () => {
    if (currentStepIndex === 0) return;
    setCurrentStepIndex((i) => i - 1);
    setComeFromReview(false);
  };

  const goToStep = (stepId: StepId) => {
    const idx = steps.indexOf(stepId);
    if (idx >= 0) {
      setComeFromReview(true);
      setCurrentStepIndex(idx);
    }
  };

  // ── Submit ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitForm(formData);
      setSubmitted(true);
      clearDraft();
      // Fire-and-forget Google Sheets
      sendToGoogleSheets(formData, result.protocolo).catch(() => {});
      navigate('/sucesso', {
        state: {
          protocolo: result.protocolo,
          nomeContratante:
            formData.tipo_pessoa === 'PJ'
              ? formData.nome_responsavel
              : formData.nome_contratante,
          dataEvento: formData.data_evento,
          tipoPessoa: formData.tipo_pessoa,
        },
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      addToast(
        `Erro ao enviar: ${msg}`,
        'error',
        10000
      );
      console.error('[handleSubmit]', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Address copy ────────────────────────────────
  const copyAddressToEvent = () => {
    update('cep_evento', formData.cep);
    update('logradouro_evento', formData.logradouro);
    update('numero_evento', formData.numero);
    update('complemento_evento', formData.complemento);
    update('bairro_evento', formData.bairro);
    update('cidade_evento', formData.cidade);
    update('estado_evento', formData.estado);
    addToast('Endereço copiado. Confira e ajuste se necessário.', 'info');
  };

  const hasContratanteAddress =
    !!formData.cep && !!formData.logradouro && !!formData.cidade;

  const contratanteName =
    formData.tipo_pessoa === 'PJ'
      ? firstName(formData.nome_responsavel)
      : firstName(formData.nome_contratante);

  // ─────────────────────────────────────────────────────────
  // RENDER STEPS
  // ─────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      // ── STEP: TIPO ──────────────────────────────────────
      case 'tipo':
        return (
          <div className="step-card">
            <h2 className="step-title">Me diz aqui, você quer contratar como?</h2>
            <p className="step-subtitle">
              Escolha a opção que constará como contratante do evento.
            </p>
            <div className="choice-grid grid-2" style={{ gap: 16 }}>
              {[
                { tipo: 'PF' as TipoPessoa, label: 'Pessoa Física', icon: '👤', desc: 'Contratação em seu nome pessoal (CPF).' },
                { tipo: 'PJ' as TipoPessoa, label: 'Pessoa Jurídica', icon: '🏢', desc: 'Contratação por empresa (CNPJ).' },
              ].map(({ tipo, label, icon, desc }) => (
                <div
                  key={tipo}
                  id={`card-tipo-${tipo}`}
                  className={`choice-card tipo-card ${formData.tipo_pessoa === tipo ? 'selected' : ''}`}
                  onClick={() => handleTipoChange(tipo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleTipoChange(tipo)}
                >
                  <div className="selected-check">✓</div>
                  <div style={{ fontSize: '2.5rem' }}>{icon}</div>
                  <div className="choice-card-title">{label}</div>
                  <span className="tipo-badge">{tipo}</span>
                  <div className="choice-card-subtitle">{desc}</div>
                </div>
              ))}
            </div>
            {errors.tipo_pessoa && <p className="field-error mt-2">{errors.tipo_pessoa}</p>}
            <div className="nav-buttons">
              <button id="btn-next-tipo" className="btn btn-primary" onClick={goNext}>
                Continuar →
              </button>
            </div>
          </div>
        );

      // ── STEP: DADOS PF ──────────────────────────────────
      case 'dados_pf':
        return (
          <div className="step-card">
            <p className="step-greeting">
              Obrigado por escolher a Cabine Só Alegria! 🎉
            </p>
            <h2 className="step-title">Dados pessoais</h2>
            <p className="step-subtitle">
              Precisamos dessas informações para preparar o seu contrato.
              Seus dados estão seguros com a gente.
            </p>
            <div className="field-group">
              {/* Nome */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-nome_contratante">
                  Nome completo <span className="required-mark">*</span>
                </label>
                <input
                  id="field-nome_contratante"
                  type="text"
                  className={`field-input ${errors.nome_contratante ? 'error' : ''}`}
                  value={formData.nome_contratante}
                  onChange={(e) => update('nome_contratante', e.target.value)}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                />
                {errors.nome_contratante && <span className="field-error">{errors.nome_contratante}</span>}
              </div>

              {/* Data nascimento */}
              <div className="field-row">
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="field-data_nascimento">
                    Data de nascimento <span className="required-mark">*</span>
                  </label>
                  <input
                    id="field-data_nascimento"
                    type="text"
                    inputMode="numeric"
                    className={`field-input ${errors.data_nascimento ? 'error' : ''}`}
                    value={formData.data_nascimento}
                    onChange={(e) => update('data_nascimento', maskDate(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    autoComplete="bday"
                  />
                  {errors.data_nascimento && <span className="field-error">{errors.data_nascimento}</span>}
                </div>

                {/* RG */}
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="field-rg">RG</label>
                  <input
                    id="field-rg"
                    type="text"
                    className="field-input"
                    value={formData.rg}
                    onChange={(e) => update('rg', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* CPF */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-cpf">
                  CPF <span className="required-mark">*</span>
                </label>
                <input
                  id="field-cpf"
                  type="text"
                  inputMode="numeric"
                  className={`field-input ${errors.cpf ? 'error' : ''}`}
                  value={formData.cpf}
                  onChange={(e) => update('cpf', maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  autoComplete="off"
                />
                {errors.cpf && <span className="field-error">{errors.cpf}</span>}
              </div>
            </div>

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-dados-pf" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: DADOS PJ ──────────────────────────────────
      case 'dados_pj':
        return (
          <div className="step-card">
            <p className="step-greeting">
              Obrigado por escolher a Cabine Só Alegria! 🎉
            </p>
            <h2 className="step-title">Dados da empresa</h2>
            <p className="step-subtitle">
              Precisamos dessas informações para preparar o contrato corporativo.
              Seus dados estão seguros com a gente.
            </p>
            <div className="field-group">
              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-nome_fantasia">
                  Nome Fantasia da empresa <span className="required-mark">*</span>
                </label>
                <input
                  id="field-nome_fantasia"
                  type="text"
                  className={`field-input ${errors.nome_fantasia ? 'error' : ''}`}
                  value={formData.nome_fantasia}
                  onChange={(e) => update('nome_fantasia', e.target.value)}
                  placeholder="Nome da empresa como é conhecida"
                  autoComplete="organization"
                />
                {errors.nome_fantasia && <span className="field-error">{errors.nome_fantasia}</span>}
              </div>

              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-cnpj">
                  CNPJ <span className="required-mark">*</span>
                </label>
                <input
                  id="field-cnpj"
                  type="text"
                  inputMode="numeric"
                  className={`field-input ${errors.cnpj ? 'error' : ''}`}
                  value={formData.cnpj}
                  onChange={(e) => update('cnpj', maskCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  autoComplete="off"
                />
                {errors.cnpj && <span className="field-error">{errors.cnpj}</span>}
              </div>
            </div>

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-dados-pj" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: ENDEREÇO ──────────────────────────────────
      case 'endereco':
        return (
          <div className="step-card">
            {contratanteName && (
              <p className="step-greeting">Ótimo, {contratanteName}!</p>
            )}
            <h2 className="step-title">
              {formData.tipo_pessoa === 'PJ' ? 'Endereço da empresa' : 'Seu endereço residencial'}
            </h2>
            <p className="step-subtitle">
              Informe o CEP para preenchimento automático.
            </p>
            <AddressFields
              values={{
                cep: formData.cep,
                logradouro: formData.logradouro,
                numero: formData.numero,
                complemento: formData.complemento,
                bairro: formData.bairro,
                cidade: formData.cidade,
                estado: formData.estado,
              }}
              onChange={(field, value) => update(field as keyof FormData, value)}
              errors={errors}
            />
            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-endereco" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: CONTATOS ──────────────────────────────────
      case 'contatos':
        return (
          <div className="step-card">
            <h2 className="step-title">Contatos</h2>
            <p className="step-subtitle">
              Como podemos entrar em contato com você?
            </p>
            <div className="field-group">
              {/* Telefone */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-telefone">
                  Telefone para contato <span className="required-mark">*</span>
                </label>
                <input
                  id="field-telefone"
                  type="tel"
                  inputMode="numeric"
                  className={`field-input ${errors.telefone ? 'error' : ''}`}
                  value={formData.telefone}
                  onChange={(e) => update('telefone', maskPhone(e.target.value))}
                  placeholder="(31) 99999-9999"
                  maxLength={15}
                  autoComplete="tel"
                />
                {errors.telefone && <span className="field-error">{errors.telefone}</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    id="field-telefone_whatsapp"
                    checked={formData.telefone_whatsapp}
                    onChange={(e) => update('telefone_whatsapp', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-secondary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="field-telefone_whatsapp" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                    Este número é WhatsApp
                  </label>
                  {formData.telefone_whatsapp && (
                    <span className="whatsapp-tag">📱 WhatsApp</span>
                  )}
                </div>
              </div>

              {/* E-mail */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-email">
                  E-mail{formData.tipo_pessoa === 'PJ' ? <span className="required-mark"> *</span> : ''}
                </label>
                <input
                  id="field-email"
                  type="email"
                  inputMode="email"
                  className={`field-input ${errors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="seu@email.com.br"
                  autoComplete="email"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              {/* Responsável (PJ) */}
              {formData.tipo_pessoa === 'PJ' && (
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="field-nome_responsavel">
                    Responsável pelo contrato <span className="required-mark">*</span>
                  </label>
                  <input
                    id="field-nome_responsavel"
                    type="text"
                    className={`field-input ${errors.nome_responsavel ? 'error' : ''}`}
                    value={formData.nome_responsavel}
                    onChange={(e) => update('nome_responsavel', e.target.value)}
                    placeholder="Nome completo do responsável"
                  />
                  <span className="field-helper">
                    Informe o nome da pessoa responsável pelas informações e pelo contrato.
                  </span>
                  {errors.nome_responsavel && <span className="field-error">{errors.nome_responsavel}</span>}
                </div>
              )}

              {/* Cerimonial (PF) */}
              {formData.tipo_pessoa === 'PF' && (
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="field-contato_cerimonial">
                    Contato Cerimonial / Observações
                  </label>
                  <textarea
                    id="field-contato_cerimonial"
                    className="field-input"
                    value={formData.contato_cerimonial}
                    onChange={(e) => update('contato_cerimonial', e.target.value.slice(0, 1000))}
                    placeholder="Informe o nome e telefone do cerimonial, se houver, ou alguma observação."
                    rows={3}
                  />
                  <div className="char-counter">{formData.contato_cerimonial.length}/1000</div>
                </div>
              )}
            </div>

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-contatos" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: EVENTO ────────────────────────────────────
      case 'evento':
        return (
          <div className="step-card">
            {contratanteName && (
              <p className="step-greeting">
                {formData.tipo_pessoa === 'PF'
                  ? `Agora são os dados do seu evento, ${contratanteName}. Calma que já está acabando!`
                  : `Agora são os dados do evento, ${contratanteName}.`}
              </p>
            )}
            <h2 className="step-title">Dados do evento</h2>
            <div className="field-group">
              {/* Nome do evento */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-nome_evento">Nome do evento</label>
                <input
                  id="field-nome_evento"
                  type="text"
                  className="field-input"
                  value={formData.nome_evento}
                  onChange={(e) => update('nome_evento', e.target.value)}
                  placeholder="Ex: Casamento Ana e Carlos, Aniversário da Júlia..."
                />
                <span className="field-helper">
                  Exemplo: Casamento Ana e Carlos, Aniversário da Júlia ou Confraternização da Empresa.
                </span>
              </div>

              {/* Data do evento */}
              <div className="field-row">
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="field-data_evento">
                    Data do evento <span className="required-mark">*</span>
                  </label>
                  <input
                    id="field-data_evento"
                    type="text"
                    inputMode="numeric"
                    className={`field-input ${errors.data_evento ? 'error' : ''}`}
                    value={formData.data_evento}
                    onChange={(e) => update('data_evento', maskDate(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                  {errors.data_evento && <span className="field-error">{errors.data_evento}</span>}
                </div>

                {/* Horário início evento */}
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="field-horario_inicio_evento">
                    Início do evento{formData.tipo_pessoa === 'PJ' ? <span className="required-mark"> *</span> : ''}
                  </label>
                  <input
                    id="field-horario_inicio_evento"
                    type="time"
                    className={`field-input ${errors.horario_inicio_evento ? 'error' : ''}`}
                    value={formData.horario_inicio_evento}
                    onChange={(e) => update('horario_inicio_evento', e.target.value)}
                  />
                  {errors.horario_inicio_evento && <span className="field-error">{errors.horario_inicio_evento}</span>}
                </div>
              </div>

              {/* Horário início fotos */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="field-horario_inicio_fotos">
                  Horário de início das fotos
                </label>
                <input
                  id="field-horario_inicio_fotos"
                  type="time"
                  className="field-input"
                  value={formData.horario_inicio_fotos}
                  onChange={(e) => update('horario_inicio_fotos', e.target.value)}
                />
                <span className="field-helper">
                  Informe o horário previsto para o início do serviço de fotos.
                </span>
              </div>

              <div className="divider" />

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                Endereço do evento <span className="required-mark">*</span>
              </h3>

              <AddressFields
                values={{
                  cep: formData.cep_evento,
                  logradouro: formData.logradouro_evento,
                  numero: formData.numero_evento,
                  complemento: formData.complemento_evento,
                  bairro: formData.bairro_evento,
                  cidade: formData.cidade_evento,
                  estado: formData.estado_evento,
                }}
                onChange={(field, value) => update(`${field}_evento` as keyof FormData, value === 'estado' ? value : value)}
                errors={{
                  cep: errors.cep_evento,
                  logradouro: errors.logradouro_evento,
                  numero: errors.numero_evento,
                  bairro: errors.bairro_evento,
                  cidade: errors.cidade_evento,
                  estado: errors.estado_evento,
                }}
                showCopyOption={hasContratanteAddress}
                previousAddress={hasContratanteAddress ? {
                  cep: formData.cep,
                  logradouro: formData.logradouro,
                  numero: formData.numero,
                  complemento: formData.complemento,
                  bairro: formData.bairro,
                  cidade: formData.cidade,
                  estado: formData.estado,
                } : null}
                onCopyPrevious={copyAddressToEvent}
                extraFields={
                  <div className="field-wrapper">
                    <label className="field-label" htmlFor="field-referencia_evento">Ponto de referência</label>
                    <input
                      id="field-referencia_evento"
                      type="text"
                      className="field-input"
                      value={formData.referencia_evento}
                      onChange={(e) => update('referencia_evento', e.target.value)}
                      placeholder="Próximo a... (opcional)"
                    />
                  </div>
                }
              />
            </div>

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-evento" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: PAGAMENTO ──────────────────────────────────
      case 'pagamento':
        const paymentOptions = formData.tipo_pessoa === 'PJ' ? PJ_PAYMENT : PF_PAYMENT;
        return (
          <div className="step-card">
            <h2 className="step-title">Forma de pagamento</h2>
            <p className="step-subtitle">
              Qual a forma de pagamento combinada?
            </p>
            <div className="payment-grid">
              {paymentOptions.map((opt) => (
                <div
                  key={opt.value}
                  id={`payment-${opt.value}`}
                  className={`payment-card ${formData.forma_pagamento === opt.value ? 'selected' : ''}`}
                  onClick={() => update('forma_pagamento', opt.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('forma_pagamento', opt.value)}
                >
                  <span className="payment-icon">{opt.icon}</span>
                  <span className="payment-label">{opt.label}</span>
                </div>
              ))}
            </div>
            {errors.forma_pagamento && <p className="field-error mt-2">{errors.forma_pagamento}</p>}

            {formData.forma_pagamento === 'outro' && (
              <div className="field-wrapper mt-3">
                <label className="field-label" htmlFor="field-forma_pagamento_outro">
                  Informe a forma de pagamento <span className="required-mark">*</span>
                </label>
                <input
                  id="field-forma_pagamento_outro"
                  type="text"
                  className={`field-input ${errors.forma_pagamento_outro ? 'error' : ''}`}
                  value={formData.forma_pagamento_outro}
                  onChange={(e) => update('forma_pagamento_outro', e.target.value)}
                  placeholder="Descreva a forma de pagamento"
                  autoFocus
                />
                {errors.forma_pagamento_outro && <span className="field-error">{errors.forma_pagamento_outro}</span>}
              </div>
            )}

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-pagamento" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: HORAS ──────────────────────────────────────
      case 'horas':
        return (
          <div className="step-card">
            <h2 className="step-title">Quantidade de horas contratada</h2>
            <div className="choice-grid grid-auto">
              {HORAS.map((h) => (
                <div
                  key={h}
                  id={`horas-${h}`}
                  className={`choice-card ${formData.quantidade_horas === h ? 'selected' : ''}`}
                  onClick={() => update('quantidade_horas', h)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && update('quantidade_horas', h)}
                >
                  <div className="selected-check">✓</div>
                  <div className="choice-card-title" style={{ fontSize: '1.4rem' }}>
                    {h === 'outro' ? '📝' : `${h}h`}
                  </div>
                  <div className="choice-card-subtitle">
                    {h === 'outro' ? 'Outro' : `${h} hora${h !== '1' ? 's' : ''}`}
                  </div>
                </div>
              ))}
            </div>
            {errors.quantidade_horas && <p className="field-error mt-2">{errors.quantidade_horas}</p>}

            {formData.quantidade_horas === 'outro' && (
              <div className="field-wrapper mt-3">
                <label className="field-label" htmlFor="field-quantidade_horas_outro">
                  Especifique <span className="required-mark">*</span>
                </label>
                <input
                  id="field-quantidade_horas_outro"
                  type="text"
                  className={`field-input ${errors.quantidade_horas_outro ? 'error' : ''}`}
                  value={formData.quantidade_horas_outro}
                  onChange={(e) => update('quantidade_horas_outro', e.target.value)}
                  placeholder="Ex: 7 horas, 1h30..."
                  autoFocus
                />
                {errors.quantidade_horas_outro && <span className="field-error">{errors.quantidade_horas_outro}</span>}
              </div>
            )}

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-horas" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: PACOTE ─────────────────────────────────────
      case 'pacote':
        return (
          <div className="step-card">
            {contratanteName && (
              <p className="step-greeting">Tudo certo, {contratanteName}!</p>
            )}
            <h2 className="step-title">Pacote escolhido</h2>
            <p className="step-subtitle">Qual pacote foi contratado?</p>

            {packagesLoading ? (
              <div className="loading-overlay">
                <div className="spinner" />
                <span>Carregando pacotes...</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    id={`pkg-${pkg.id}`}
                    className={`item-card ${formData.pacote_id === pkg.id ? 'selected' : ''}`}
                    onClick={() => {
                      update('pacote_id', pkg.id);
                      update('pacote_nome_snapshot', `${pkg.nome} — ${pkg.tamanho_foto}`);
                      update('pacote_outro', '');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && update('pacote_id', pkg.id)}
                  >
                    <div className="selected-badge">✓</div>
                    <div className="item-card-image">
                      {pkg.imagem_url
                        ? <img src={pkg.imagem_url} alt={pkg.nome} />
                        : <span>📸</span>
                      }
                    </div>
                    <div className="item-card-body">
                      <div className="item-card-name">{pkg.nome}</div>
                      {pkg.tamanho_foto && (
                        <span className="item-card-badge">{pkg.tamanho_foto}</span>
                      )}
                      {pkg.descricao && (
                        <div className="item-card-desc" style={{ marginTop: 6 }}>{pkg.descricao}</div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Outro (PJ only, but we support it on both for flexibility) */}
                {formData.tipo_pessoa === 'PJ' && (
                  <div
                    id="pkg-outro"
                    className={`item-card ${formData.pacote_id === 'outro' ? 'selected' : ''}`}
                    onClick={() => { update('pacote_id', 'outro'); update('pacote_nome_snapshot', 'Outro'); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && update('pacote_id', 'outro')}
                  >
                    <div className="selected-badge">✓</div>
                    <div className="item-card-image"><span>📝</span></div>
                    <div className="item-card-body">
                      <div className="item-card-name">Outro</div>
                      <div className="item-card-desc">Especifique o pacote contratado.</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errors.pacote_id && <p className="field-error mt-2">{errors.pacote_id}</p>}

            {formData.pacote_id === 'outro' && (
              <div className="field-wrapper mt-3">
                <label className="field-label" htmlFor="field-pacote_outro">
                  Informe o pacote <span className="required-mark">*</span>
                </label>
                <input
                  id="field-pacote_outro"
                  type="text"
                  className={`field-input ${errors.pacote_outro ? 'error' : ''}`}
                  value={formData.pacote_outro}
                  onChange={(e) => update('pacote_outro', e.target.value)}
                  placeholder="Descreva o pacote contratado"
                  autoFocus
                />
                {errors.pacote_outro && <span className="field-error">{errors.pacote_outro}</span>}
              </div>
            )}

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-pacote" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: EQUIPAMENTO ────────────────────────────────
      case 'equipamento':
        return (
          <div className="step-card">
            <h2 className="step-title">Equipamento escolhido</h2>
            <p className="step-subtitle">Qual equipamento foi contratado para o seu evento?</p>

            {equipmentsLoading ? (
              <div className="loading-overlay">
                <div className="spinner" />
                <span>Carregando equipamentos...</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                {equipments.map((eq) => (
                  <div
                    key={eq.id}
                    id={`eq-${eq.id}`}
                    className={`item-card ${formData.equipamento_id === eq.id ? 'selected' : ''}`}
                    onClick={() => {
                      update('equipamento_id', eq.id);
                      update('equipamento_nome_snapshot', eq.nome);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && update('equipamento_id', eq.id)}
                  >
                    <div className="selected-badge">✓</div>
                    <div className="item-card-image">
                      {eq.imagem_url
                        ? <img src={eq.imagem_url} alt={eq.nome} />
                        : <span>📷</span>
                      }
                    </div>
                    <div className="item-card-body">
                      <div className="item-card-name">{eq.nome}</div>
                      {eq.descricao && (
                        <div className="item-card-desc">{eq.descricao}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-equipamento" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: PUBLICAÇÃO ─────────────────────────────────
      case 'publicacao':
        return (
          <div className="step-card">
            <h2 className="step-title">Autorização de publicação</h2>
            <p className="step-subtitle">
              Você autoriza a publicação das fotos tiradas no evento nas redes sociais da Cabine Só Alegria?
            </p>
            <p className="field-helper" style={{ marginBottom: 16 }}>
              Isso pode incluir Facebook, Instagram e o site da Cabine Só Alegria.
            </p>
            <div className="toggle-group">
              <button
                id="pub-sim"
                type="button"
                className={`toggle-btn ${formData.autoriza_publicacao_fotos === true ? 'active-yes' : ''}`}
                onClick={() => update('autoriza_publicacao_fotos', true)}
              >
                ✅ Sim, autorizo
              </button>
              <button
                id="pub-nao"
                type="button"
                className={`toggle-btn ${formData.autoriza_publicacao_fotos === false ? 'active-no' : ''}`}
                onClick={() => update('autoriza_publicacao_fotos', false)}
              >
                🚫 Não autorizo
              </button>
            </div>
            {errors.autoriza_publicacao_fotos && (
              <p className="field-error mt-2">{errors.autoriza_publicacao_fotos}</p>
            )}

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-publicacao" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: COMENTÁRIOS ────────────────────────────────
      case 'comentarios':
        return (
          <div className="step-card">
            <h2 className="step-title">Comentários</h2>
            <p className="step-subtitle">
              Existe alguma informação importante que nossa equipe precisa saber?
            </p>
            <div className="field-wrapper">
              <textarea
                id="field-comentarios"
                className="field-input"
                value={formData.comentarios}
                onChange={(e) => update('comentarios', e.target.value.slice(0, 2000))}
                placeholder="Escreva aqui qualquer observação relevante para o evento... (opcional)"
                rows={5}
              />
              <div className={`char-counter ${formData.comentarios.length > 1800 ? 'near-limit' : ''} ${formData.comentarios.length >= 2000 ? 'at-limit' : ''}`}>
                {formData.comentarios.length}/2000
              </div>
            </div>

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-comentarios" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: NOTA FISCAL ────────────────────────────────
      case 'nota_fiscal':
        return (
          <div className="step-card">
            <h2 className="step-title">Nota fiscal</h2>
            <div className="info-notice">
              <div className="info-notice-icon">🧾</div>
              <div className="info-notice-text">
                Como a contratação é realizada por uma empresa, os dados informados poderão ser
                utilizados para emissão manual da nota fiscal quando necessário.
                <br /><br />
                Nenhuma ação adicional é necessária por sua parte.
              </div>
            </div>

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-nota" className="btn btn-primary" onClick={goNext}>Continuar →</button>
            </div>
          </div>
        );

      // ── STEP: REVISÃO ────────────────────────────────────
      case 'revisao':
        const isPF = formData.tipo_pessoa === 'PF';
        const ReviewBlock = ({ title, stepId, children }: { title: string; stepId: StepId; children: React.ReactNode }) => (
          <div className="review-section">
            <div className="review-section-header">
              <span className="review-section-title">{title}</span>
              <button className="review-edit-btn" onClick={() => goToStep(stepId)}>
                ✏️ Editar
              </button>
            </div>
            {children}
          </div>
        );
        const ReviewField = ({ label, value }: { label: string; value: string | null | undefined }) => {
          if (!value) return null;
          return (
            <div className="review-field">
              <span className="review-field-label">{label}</span>
              <span className="review-field-value">{value}</span>
            </div>
          );
        };

        return (
          <div className="step-card">
            <h2 className="step-title">Revise seus dados</h2>
            <p className="step-subtitle">
              Confirme as informações antes de enviar. Você pode editar qualquer seção.
            </p>

            {isPF ? (
              <>
                <ReviewBlock title="Tipo de contratação" stepId="tipo">
                  <ReviewField label="Tipo" value="Pessoa Física (PF)" />
                </ReviewBlock>
                <ReviewBlock title="Dados pessoais" stepId="dados_pf">
                  <ReviewField label="Nome" value={formData.nome_contratante} />
                  <ReviewField label="Nascimento" value={formatDate(formData.data_nascimento)} />
                  <ReviewField label="CPF" value={formData.cpf ? `***.${onlyDigits(formData.cpf).slice(3,6)}.${onlyDigits(formData.cpf).slice(6,9)}-**` : undefined} />
                  <ReviewField label="RG" value={formData.rg} />
                </ReviewBlock>
              </>
            ) : (
              <>
                <ReviewBlock title="Tipo de contratação" stepId="tipo">
                  <ReviewField label="Tipo" value="Pessoa Jurídica (PJ)" />
                </ReviewBlock>
                <ReviewBlock title="Dados da empresa" stepId="dados_pj">
                  <ReviewField label="Nome Fantasia" value={formData.nome_fantasia} />
                  <ReviewField label="CNPJ" value={formData.cnpj ? `**.${onlyDigits(formData.cnpj).slice(2,5)}.${onlyDigits(formData.cnpj).slice(5,8)}/****-**` : undefined} />
                </ReviewBlock>
              </>
            )}

            <ReviewBlock title={isPF ? 'Endereço residencial' : 'Endereço da empresa'} stepId="endereco">
              <ReviewField label="CEP" value={formData.cep} />
              <ReviewField label="Logradouro" value={`${formData.logradouro}${formData.numero ? `, ${formData.numero}` : ''}`} />
              <ReviewField label="Complemento" value={formData.complemento} />
              <ReviewField label="Bairro" value={formData.bairro} />
              <ReviewField label="Cidade/UF" value={`${formData.cidade}${formData.estado ? ` — ${formData.estado}` : ''}`} />
            </ReviewBlock>

            <ReviewBlock title="Contatos" stepId="contatos">
              <ReviewField label="Telefone" value={`${formData.telefone}${formData.telefone_whatsapp ? ' 📱 WhatsApp' : ''}`} />
              <ReviewField label="E-mail" value={formData.email} />
              {isPF && <ReviewField label="Cerimonial" value={formData.contato_cerimonial} />}
              {!isPF && <ReviewField label="Responsável" value={formData.nome_responsavel} />}
            </ReviewBlock>

            <ReviewBlock title="Dados do evento" stepId="evento">
              <ReviewField label="Nome" value={formData.nome_evento} />
              <ReviewField label="Data" value={formatDate(formData.data_evento)} />
              <ReviewField label="Início evento" value={formData.horario_inicio_evento} />
              <ReviewField label="Início fotos" value={formData.horario_inicio_fotos} />
              <ReviewField label="Endereço" value={`${formData.logradouro_evento}${formData.numero_evento ? `, ${formData.numero_evento}` : ''} — ${formData.cidade_evento}`} />
            </ReviewBlock>

            <ReviewBlock title="Pagamento" stepId="pagamento">
              <ReviewField label="Forma" value={formasPagamentoLabel(formData.forma_pagamento)} />
              {formData.forma_pagamento === 'outro' && <ReviewField label="Detalhe" value={formData.forma_pagamento_outro} />}
            </ReviewBlock>

            <ReviewBlock title="Serviços" stepId="horas">
              <ReviewField label="Horas" value={formData.quantidade_horas === 'outro' ? formData.quantidade_horas_outro : `${formData.quantidade_horas} horas`} />
              <ReviewField label="Pacote" value={formData.pacote_id === 'outro' ? formData.pacote_outro : formData.pacote_nome_snapshot} />
              <ReviewField label="Equipamento" value={formData.equipamento_nome_snapshot} />
            </ReviewBlock>

            <ReviewBlock title="Autorizações" stepId="publicacao">
              <ReviewField label="Publicação fotos" value={
                formData.autoriza_publicacao_fotos === true ? 'Autorizado ✅' :
                formData.autoriza_publicacao_fotos === false ? 'Não autorizado' : 'Não informado'
              } />
            </ReviewBlock>

            {formData.comentarios && (
              <ReviewBlock title="Comentários" stepId="comentarios">
                <ReviewField label="" value={formData.comentarios} />
              </ReviewBlock>
            )}

            {!isPF && (
              <ReviewBlock title="Nota fiscal" stepId="nota_fiscal">
                <ReviewField label="Dados disponíveis para NF" value="Sim" />
              </ReviewBlock>
            )}

            <div className="nav-buttons">
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button id="btn-next-revisao" className="btn btn-primary" onClick={goNext}>
                Confirmar dados →
              </button>
            </div>
          </div>
        );

      // ── STEP: CONSENTIMENTO ──────────────────────────────
      case 'consentimento':
        return (
          <div className="step-card">
            <h2 className="step-title">Consentimento e privacidade</h2>

            <div className="info-notice" style={{ marginBottom: 20 }}>
              <div className="info-notice-icon">🔒</div>
              <div className="info-notice-text">
                Os dados informados serão utilizados para cadastro, reserva da data, elaboração do contrato,
                organização do evento, emissão manual de documentos fiscais quando necessária e comunicação
                relacionada ao serviço contratado.
              </div>
            </div>

            <div
              className={`checkbox-wrapper ${formData.consentimento_dados ? 'checked' : ''}`}
              onClick={() => update('consentimento_dados', !formData.consentimento_dados)}
              role="checkbox"
              aria-checked={formData.consentimento_dados}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && update('consentimento_dados', !formData.consentimento_dados)}
              id="field-consentimento_dados"
            >
              <div className="checkbox-box">
                {formData.consentimento_dados && <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>✓</span>}
              </div>
              <span className="checkbox-label">
                Li e estou de acordo com o uso dos meus dados para as finalidades informadas.
                {APP_CONFIG.privacyPolicyUrl && (
                  <> <a href={APP_CONFIG.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">Política de Privacidade</a></>
                )}
              </span>
            </div>
            {errors.consentimento_dados && (
              <p className="field-error mt-2">{errors.consentimento_dados}</p>
            )}

            <div className="nav-buttons" style={{ marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={goBack}>← Voltar</button>
              <button
                id="btn-submit"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !formData.consentimento_dados}
              >
                {submitting ? (
                  <><div className="spinner" /> Enviando...</>
                ) : (
                  '✔ Enviar informações'
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── RENDER ───────────────────────────────────────────────
  const progressIndex = currentStepIndex;

  return (
    <div className="app-bg" style={{ minHeight: '100dvh' }}>
      {/* Modals */}
      <Modal
        open={showResumeDraft}
        icon="💾"
        title="Preenchimento salvo encontrado"
        message="Encontramos um preenchimento iniciado neste dispositivo. Deseja continuar de onde parou?"
        confirmLabel="Continuar preenchimento"
        cancelLabel="Começar novamente"
        onConfirm={() => {
          const draft = loadDraft();
          if (draft) {
            setFormData({ ...defaultFormData, ...(draft.formData as FormData) });
            setCurrentStepIndex(draft.currentStep || 0);
          }
          setShowResumeDraft(false);
        }}
        onCancel={() => {
          setShowConfirmClearDraft(true);
          setShowResumeDraft(false);
        }}
      />

      <Modal
        open={showConfirmClearDraft}
        icon="🗑️"
        title="Deseja mesmo começar novamente?"
        message="O preenchimento salvo será perdido."
        confirmLabel="Sim, começar novamente"
        cancelLabel="Cancelar"
        confirmDanger
        onConfirm={() => {
          clearDraft();
          setFormData({ ...defaultFormData, submission_id: crypto.randomUUID(), data_inicio: new Date().toISOString() });
          setCurrentStepIndex(0);
          setShowConfirmClearDraft(false);
        }}
        onCancel={() => setShowConfirmClearDraft(false)}
      />

      <Modal
        open={showChangeTipo}
        icon="⚠️"
        title="Alterar tipo de contratação"
        message="Alterar o tipo de contratação apagará as respostas exclusivas deste caminho. Deseja continuar?"
        confirmLabel="Alterar contratação"
        cancelLabel="Manter opção atual"
        confirmDanger
        onConfirm={() => {
          if (pendingTipo) applyTipoChange(pendingTipo);
          setPendingTipo(null);
          setShowChangeTipo(false);
        }}
        onCancel={() => {
          setPendingTipo(null);
          setShowChangeTipo(false);
        }}
      />

      <div ref={topRef} />

      {/* Progress bar (only after tipo step) */}
      {currentStepIndex > 0 && (
        <ProgressBar
          currentStep={progressIndex}
          totalSteps={totalSteps - 1}
          sectionName={getStepLabel(currentStep)}
        />
      )}

      <div className="form-container" style={{ paddingTop: currentStepIndex === 0 ? 0 : 8 }}>
        {currentStepIndex === 0 && <LogoArea />}
        {renderStep()}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

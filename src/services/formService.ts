import { supabase } from '../lib/supabase';
import type { FormData } from '../types/form.types';
import { onlyDigits, dateToISO } from '../lib/masks';

export interface SubmitResult {
  protocolo: string;
  id: string;
}

export async function submitForm(formData: FormData): Promise<SubmitResult> {
  const payload = {
    submission_id: formData.submission_id,
    tipo_pessoa: formData.tipo_pessoa,
    nome_contratante: formData.nome_contratante || null,
    // Dates: form stores as DD/MM/AAAA, Supabase expects YYYY-MM-DD
    data_nascimento: formData.data_nascimento ? dateToISO(formData.data_nascimento) : null,
    cpf: formData.cpf ? onlyDigits(formData.cpf) : null,
    rg: formData.rg || null,
    nome_fantasia: formData.nome_fantasia || null,
    razao_social: formData.razao_social || null,
    cnpj: formData.cnpj ? onlyDigits(formData.cnpj) : null,
    nome_responsavel: formData.nome_responsavel || null,
    cep: formData.cep ? onlyDigits(formData.cep) : null,
    logradouro: formData.logradouro || null,
    numero: formData.numero || null,
    complemento: formData.complemento || null,
    bairro: formData.bairro || null,
    cidade: formData.cidade || null,
    estado: formData.estado || 'MG',
    telefone: formData.telefone ? onlyDigits(formData.telefone) : null,
    email: formData.email || null,
    contato_cerimonial: formData.contato_cerimonial || null,
    nome_evento: formData.nome_evento || null,
    cep_evento: formData.cep_evento ? onlyDigits(formData.cep_evento) : null,
    logradouro_evento: formData.logradouro_evento || null,
    numero_evento: formData.numero_evento || null,
    complemento_evento: formData.complemento_evento || null,
    bairro_evento: formData.bairro_evento || null,
    cidade_evento: formData.cidade_evento || null,
    estado_evento: formData.estado_evento || 'MG',
    referencia_evento: formData.referencia_evento || null,
    data_evento: formData.data_evento ? dateToISO(formData.data_evento) : null,
    horario_inicio_evento: formData.horario_inicio_evento || null,
    horario_inicio_fotos: formData.horario_inicio_fotos || null,
    forma_pagamento: formData.forma_pagamento || null,
    forma_pagamento_outro: formData.forma_pagamento_outro || null,
    quantidade_horas: formData.quantidade_horas || null,
    quantidade_horas_outro: formData.quantidade_horas_outro || null,
    pacote_id: formData.pacote_id || null,
    pacote_nome_snapshot: formData.pacote_nome_snapshot || null,
    pacote_outro: formData.pacote_outro || null,
    equipamento_id: formData.equipamento_id || null,
    equipamento_nome_snapshot: formData.equipamento_nome_snapshot || null,
    autoriza_publicacao_fotos: formData.autoriza_publicacao_fotos !== null ? formData.autoriza_publicacao_fotos : null,
    solicita_nota_fiscal: formData.tipo_pessoa === 'PJ',
    comentarios: formData.comentarios || null,
    consentimento_dados: formData.consentimento_dados,
    origem: typeof window !== 'undefined' ? window.location.origin : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    data_inicio: formData.data_inicio || null,
    data_envio: new Date().toISOString(),
    sincronizado_planilha: false,
  };

  // Attempt 1: insert and select back (works if RLS allows anon select)
  const { data, error } = await supabase
    .from('formularios_eventos')
    .insert(payload)
    .select('id, protocolo')
    .single();

  if (!error && data) {
    return { protocolo: data.protocolo, id: data.id };
  }

  // Duplicate submission_id: fetch existing record
  if (error?.code === '23505') {
    const { data: existing, error: fetchError } = await supabase
      .from('formularios_eventos')
      .select('id, protocolo')
      .eq('submission_id', formData.submission_id)
      .maybeSingle();
    if (!fetchError && existing) {
      return { protocolo: existing.protocolo, id: existing.id };
    }
  }

  // RLS may block the SELECT after insert for anon users.
  // Try insert without select, then build a synthetic result.
  if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
    const { error: insertOnlyError } = await supabase
      .from('formularios_eventos')
      .insert(payload);

    if (!insertOnlyError) {
      // Return submission_id as a proxy ID — enough to navigate to success
      return {
        protocolo: `CSA-${new Date().getFullYear()}-PENDENTE`,
        id: formData.submission_id,
      };
    }
    throw new Error(insertOnlyError.message);
  }

  throw new Error(error?.message || 'Erro desconhecido ao salvar formulário');
}

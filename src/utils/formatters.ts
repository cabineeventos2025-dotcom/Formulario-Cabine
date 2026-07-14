export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate + 'T12:00:00').toLocaleDateString('pt-BR');
  } catch {
    return isoDate;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function formatPhone(digits: string | null | undefined): string {
  if (!digits) return '—';
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return digits;
}

export function formatCPFDisplay(cpf: string | null | undefined): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3,6)}.${d.slice(6,9)}-**`;
}

export function formatCNPJDisplay(cnpj: string | null | undefined): string {
  if (!cnpj) return '—';
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `**.${d.slice(2,5)}.${d.slice(5,8)}/****-**`;
}

export function formasPagamentoLabel(forma: string): string {
  const map: Record<string, string> = {
    boleto: 'Boleto até a data do evento',
    cartao_credito: 'Cartão de crédito',
    pix: 'PIX',
    deposito_bancario: 'Depósito bancário',
    faturado_15_21_30: 'Faturado 15-21-30 dias',
    outro: 'Outro',
  };
  return map[forma] || forma;
}

export function horasLabel(h: string): string {
  if (h === 'outro') return 'Outro';
  return `${h} hora${h !== '1' ? 's' : ''}`;
}

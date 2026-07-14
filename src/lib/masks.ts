// ═══════════════════════════════════════════
// MASKS — CPF, CNPJ, Phone, CEP, Date
// ═══════════════════════════════════════════

export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCPFPartial(cpf: string): string {
  // ***.456.789-**
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function maskCNPJPartial(cnpj: string): string {
  // **.345.678/****-**
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/****-**`;
}

/** Mask date input as DD/MM/AAAA while the user types */
export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Convert DD/MM/AAAA → YYYY-MM-DD for Supabase date columns. Returns null if invalid. */
export function dateToISO(ddmmaaaa: string): string | null {
  const m = ddmmaaaa.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo}-${d}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

/** Returns true if DD/MM/AAAA is a valid, complete date */
export function isValidDate(ddmmaaaa: string): boolean {
  return dateToISO(ddmmaaaa) !== null;
}

/** Returns true if DD/MM/AAAA is today or in the past */
export function isDatePastOrToday(ddmmaaaa: string): boolean {
  const iso = dateToISO(ddmmaaaa);
  if (!iso) return false;
  return new Date(iso) <= new Date();
}

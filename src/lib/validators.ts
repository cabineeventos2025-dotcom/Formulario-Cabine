import { z } from 'zod';
import { onlyDigits } from './masks';

// ── CPF ──────────────────────────────────
export function validateCPF(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(d[10]);
}

// ── CNPJ ─────────────────────────────────
export function validateCNPJ(cnpj: string): boolean {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = (d: string, len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(d[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return calc(d, 12) === parseInt(d[12]) && calc(d, 13) === parseInt(d[13]);
}

// ── Zod schemas ──────────────────────────

export const cpfSchema = z
  .string()
  .min(1, 'Informe o CPF')
  .refine((v) => validateCPF(v), 'Informe um CPF válido');

export const cnpjSchema = z
  .string()
  .min(1, 'Informe o CNPJ')
  .refine((v) => validateCNPJ(v), 'Confira o CNPJ informado');

export const phoneSchema = z
  .string()
  .min(1, 'Informe o telefone')
  .refine((v) => {
    const d = onlyDigits(v);
    return d.length >= 10 && d.length <= 11;
  }, 'Informe um telefone válido (10 ou 11 dígitos)');

export const emailSchema = z
  .string()
  .email('Informe um e-mail válido');

export const emailOptionalSchema = z
  .string()
  .optional()
  .refine((v) => !v || z.string().email().safeParse(v).success, 'Informe um e-mail válido');

export const cepSchema = z
  .string()
  .min(1, 'Informe o CEP')
  .refine((v) => onlyDigits(v).length === 8, 'CEP inválido');

export const dataNascimentoSchema = z
  .string()
  .min(1, 'Informe a data de nascimento')
  .refine((v) => {
    const d = new Date(v);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data inválida ou futura');

export const dataEventoSchema = z
  .string()
  .min(1, 'Informe a data do evento');

export const nameSchema = z
  .string()
  .min(3, 'Nome muito curto (mínimo 3 caracteres)')
  .max(120, 'Nome muito longo')
  .refine((v) => !/^\d+$/.test(v), 'Nome inválido')
  .transform((v) => v.replace(/\s+/g, ' ').trim());

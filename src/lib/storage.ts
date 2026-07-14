import type { FormData } from '../types/form.types';

const KEY = 'cabine_so_alegria_formulario_evento';
const EXPIRY_DAYS = 30;

interface StoredDraft {
  formData: Partial<FormData>;
  currentStep: number;
  savedAt: string;
  expiresAt: string;
}

export function saveDraft(formData: Partial<FormData>, currentStep: number): void {
  try {
    const now = new Date();
    const expires = new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const draft: StoredDraft = {
      formData,
      currentStep,
      savedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // ignore storage errors
  }
}

export function loadDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft: StoredDraft = JSON.parse(raw);
    if (new Date(draft.expiresAt) < new Date()) {
      clearDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function hasDraft(): boolean {
  return loadDraft() !== null;
}

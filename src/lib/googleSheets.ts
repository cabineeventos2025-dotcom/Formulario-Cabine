import type { FormData } from '../types/form.types';

// Replace with your deployed Google Apps Script Web App URL
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwcJODJ4huTpAoLhBqO5zGacvSwI9ysjR_9BbNSAwwUQxIjH-NFe79Ymmx_7y2K1t7JQQ/exec';

export async function sendToGoogleSheets(formData: FormData, protocolo: string): Promise<void> {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'COLE_AQUI_A_URL_TERMINADA_EM_EXEC') {
    console.warn('[GoogleSheets] URL not configured. Skipping.');
    return;
  }

  const payload = {
    ...formData,
    protocolo,
    data_envio: new Date().toISOString(),
    origem: window.location.origin,
    user_agent: navigator.userAgent,
  };

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    // no-cors: we cannot read the response, but the request was sent
  } catch (err) {
    console.error('[GoogleSheets] Failed to send:', err);
    // Do not throw — Google Sheets sync failure should not block the user
  }
}

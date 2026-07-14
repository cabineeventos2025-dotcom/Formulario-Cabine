import { useState, useCallback } from 'react';
import { fetchCEP } from '../lib/viaCep';

interface AddressState {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export function useViaCep() {
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const lookup = useCallback(async (cep: string): Promise<AddressState | null> => {
    setNotFound(false);
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return null;

    setLoading(true);
    try {
      const result = await fetchCEP(digits);
      if (!result) {
        setNotFound(true);
        return null;
      }
      return {
        logradouro: result.logradouro || '',
        bairro: result.bairro || '',
        cidade: result.localidade || '',
        estado: result.uf || '',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, notFound };
}

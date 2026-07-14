import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Pacote } from '../types/form.types';
import { DEFAULT_PACKAGES } from '../data/defaultPackages';

export function usePackages(tipoPessoa: 'PF' | 'PJ' | '') {
  const [packages, setPackages] = useState<Pacote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('pacotes')
          .select('*')
          .eq('ativo', true)
          .order('ordem', { ascending: true });

        if (cancelled) return;

        if (error) throw error;

        let list = (data as Pacote[]) || [];
        if (tipoPessoa === 'PF') list = list.filter((p) => p.permite_pf);
        else if (tipoPessoa === 'PJ') list = list.filter((p) => p.permite_pj);

        setPackages(list.length > 0 ? list : fallback(tipoPessoa));
      } catch {
        if (!cancelled) {
          setError('Usando pacotes padrão.');
          setPackages(fallback(tipoPessoa));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tipoPessoa]);

  return { packages, loading, error };
}

function fallback(tipo: 'PF' | 'PJ' | ''): Pacote[] {
  if (tipo === 'PF') return DEFAULT_PACKAGES.filter((p) => p.permite_pf);
  if (tipo === 'PJ') return DEFAULT_PACKAGES.filter((p) => p.permite_pj);
  return DEFAULT_PACKAGES;
}

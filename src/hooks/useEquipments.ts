import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Equipamento } from '../types/form.types';
import { DEFAULT_EQUIPMENT } from '../data/defaultEquipment';

export function useEquipments() {
  const [equipments, setEquipments] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('equipamentos')
          .select('*')
          .eq('ativo', true)
          .order('ordem', { ascending: true });

        if (cancelled) return;
        if (error) throw error;
        setEquipments((data as Equipamento[]).length > 0 ? (data as Equipamento[]) : DEFAULT_EQUIPMENT);
      } catch {
        if (!cancelled) setEquipments(DEFAULT_EQUIPMENT);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { equipments, loading };
}

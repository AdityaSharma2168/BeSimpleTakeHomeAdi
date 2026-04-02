'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Judge, Provider } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface UseJudgesReturn {
  judges: Judge[];
  isLoading: boolean;
  createJudge: (data: CreateJudgeData) => Promise<Judge>;
  updateJudge: (id: string, data: UpdateJudgeData) => Promise<Judge>;
  deleteJudge: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
}

interface CreateJudgeData {
  name: string;
  provider: Provider;
  model: string;
  prompt: string;
  active: boolean;
}

interface UpdateJudgeData {
  name?: string;
  provider?: Provider;
  model?: string;
  prompt?: string;
  active?: boolean;
}

type SupabaseJudgeRow = {
  id: string;
  name: string;
  system_prompt: string;
  model_name: string;
  provider: Provider;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

const JUDGES_SELECT_COLUMNS =
  'id,name,system_prompt,model_name,provider,active,created_at,updated_at';

function isProvider(value: unknown): value is Provider {
  return value === 'openai' || value === 'anthropic' || value === 'google';
}

function isSupabaseJudgeRow(row: unknown): row is SupabaseJudgeRow {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.system_prompt === 'string' &&
    typeof r.model_name === 'string' &&
    isProvider(r.provider) &&
    typeof r.active === 'boolean' &&
    typeof r.created_at === 'string' &&
    (typeof r.updated_at === 'string' || r.updated_at === null)
  );
}

function toJudge(row: SupabaseJudgeRow): Judge {
  return {
    id: row.id,
    name: row.name,
    system_prompt: row.system_prompt,
    model_name: row.model_name,
    provider: row.provider,
    active: row.active,
    created_at: row.created_at,
  };
}

function isActiveRow(row: unknown): row is { id: string; active: boolean } {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.active === 'boolean';
}

export function useJudges(): UseJudgesReturn {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJudges = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('judges')
        .select(JUDGES_SELECT_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rowsUnknown: unknown = data;
      const rows = Array.isArray(rowsUnknown) ? rowsUnknown : [];

      setJudges(rows.filter(isSupabaseJudgeRow).map(toJudge));
    } catch {
      toast.error('Failed to load judges');
      setJudges([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJudges().catch(() => {
      // handled inside fetchJudges
    });
  }, [fetchJudges]);

  const createJudge = useCallback(
    async (data: CreateJudgeData): Promise<Judge> => {
      try {
        const payload = {
          name: data.name,
          provider: data.provider,
          model_name: data.model,
          system_prompt: data.prompt,
          active: data.active,
        };

        const { data: insertedData, error } = await supabase
          .from('judges')
          .insert(payload)
          .select(JUDGES_SELECT_COLUMNS)
          .single();

        if (error) throw error;
        if (!isSupabaseJudgeRow(insertedData)) {
          throw new Error('Unexpected response while creating judge');
        }

        const created = toJudge(insertedData);
        await fetchJudges();
        return created;
      } catch (e) {
        toast.error('Failed to create judge');
        throw e;
      }
    },
    [fetchJudges],
  );

  const updateJudge = useCallback(
    async (id: string, data: UpdateJudgeData): Promise<Judge> => {
      try {
        const updatePayload: Record<string, unknown> = {};
        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.provider !== undefined) updatePayload.provider = data.provider;
        if (data.model !== undefined) updatePayload.model_name = data.model;
        if (data.prompt !== undefined) {
          updatePayload.system_prompt = data.prompt;
        }
        if (data.active !== undefined) updatePayload.active = data.active;

        const { data: updatedData, error } = await supabase
          .from('judges')
          .update(updatePayload)
          .eq('id', id)
          .select(JUDGES_SELECT_COLUMNS)
          .single();

        if (error) throw error;
        if (!isSupabaseJudgeRow(updatedData)) {
          throw new Error('Unexpected response while updating judge');
        }

        const updated = toJudge(updatedData);
        await fetchJudges();
        return updated;
      } catch (e) {
        toast.error('Failed to update judge');
        throw e;
      }
    },
    [fetchJudges],
  );

  const deleteJudge = useCallback(
    async (id: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('judges')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await fetchJudges();
      } catch (e) {
        toast.error('Failed to delete judge');
        throw e;
      }
    },
    [fetchJudges],
  );

  const toggleActive = useCallback(
    async (id: string): Promise<void> => {
      try {
        const existing = judges.find((j) => j.id === id);
        let activeToSet: boolean;

        if (existing) {
          activeToSet = !existing.active;
        } else {
          const { data: existingData, error: existingError } = await supabase
            .from('judges')
            .select('id,active')
            .eq('id', id)
            .single();

          if (existingError) throw existingError;
          if (!isActiveRow(existingData)) {
            throw new Error('Unexpected response while toggling judge');
          }
          activeToSet = !existingData.active;
        }

        const { error } = await supabase
          .from('judges')
          .update({ active: activeToSet })
          .eq('id', id);

        if (error) throw error;
        await fetchJudges();
      } catch (e) {
        toast.error('Failed to toggle judge');
        throw e;
      }
    },
    [fetchJudges, judges],
  );

  return {
    judges,
    isLoading,
    createJudge,
    updateJudge,
    deleteJudge,
    toggleActive,
  };
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ApiKeyState {
  openai: string;
  anthropic: string;
  google: string;
}

interface VisibilityState {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
}

interface PreferencesState {
  concurrentEvals: number;
  evalTimeout: number;
}

interface UseSettingsReturn {
  // Loading state
  isLoading: boolean;
  
  // API Keys
  openaiKey: string;
  setOpenaiKey: (value: string) => void;
  openaiKeyVisible: boolean;
  setOpenaiKeyVisible: (value: boolean) => void;
  
  anthropicKey: string;
  setAnthropicKey: (value: string) => void;
  anthropicKeyVisible: boolean;
  setAnthropicKeyVisible: (value: boolean) => void;
  
  googleKey: string;
  setGoogleKey: (value: string) => void;
  googleKeyVisible: boolean;
  setGoogleKeyVisible: (value: boolean) => void;
  
  // Preferences
  concurrentEvals: number;
  setConcurrentEvals: (value: number) => void;
  evalTimeout: number;
  setEvalTimeout: (value: number) => void;
  
  // Actions
  isSaving: boolean;
  handleSaveKeys: () => Promise<void>;
  testConnection: (provider: keyof ApiKeyState) => Promise<boolean>;
}

// Default values - in a real app these would come from the backend
const DEFAULT_API_KEYS: ApiKeyState = {
  openai: '',
  anthropic: '',
  google: '',
};

const DEFAULT_VISIBILITY: VisibilityState = {
  openai: false,
  anthropic: false,
  google: false,
};

const DEFAULT_PREFERENCES: PreferencesState = {
  concurrentEvals: 5,
  evalTimeout: 30,
};

type SettingsKey =
  | 'openai_api_key'
  | 'anthropic_api_key'
  | 'google_api_key'
  | 'concurrent_evaluations'
  | 'evaluation_timeout';

type SettingsRow = {
  key: string;
  value: string;
};

export function useSettings(): UseSettingsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyState>(DEFAULT_API_KEYS);
  const [visibility, setVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [preferences, setPreferences] = useState<PreferencesState>(DEFAULT_PREFERENCES);
  const didLoadOnceRef = useRef(false);
  const prefsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchSettings = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const { data: rowsUnknown, error } = await supabase
          .from('settings')
          .select('key,value');

        if (error) throw error;

        const rows = (Array.isArray(rowsUnknown) ? rowsUnknown : []) as SettingsRow[];

        const allowedKeys = new Set<string>([
          'openai_api_key',
          'anthropic_api_key',
          'google_api_key',
          'concurrent_evaluations',
          'evaluation_timeout',
        ]);

        const values: Partial<Record<SettingsKey, string>> = {};
        for (const row of rows) {
          if (!row || typeof row.key !== 'string') continue;
          if (!allowedKeys.has(row.key)) continue;
          const v = typeof row.value === 'string' ? row.value : '';
          values[row.key as SettingsKey] = v;
        }

        const nextKeys: ApiKeyState = {
          openai: values.openai_api_key ?? '',
          anthropic: values.anthropic_api_key ?? '',
          google: values.google_api_key ?? '',
        };

        // Inputs start hidden by default (security UX). We still determine
        // "connected" status internally by whether values are non-empty.
        const nextVisibility: VisibilityState = DEFAULT_VISIBILITY;

        const concurrent = parseInt(values.concurrent_evaluations ?? '', 10);
        const timeout = parseInt(values.evaluation_timeout ?? '', 10);

        const nextPreferences: PreferencesState = {
          concurrentEvals:
            Number.isFinite(concurrent) && concurrent > 0
              ? concurrent
              : DEFAULT_PREFERENCES.concurrentEvals,
          evalTimeout:
            Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_PREFERENCES.evalTimeout,
        };

        setApiKeys(nextKeys);
        setVisibility(nextVisibility);
        setPreferences(nextPreferences);
        didLoadOnceRef.current = true;
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings().catch(() => {
      // handled inside
    });
  }, []);

  // Auto-save evaluation preferences (debounced) to match UI expectations.
  useEffect(() => {
    if (!didLoadOnceRef.current) return;

    if (prefsSaveTimerRef.current) {
      clearTimeout(prefsSaveTimerRef.current);
    }

    prefsSaveTimerRef.current = setTimeout(() => {
      const run = async (): Promise<void> => {
        try {
          const updatedAt = new Date().toISOString();
          const payloads = [
            {
              key: 'concurrent_evaluations' as const,
              value: String(preferences.concurrentEvals),
              updated_at: updatedAt,
            },
            {
              key: 'evaluation_timeout' as const,
              value: String(preferences.evalTimeout),
              updated_at: updatedAt,
            },
          ];

          const { error } = await supabase
            .from('settings')
            .upsert(payloads, { onConflict: 'key' });
          if (error) throw error;
        } catch {
          toast.error('Failed to save evaluation preferences');
        }
      };

      void run();
    }, 500);

    return () => {
      if (prefsSaveTimerRef.current) clearTimeout(prefsSaveTimerRef.current);
    };
  }, [preferences.concurrentEvals, preferences.evalTimeout]);

  // TODO: Replace with Supabase call
  const setOpenaiKey = useCallback((value: string) => {
    setApiKeys((prev) => ({ ...prev, openai: value }));
  }, []);

  // TODO: Replace with Supabase call
  const setAnthropicKey = useCallback((value: string) => {
    setApiKeys((prev) => ({ ...prev, anthropic: value }));
  }, []);

  // TODO: Replace with Supabase call
  const setGoogleKey = useCallback((value: string) => {
    setApiKeys((prev) => ({ ...prev, google: value }));
  }, []);

  const setOpenaiKeyVisible = useCallback((value: boolean) => {
    setVisibility((prev) => ({ ...prev, openai: value }));
  }, []);

  const setAnthropicKeyVisible = useCallback((value: boolean) => {
    setVisibility((prev) => ({ ...prev, anthropic: value }));
  }, []);

  const setGoogleKeyVisible = useCallback((value: boolean) => {
    setVisibility((prev) => ({ ...prev, google: value }));
  }, []);

  // TODO: Replace with Supabase call
  const setConcurrentEvals = useCallback((value: number) => {
    setPreferences((prev) => ({ ...prev, concurrentEvals: value }));
  }, []);

  // TODO: Replace with Supabase call
  const setEvalTimeout = useCallback((value: number) => {
    setPreferences((prev) => ({ ...prev, evalTimeout: value }));
  }, []);

  // TODO: Replace with Supabase call
  const handleSaveKeys = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    try {
      const updatedAt = new Date().toISOString();

      const payloads = [
        {
          key: 'openai_api_key' as const,
          value: apiKeys.openai,
          updated_at: updatedAt,
        },
        {
          key: 'anthropic_api_key' as const,
          value: apiKeys.anthropic,
          updated_at: updatedAt,
        },
        {
          key: 'google_api_key' as const,
          value: apiKeys.google,
          updated_at: updatedAt,
        },
        {
          key: 'concurrent_evaluations' as const,
          value: String(preferences.concurrentEvals),
          updated_at: updatedAt,
        },
        {
          key: 'evaluation_timeout' as const,
          value: String(preferences.evalTimeout),
          updated_at: updatedAt,
        },
      ];

      const { error } = await supabase
        .from('settings')
        .upsert(payloads, { onConflict: 'key' });

      if (error) throw error;

      toast.success('API keys saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [apiKeys, preferences]);

  // TODO: Replace with Supabase call
  const testConnection = useCallback(async (provider: keyof ApiKeyState): Promise<boolean> => {
    // Simulated test for Phase 4; will be wired to real API route later.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const keyValue = apiKeys[provider];
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    if (!keyValue || keyValue.trim().length === 0) {
      toast.error(`${providerName} key not configured`);
      return false;
    }

    toast.success(`${providerName} connection successful`);
    return true;
  }, [apiKeys]);

  return {
    isLoading,
    openaiKey: apiKeys.openai,
    setOpenaiKey,
    openaiKeyVisible: visibility.openai,
    setOpenaiKeyVisible,
    anthropicKey: apiKeys.anthropic,
    setAnthropicKey,
    anthropicKeyVisible: visibility.anthropic,
    setAnthropicKeyVisible,
    googleKey: apiKeys.google,
    setGoogleKey,
    googleKeyVisible: visibility.google,
    setGoogleKeyVisible,
    concurrentEvals: preferences.concurrentEvals,
    setConcurrentEvals,
    evalTimeout: preferences.evalTimeout,
    setEvalTimeout,
    isSaving,
    handleSaveKeys,
    testConnection,
  };
}

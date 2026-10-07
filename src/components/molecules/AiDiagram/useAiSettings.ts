'use client';
import {useCallback, useEffect, useState} from 'react';
import {DEFAULT_AI_MODEL, resolveAiModel} from '@/app/utils/aiModels';

export interface AiSettings {
  model: string;
  /** With context: only use facts from it (vs. also the model's knowledge). */
  strict: boolean;
}

const STORAGE_KEY = 'treemind_ai_settings';
const DEFAULTS: AiSettings = {model: DEFAULT_AI_MODEL, strict: true};

/** Per-browser AI preferences, remembered across maps. */
export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULTS);

  // Read after mount so server and client render the same markup.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved && typeof saved === 'object') {
        setSettings({
          model: resolveAiModel(saved.model),
          strict: saved.strict !== false,
        });
      }
    } catch {
      // Unreadable settings fall back to the defaults.
    }
  }, []);

  const update = useCallback((patch: Partial<AiSettings>) => {
    setSettings((prev) => {
      const next = {...prev, ...patch};
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Not persisted (e.g. private mode); still applies for this session.
      }
      return next;
    });
  }, []);

  return {settings, update};
}

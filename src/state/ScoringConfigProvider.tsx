import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from '../data/types';

const STORAGE_KEY = 'lb_scoring_cfg';

function loadStoredConfig(): ScoringConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SCORING_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ScoringConfig> | null;
    if (parsed && parsed.weights) {
      return {
        weights: { ...DEFAULT_SCORING_CONFIG.weights, ...parsed.weights },
        greenThreshold: parsed.greenThreshold ?? DEFAULT_SCORING_CONFIG.greenThreshold,
        attentionThreshold: parsed.attentionThreshold ?? DEFAULT_SCORING_CONFIG.attentionThreshold,
      };
    }
  } catch {
    // ignore malformed/unavailable storage
  }
  return DEFAULT_SCORING_CONFIG;
}

interface ScoringConfigContextValue {
  config: ScoringConfig;
  setConfig: (updater: (prev: ScoringConfig) => ScoringConfig) => void;
  resetConfig: () => void;
  /** True once the viewer has changed anything away from the shipped placeholder defaults. */
  isCustomized: boolean;
}

const ScoringConfigContext = createContext<ScoringConfigContextValue | null>(null);

export function ScoringConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ScoringConfig>(loadStoredConfig);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  const value = useMemo<ScoringConfigContextValue>(
    () => ({
      config,
      setConfig: (updater) => setConfigState(updater),
      resetConfig: () => setConfigState(DEFAULT_SCORING_CONFIG),
      isCustomized: JSON.stringify(config) !== JSON.stringify(DEFAULT_SCORING_CONFIG),
    }),
    [config],
  );

  return <ScoringConfigContext.Provider value={value}>{children}</ScoringConfigContext.Provider>;
}

export function useScoringConfig(): ScoringConfigContextValue {
  const ctx = useContext(ScoringConfigContext);
  if (!ctx) throw new Error('useScoringConfig must be used within ScoringConfigProvider');
  return ctx;
}

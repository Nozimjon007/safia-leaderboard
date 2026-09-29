import { useCallback, useEffect, useState } from 'react';
import { dataSource } from '../data/dataSource';
import type { LeaderboardDataset } from '../data/types';

export type DatasetStatus = 'loading' | 'ready' | 'error';

interface DatasetState {
  status: DatasetStatus;
  dataset: LeaderboardDataset | null;
  error: string | null;
}

export function useDataset(): DatasetState & { reload: () => void } {
  const [state, setState] = useState<DatasetState>({ status: 'loading', dataset: null, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    dataSource
      .load()
      .then((dataset) => {
        if (!cancelled) setState({ status: 'ready', dataset, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', dataset: null, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return { ...state, reload };
}

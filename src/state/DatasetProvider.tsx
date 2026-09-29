import { createContext, useContext, type ReactNode } from 'react';
import { useDataset, type DatasetStatus } from '../hooks/useDataset';
import type { LeaderboardDataset } from '../data/types';

interface DatasetContextValue {
  status: DatasetStatus;
  dataset: LeaderboardDataset | null;
  error: string | null;
  reload: () => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

/** Loads the dataset once for the whole app, so navigating between pages never re-triggers the load. */
export function DatasetProvider({ children }: { children: ReactNode }) {
  const value = useDataset();
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDatasetContext(): DatasetContextValue {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDatasetContext must be used within DatasetProvider');
  return ctx;
}

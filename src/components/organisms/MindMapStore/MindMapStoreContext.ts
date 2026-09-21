'use client';
import {createContext, useContext} from 'react';
import type {MindMapActions, MindMapState} from './useMindMapStore';

/** Store actions plus app-level services that depend on them. */
export type AppActions = MindMapActions & {
  generateIdeas: (nodeId: string) => void;
  /** Adds one level of AI detail (and link changes) to a node. */
  expandNode: (nodeId: string) => void;
  /** Adds one level of AI detail across the whole map. */
  expandAll: () => void;
  notify: (message: string, severity?: 'success' | 'error' | 'info') => void;
};

export const MindMapStateContext = createContext<MindMapState | null>(null);
// Actions are stable, so components that only dispatch (e.g. every node)
// don't re-render when the map changes.
export const MindMapActionsContext = createContext<AppActions | null>(null);

export function useMindMapState() {
  const context = useContext(MindMapStateContext);
  if (!context)
    throw new Error('useMindMapState must be used within a provider');
  return context;
}

export function useMindMapActions() {
  const context = useContext(MindMapActionsContext);
  if (!context)
    throw new Error('useMindMapActions must be used within a provider');
  return context;
}

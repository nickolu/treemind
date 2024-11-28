"use client";
import {useContext} from 'react';
import {MindMapStateContext} from '@/components/organisms/MindMapState/MindMapStateContext';

export function useMindMapStateContext() {
  const context = useContext(MindMapStateContext);
  if (context === null) {
    throw new Error(
      'useMindMapStateContext must be used within a MindMapStateProvider',
    );
  }
  return context;
}

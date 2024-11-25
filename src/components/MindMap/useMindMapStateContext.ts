import {useContext} from 'react';
import MindMapStateContext from './MindMapStateContext';

export default function useMindMapStateContext() {
  const context = useContext(MindMapStateContext);
  if (context === null) {
    throw new Error(
      'useMindMapStateContext must be used within a MindMapStateProvider',
    );
  }
  return context;
}

import {useContext} from 'react';
import TreeServiceContext from './TreeServiceContext';

export default function useTreeServiceContext() {
  const context = useContext(TreeServiceContext);
  if (context === null) {
    throw new Error('useTreeServiceContext must be used within a TreeProvider');
  }
  return context;
}

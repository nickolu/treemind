import {useContext} from 'react';
import {TreeServiceContext} from '@/components/organisms/TreeService/TreeServiceContext';

export function useTreeServiceContext() {
  const context = useContext(TreeServiceContext);
  if (context === null) {
    throw new Error('useTreeServiceContext must be used within a TreeProvider');
  }
  return context;
}

import {createContext} from 'react';
import {TreeService} from '@/types/tree';

const TreeServiceContext = createContext<TreeService | null>(null);

export default TreeServiceContext;

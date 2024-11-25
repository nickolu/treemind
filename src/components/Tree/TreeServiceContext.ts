import {createContext} from 'react';
import {TreeService} from './useTreeService';

const TreeServiceContext = createContext<TreeService | null>(null);

export default TreeServiceContext;

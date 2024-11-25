import {createContext} from 'react';
import {MindMapState} from './useMindMapState';

const MindMapStateContext = createContext<MindMapState | null>(null);
export default MindMapStateContext;

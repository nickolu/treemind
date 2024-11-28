'use client';
import {createContext} from 'react';
import {MindMapState} from './useMindMapState';

export const MindMapStateContext = createContext<MindMapState | null>(null);

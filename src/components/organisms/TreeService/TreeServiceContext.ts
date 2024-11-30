'use client';
import {createContext} from 'react';
import {TreeService} from './useTreeService';

export const TreeServiceContext = createContext<TreeService | null>(null);

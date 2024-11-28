'use client';
import {createContext} from 'react';
import {TreeService} from '@/types/tree';

export const TreeServiceContext = createContext<TreeService | null>(null);

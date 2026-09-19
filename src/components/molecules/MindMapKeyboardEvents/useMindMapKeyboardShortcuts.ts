'use client';
import {useEffect, useRef} from 'react';
import {MindNode, findNode} from '@/domain/MindMap/tree';
import {hasRichFormatting} from '@/domain/MindMap/html';
import type {MindMapState} from '@/components/organisms/MindMapStore/useMindMapStore';
import type {AppActions} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {matchShortcut} from './shortcuts';

/**
 * Keys typed into a field, a dialog or a focused control belong to that
 * element, not to the mind map. This keeps e.g. Backspace in the rich editor
 * or Enter on a toolbar button from also editing the map.
 */
function belongsToAnotherElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    !!target.closest(
      'input, textarea, select, button, a[href], [role="dialog"], [role="menu"]',
    )
  );
}

/** Visible nodes in top-to-bottom order at each depth (matches the layout). */
function visibleNodesAtDepth(root: MindNode, depth: number): MindNode[] {
  const result: MindNode[] = [];
  const walk = (node: MindNode, d: number) => {
    if (d === depth) return void result.push(node);
    if (!node.collapsed) node.children.forEach((c) => walk(c, d + 1));
  };
  walk(root, 0);
  return result;
}

function depthOf(root: MindNode, node: MindNode): number {
  let depth = 0;
  let current: MindNode | undefined = node;
  while (current?.parentId) {
    depth++;
    current = findNode(root, current.parentId);
  }
  return depth;
}

function neighbour(
  root: MindNode,
  node: MindNode,
  direction: 'up' | 'down' | 'left' | 'right',
): MindNode | undefined {
  switch (direction) {
    case 'left':
      return node.parentId ? findNode(root, node.parentId) : undefined;
    case 'right':
      if (node.collapsed || node.children.length === 0) return undefined;
      // The child nearest the parent's vertical centre.
      return node.children[Math.floor((node.children.length - 1) / 2)];
    case 'up':
    case 'down': {
      // Moves across cousins too, like moving through a column.
      const column = visibleNodesAtDepth(root, depthOf(root, node));
      const index = column.findIndex((n) => n.id === node.id);
      return column[index + (direction === 'up' ? -1 : 1)];
    }
  }
}

const ARROWS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export function useMindMapKeyboardShortcuts(
  state: MindMapState,
  actions: AppActions,
) {
  // Read through a ref so the listener is attached once, not on every change.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const {root, selectedId, editing, richEditorId} = stateRef.current;
      if (e.defaultPrevented || e.isComposing || editing || richEditorId)
        return;
      if (belongsToAnotherElement(e.target)) return;

      const node = findNode(root, selectedId);
      if (!node) return;

      const startEditing = (initialText?: string) => {
        if (hasRichFormatting(node.html)) {
          actions.openRichEditor(node.id); // don't flatten formatted text
        } else {
          actions.startEditing(node.id, initialText);
        }
      };

      const shortcut = matchShortcut(e);
      const handled = (() => {
        switch (shortcut) {
          case 'addChild':
            return (actions.addChild(node.id), true);
          case 'addSibling':
            return (actions.addSibling(node.id), true);
          case 'generate':
            return (actions.generateIdeas(node.id), true);
          case 'edit':
            return (startEditing(), true);
          case 'richEditor':
            return (actions.openRichEditor(node.id), true);
          case 'toggleCollapse':
            return (actions.toggleCollapsed(node.id), true);
          case 'delete':
            return (actions.deleteNode(node.id), true);
          case 'moveUp':
            return (actions.reorder(node.id, -1), true);
          case 'moveDown':
            return (actions.reorder(node.id, 1), true);
          case 'undo':
            return (actions.undo(), true);
          case 'redo':
            return (actions.redo(), true);
        }

        const direction = ARROWS[e.key];
        if (direction && !e.metaKey && !e.ctrlKey && !e.altKey) {
          if (direction === 'right' && node.collapsed) {
            actions.toggleCollapsed(node.id, false);
          } else {
            const next = neighbour(root, node, direction);
            if (next) actions.select(next.id);
          }
          return true;
        }

        // Type-to-edit: a printable character replaces the node's text.
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          startEditing(e.key);
          return true;
        }
        return false;
      })();

      if (handled) e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}

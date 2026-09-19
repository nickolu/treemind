/**
 * Single source of truth for keyboard shortcuts: used by the key handler and
 * rendered by the shortcuts panel / tooltips.
 *
 * Chosen to avoid OS- and browser-level bindings: nothing uses Alt/Option
 * (app switchers, special characters, browser back/forward), and the only
 * ⌘/Ctrl combos are Enter, arrows and undo/redo, which browsers don't claim
 * on a page.
 */
export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export const MOD = isMac ? '⌘' : 'Ctrl';

/** ⌘ on macOS, Ctrl elsewhere — and never both. */
export const isModKey = (e: KeyboardEvent) =>
  isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;

const noModifiers = (e: KeyboardEvent) => !e.metaKey && !e.ctrlKey && !e.altKey;

export type ShortcutId =
  | 'addChild'
  | 'addSibling'
  | 'generate'
  | 'edit'
  | 'richEditor'
  | 'toggleCollapse'
  | 'delete'
  | 'navigate'
  | 'moveUp'
  | 'moveDown'
  | 'undo'
  | 'redo';

interface Shortcut {
  id: ShortcutId;
  keys: string[];
  description: string;
  matches?: (e: KeyboardEvent) => boolean;
}

export const SHORTCUTS: Shortcut[] = [
  {
    id: 'addChild',
    keys: ['Tab'],
    description: 'Add child',
    matches: (e) => e.key === 'Tab' && noModifiers(e) && !e.shiftKey,
  },
  {
    id: 'addSibling',
    keys: ['Enter'],
    description: 'Add sibling',
    matches: (e) => e.key === 'Enter' && noModifiers(e) && !e.shiftKey,
  },
  {
    id: 'generate',
    keys: [`${MOD} Enter`],
    description: 'Generate ideas with AI',
    matches: (e) => e.key === 'Enter' && isModKey(e) && !e.altKey,
  },
  {
    id: 'edit',
    keys: ['F2', 'Type'],
    description: 'Edit text (typing replaces it)',
    matches: (e) => e.key === 'F2' && noModifiers(e),
  },
  {
    id: 'richEditor',
    keys: ['Shift Enter'],
    description: 'Open formatted editor',
    matches: (e) => e.key === 'Enter' && noModifiers(e) && e.shiftKey,
  },
  {
    id: 'toggleCollapse',
    keys: ['Space'],
    description: 'Collapse / expand branch',
    matches: (e) => e.key === ' ' && noModifiers(e) && !e.shiftKey,
  },
  {
    id: 'delete',
    keys: ['Delete'],
    description: 'Delete node and its branch',
    matches: (e) =>
      (e.key === 'Delete' || e.key === 'Backspace') && noModifiers(e),
  },
  {
    id: 'navigate',
    keys: ['↑ ↓ ← →'],
    description: 'Select nearby nodes',
  },
  {
    id: 'moveUp',
    keys: [`${MOD} ↑`],
    description: 'Move node up',
    matches: (e) => e.key === 'ArrowUp' && isModKey(e) && !e.altKey,
  },
  {
    id: 'moveDown',
    keys: [`${MOD} ↓`],
    description: 'Move node down',
    matches: (e) => e.key === 'ArrowDown' && isModKey(e) && !e.altKey,
  },
  {
    id: 'undo',
    keys: [`${MOD} Z`],
    description: 'Undo',
    matches: (e) =>
      e.key.toLowerCase() === 'z' && isModKey(e) && !e.shiftKey && !e.altKey,
  },
  {
    id: 'redo',
    keys: [isMac ? '⌘ ⇧ Z' : 'Ctrl Y'],
    description: 'Redo',
    matches: (e) =>
      isModKey(e) &&
      !e.altKey &&
      ((e.key.toLowerCase() === 'z' && e.shiftKey) ||
        (e.key.toLowerCase() === 'y' && !e.shiftKey)),
  },
];

export const EDITING_SHORTCUTS = [
  {keys: ['Enter'], description: 'Save'},
  {keys: ['Shift Enter'], description: 'New line'},
  {keys: ['Tab'], description: 'Save and add child'},
  {keys: ['Esc'], description: 'Cancel'},
];

export function matchShortcut(e: KeyboardEvent): ShortcutId | null {
  return SHORTCUTS.find((s) => s.matches?.(e))?.id ?? null;
}

export function shortcutLabel(id: ShortcutId): string {
  return SHORTCUTS.find((s) => s.id === id)?.keys[0] ?? '';
}

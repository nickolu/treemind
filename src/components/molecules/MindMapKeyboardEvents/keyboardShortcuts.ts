export function isMindMapNodeShortcut(e: KeyboardEvent): {[key: string]: boolean} {
  return {
    generateChildNodes: (e.altKey || e.metaKey) && e.code === 'Space',
    insertChild: e.key === 'Tab',
    insertSibling: e.key === 'Enter',
    deleteNode: e.key === 'Delete' || e.key === 'Backspace',
    openEditor: e.key === 'e' || e.key === 'E',
    moveUp: e.key === 'ArrowUp',
    moveDown: e.key === 'ArrowDown',
    moveLeft: e.key === 'ArrowLeft',
    moveRight: e.key === 'ArrowRight',
    regularCharacterKey:
      !e.altKey && !e.metaKey && !e.ctrlKey && e.key.length === 1,
  };
}

export function isTextEditorShortcut(e: KeyboardEvent): {[key: string]: boolean} {
  return {
    save: e.key === 'Enter',
    cancel: e.key === 'Escape',
    editingEvent: e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter',
  };
}

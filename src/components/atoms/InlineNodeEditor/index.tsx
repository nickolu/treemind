'use client';
import {KeyboardEvent, useLayoutEffect, useRef} from 'react';
import {htmlToText, textToHtml} from '@/domain/MindMap/html';
import {useMindMapActions} from '@/components/organisms/MindMapStore/MindMapStoreContext';

interface InlineNodeEditorProps {
  nodeId: string;
  html: string;
  /** When set (typing on a selected node), replaces the text instead of selecting it. */
  initialText?: string;
}

/**
 * Plain-text, in-place editor. A contentEditable (rather than an input) keeps
 * the node exactly the same size as its rendered text, so entering edit mode
 * doesn't shift the layout.
 *
 * Enter saves · Shift+Enter inserts a newline · Tab saves and adds a child ·
 * Escape cancels. Clicking away saves.
 */
export function InlineNodeEditor({
  nodeId,
  html,
  initialText,
}: InlineNodeEditorProps) {
  const actions = useMindMapActions();
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = initialText ?? htmlToText(html);
    let frame = 0;
    let attempts = 0;
    const focus = () => {
      el.focus({preventScroll: true});
      // The node may not be visible yet on its very first frame; retry briefly.
      if (document.activeElement !== el && attempts++ < 10) {
        frame = requestAnimationFrame(focus);
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(el);
      if (initialText !== undefined) range.collapse(false); // caret at end
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    };
    focus();
    return () => cancelAnimationFrame(frame);
    // Only on mount: the editor is keyed to one editing session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (save: boolean) => {
    if (doneRef.current) return false;
    doneRef.current = true;
    const text = ref.current?.innerText ?? '';
    const isNew = html === '';
    if (!text.trim() && isNew) {
      // Abandoning a brand-new, still-empty node removes it.
      actions.deleteNode(nodeId);
    } else if (save && text.trim()) {
      actions.setHtml(nodeId, textToHtml(text));
    }
    actions.stopEditing();
    return true;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const hasText = !!ref.current?.innerText.trim();
      if (finish(true) && hasText) actions.addChild(nodeId);
    }
  };

  return (
    <div
      ref={ref}
      className="mm-node__editor nodrag nopan"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label="Edit node text"
      aria-multiline
      spellCheck
      onKeyDown={onKeyDown}
      onBlur={() => finish(true)}
      // Let the caret be placed with the mouse without starting a drag/select.
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    />
  );
}

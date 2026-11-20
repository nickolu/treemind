'use client';
import {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {htmlToText, textToHtml, toLines} from '@/domain/MindMap/html';
import {UmlClass} from '@/domain/MindMap/tree';
import {ClassField} from '@/components/organisms/MindMapStore/useMindMapStore';
import {useMindMapActions} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {MOD} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';

const FIELDS: ClassField[] = ['name', 'stereotype', 'attributes', 'operations'];
const MULTILINE: ClassField[] = ['attributes', 'operations'];

interface ClassInlineEditorProps {
  nodeId: string;
  html: string;
  umlClass: UmlClass;
  /** Field that receives focus first. */
  field?: ClassField;
  /** Abstract types and interfaces are named in italics. */
  italic: boolean;
}

/**
 * Edits a class in place, reusing the class box markup so the node keeps its
 * look. Drafts live in the DOM of the four fields and are saved as a single
 * undo step; unmounting (node deleted, undo, ...) discards them.
 *
 * Tab / Shift+Tab move between fields · Enter saves (name, stereotype) or adds
 * a line (members) · Ctrl/Cmd+Enter saves · Escape cancels · clicking outside
 * the node saves.
 */
export function ClassInlineEditor({
  nodeId,
  html,
  umlClass,
  field = 'name',
  italic,
}: ClassInlineEditorProps) {
  const actions = useMindMapActions();
  const rootRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<ClassField, HTMLDivElement | null>>({
    name: null,
    stereotype: null,
    attributes: null,
    operations: null,
  });
  const doneRef = useRef(false);
  const mountedRef = useRef(false);
  const [focused, setFocused] = useState<ClassField | null>(null);
  const [hasStereotype, setHasStereotype] = useState(!!umlClass.stereotype);

  const originalName = htmlToText(html);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // Unmounting never saves, even if the browser fires a blur on removal.
      mountedRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const initial: Record<ClassField, string> = {
      name: originalName,
      stereotype: umlClass.stereotype,
      attributes: umlClass.attributes.join('\n'),
      operations: umlClass.operations.join('\n'),
    };
    for (const key of FIELDS) {
      const el = refs.current[key];
      if (el) el.textContent = initial[key];
    }
    let frame = 0;
    let attempts = 0;
    const focus = () => {
      const el = refs.current[field];
      if (!el) return;
      el.focus({preventScroll: true});
      // The node may not be visible yet on its very first frame; retry briefly.
      if (document.activeElement !== el && attempts++ < 10) {
        frame = requestAnimationFrame(focus);
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false); // caret at end
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    };
    focus();
    return () => cancelAnimationFrame(frame);
    // Only on mount: the editor is keyed to one editing session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const read = (key: ClassField) => refs.current[key]?.innerText ?? '';

  const finish = (save: boolean) => {
    if (doneRef.current || !mountedRef.current) return;
    doneRef.current = true;
    if (save) {
      const name = read('name').trim();
      const stereotype = read('stereotype').replace(/\s+/g, ' ').trim();
      const attributes = toLines(read('attributes'));
      const operations = toLines(read('operations'));
      // An empty name keeps the old one.
      const nameChanged = name !== '' && name !== originalName.trim();
      const same = (a: string[], b: string[]) =>
        a.length === b.length && a.every((line, i) => line === b[i]);
      const changed =
        nameChanged ||
        stereotype !== umlClass.stereotype ||
        !same(attributes, umlClass.attributes) ||
        !same(operations, umlClass.operations);
      if (changed) {
        actions.setUmlClass(
          nodeId,
          {stereotype, attributes, operations},
          nameChanged ? textToHtml(name) : undefined,
        );
      }
    }
    actions.stopEditing();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    const current = FIELDS.find((key) => refs.current[key] === event.target);
    if (!current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    } else if (event.key === 'Enter') {
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        finish(true);
      } else if (MULTILINE.includes(current)) {
        // Native plaintext-only behaviour inserts the newline.
      } else if (current === 'name' && event.shiftKey) {
        // Names may span lines, as in the inline editor.
      } else {
        event.preventDefault();
        if (!event.shiftKey) finish(true);
      }
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const step = event.shiftKey ? -1 : 1;
      const next =
        FIELDS[(FIELDS.indexOf(current) + step + FIELDS.length) % FIELDS.length];
      refs.current[next]?.focus();
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    setFocused(null);
    // Moving between fields stays within the node and doesn't save.
    if (rootRef.current?.contains(event.relatedTarget as Node | null)) return;
    finish(true);
  };

  const onRootMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    // Clicks on the box's padding or borders must not blur the active field.
    if (!(event.target as HTMLElement).dataset.field) event.preventDefault();
  };

  const fieldProps = (key: ClassField, label: string, placeholder: string) => ({
    ref: (el: HTMLDivElement | null) => {
      refs.current[key] = el;
    },
    'data-field': key,
    'data-placeholder': placeholder,
    contentEditable: 'plaintext-only' as const,
    suppressContentEditableWarning: true,
    role: 'textbox',
    'aria-label': label,
    'aria-multiline': key === 'name' || MULTILINE.includes(key),
    spellCheck: key === 'name',
    onFocus: () => setFocused(key),
  });

  return (
    <div
      ref={rootRef}
      className="mm-class mm-class--editing nodrag nopan nowheel"
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onMouseDown={onRootMouseDown}
      onDoubleClick={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mm-class__header">
        <div
          className={`mm-class__stereotype ${hasStereotype || focused === 'stereotype' ? '' : 'mm-class__stereotype--idle'}`}
        >
          <span className="mm-class__quote">«</span>
          <div
            {...fieldProps('stereotype', 'Stereotype', 'stereotype')}
            className="mm-class__field mm-class__field--inline"
            onInput={(event) =>
              setHasStereotype(!!event.currentTarget.textContent)
            }
          />
          <span className="mm-class__quote">»</span>
        </div>
        <div
          className={`mm-class__name ${italic ? 'mm-class__name--italic' : ''}`}
        >
          <div
            {...fieldProps('name', 'Class name', 'Untitled')}
            className="mm-class__field"
          />
        </div>
      </div>
      <div
        {...fieldProps(
          'attributes',
          'Attributes, one per line',
          'attributes',
        )}
        className="mm-class__compartment mm-class__field mm-class__field--members"
        title={`One per line · ${MOD} Enter saves`}
      />
      <div
        {...fieldProps(
          'operations',
          'Operations, one per line',
          'operations',
        )}
        className="mm-class__compartment mm-class__field mm-class__field--members"
        title={`One per line · ${MOD} Enter saves`}
      />
    </div>
  );
}

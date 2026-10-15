'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import 'react-quill-new/dist/quill.snow.css';
import {findNode} from '@/domain/MindMap/tree';
import {sanitizeHtml} from '@/domain/MindMap/html';
import {
  useMindMapActions,
  useMindMapState,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {MOD} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';
import {ClassEditor} from '@/components/molecules/ClassEditor';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <Box sx={{display: 'grid', placeItems: 'center', height: 200}}>
      <CircularProgress size={24} />
    </Box>
  ),
});

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['link', 'code'],
    [{list: 'ordered'}, {list: 'bullet'}],
    ['clean'],
  ],
};

/**
 * One editor for the whole app, opened for a specific node. Edits are kept
 * in a local draft and only written to the map on Save, so Cancel really
 * cancels (and a whole editing session is a single undo step).
 */
export function EditorModal() {
  const {root, richEditorId} = useMindMapState();
  const actions = useMindMapActions();
  const node = richEditorId ? findNode(root, richEditorId) : undefined;

  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState(0);
  const initialRef = useRef('');

  useEffect(() => {
    if (!richEditorId) return;
    const html = (richEditorId && findNode(root, richEditorId)?.html) || '';
    initialRef.current = html;
    setDraft(html);
    setTab(0);
    // Only when a node is opened; later tree changes don't reset the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [richEditorId]);

  // Quill loads lazily, so wait for it to mount, then focus it with the
  // caret at the end.
  const focusEditor = useCallback((dialog: HTMLElement) => {
    let attempts = 0;
    const tryFocus = () => {
      const editable = dialog.querySelector<HTMLElement>('.ql-editor');
      if (!editable) {
        if (attempts++ < 60) requestAnimationFrame(tryFocus);
        return;
      }
      editable.focus();
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    };
    tryFocus();
  }, []);

  const close = () => actions.openRichEditor(null);
  const save = () => {
    if (node) {
      // Quill represents an empty document as an empty paragraph.
      const html = sanitizeHtml(draft).replace(/^<p><br><\/p>$/, '');
      if (html !== initialRef.current) actions.setHtml(node.id, html);
    }
    close();
  };

  // Class nodes get a structured editor instead of the rich-text one.
  if (node?.umlClass) return <ClassEditor node={node} onClose={close} />;

  return (
    <Dialog
      open={!!node}
      onClose={close}
      maxWidth="sm"
      fullWidth
      TransitionProps={{onEntered: focusEditor}}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
        }
      }}
    >
      <DialogTitle sx={{pb: 0}}>Edit node</DialogTitle>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{px: 3}}>
        <Tab label="Formatted" />
        <Tab label="HTML" />
      </Tabs>
      <DialogContent dividers sx={{minHeight: 240}}>
        {tab === 0 ? (
          <Box sx={{'& .ql-container': {minHeight: 160, fontSize: 15}}}>
            <ReactQuill
              theme="snow"
              value={draft}
              onChange={setDraft}
              modules={QUILL_MODULES}
            />
          </Box>
        ) : (
          <TextField
            multiline
            fullWidth
            minRows={8}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            slotProps={{
              htmlInput: {
                spellCheck: false,
                style: {fontFamily: 'monospace', fontSize: 13},
              },
            }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button onClick={save} variant="contained" title={`${MOD} Enter`}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

'use client';
import {useState} from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import {MindNode} from '@/domain/MindMap/tree';
import {htmlToText, textToHtml} from '@/domain/MindMap/html';
import {useMindMapActions} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {MOD} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';

/** Suggestions only; any stereotype can be typed. */
const STEREOTYPES = [
  'entity',
  'value object',
  'aggregate root',
  'domain service',
  'application service',
  'repository',
  'factory',
  'domain event',
  'command',
  'interface',
  'abstract',
  'enum',
];

const toLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const monospace = {
  htmlInput: {
    spellCheck: false,
    style: {fontFamily: 'var(--font-geist-mono), monospace', fontSize: 13},
  },
};

/**
 * Edits a class node: name, stereotype and its two compartments. Like the
 * formatted editor, changes are drafted locally and saved as one undo step.
 */
function ClassEditorForm({
  node,
  onClose,
}: {
  node: MindNode;
  onClose: () => void;
}) {
  const actions = useMindMapActions();
  const uml = node.umlClass!;
  const [name, setName] = useState(() => htmlToText(node.html));
  const [stereotype, setStereotype] = useState(uml.stereotype);
  const [attributes, setAttributes] = useState(uml.attributes.join('\n'));
  const [operations, setOperations] = useState(uml.operations.join('\n'));

  const save = () => {
    const nameChanged = name.trim() !== htmlToText(node.html);
    actions.setUmlClass(
      node.id,
      {
        stereotype: stereotype.trim(),
        attributes: toLines(attributes),
        operations: toLines(operations),
      },
      nameChanged ? textToHtml(name) : undefined,
    );
    onClose();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
        }
      }}
    >
      <DialogTitle>Edit class</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              fullWidth
            />
            <Autocomplete
              freeSolo
              options={STEREOTYPES}
              inputValue={stereotype}
              onInputChange={(_, value) => setStereotype(value)}
              sx={{width: 260, flexShrink: 0}}
              renderInput={(params) => (
                <TextField {...params} label="Stereotype" />
              )}
            />
          </Stack>
          <TextField
            label="Attributes"
            helperText="One per line, e.g. price: Money"
            value={attributes}
            onChange={(event) => setAttributes(event.target.value)}
            multiline
            minRows={4}
            slotProps={monospace}
          />
          <TextField
            label="Operations"
            helperText="One per line, e.g. reprice(price: Money): void"
            value={operations}
            onChange={(event) => setOperations(event.target.value)}
            multiline
            minRows={3}
            slotProps={monospace}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" title={`${MOD} Enter`}>
          Save
        </Button>
      </DialogActions>
    </form>
  );
}

export function ClassEditor({
  node,
  onClose,
}: {
  node: MindNode | undefined;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!node?.umlClass} onClose={onClose} maxWidth="sm" fullWidth>
      {node?.umlClass && (
        // Keyed so each opening starts from the node's current values.
        <ClassEditorForm key={node.id} node={node} onClose={onClose} />
      )}
    </Dialog>
  );
}

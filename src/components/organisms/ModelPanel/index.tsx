'use client';
import {useEffect, useRef, useState} from 'react';
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {findNode} from '@/domain/MindMap/tree';
import {htmlToText} from '@/domain/MindMap/html';
import {AI_MODELS} from '@/app/utils/aiModels';
import {
  useMindMapActions,
  useMindMapState,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {shortcutLabel} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';
import type {AiSettings} from '@/components/molecules/AiDiagram/useAiSettings';

const CONTEXT_SAVE_DELAY_MS = 400;

/**
 * The context box keeps its own draft so typing doesn't re-render the whole
 * map; the draft is written to the store shortly after typing stops, and on
 * blur (so a Generate click right after typing uses the latest text).
 */
function ContextField() {
  const {context} = useMindMapState();
  const actions = useMindMapActions();
  const [draft, setDraft] = useState(context);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<string | null>(null);

  const commit = () => {
    clearTimeout(timeout.current);
    if (pending.current !== null) actions.setContext(pending.current);
    pending.current = null;
  };
  // Closing the panel mid-typing still saves what was typed.
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => () => commitRef.current(), []);

  return (
    <TextField
      label="Context (optional)"
      placeholder="Paste notes, requirements, docs, a transcript, an outline or another diagram (Mermaid, PlantUML…). Generated detail will be based on it."
      multiline
      minRows={8}
      maxRows={22}
      fullWidth
      value={draft}
      onChange={(event) => {
        const value = event.target.value;
        setDraft(value);
        pending.current = value;
        clearTimeout(timeout.current);
        timeout.current = setTimeout(commit, CONTEXT_SAVE_DELAY_MS);
      }}
      onBlur={commit}
      helperText={
        draft ? `${draft.length.toLocaleString()} characters` : undefined
      }
      slotProps={{htmlInput: {spellCheck: false, style: {fontSize: 13}}}}
    />
  );
}

export function ModelPanel({
  settings,
  onSettingsChange,
  onClose,
}: {
  settings: AiSettings;
  onSettingsChange: (patch: Partial<AiSettings>) => void;
  onClose: () => void;
}) {
  const {root, context, selectedId, generatingIds} = useMindMapState();
  const actions = useMindMapActions();
  const busy = generatingIds.length > 0;
  const hasContext = !!context.trim();
  const isEmpty = root.children.length === 0;
  const selected = findNode(root, selectedId);
  const selectedName = selected ? htmlToText(selected.html) || 'Untitled' : '';

  return (
    <Box component="aside" className="mm-panel" aria-label="AI modeling">
      <Box className="mm-panel__header">
        <Typography variant="subtitle2" sx={{fontWeight: 700}}>
          AI modeling
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close panel">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Stack spacing={2} sx={{p: 2, overflowY: 'auto', flex: 1}}>
        <Typography variant="body2" color="text.secondary">
          Start from the central topic, or model by hand, then let AI add detail
          one level at a time. Links are updated as parts are broken down.
        </Typography>

        {/* Remounted per map, so a new or opened map shows its own context. */}
        <ContextField key={root.id} />

        <FormControlLabel
          disabled={!hasContext}
          control={
            <Switch
              size="small"
              checked={settings.strict}
              onChange={(event) =>
                onSettingsChange({strict: event.target.checked})
              }
            />
          }
          label={
            <Box>
              <Typography variant="body2">
                Only use facts from the context
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {settings.strict
                  ? 'Nothing is invented; detail stops where the context does.'
                  : 'AI may fill gaps; those nodes get a dashed outline.'}
              </Typography>
            </Box>
          }
          sx={{
            alignItems: 'flex-start',
            ml: 0,
            gap: 1,
            '& .MuiSwitch-root': {mt: 0.25},
          }}
        />

        <TextField
          select
          label="AI model"
          size="small"
          value={settings.model}
          onChange={(event) => onSettingsChange({model: event.target.value})}
          slotProps={{
            select: {
              renderValue: (id) =>
                AI_MODELS.find((m) => m.id === id)?.name ?? String(id),
            },
          }}
          helperText="Also used for “Generate ideas”"
        >
          {AI_MODELS.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              <ListItemText
                primary={
                  <Box
                    component="span"
                    sx={{display: 'flex', alignItems: 'center', gap: 1}}
                  >
                    {model.name}
                    {model.tier === 'premium' && (
                      <Chip
                        label="Pro"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                }
                secondary={model.description}
              />
            </MenuItem>
          ))}
        </TextField>

        <Stack spacing={1}>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            disabled={busy}
            onClick={actions.expandAll}
          >
            {isEmpty ? 'Generate diagram' : 'Add detail everywhere'}
          </Button>
          <Tooltip
            title={`Or press ${shortcutLabel('addDetail')} on a node`}
            placement="bottom"
          >
            <span>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LayersOutlinedIcon />}
                disabled={busy || !selected || isEmpty}
                onClick={() => selected && actions.expandNode(selected.id)}
                sx={{justifyContent: 'flex-start', minWidth: 0}}
              >
                <Box
                  component="span"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Add detail to “{selectedName}”
                </Box>
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <Typography variant="caption" color="text.secondary" component="div">
          Tips: drag the dot under a node onto another node to link them; click
          a link to change its type. Collapse a branch to see its links
          summarized at that level.
        </Typography>
      </Stack>
    </Box>
  );
}

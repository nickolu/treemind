'use client';
import {useState} from 'react';
import {Button, IconButton} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import {
  useMindMapActions,
  useMindMapState,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';

/**
 * Shown only on an untouched map. Getting from nothing to a diagram is the
 * least guessable thing the app does, and an empty canvas is the one moment
 * where there's room to name the two ways to do it. It goes away as soon as
 * the map has anything in it.
 */
export function StartHint() {
  const {root, context, linkingFrom, generatingIds} = useMindMapState();
  const actions = useMindMapActions();
  const [dismissed, setDismissed] = useState(false);

  const named = !!root.html;
  const visible =
    !dismissed && !linkingFrom && root.children.length === 0 && !context.trim();
  if (!visible) return null;

  return (
    <div className="mm-start-hint" role="note">
      <span className="mm-start-hint__text">
        {named
          ? 'Brainstorm branches with AI, or build the map from your own notes.'
          : 'Type to name your central topic — then let AI take it from there.'}
      </span>
      <Button
        size="small"
        variant="contained"
        disableElevation
        startIcon={<AutoAwesomeIcon />}
        disabled={!named || generatingIds.length > 0}
        // Clicking must not take keyboard focus off the map.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => actions.generateIdeas(root.id)}
      >
        Brainstorm it
      </Button>
      <Button
        size="small"
        startIcon={<NotesOutlinedIcon />}
        onClick={actions.openAiPanel}
      >
        Paste notes instead
      </Button>
      <IconButton
        size="small"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        <CloseIcon sx={{fontSize: 16}} />
      </IconButton>
    </div>
  );
}

'use client';
import {MouseEvent, ReactNode, useState} from 'react';
import {useReactFlow} from 'reactflow';
import {
  Box,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined';
import KeyboardOutlinedIcon from '@mui/icons-material/KeyboardOutlined';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import {createRoot} from '@/domain/MindMap/tree';
import {createDocument} from '@/domain/MindMap/document';
import {htmlToText} from '@/domain/MindMap/html';
import {
  ExportFormat,
  loadMindMapFromFile,
  saveMindMapToFile,
} from '@/app/utils/fileOperations';
import {
  useMindMapActions,
  useMindMapState,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {MindMapLegend} from '@/components/molecules/MindMapLegend';
import {shortcutLabel} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';

/** Clicking a toolbar button shouldn't move keyboard focus off the map. */
const keepFocus = (event: MouseEvent) => event.preventDefault();

function ToolButton({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip title={title} disableInteractive>
      <span>
        <IconButton
          size="small"
          onMouseDown={keepFocus}
          onClick={onClick}
          disabled={disabled}
          aria-label={title}
          aria-pressed={active}
          color={active ? 'primary' : 'default'}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function AppToolbar({
  panelOpen,
  onTogglePanel,
}: {
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const {root, links, context, canUndo, canRedo} = useMindMapState();
  const actions = useMindMapActions();
  const reactFlow = useReactFlow();
  const [shortcutsAnchor, setShortcutsAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [saveAnchor, setSaveAnchor] = useState<HTMLElement | null>(null);

  const title = htmlToText(root.html) || 'Untitled';

  const handleNew = () => {
    if (
      (root.children.length > 0 || context.trim()) &&
      !window.confirm(
        'Start a new mind map? The current one will be replaced (save it first if you want to keep it).',
      )
    ) {
      return;
    }
    actions.replace(createDocument(createRoot()));
  };

  const handleOpen = async () => {
    try {
      const loaded = await loadMindMapFromFile();
      if (loaded) {
        actions.replace(loaded);
        actions.notify(
          `Opened “${htmlToText(loaded.root.html) || 'Untitled'}”`,
          'success',
        );
      }
    } catch {
      actions.notify('That file isn’t a valid mind map.', 'error');
    }
  };

  const handleSave = (format: ExportFormat) => {
    setSaveAnchor(null);
    saveMindMapToFile({root, links, context}, format);
  };

  return (
    <Box component="header" className="mm-appbar">
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
        <AccountTreeOutlinedIcon sx={{color: 'primary.main'}} />
        <Typography variant="subtitle1" sx={{fontWeight: 700}}>
          TreeMind
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          sx={{ml: 1, maxWidth: 360}}
        >
          {title}
        </Typography>
      </Box>

      <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
        <ToolButton title="New mind map" onClick={handleNew}>
          <NoteAddOutlinedIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          title="Open file (TreeMind, FreeMind or XMind)…"
          onClick={handleOpen}
        >
          <FolderOpenOutlinedIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          title="Save to file…"
          onClick={(event) => setSaveAnchor(event.currentTarget)}
        >
          <FileDownloadOutlinedIcon fontSize="small" />
        </ToolButton>
        <Divider orientation="vertical" flexItem sx={{mx: 0.5}} />
        <ToolButton
          title={`Undo (${shortcutLabel('undo')})`}
          onClick={actions.undo}
          disabled={!canUndo}
        >
          <UndoIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          title={`Redo (${shortcutLabel('redo')})`}
          onClick={actions.redo}
          disabled={!canRedo}
        >
          <RedoIcon fontSize="small" />
        </ToolButton>
        <Divider orientation="vertical" flexItem sx={{mx: 0.5}} />
        <ToolButton
          title="Collapse all"
          onClick={() => actions.setAllCollapsed(true)}
        >
          <UnfoldLessIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          title="Expand all"
          onClick={() => actions.setAllCollapsed(false)}
        >
          <UnfoldMoreIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          title="Fit map to screen"
          onClick={() =>
            reactFlow.fitView({padding: 0.2, maxZoom: 1, duration: 300})
          }
        >
          <FitScreenOutlinedIcon fontSize="small" />
        </ToolButton>
        <Divider orientation="vertical" flexItem sx={{mx: 0.5}} />
        <ToolButton
          title={panelOpen ? 'Hide AI modeling panel' : 'AI modeling panel'}
          onClick={onTogglePanel}
          active={panelOpen}
        >
          <ViewSidebarOutlinedIcon fontSize="small" />
        </ToolButton>
        <ToolButton
          title="Keyboard shortcuts"
          onClick={(event) => setShortcutsAnchor(event.currentTarget)}
        >
          <KeyboardOutlinedIcon fontSize="small" />
        </ToolButton>
      </Box>

      <Menu
        open={!!saveAnchor}
        anchorEl={saveAnchor}
        onClose={() => setSaveAnchor(null)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
      >
        <MenuItem onClick={() => handleSave('json')}>
          <ListItemText primary="TreeMind" secondary=".json" />
        </MenuItem>
        <MenuItem onClick={() => handleSave('freemind')}>
          <ListItemText
            primary="FreeMind"
            secondary={links.length ? '.mm (tree only, no links)' : '.mm'}
          />
        </MenuItem>
      </Menu>

      <Popover
        open={!!shortcutsAnchor}
        anchorEl={shortcutsAnchor}
        onClose={() => setShortcutsAnchor(null)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
      >
        <MindMapLegend />
      </Popover>
    </Box>
  );
}

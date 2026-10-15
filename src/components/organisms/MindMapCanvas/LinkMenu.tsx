'use client';
import {useEffect, useState} from 'react';
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  MenuItem,
  MenuList,
  Popover,
  TextField,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import {LINK_KINDS, LINK_KIND_IDS} from '@/domain/MindMap/links';
import {
  useMindMapActions,
  useMindMapState,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';

export interface LinkMenuTarget {
  x: number;
  y: number;
  linkIds: string[];
  /** The links' ends are hidden inside collapsed branches. */
  summarized: boolean;
}

const GENERAL_KINDS = LINK_KIND_IDS.filter((k) => !LINK_KINDS[k].uml);
const UML_KINDS = LINK_KIND_IDS.filter((k) => LINK_KINDS[k].uml);

/** Edits one link (kind, label, direction), or reveals summarized ones. */
export function LinkMenu({
  target,
  onClose,
}: {
  target: LinkMenuTarget | null;
  onClose: () => void;
}) {
  const actions = useMindMapActions();
  // Read live from the store so the menu reflects each change it makes.
  const {links: allLinks} = useMindMapState();
  const links = target
    ? allLinks.filter((l) => target.linkIds.includes(l.id))
    : [];
  const link = links.length === 1 ? links[0] : null;
  const [label, setLabel] = useState('');

  useEffect(() => setLabel(link?.label ?? ''), [link?.id, link?.label]);

  const saveLabel = () => {
    if (link && label.trim() !== link.label) {
      actions.updateLink(link.id, {label: label.trim()});
    }
  };
  const close = () => {
    saveLabel();
    onClose();
  };

  const kindItem = (kind: (typeof LINK_KIND_IDS)[number]) => (
    <MenuItem
      key={kind}
      dense
      selected={link?.kind === kind}
      onClick={() => {
        if (link) actions.updateLink(link.id, {kind});
      }}
    >
      <ListItemIcon>
        {link?.kind === kind && <CheckIcon fontSize="small" />}
      </ListItemIcon>
      <ListItemText
        primary={LINK_KINDS[kind].name}
        secondary={LINK_KINDS[kind].description}
      />
    </MenuItem>
  );

  return (
    <Popover
      open={!!target && links.length > 0}
      onClose={close}
      anchorReference="anchorPosition"
      anchorPosition={target ? {left: target.x, top: target.y} : undefined}
      slotProps={{
        paper: {
          sx: {width: 300, '& .MuiMenuItem-root': {whiteSpace: 'normal'}},
        },
      }}
    >
      {target?.summarized && (
        <MenuList dense>
          <MenuItem
            onClick={() => {
              actions.reveal(links.flatMap((l) => [l.from, l.to]));
              onClose();
            }}
          >
            <ListItemIcon>
              <UnfoldMoreIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                links.length > 1
                  ? `Show ${links.length} hidden links`
                  : 'Show hidden link'
              }
              secondary="Expands the collapsed branches"
            />
          </MenuItem>
        </MenuList>
      )}
      {link && (
        <>
          {target?.summarized && <Divider />}
          <Box sx={{px: 2, pt: 2, pb: 1}}>
            <TextField
              label="Label"
              size="small"
              fullWidth
              autoFocus={!target?.summarized}
              value={label}
              placeholder="e.g. uses, owns, reports to"
              onChange={(event) => setLabel(event.target.value)}
              onBlur={saveLabel}
              onKeyDown={(event) => {
                if (event.key === 'Enter') close();
              }}
            />
          </Box>
          <MenuList dense sx={{py: 0}}>
            {GENERAL_KINDS.map(kindItem)}
            <ListSubheader sx={{lineHeight: '32px'}}>UML</ListSubheader>
            {UML_KINDS.map(kindItem)}
            <Divider />
            <MenuItem
              onClick={() =>
                actions.updateLink(link.id, {from: link.to, to: link.from})
              }
            >
              <ListItemIcon>
                <SwapHorizIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Reverse direction" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                actions.removeLink(link.id);
                onClose();
              }}
            >
              <ListItemIcon>
                <DeleteOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Delete link" />
            </MenuItem>
          </MenuList>
        </>
      )}
    </Popover>
  );
}

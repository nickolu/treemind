import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Divider,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const keyboardShortcuts = [
  { key: 'Enter', description: 'Add sibling node' },
  { key: 'Tab', description: 'Add child node' },
  { key: 'Alt/Option + Tab', description: 'Add some AI generated nodes' },
  { key: 'Delete/Backspace', description: 'Delete selected node' },
  { key: '↑/↓', description: 'Navigate between siblings' },
  { key: '←/→', description: 'Navigate parent/child nodes' },
  { key: 'Enter (while editing)', description: 'Finish editing' },
  { key: 'Escape', description: 'Cancel editing' },
];

export function MindMapLegend() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        maxWidth: 300,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
      elevation={3}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Keyboard Shortcuts
        </Typography>
        <IconButton size="small">
          {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
        </IconButton>
      </Box>
      <Collapse in={isExpanded}>
        <Divider />
        <List dense sx={{ pt: 0, pb: 0 }}>
          {keyboardShortcuts.map(({ key, description }, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      component="span"
                      sx={{
                        backgroundColor: 'grey.100',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      {key}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {description}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Paper>
  );
}

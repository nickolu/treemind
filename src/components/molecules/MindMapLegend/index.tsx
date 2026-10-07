'use client';
import {Box, Divider, Typography} from '@mui/material';
import {
  EDITING_SHORTCUTS,
  SHORTCUTS,
} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';

function Keys({keys}: {keys: string[]}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      {keys.map((combo) => (
        <Box key={combo} sx={{display: 'flex', gap: 0.25}}>
          {combo.split(' ').map((key) => (
            <kbd key={key} className="mm-kbd">
              {key}
            </kbd>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: {keys: string[]; description: string}[];
}) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      {items.map(({keys, description}) => (
        <Box
          key={description}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 0.5,
          }}
        >
          <Typography variant="body2">{description}</Typography>
          <Keys keys={keys} />
        </Box>
      ))}
    </Box>
  );
}

/** Keyboard reference, rendered from the same table the key handler uses. */
export function MindMapLegend() {
  return (
    <Box sx={{p: 2, width: 340}}>
      <Section title="Mind map" items={SHORTCUTS} />
      <Divider sx={{my: 1}} />
      <Section title="While editing text" items={EDITING_SHORTCUTS} />
      <Divider sx={{my: 1}} />
      <Typography variant="body2" color="text.secondary">
        Drag a node onto another to move it there, or up/down to reorder.
        Double-click to edit. Link nodes with the link button on a selected
        node, or drag the dot under a node onto another; click a link to change
        its type or label. Double-click empty canvas to add a node that stands
        on its own.
      </Typography>
    </Box>
  );
}

'use client';
import {Box, ButtonBase, Popover, Typography} from '@mui/material';
import {NodeShape, SHAPES, SHAPE_IDS} from '@/domain/MindMap/shapes';
import {ShapeGlyph} from '@/components/atoms/NodeShape';

export type ShapeChoice = NodeShape | 'class' | null;

const GROUPS: {title: string; items: {id: ShapeChoice; name: string}[]}[] = [
  {
    title: 'General',
    items: [
      {id: null, name: 'Topic'},
      {id: 'class', name: 'Class'},
      ...SHAPE_IDS.filter((id) => SHAPES[id].group === 'Basic').map((id) => ({
        id,
        name: SHAPES[id].name,
      })),
    ],
  },
  ...(['UML', 'Flowchart'] as const).map((group) => ({
    title: group,
    items: SHAPE_IDS.filter((id) => SHAPES[id].group === group).map((id) => ({
      id: id as ShapeChoice,
      name: SHAPES[id].name,
    })),
  })),
];

/** Grid of shapes (plus topic and class) to draw a node as. */
export function ShapePicker({
  anchor,
  current,
  onPick,
  onClose,
}: {
  anchor: HTMLElement | null;
  current: ShapeChoice;
  onPick: (shape: ShapeChoice) => void;
  onClose: () => void;
}) {
  return (
    <Popover
      open={!!anchor}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      transformOrigin={{vertical: 'top', horizontal: 'center'}}
      slotProps={{paper: {sx: {p: 1.5, width: 332}}}}
      // Keep keystrokes in the picker from reaching the map.
      onKeyDown={(event) => event.stopPropagation()}
    >
      {GROUPS.map((group) => (
        <Box key={group.title} sx={{'& + &': {mt: 1}}}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{lineHeight: '24px'}}
          >
            {group.title}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 0.5,
            }}
          >
            {group.items.map(({id, name}) => (
              <ButtonBase
                key={name}
                className={`mm-shape-option ${current === id ? 'mm-shape-option--current' : ''}`}
                onClick={() => onPick(id)}
                aria-pressed={current === id}
                title={id && id !== 'class' ? SHAPES[id].hint : name}
              >
                <ShapeGlyph shape={id ?? 'topic'} />
                <span>{name}</span>
              </ButtonBase>
            ))}
          </Box>
        </Box>
      ))}
    </Popover>
  );
}

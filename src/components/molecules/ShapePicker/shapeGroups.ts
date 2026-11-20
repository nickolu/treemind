import {NodeShape, SHAPES, SHAPE_IDS} from '@/domain/MindMap/shapes';

/** A shape to draw a node as: a shape, a UML class, or (null) a plain topic. */
export type ShapeChoice = NodeShape | 'class' | null;

export interface ShapeGroup {
  title: string;
  items: {id: ShapeChoice; name: string}[];
}

export const SHAPE_GROUPS: ShapeGroup[] = [
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

/** Tooltip text for a shape. */
export const shapeHint = (id: ShapeChoice, name: string) =>
  id && id !== 'class' ? SHAPES[id].hint : name;

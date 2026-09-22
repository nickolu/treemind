/**
 * Shapes a node can be drawn as. A node without a shape is a plain topic;
 * a node with `umlClass` is a class box (and ignores `shape`).
 */
export type NodeShape =
  | 'rectangle'
  | 'rounded'
  | 'ellipse'
  | 'diamond'
  | 'note'
  | 'package'
  | 'actor'
  | 'usecase'
  | 'component'
  | 'interface'
  | 'state'
  | 'initial'
  | 'final'
  | 'terminator'
  | 'data'
  | 'document'
  | 'database';

export interface ShapeInfo {
  name: string;
  group: 'Basic' | 'UML' | 'Flowchart';
  /** When the AI should pick it. */
  hint: string;
}

export const SHAPES: Record<NodeShape, ShapeInfo> = {
  rectangle: {
    name: 'Rectangle',
    group: 'Basic',
    hint: 'a process step or plain box',
  },
  rounded: {name: 'Rounded', group: 'Basic', hint: 'a softer plain box'},
  ellipse: {name: 'Ellipse', group: 'Basic', hint: 'a concept or circle'},
  diamond: {
    name: 'Decision',
    group: 'Basic',
    hint: 'a decision or branch point',
  },
  note: {name: 'Note', group: 'UML', hint: 'a comment or annotation'},
  package: {
    name: 'Package',
    group: 'UML',
    hint: 'a module, namespace or bounded context',
  },
  actor: {
    name: 'Actor',
    group: 'UML',
    hint: 'a user, role or external system in a use case',
  },
  usecase: {
    name: 'Use case',
    group: 'UML',
    hint: 'something an actor does with the system',
  },
  component: {
    name: 'Component',
    group: 'UML',
    hint: 'a deployable part or service',
  },
  interface: {
    name: 'Interface',
    group: 'UML',
    hint: 'a provided interface / API (lollipop)',
  },
  state: {name: 'State', group: 'UML', hint: 'a state in a state machine'},
  initial: {
    name: 'Start',
    group: 'UML',
    hint: 'the initial state or start of a flow',
  },
  final: {name: 'End', group: 'UML', hint: 'the final state or end of a flow'},
  terminator: {
    name: 'Terminator',
    group: 'Flowchart',
    hint: 'the start or end of a flowchart',
  },
  data: {name: 'Data', group: 'Flowchart', hint: 'input or output'},
  document: {
    name: 'Document',
    group: 'Flowchart',
    hint: 'a document or report',
  },
  database: {
    name: 'Database',
    group: 'Flowchart',
    hint: 'a database or data store',
  },
};

export const SHAPE_IDS = Object.keys(SHAPES) as NodeShape[];

export const isNodeShape = (value: unknown): value is NodeShape =>
  typeof value === 'string' && value in SHAPES;

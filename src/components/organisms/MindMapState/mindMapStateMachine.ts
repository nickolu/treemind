import {createMachine, assign} from 'xstate';

export type MindMapEvent =
  | {type: 'SELECT_NODE'; nodeId: string}
  | {type: 'RESELECT_NODE'}
  | {type: 'START_EDITING'}
  | {type: 'FINISH_EDITING'}
  | {type: 'CANCEL_EDITING'}
  | {type: 'START_AI_GENERATION'}
  | {type: 'FINISH_AI_GENERATION'};

export type MindMapContext = {
  selectedNodeId: string | null;
  previousNodeId: string | null;
};

type MindMapState =
  | {value: 'idle'; context: MindMapContext}
  | {value: 'selected'; context: MindMapContext}
  | {value: 'editing'; context: MindMapContext}
  | {value: 'generating'; context: MindMapContext};

export const mindMapMachine = createMachine({
  id: 'mindMap',
  initial: 'selected',
  context: {
    selectedNodeId: null,
    previousNodeId: null,
  },
  types: {
    context: {} as MindMapContext,
    events: {} as MindMapEvent,
  },
  states: {
    idle: {
      on: {
        SELECT_NODE: {
          target: 'selected',
          actions: [
            assign({
              selectedNodeId: ({event}) => event.nodeId,
              previousNodeId: ({context}) => context.selectedNodeId,
            }),
          ],
        },
      },
    },
    selected: {
      on: {
        SELECT_NODE: {
          target: 'selected',
          actions: [
            assign({
              selectedNodeId: ({event}) => event.nodeId,
              previousNodeId: ({context}) => context.selectedNodeId,
            }),
          ],
        },
        RESELECT_NODE: {
          target: 'selected',
        },
        START_EDITING: {
          target: 'editing',
        },
        START_AI_GENERATION: {
          target: 'generating',
        },
      },
    },
    editing: {
      on: {
        FINISH_EDITING: {
          target: 'selected',
        },
        CANCEL_EDITING: {
          target: 'selected',
        },
      },
    },
    generating: {
      on: {
        FINISH_AI_GENERATION: {
          target: 'selected',
        },
      },
    },
  },
});

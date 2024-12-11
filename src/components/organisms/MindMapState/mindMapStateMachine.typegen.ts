// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {
  };
  missingImplementations: {
    actions: never;
    delays: never;
    guards: never;
    services: never;
  };
  eventsCausingActions: {
    clearSelection: "DISABLE_KEYBOARD";
    updateSelectedNode: "SELECT_NODE";
  };
  eventsCausingDelays: {
  };
  eventsCausingGuards: {
  };
  eventsCausingServices: {
  };
  matchesStates: "idle" | "selected" | "editing" | "generating";
  tags: never;
}

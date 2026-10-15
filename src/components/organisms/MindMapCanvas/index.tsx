'use client';
import {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeChange,
  OnConnectStartParams,
  useNodesInitialized,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {MindNode, Point, findNode} from '@/domain/MindMap/tree';
import {htmlToText} from '@/domain/MindMap/html';
import {MindMapNode, MindMapNodeData} from '@/components/molecules/MindMapNode';
import {
  useMindMapActions,
  useMindMapState,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {isMac} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';
import {
  DEFAULT_SIZE,
  Layout,
  LayoutNode,
  Size,
  XY,
  hasPinnedNodes,
} from './layout';
import {useCanvasLayout} from './useCanvasLayout';
import {useAnimatedPositions} from './useAnimatedPositions';
import {LinkEdge, LinkEdgeData, LinkMarkers} from './LinkEdge';
import {TreeEdge} from './TreeEdge';
import {LinkMenu, LinkMenuTarget} from './LinkMenu';
import {Z_NODE, linkEdges, treeEdges} from './edges';

const nodeTypes = {mindMapNode: MindMapNode};
const edgeTypes = {link: LinkEdge, tree: TreeEdge};
const FIT_VIEW_OPTIONS = {padding: 0.2, maxZoom: 1};
const FOLLOW_MARGIN = 48;

interface DragState {
  id: string;
  subtree: Set<string>;
  offset: XY;
  dropTargetId: string | null;
}

function visibleSubtreeIds(node: MindNode, ids = new Set<string>()) {
  ids.add(node.id);
  if (!node.collapsed) node.children.forEach((c) => visibleSubtreeIds(c, ids));
  return ids;
}

const contains = (n: LayoutNode, point: XY) =>
  point.x >= n.position.x &&
  point.x <= n.position.x + n.size.width &&
  point.y >= n.position.y &&
  point.y <= n.position.y + n.size.height;

/**
 * What's under a point: an ordinary node if there is one, otherwise the
 * innermost container (containers come before their contents in the layout).
 */
function nodeAt(
  layout: Layout,
  point: XY,
  exclude: (id: string) => boolean,
  containersOnly = false,
) {
  const hits = layout.nodes.filter((n) => !exclude(n.id) && contains(n, point));
  const plain = containersOnly ? undefined : hits.find((n) => !n.container);
  return plain ?? hits.filter((n) => n.container).at(-1);
}

export function MindMapCanvas() {
  const {
    root,
    links,
    layout: layoutKind,
    selectedId,
    editing,
    generatingIds,
    linkingFrom,
  } = useMindMapState();
  const actions = useMindMapActions();
  const reactFlow = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Measured node sizes feed the layout, so it adapts to real content.
  const [sizes, setSizes] = useState<Map<string, Size>>(() => new Map());
  const layout = useCanvasLayout(layoutKind, root, links, sizes);
  const freeform = layout.kind === 'freeform';

  const [drag, setDrag] = useState<DragState | null>(null);
  const animated = useAnimatedPositions(layout, drag !== null);

  // Reuse data objects that haven't changed so memoized nodes skip re-rendering.
  const dataCache = useRef(new Map<string, MindMapNodeData>());

  const nodes = useMemo<Node<MindMapNodeData>[]>(() => {
    const generating = new Set(generatingIds);
    const nextCache = new Map<string, MindMapNodeData>();
    const result = layout.nodes.flatMap((layoutNode) => {
      // An async layout can briefly lag behind the tree.
      const treeNode = findNode(root, layoutNode.id);
      if (!treeNode) return [];
      const isRoot = treeNode.id === root.id;
      const data: MindMapNodeData = {
        html: treeNode.html,
        depth: layoutNode.depth,
        color: layoutNode.color,
        isRoot,
        childCount: treeNode.children.length,
        collapsed: !!treeNode.collapsed,
        isEditing: editing?.id === treeNode.id,
        editInitialText:
          editing?.id === treeNode.id ? editing.initialText : undefined,
        isGenerating: generating.has(treeNode.id),
        isDropTarget: drag?.dropTargetId === treeNode.id,
        umlClass: treeNode.umlClass,
        origin: treeNode.origin,
        shape: treeNode.shape,
        container: !!layoutNode.container,
        floating: !!treeNode.floating,
        isLinkSource: linkingFrom === treeNode.id,
      };
      const cached = dataCache.current.get(treeNode.id);
      const stable =
        cached &&
        (Object.keys(data) as (keyof MindMapNodeData)[]).every(
          (key) => cached[key] === data[key],
        )
          ? cached
          : data;
      nextCache.set(treeNode.id, stable);

      const base = animated.get(layoutNode.id);
      const isDragged = drag?.subtree.has(layoutNode.id);
      // Containers are sized by the layout; other nodes by their content.
      // Unmeasured nodes get a provisional size: React Flow hides nodes
      // without one, and a hidden node's editor can't take focus.
      const size = layoutNode.container
        ? layoutNode.size
        : (sizes.get(layoutNode.id) ?? DEFAULT_SIZE);
      return [
        {
          id: layoutNode.id,
          type: 'mindMapNode',
          position: isDragged
            ? {x: base.x + drag!.offset.x, y: base.y + drag!.offset.y}
            : base,
          data: stable,
          selected: layoutNode.id === selectedId,
          draggable: (!isRoot || freeform) && !stable.isEditing,
          // Containers stack by depth below edges; nodes sit above both.
          zIndex: layoutNode.container
            ? layoutNode.depth
            : Z_NODE + (isDragged ? 10 : 0),
          width: size.width,
          height: size.height,
          ...(layoutNode.container
            ? {
                className: 'mm-rf-container',
                style: {width: size.width, height: size.height},
              }
            : {}),
        },
      ];
    });
    dataCache.current = nextCache;
    return result;
  }, [
    layout,
    root,
    animated,
    drag,
    sizes,
    selectedId,
    editing,
    generatingIds,
    linkingFrom,
    freeform,
  ]);

  const edges = useMemo<Edge[]>(
    () => [...treeEdges(layout), ...linkEdges(root, links, layout)],
    [layout, root, links],
  );

  /** Current on-screen positions of every drawn node (freeform pinning). */
  const displayedPositions = useCallback(() => {
    const positions = new Map<string, Point>();
    layout.nodes.forEach((n) => positions.set(n.id, animated.get(n.id)));
    return positions;
  }, [layout, animated]);

  /**
   * Freeform keeps the automatic arrangement until something is placed by
   * hand; at that point every node is pinned where it is, so placing one
   * node doesn't rearrange the others.
   */
  const pinsForFreeform = useCallback(
    () => (hasPinnedNodes(root) ? new Map() : displayedPositions()),
    [root, displayedPositions],
  );

  // Dragging from a node's link handle and dropping on another node links them.
  const linkSourceRef = useRef<string | null>(null);
  const onConnectStart = useCallback(
    (_: unknown, {nodeId, handleId}: OnConnectStartParams) => {
      linkSourceRef.current = handleId === 'link' ? nodeId : null;
    },
    [],
  );
  const onConnectEnd = useCallback(
    (event: globalThis.MouseEvent | TouchEvent) => {
      const source = linkSourceRef.current;
      linkSourceRef.current = null;
      if (!source) return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      if (!point) return;
      const target = nodeAt(
        layout,
        reactFlow.screenToFlowPosition({x: point.clientX, y: point.clientY}),
        (id) => id === source,
      );
      if (target) {
        actions.addLink(source, target.id);
        actions.select(source);
      }
    },
    [layout, reactFlow, actions],
  );

  const [linkMenu, setLinkMenu] = useState<LinkMenuTarget | null>(null);
  const onEdgeClick = useCallback((event: MouseEvent, edge: Edge) => {
    const data = edge.data as LinkEdgeData | undefined;
    if (edge.type !== 'link' || !data) return;
    setLinkMenu({
      x: event.clientX,
      y: event.clientY,
      linkIds: data.linkIds,
      summarized: data.summarized,
    });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Containers are sized by the layout, so their size isn't fed back.
      const measured = changes.filter(
        (c): c is Extract<NodeChange, {type: 'dimensions'}> =>
          c.type === 'dimensions' &&
          !!c.dimensions &&
          !layout.byId.get(c.id)?.container,
      );
      // Applied on the next frame: resizing containers inside React Flow's
      // ResizeObserver callback would trigger a "ResizeObserver loop" error.
      if (measured.length) {
        requestAnimationFrame(() =>
          setSizes((prev) => {
            let next: Map<string, Size> | null = null;
            measured.forEach(({id, dimensions}) => {
              const old = prev.get(id);
              if (
                old?.width === dimensions!.width &&
                old?.height === dimensions!.height
              ) {
                return;
              }
              next ??= new Map(prev);
              next.set(id, dimensions!);
            });
            return next ?? prev;
          }),
        );
      }

      // While dragging, React Flow reports the new position of the dragged
      // node; its whole subtree follows by the same offset.
      const moved = changes.find(
        (c): c is Extract<NodeChange, {type: 'position'}> =>
          c.type === 'position' && !!c.dragging && !!c.position,
      );
      if (moved) {
        setDrag((prev) => {
          const origin = animated.get(moved.id);
          if (!prev || prev.id !== moved.id) return prev;
          return {
            ...prev,
            offset: {
              x: moved.position!.x - origin.x,
              y: moved.position!.y - origin.y,
            },
          };
        });
      }
      // Selection and removal are owned by the store, so other changes are ignored.
    },
    [layout, animated],
  );

  const onNodeDragStart = useCallback(
    (_: MouseEvent, node: Node) => {
      const treeNode = findNode(root, node.id);
      if (!treeNode) return;
      actions.select(node.id);
      setDrag({
        id: node.id,
        subtree: visibleSubtreeIds(treeNode),
        offset: {x: 0, y: 0},
        dropTargetId: null,
      });
    },
    [root, actions],
  );

  // Highlight where the node would go: a new parent, or (freeform) a container.
  const onNodeDrag = useCallback(
    (event: MouseEvent) => {
      const pointer = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setDrag((prev) => {
        if (!prev) return prev;
        const target = nodeAt(
          layout,
          pointer,
          (id) => prev.subtree.has(id),
          layout.kind === 'freeform',
        );
        const dropTargetId = target?.id ?? null;
        return dropTargetId === prev.dropTargetId
          ? prev
          : {...prev, dropTargetId};
      });
    },
    [layout, reactFlow],
  );

  /**
   * Freeform: the node stays where it's dropped, inside whichever container
   * it's dropped in (or unconnected, outside all of them). Other layouts:
   * dropping onto a node makes the dragged node its child; in the mind map
   * and top-down tree, dropping elsewhere reorders it among its siblings.
   * Anything else snaps back into place.
   */
  const onNodeDragStop = useCallback(() => {
    if (!drag) return;
    const dragged = layout.byId.get(drag.id);
    const treeNode = findNode(root, drag.id);
    const parent = treeNode?.parentId
      ? findNode(root, treeNode.parentId)
      : undefined;

    // Animate from where the subtree was dropped rather than jumping back.
    const dropped = new Map<string, XY>();
    drag.subtree.forEach((id) => {
      const base = animated.get(id);
      dropped.set(id, {x: base.x + drag.offset.x, y: base.y + drag.offset.y});
    });
    animated.jumpTo(dropped);
    setDrag(null);
    if (!dragged || !treeNode) return;

    if (layout.kind === 'freeform') {
      const positions = pinsForFreeform();
      dropped.forEach((position, id) => positions.set(id, position));
      if (!parent) return actions.setPositions(positions); // the root
      const target = drag.dropTargetId;
      if (target && (target !== parent.id || treeNode.floating)) {
        actions.move(drag.id, target, undefined, false, positions);
      } else if (!target && !treeNode.floating) {
        actions.move(drag.id, root.id, undefined, true, positions);
      } else {
        actions.setPositions(positions);
      }
      return;
    }

    if (!parent) return;
    if (drag.dropTargetId && drag.dropTargetId !== parent.id) {
      actions.move(drag.id, drag.dropTargetId);
      return;
    }
    if (layout.kind !== 'mindmap' && layout.kind !== 'tree') return;

    // Reorder along the axis siblings are stacked on.
    const horizontal = layout.kind === 'tree';
    const centre = (n: LayoutNode, offset = 0) =>
      horizontal
        ? n.position.x + offset + n.size.width / 2
        : n.position.y + offset + n.size.height / 2;
    const draggedCentre = centre(
      dragged,
      horizontal ? drag.offset.x : drag.offset.y,
    );
    const siblings = parent.children.filter((c) => c.id !== drag.id);
    const index = siblings.filter((sibling) => {
      const s = layout.byId.get(sibling.id);
      return s && centre(s) < draggedCentre;
    }).length;
    const currentIndex = parent.children.findIndex((c) => c.id === drag.id);
    if (index !== currentIndex) {
      actions.move(drag.id, parent.id, index, !!treeNode.floating);
    }
  }, [drag, layout, root, animated, actions, pinsForFreeform]);

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      if (linkingFrom) {
        if (node.id !== linkingFrom) actions.addLink(linkingFrom, node.id);
        actions.stopLinking();
        return;
      }
      actions.select(node.id);
    },
    [actions, linkingFrom],
  );

  // Classes have several fields, so they open in the class editor.
  const onNodeDoubleClick = useCallback(
    (_: MouseEvent, node: Node<MindMapNodeData>) =>
      node.data.umlClass
        ? actions.openRichEditor(node.id)
        : actions.startEditing(node.id),
    [actions],
  );

  const onPaneClick = useCallback(() => {
    if (linkingFrom) actions.stopLinking();
  }, [actions, linkingFrom]);

  /**
   * Double-clicking empty canvas adds a node there: inside the container
   * under the pointer, or unconnected. (React Flow has no pane double-click
   * event, so this listens on the wrapper.)
   */
  const onCanvasDoubleClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('.react-flow__pane') ||
        target.closest(
          '.react-flow__edge, .react-flow__controls, .react-flow__minimap, .mm-container__header',
        )
      ) {
        return;
      }
      const point = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const container = nodeAt(layout, point, () => false, true);
      if (freeform) {
        const at = {x: point.x - DEFAULT_SIZE.width / 2, y: point.y - 20};
        actions.addNodeAt(container?.id ?? null, at, pinsForFreeform());
      } else {
        actions.addNodeAt(container?.id ?? null);
      }
    },
    [reactFlow, layout, freeform, actions, pinsForFreeform],
  );

  // Link mode: a line follows the pointer from the source node.
  const [pointer, setPointer] = useState<XY | null>(null);
  const linkSource = linkingFrom ? layout.byId.get(linkingFrom) : undefined;
  let preview: {from: XY; to: XY} | null = null;
  if (linkSource && pointer && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const position = animated.get(linkSource.id);
    const screen = reactFlow.flowToScreenPosition({
      x: position.x + linkSource.size.width / 2,
      y: position.y + linkSource.size.height / 2,
    });
    preview = {
      from: {x: screen.x - rect.left, y: screen.y - rect.top},
      to: pointer,
    };
  }
  const linkSourceName = linkingFrom
    ? htmlToText(findNode(root, linkingFrom)?.html ?? '') || 'Untitled'
    : '';

  // Keep the selected node on screen, panning as little as possible.
  const selectedLayout = layout.byId.get(selectedId);
  const selectedRect = selectedLayout
    ? `${selectedLayout.position.x},${selectedLayout.position.y},${selectedLayout.size.width},${selectedLayout.size.height}`
    : '';
  useEffect(() => {
    const container = containerRef.current;
    if (!selectedRect || !container || drag) return;
    const [x, y, width, height] = selectedRect.split(',').map(Number);
    const {x: vx, y: vy, zoom} = reactFlow.getViewport();
    const left = x * zoom + vx;
    const top = y * zoom + vy;
    const right = left + width * zoom;
    const bottom = top + height * zoom;
    const {clientWidth: w, clientHeight: h} = container;

    const shift = (start: number, end: number, size: number) => {
      if (end - start > size - 2 * FOLLOW_MARGIN) return 0;
      if (start < FOLLOW_MARGIN) return FOLLOW_MARGIN - start;
      if (end > size - FOLLOW_MARGIN) return size - FOLLOW_MARGIN - end;
      return 0;
    };
    const dx = shift(left, right, w);
    const dy = shift(top, bottom, h);
    if (dx || dy) {
      reactFlow.setViewport({x: vx + dx, y: vy + dy, zoom}, {duration: 200});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedRect]);

  // Fit the whole map when a different map is loaded (once it's measured).
  const nodesInitialized = useNodesInitialized();
  const fittedRootRef = useRef(root.id);
  useEffect(() => {
    if (fittedRootRef.current === root.id || !nodesInitialized) return;
    fittedRootRef.current = root.id;
    reactFlow.fitView({...FIT_VIEW_OPTIONS, duration: 300});
  }, [root.id, nodesInitialized, reactFlow]);

  // ...and when the layout changes, once nodes have animated into place.
  const fittedKindRef = useRef(layout.kind);
  useEffect(() => {
    if (fittedKindRef.current === layout.kind) return;
    fittedKindRef.current = layout.kind;
    const timeout = setTimeout(
      () => reactFlow.fitView({...FIT_VIEW_OPTIONS, duration: 300}),
      260,
    );
    return () => clearTimeout(timeout);
  }, [layout.kind, reactFlow]);

  return (
    <div
      ref={containerRef}
      className={`mm-canvas ${linkingFrom ? 'mm-canvas--linking' : ''}`}
      onDoubleClick={onCanvasDoubleClick}
      onMouseMove={(event) => {
        if (!linkingFrom || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPointer({x: event.clientX - rect.left, y: event.clientY - rect.top});
      }}
    >
      <LinkMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        connectionLineStyle={{stroke: 'var(--link)', strokeDasharray: '6 4'}}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.15}
        maxZoom={2}
        nodeDragThreshold={4}
        edgesUpdatable={false}
        selectNodesOnDrag={false}
        // A selected container must not jump above the nodes inside it.
        elevateNodesOnSelect={false}
        zoomOnDoubleClick={false}
        panOnScroll
        // All keyboard handling is ours; turn off React Flow's built-in keys
        // (its Backspace-to-delete used to bypass the tree entirely).
        disableKeyboardA11y
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        panActivationKeyCode={null}
        zoomActivationKeyCode={isMac ? 'Meta' : 'Control'}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#cbd5e1"
        />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={(node) => (node.data as MindMapNodeData).color}
          nodeBorderRadius={6}
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>
      {preview && (
        <svg className="mm-link-preview" aria-hidden>
          <line
            x1={preview.from.x}
            y1={preview.from.y}
            x2={preview.to.x}
            y2={preview.to.y}
          />
        </svg>
      )}
      {linkingFrom && (
        <div className="mm-link-hint" role="status">
          Click a node to link it from “{linkSourceName}” · Esc to cancel
        </div>
      )}
      <LinkMenu target={linkMenu} onClose={() => setLinkMenu(null)} />
    </div>
  );
}

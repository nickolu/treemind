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
import {MindNode, findNode} from '@/domain/MindMap/tree';
import {MindMapNode, MindMapNodeData} from '@/components/molecules/MindMapNode';
import {
  useMindMapActions,
  useMindMapState,
} from '@/components/organisms/MindMapStore/MindMapStoreContext';
import {isMac} from '@/components/molecules/MindMapKeyboardEvents/shortcuts';
import {DEFAULT_SIZE, Layout, Size, XY, computeLayout} from './layout';
import {useAnimatedPositions} from './useAnimatedPositions';
import {LinkEdge, LinkEdgeData, LinkMarkers} from './LinkEdge';
import {LinkMenu, LinkMenuTarget} from './LinkMenu';
import {MindLink} from '@/domain/MindMap/links';

const nodeTypes = {mindMapNode: MindMapNode};
const edgeTypes = {link: LinkEdge};
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

/** The node under a point in flow coordinates, if any. */
function nodeAt(layout: Layout, point: XY, exclude: (id: string) => boolean) {
  return layout.nodes.find(
    (n) =>
      !exclude(n.id) &&
      point.x >= n.position.x &&
      point.x <= n.position.x + n.size.width &&
      point.y >= n.position.y &&
      point.y <= n.position.y + n.size.height,
  );
}

function parentIds(node: MindNode, map = new Map<string, string>()) {
  node.children.forEach((child) => {
    map.set(child.id, node.id);
    parentIds(child, map);
  });
  return map;
}

/**
 * One edge per pair of visible nodes. A link whose end is inside a collapsed
 * branch is drawn to that branch's visible ancestor instead, and several such
 * links are summarized as one, so collapsing and expanding shows the links at
 * the level of detail on screen.
 */
function linkEdges(
  root: MindNode,
  links: MindLink[],
  layout: Layout,
): Edge<LinkEdgeData>[] {
  if (links.length === 0) return [];
  const parents = parentIds(root);
  const visible = (id: string) => {
    let current: string | undefined = id;
    while (current && !layout.byId.has(current)) current = parents.get(current);
    return current;
  };

  const groups = new Map<
    string,
    {from: string; to: string; links: MindLink[]}
  >();
  links.forEach((link) => {
    const from = visible(link.from);
    const to = visible(link.to);
    if (!from || !to || from === to) return;
    const key = `${from}->${to}`;
    const group = groups.get(key) ?? {from, to, links: []};
    group.links.push(link);
    groups.set(key, group);
  });

  // Spread links between the same two nodes (either direction) apart.
  const perPair = new Map<string, number>();
  return [...groups.values()].map(({from, to, links: group}) => {
    const pair = from < to ? `${from}|${to}` : `${to}|${from}`;
    const index = perPair.get(pair) ?? 0;
    perPair.set(pair, index + 1);
    const magnitude = Math.ceil(index / 2) * 24;
    // Opposite directions have opposite normals, so the sign keeps them apart.
    const offset = (index % 2 ? 1 : -1) * magnitude * (from < to ? 1 : -1);

    const single = group.length === 1 ? group[0] : null;
    const summarized = group.some((l) => l.from !== from || l.to !== to);
    return {
      id: `link:${from}->${to}`,
      source: from,
      target: to,
      sourceHandle: 'tree',
      type: 'link',
      zIndex: 1,
      data: {
        linkIds: group.map((l) => l.id),
        kind: single?.kind ?? null,
        label: single?.label ?? '',
        summarized,
        offset,
      },
    };
  });
}

export function MindMapCanvas() {
  const {root, links, selectedId, editing, generatingIds} = useMindMapState();
  const actions = useMindMapActions();
  const reactFlow = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Measured node sizes feed the layout, so it adapts to real content.
  const [sizes, setSizes] = useState<Map<string, Size>>(() => new Map());
  const layout = useMemo(() => computeLayout(root, sizes), [root, sizes]);

  const [drag, setDrag] = useState<DragState | null>(null);
  const animated = useAnimatedPositions(layout, drag !== null);

  // Reuse data objects that haven't changed so memoized nodes skip re-rendering.
  const dataCache = useRef(new Map<string, MindMapNodeData>());

  const nodes = useMemo<Node<MindMapNodeData>[]>(() => {
    const generating = new Set(generatingIds);
    const nextCache = new Map<string, MindMapNodeData>();
    const result = layout.nodes.map((layoutNode) => {
      const treeNode = findNode(root, layoutNode.id)!;
      const data: MindMapNodeData = {
        html: treeNode.html,
        depth: layoutNode.depth,
        color: layoutNode.color,
        isRoot: treeNode.id === root.id,
        childCount: treeNode.children.length,
        collapsed: !!treeNode.collapsed,
        isEditing: editing?.id === treeNode.id,
        editInitialText:
          editing?.id === treeNode.id ? editing.initialText : undefined,
        isGenerating: generating.has(treeNode.id),
        isDropTarget: drag?.dropTargetId === treeNode.id,
        umlClass: treeNode.umlClass,
        origin: treeNode.origin,
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
      // Unmeasured nodes get a provisional size: React Flow hides nodes
      // without one, and a hidden node's editor can't take focus.
      const size = sizes.get(layoutNode.id) ?? DEFAULT_SIZE;
      return {
        id: layoutNode.id,
        type: 'mindMapNode',
        position: isDragged
          ? {x: base.x + drag!.offset.x, y: base.y + drag!.offset.y}
          : base,
        data: stable,
        selected: layoutNode.id === selectedId,
        draggable: layoutNode.id !== root.id && !stable.isEditing,
        zIndex: isDragged ? 10 : undefined,
        width: size.width,
        height: size.height,
      };
    });
    dataCache.current = nextCache;
    return result;
  }, [layout, root, animated, drag, sizes, selectedId, editing, generatingIds]);

  const edges = useMemo<Edge[]>(
    () => [
      ...layout.nodes
        .filter((n) => n.parentId)
        .map((n) => ({
          id: `${n.parentId}->${n.id}`,
          source: n.parentId!,
          sourceHandle: 'tree',
          target: n.id,
          type: 'default',
          style: {stroke: n.color, strokeWidth: n.depth === 1 ? 3 : 2},
          className: 'mm-edge',
          focusable: false,
        })),
      ...linkEdges(root, links, layout),
    ],
    [layout, root, links],
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
      const measured = changes.filter(
        (c): c is Extract<NodeChange, {type: 'dimensions'}> =>
          c.type === 'dimensions' && !!c.dimensions,
      );
      if (measured.length) {
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
        });
      }

      // While dragging, React Flow reports the new position of the dragged
      // node; its whole subtree follows by the same offset.
      const moved = changes.find(
        (c): c is Extract<NodeChange, {type: 'position'}> =>
          c.type === 'position' && !!c.dragging && !!c.position,
      );
      if (moved) {
        setDrag((prev) => {
          const origin = layout.byId.get(moved.id)?.position;
          if (!prev || prev.id !== moved.id || !origin) return prev;
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
    [layout],
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

  // Highlight the node under the pointer as the new parent.
  const onNodeDrag = useCallback(
    (event: MouseEvent) => {
      const pointer = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setDrag((prev) => {
        if (!prev) return prev;
        const target = nodeAt(layout, pointer, (id) => prev.subtree.has(id));
        const dropTargetId = target?.id ?? null;
        return dropTargetId === prev.dropTargetId
          ? prev
          : {...prev, dropTargetId};
      });
    },
    [layout, reactFlow],
  );

  /**
   * Dropping onto a node makes the dragged node its child. Dropping anywhere
   * else reorders it among its siblings by vertical position; the layout
   * then animates everything into place.
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

    if (!dragged || !treeNode || !parent) return;
    if (drag.dropTargetId && drag.dropTargetId !== parent.id) {
      actions.move(drag.id, drag.dropTargetId);
      return;
    }

    const centerY =
      dragged.position.y + drag.offset.y + dragged.size.height / 2;
    const siblings = parent.children.filter((c) => c.id !== drag.id);
    const index = siblings.filter((sibling) => {
      const s = layout.byId.get(sibling.id);
      return s && s.position.y + s.size.height / 2 < centerY;
    }).length;
    const currentIndex = parent.children.findIndex((c) => c.id === drag.id);
    if (index !== currentIndex) actions.move(drag.id, parent.id, index);
  }, [drag, layout, root, animated, actions]);

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => actions.select(node.id),
    [actions],
  );

  // Classes have several fields, so they open in the class editor.
  const onNodeDoubleClick = useCallback(
    (_: MouseEvent, node: Node<MindMapNodeData>) =>
      node.data.umlClass
        ? actions.openRichEditor(node.id)
        : actions.startEditing(node.id),
    [actions],
  );

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

  return (
    <div ref={containerRef} className="mm-canvas">
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
      <LinkMenu target={linkMenu} onClose={() => setLinkMenu(null)} />
    </div>
  );
}

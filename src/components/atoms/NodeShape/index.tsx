import {NodeShape} from '@/domain/MindMap/shapes';

/**
 * Outlines drawn in a 100×100 box stretched over the node
 * (preserveAspectRatio="none" with non-scaling strokes), so they fit any
 * amount of text. Shapes CSS can draw (rectangles, ellipses, pills) aren't
 * listed; figures (actor, start/end, interface) are drawn separately.
 */
const OUTLINES: Partial<Record<NodeShape, string>> = {
  diamond: 'M50,1 L99,50 L50,99 L1,50 Z',
  note: 'M1,1 H86 L99,16 V99 H1 Z M86,1 V16 H99',
  package: 'M1,1 H38 V14 H99 V99 H1 Z M1,14 H38',
  data: 'M14,1 H99 L86,99 H1 Z',
  document: 'M1,1 H99 V86 C75,72 50,100 25,90 C15,86 8,84 1,86 Z',
  database:
    'M1,12 C1,-3 99,-3 99,12 V88 C99,103 1,103 1,88 Z M1,12 C1,27 99,27 99,12',
};

/** Shapes drawn as a small figure with the name underneath. */
export const FIGURE_SHAPES = new Set<NodeShape>([
  'actor',
  'initial',
  'final',
  'interface',
]);

/** Shapes whose outline is one of the stretched SVG paths above. */
export const hasOutline = (shape: NodeShape) => shape in OUTLINES;

export function ShapeOutline({shape}: {shape: NodeShape}) {
  const path = OUTLINES[shape];
  if (!path) return null;
  return (
    <svg
      className="mm-shape__outline"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={path} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The UML component icon, drawn in the corner of component nodes. */
export function ComponentBadge() {
  return (
    <svg className="mm-shape__badge" viewBox="0 0 16 16" aria-hidden>
      <rect x="4" y="1.5" width="10.5" height="13" rx="1" />
      <rect x="1.5" y="4" width="5" height="2.5" />
      <rect x="1.5" y="9.5" width="5" height="2.5" />
    </svg>
  );
}

export function ShapeFigure({shape}: {shape: NodeShape}) {
  switch (shape) {
    case 'actor':
      return (
        <svg
          className="mm-figure mm-figure--actor"
          viewBox="0 0 30 48"
          aria-hidden
        >
          <circle cx="15" cy="7" r="6" />
          <path d="M15,13 V30 M3,19 H27 M15,30 L5,46 M15,30 L25,46" />
        </svg>
      );
    case 'initial':
      return (
        <svg className="mm-figure" viewBox="0 0 28 28" aria-hidden>
          <circle cx="14" cy="14" r="12" className="mm-figure__solid" />
        </svg>
      );
    case 'final':
      return (
        <svg className="mm-figure" viewBox="0 0 28 28" aria-hidden>
          <circle cx="14" cy="14" r="12.5" />
          <circle cx="14" cy="14" r="7.5" className="mm-figure__solid" />
        </svg>
      );
    case 'interface':
      return (
        <svg
          className="mm-figure mm-figure--interface"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    default:
      return null;
  }
}

/** Small preview of a shape, for the shape picker. */
export function ShapeGlyph({shape}: {shape: NodeShape | 'topic' | 'class'}) {
  if (shape === 'topic' || shape === 'class') {
    return (
      <svg className="mm-glyph" viewBox="0 0 40 26" aria-hidden>
        <rect
          x="1"
          y="1"
          width="38"
          height="24"
          rx={shape === 'topic' ? 6 : 1}
        />
        {shape === 'topic' ? (
          <path d="M1.5,4 V22" className="mm-glyph__accent" />
        ) : (
          <path d="M1,9 H39 M1,17 H39" />
        )}
      </svg>
    );
  }
  if (FIGURE_SHAPES.has(shape)) {
    return (
      <span className="mm-glyph mm-glyph--figure">
        <ShapeFigure shape={shape} />
      </span>
    );
  }
  const path = OUTLINES[shape];
  const box: Record<string, JSX.Element> = {
    rectangle: <rect x="1" y="1" width="38" height="24" />,
    rounded: <rect x="1" y="1" width="38" height="24" rx="6" />,
    state: <rect x="1" y="1" width="38" height="24" rx="8" />,
    terminator: <rect x="1" y="1" width="38" height="24" rx="12" />,
    ellipse: <ellipse cx="20" cy="13" rx="19" ry="12" />,
    usecase: <ellipse cx="20" cy="13" rx="19" ry="10" />,
    component: (
      <>
        <rect x="1" y="1" width="38" height="24" />
        <rect x="28" y="4" width="8" height="8" />
      </>
    ),
  };
  return (
    <svg
      className="mm-glyph"
      viewBox={path ? '0 0 100 100' : '0 0 40 26'}
      preserveAspectRatio={path ? 'none' : undefined}
      aria-hidden
    >
      {path ? <path d={path} vectorEffect="non-scaling-stroke" /> : box[shape]}
    </svg>
  );
}

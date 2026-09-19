import {v4 as uuidv4} from 'uuid';
import {MindNode} from '@/domain/MindMap/tree';
import {
  hasRichFormatting,
  htmlToText,
  sanitizeHtml,
  textToHtml,
} from '@/domain/MindMap/html';
import {childElements, escapeXml, parseXml} from './xml';

/**
 * FreeMind (.mm) is plain XML: <map><node TEXT="…">…nested <node>s…</node></map>.
 * A node's label is either the TEXT attribute or, for formatted text, an
 * XHTML document inside <richcontent TYPE="NODE">. Icons, clouds, arrows,
 * notes and styling have no equivalent here and are dropped on import.
 */
export function parseFreeMind(xml: string): MindNode {
  const doc = parseXml(xml);
  const map = doc.documentElement;
  if (map.nodeName !== 'map') {
    throw new Error('Invalid FreeMind file: missing <map>');
  }
  const rootElement = childElements(map, 'node')[0];
  if (!rootElement) throw new Error('Invalid FreeMind file: no root node');
  return readNode(rootElement, null);
}

function readNode(element: Element, parentId: string | null): MindNode {
  const id = uuidv4();
  const children = childElements(element, 'node').map((child) =>
    readNode(child, id),
  );
  const node: MindNode = {id, parentId, html: readLabel(element), children};
  if (element.getAttribute('FOLDED') === 'true' && children.length > 0) {
    node.collapsed = true;
  }
  return node;
}

function readLabel(element: Element): string {
  const rich = childElements(element, 'richcontent').find(
    (child) => child.getAttribute('TYPE') === 'NODE',
  );
  const body = rich?.getElementsByTagName('body')[0];
  if (body) {
    // Re-parse as HTML so the sanitizer sees ordinary (non-namespaced) elements.
    const html = new DOMParser()
      .parseFromString(new XMLSerializer().serializeToString(body), 'text/html')
      .body.innerHTML.trim();
    return sanitizeHtml(html);
  }
  return textToHtml(element.getAttribute('TEXT') ?? '');
}

export function toFreeMind(root: MindNode): string {
  const now = Date.now();
  const lines = [
    '<map version="1.0.1">',
    '<!-- To view this file, download free mind mapping software FreeMind from http://freemind.sourceforge.net -->',
  ];
  const write = (node: MindNode, depth: number) => {
    const attrs = [
      `CREATED="${now}"`,
      `ID="ID_${node.id.replace(/[^a-zA-Z0-9]/g, '')}"`,
      `MODIFIED="${now}"`,
    ];
    if (depth === 1) attrs.push('POSITION="right"');
    if (node.collapsed && node.children.length > 0) attrs.push('FOLDED="true"');

    const rich = hasRichFormatting(node.html);
    if (!rich) {
      attrs.push(
        `TEXT="${escapeXml(htmlToText(node.html)).replace(/\n/g, '&#xa;')}"`,
      );
    }
    if (!rich && node.children.length === 0) {
      lines.push(`<node ${attrs.join(' ')}/>`);
      return;
    }
    lines.push(`<node ${attrs.join(' ')}>`);
    if (rich) {
      lines.push(
        '<richcontent TYPE="NODE"><html>',
        '  <head>',
        '  </head>',
        `  <body>${htmlToXhtml(node.html)}</body>`,
        '</html>',
        '</richcontent>',
      );
    }
    node.children.forEach((child) => write(child, depth + 1));
    lines.push('</node>');
  };
  write(root, 0);
  lines.push('</map>', '');
  return lines.join('\n');
}

/** FreeMind embeds rich text as XHTML, so it has to be well-formed XML. */
function htmlToXhtml(html: string): string {
  const body = new DOMParser().parseFromString(
    sanitizeHtml(html),
    'text/html',
  ).body;
  const serializer = new XMLSerializer();
  return Array.from(body.childNodes)
    .map((child) => serializer.serializeToString(child))
    .join('')
    .replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');
}

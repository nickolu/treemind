import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'b',
  'br',
  'code',
  'div',
  'em',
  'i',
  'li',
  'ol',
  'p',
  's',
  'span',
  'strong',
  'u',
  'ul',
];

/** Node HTML comes from files, localStorage and AI output, so always sanitize. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return `<div>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</div>`;
}

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'UL', 'OL']);

/** Plain-text version of node HTML, preserving line breaks. */
export function htmlToText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let text = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
      return;
    }
    if (node.nodeName === 'BR') {
      text += '\n';
      return;
    }
    const isBlock = BLOCK_TAGS.has(node.nodeName);
    if (isBlock && text && !text.endsWith('\n')) text += '\n';
    node.childNodes.forEach(walk);
    if (isBlock && text && !text.endsWith('\n')) text += '\n';
  };
  walk(doc.body);
  return text.replace(/\n+$/, '').trim();
}

/** True when the node's HTML carries formatting that plain-text editing would drop. */
export function hasRichFormatting(html: string): boolean {
  return (
    textToHtml(htmlToText(html)) !== html.trim() &&
    /<(?!\/?(div|p|br)\b)\/?[a-z]/i.test(html)
  );
}

export function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML');
  }
  return doc;
}

/** Direct children of `parent` with the given local name (ignores namespaces). */
export function childElements(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter(
    (child) => child.localName === name,
  );
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

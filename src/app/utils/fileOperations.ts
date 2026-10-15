import {MindNode} from '@/domain/MindMap/tree';
import {
  MindMapDocument,
  createDocument,
  normalizeDocument,
  serializeDocument,
} from '@/domain/MindMap/document';
import {htmlToText} from '@/domain/MindMap/html';
import {parseFreeMind, toFreeMind} from '@/domain/MindMap/formats/freemind';
import {parseXMind} from '@/domain/MindMap/formats/xmind';

export type ExportFormat = 'json' | 'freemind';

const EXPORTERS: Record<
  ExportFormat,
  {extension: string; type: string; write: (doc: MindMapDocument) => string}
> = {
  json: {
    extension: 'json',
    type: 'application/json',
    write: (doc) => JSON.stringify(serializeDocument(doc), null, 2),
  },
  // FreeMind has no equivalent for links or class members, so only the tree.
  freemind: {
    extension: 'mm',
    type: 'application/x-freemind',
    write: (doc) => toFreeMind(doc.root),
  },
};

function fileNameFor(root: MindNode, extension: string) {
  const slug = htmlToText(root.html)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${slug || 'mindmap'}.${extension}`;
}

export function saveMindMapToFile(
  doc: MindMapDocument,
  format: ExportFormat = 'json',
) {
  const exporter = EXPORTERS[format];
  const blob = new Blob([exporter.write(doc)], {type: exporter.type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileNameFor(doc.root, exporter.extension);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parses a TreeMind (.json), FreeMind (.mm) or XMind (.xmind) file. */
export async function parseMindMapFile(file: File): Promise<MindMapDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'mm') {
    return createDocument(parseFreeMind(await file.text()));
  }
  if (extension === 'xmind' || extension === 'zip') {
    return createDocument(parseXMind(new Uint8Array(await file.arrayBuffer())));
  }
  return normalizeDocument(JSON.parse(await file.text()));
}

/**
 * Opens a file picker and resolves with the parsed map, or null if the user
 * cancelled. Rejects if the file isn't a valid mind map.
 */
export function loadMindMapFromFile(): Promise<MindMapDocument | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,.mm,.xmind';
    input.addEventListener('cancel', () => resolve(null));
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(await parseMindMapFile(file));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

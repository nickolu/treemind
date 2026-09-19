import {unzipSync, strFromU8} from 'fflate';
import {v4 as uuidv4} from 'uuid';
import {MindNode} from '@/domain/MindMap/tree';
import {textToHtml} from '@/domain/MindMap/html';
import {childElements, parseXml} from './xml';

/**
 * An .xmind file is a zip archive. XMind 2020+ ("Zen") stores the map in
 * content.json; XMind 8 and earlier store it in content.xml. Newer files also
 * ship a content.xml, but it only holds an "upgrade XMind" warning map, so
 * content.json wins when both are present.
 *
 * Only the first sheet's attached topics are imported: floating/detached
 * topics, notes, markers, labels and relationships have no equivalent here.
 */
export function parseXMind(data: Uint8Array): MindNode {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data, {
      filter: (file) => /^content\.(json|xml)$/.test(file.name),
    });
  } catch {
    throw new Error('Invalid XMind file: not a zip archive');
  }
  if (files['content.json']) {
    return parseContentJson(JSON.parse(strFromU8(files['content.json'])));
  }
  if (files['content.xml']) {
    return parseContentXml(strFromU8(files['content.xml']));
  }
  throw new Error('Invalid XMind file: no content found');
}

interface XMindTopic {
  title?: string;
  branch?: string;
  children?: {attached?: XMindTopic[]};
}

function parseContentJson(sheets: unknown): MindNode {
  const sheet = Array.isArray(sheets) ? sheets[0] : undefined;
  if (!sheet?.rootTopic) throw new Error('Invalid XMind file: no root topic');
  const read = (topic: XMindTopic, parentId: string | null): MindNode => {
    const id = uuidv4();
    const attached = topic.children?.attached;
    return withCollapsed(
      {
        id,
        parentId,
        html: textToHtml(topic.title ?? ''),
        children: Array.isArray(attached)
          ? attached.map((child) => read(child, id))
          : [],
      },
      topic.branch === 'folded',
    );
  };
  return read(sheet.rootTopic, null);
}

function parseContentXml(xml: string): MindNode {
  const doc = parseXml(xml);
  const sheet = childElements(doc.documentElement, 'sheet')[0];
  const rootTopic = sheet && childElements(sheet, 'topic')[0];
  if (!rootTopic) throw new Error('Invalid XMind file: no root topic');
  const read = (topic: Element, parentId: string | null): MindNode => {
    const id = uuidv4();
    const title = childElements(topic, 'title')[0]?.textContent ?? '';
    const attached = childElements(topic, 'children')
      .flatMap((children) => childElements(children, 'topics'))
      .filter((topics) => topics.getAttribute('type') === 'attached')
      .flatMap((topics) => childElements(topics, 'topic'));
    return withCollapsed(
      {
        id,
        parentId,
        html: textToHtml(title),
        children: attached.map((child) => read(child, id)),
      },
      topic.getAttribute('branch') === 'folded',
    );
  };
  return read(rootTopic, null);
}

function withCollapsed(node: MindNode, folded: boolean): MindNode {
  return folded && node.children.length > 0 ? {...node, collapsed: true} : node;
}

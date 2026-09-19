import {memo, useMemo} from 'react';
import {sanitizeHtml} from '@/domain/MindMap/html';

const NodeHtmlRenderer = memo(function NodeHtmlRenderer({
  html,
}: {
  html: string;
}) {
  const safeHtml = useMemo(() => sanitizeHtml(html), [html]);
  return (
    <div
      className="node-content"
      dangerouslySetInnerHTML={{__html: safeHtml}}
    />
  );
});

export {NodeHtmlRenderer};

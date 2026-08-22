import { createReactInlineContentSpec } from '@blocknote/react';
import { useGraphStore } from '../../../store/graphStore';
import { NODE_TYPE_CONFIG } from '../../../lib/nodeTypeConfig';

interface NodeMentionViewProps {
  inlineContent: { props: { nodeId: string } };
  contentRef: (node: HTMLElement | null) => void;
}

// A capitalized wrapper so eslint-plugin-react-hooks recognizes this as a
// component (BlockNote's `render` field name itself is lowercase, which
// otherwise trips the rules-of-hooks heuristic).
// eslint-disable-next-line react-refresh/only-export-components -- block-spec factory file, not an HMR component boundary
function NodeMentionView(props: NodeMentionViewProps) {
  const node = useGraphStore((s) => s.nodes[props.inlineContent.props.nodeId]);
  const cfg = node?.nodeType ? NODE_TYPE_CONFIG[node.nodeType] : null;
  return (
    <span
      // eslint-disable-next-line react-hooks/refs -- contentRef is BlockNote's ref *callback*, not a ref object being dereferenced
      ref={props.contentRef}
      contentEditable={false}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded border border-primary/30 bg-primary/10 text-primary text-[12px] align-baseline select-none"
    >
      {cfg?.icon}
      {node?.label ?? 'Deleted node'}
    </span>
  );
}

export const nodeMentionSpec = createReactInlineContentSpec(
  {
    type: 'nodeMention',
    propSchema: {
      nodeId: { default: '' },
    },
    content: 'none',
  },
  {
    render: NodeMentionView,
  },
);

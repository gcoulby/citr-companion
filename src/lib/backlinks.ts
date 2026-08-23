// Pure helper for walking a BlockNote document tree and collecting the node
// ids referenced by `nodeMention` inline content. Shared by the backlinks
// store (live re-index on edit) and the .citr reader (eager seed on load) —
// kept dependency-free (no store access) so both can use it safely.

interface InlineContentLike {
  type?: string;
  props?: { nodeId?: string };
}

interface BlockLike {
  content?: InlineContentLike[] | unknown;
  children?: BlockLike[];
}

export function extractMentionedNodeIds(blocks: unknown): string[] {
  const found = new Set<string>();

  const walkInline = (content: unknown) => {
    if (!Array.isArray(content)) return;
    for (const item of content as InlineContentLike[]) {
      if (item && item.type === 'nodeMention' && item.props?.nodeId) {
        found.add(item.props.nodeId);
      }
    }
  };

  const walkBlocks = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const block of list as BlockLike[]) {
      if (!block) continue;
      walkInline(block.content);
      if (Array.isArray(block.children)) walkBlocks(block.children);
    }
  };

  walkBlocks(blocks);
  return Array.from(found);
}

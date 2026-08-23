import { createReactBlockSpec } from '@blocknote/react';

// START's Task+Action collapsed into one line — CitR doesn't need the
// film-strict split, this is just "what did the investigator do / what happened".
export const beatBlockFactory = createReactBlockSpec(
  {
    type: 'beat',
    propSchema: {},
    content: 'inline',
  },
  {
    render: (props) => (
      <div className="w-full py-0.5">
        <div ref={props.contentRef} className="italic text-[14px] text-foreground/90 outline-none before:content-['→_'] before:text-muted-foreground/50 before:not-italic" />
      </div>
    ),
  },
);

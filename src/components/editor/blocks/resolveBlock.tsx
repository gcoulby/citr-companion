import { createReactBlockSpec } from '@blocknote/react';

// Mirrors START's Resolve element and lonelog's `=>` consequence line.
export const resolveBlockFactory = createReactBlockSpec(
  {
    type: 'resolve',
    propSchema: {},
    content: 'inline',
  },
  {
    render: (props) => (
      <div className="w-full py-1.5 text-center">
        <div
          ref={props.contentRef}
          className="font-display uppercase tracking-widest text-[13px] font-semibold text-primary outline-none"
        />
      </div>
    ),
  },
);

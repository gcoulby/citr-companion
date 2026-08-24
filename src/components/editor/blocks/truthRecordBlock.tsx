import { createReactBlockSpec } from '@blocknote/react';
import type { PlayingCard } from '../../../game/types';
import { PlayingCardView } from '../../play/PlayingCard';

export interface TruthRecordPayload {
  clueRank: string;
  /** The clue set's own accumulated cards — what's being confirmed as truth. */
  clueCards: PlayingCard[];
  /** Pulled from the linked board node's summary when one exists, else the
   *  clue set's own notes — so the reader has the clue's context without
   *  needing to jump to the board. */
  clueText: string;
  /** Each truth card drawn to confirm it, paired with the note describing
   *  how that specific card modifies the clue. */
  truthCards: { card: PlayingCard; note: string }[];
}

// A read-only, stamped record of a confirmed truth — kept as its own block
// (rather than folded into the `scene` block's plain text) so Field Notes
// stays scannable by card: every truth accrued shows its cards at a glance,
// not just a paragraph describing them.
export const truthRecordBlockFactory = createReactBlockSpec(
  {
    type: 'truthRecord',
    propSchema: {
      data: { default: '{}' }, // JSON-stringified TruthRecordPayload
    },
    content: 'none',
  },
  {
    render: (props) => {
      let data: TruthRecordPayload;
      try {
        data = JSON.parse(props.block.props.data) as TruthRecordPayload;
      } catch {
        data = { clueRank: '', clueCards: [], clueText: '', truthCards: [] };
      }
      return (
        <div className="w-full my-1 px-3 py-2.5 rounded border border-yellow-300/30 bg-yellow-300/5 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-yellow-300">
            Truth confirmed — Clue {data.clueRank}
          </div>
          {data.clueText && <div className="text-[12px] text-foreground/90">{data.clueText}</div>}

          {data.clueCards.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground/70 mb-1">Clue cards</div>
              <div className="flex flex-wrap gap-1.5">
                {data.clueCards.map((c) => <PlayingCardView key={c.id} card={c} size="sm" />)}
              </div>
            </div>
          )}

          {data.truthCards.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground/70 mb-1">Truth cards drawn</div>
              <div className="flex flex-wrap gap-2">
                {data.truthCards.map(({ card, note }) => (
                  <div key={card.id} className="flex flex-col items-center gap-1 max-w-24">
                    <PlayingCardView card={card} size="sm" />
                    {note && <div className="text-[10px] text-muted-foreground text-center leading-snug">{note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    },
  },
);

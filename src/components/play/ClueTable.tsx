import { CLUE_RANKS, SUITS, type ClueSet, type Suit } from '../../game/types';

interface Props {
  clueSets: Record<string, ClueSet>;
}

const STATUS_RING: Record<ClueSet['status'], string> = {
  established: 'border-border',
  strengthened: 'border-primary/60',
  truth: 'border-yellow-300/60',
  falseLead: 'border-red-400/40 opacity-50',
};

const SUIT_GLYPH: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_RED: Record<Suit, boolean> = { hearts: true, diamonds: true, clubs: false, spades: false };
const CORNER_POS: Record<Suit, string> = {
  hearts: 'top-0.5 left-0.5',
  diamonds: 'top-0.5 right-0.5',
  clubs: 'bottom-0.5 left-0.5',
  spades: 'bottom-0.5 right-0.5',
};

// Mirrors the physical game's clue table: one cell per rank, with a corner
// pip per suit that lights up once that specific card has been drawn —
// since a rank can be strengthened by more than one suit, this shows all of
// them at a glance instead of only the most recently drawn card.
export function ClueTable({ clueSets }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {CLUE_RANKS.map((rank) => {
        const cs = clueSets[rank];
        const drawnSuits = new Set(cs?.cards.map((c) => c.suit) ?? []);
        return (
          <div
            key={rank}
            className={`relative w-11 h-14 rounded border flex items-center justify-center ${cs ? STATUS_RING[cs.status] : 'border-border/40'} ${cs ? 'bg-background' : 'bg-background/40'}`}
            title={cs ? `Clue ${rank} · ${cs.status} · ${cs.cards.length} card${cs.cards.length === 1 ? '' : 's'}` : `Clue ${rank} · not drawn`}
          >
            {SUITS.map((suit) => (
              <span
                key={suit}
                className={[
                  'absolute text-[9px] leading-none font-mono',
                  CORNER_POS[suit],
                  drawnSuits.has(suit)
                    ? SUIT_RED[suit] ? 'text-red-400' : 'text-foreground'
                    : 'text-muted-foreground/25',
                ].join(' ')}
              >
                {SUIT_GLYPH[suit]}
              </span>
            ))}
            <span className={`text-[12px] font-mono font-semibold ${cs ? 'text-foreground' : 'text-muted-foreground/40'}`}>{rank}</span>
            {cs?.boardNodeId && <span className="absolute bottom-1 right-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" title="On board" />}
          </div>
        );
      })}
    </div>
  );
}

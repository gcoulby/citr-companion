import type { PlayingCard, Suit } from '../../game/types'

const SUIT_GLYPH: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

// Corner order matches the card's visual layout: top-left, top-right,
// bottom-left, bottom-right — all four suits always render as a frame, with
// only the card's actual suit picked out in color, so the rank in the
// center reads at a glance without needing to parse a single small glyph.
const CORNER_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const CORNER_POSITION: Record<Suit, string> = {
  hearts: 'top-1 left-1',
  diamonds: 'top-1 right-1',
  clubs: 'bottom-1 left-1',
  spades: 'bottom-1 right-1',
}

interface PlayingCardViewProps {
  card: PlayingCard
  // A clue set can be strengthened by more than one suit of the same rank —
  // pass every suit collected so far to light up all of them at once.
  // Defaults to just this card's own suit when omitted.
  suits?: Suit[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<
  NonNullable<PlayingCardViewProps['size']>,
  string
> = {
  sm: 'w-9 h-13 text-[9px]',
  md: 'w-14 h-20 text-xs',
  lg: 'w-20 h-28 text-sm',
}

const RANK_SIZE_CLASSES: Record<
  NonNullable<PlayingCardViewProps['size']>,
  string
> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

export const PlayingCardView = ({
  card,
  suits,
  size = 'md',
  className = '',
}: PlayingCardViewProps) => {
  const isJoker = card.rank === 'JOKER'
  const activeSuits = suits ?? (card.suit ? [card.suit] : [])

  return (
    <div
      className={[
        'relative shrink-0 rounded-md border border-border bg-card shadow-sm select-none text-foreground',
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
    >
      {isJoker ? (
        <div className="absolute inset-0 flex justify-center items-center font-display text-primary leading-none">
          <span className="tracking-widest [writing-mode:vertical-rl]">
            JOKER
          </span>
        </div>
      ) : (
        <>
          {CORNER_SUITS.map((s) => {
            const active = activeSuits.includes(s)
            const isRedSuit = s === 'hearts' || s === 'diamonds'
            return (
              <span
                key={s}
                className={[
                  'absolute leading-none font-mono',
                  CORNER_POSITION[s],
                  active
                    ? isRedSuit
                      ? 'text-red-500'
                      : 'text-foreground'
                    : 'text-muted-foreground/25',
                ].join(' ')}
              >
                {SUIT_GLYPH[s]}
              </span>
            )
          })}
          <div
            className={`absolute inset-0 flex items-center justify-center font-mono font-bold ${RANK_SIZE_CLASSES[size]}`}
          >
            {card.rank}
          </div>
        </>
      )}
    </div>
  )
}

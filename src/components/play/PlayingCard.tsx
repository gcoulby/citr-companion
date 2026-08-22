import { useMemo } from 'react'
import type { PlayingCard } from '../../game/types'

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

interface PlayingCardViewProps {
  card: PlayingCard
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<PlayingCardViewProps['size']>, string> = {
  sm: 'w-9 h-13 text-[10px]',
  md: 'w-14 h-20 text-sm',
  lg: 'w-20 h-28 text-base',
}

export const PlayingCardView = ({ card, size = 'md', className = '' }: PlayingCardViewProps) => {
  const isRed = useMemo(() => card.suit === 'hearts' || card.suit === 'diamonds', [card.suit])
  const isJoker = card.rank === 'JOKER'
  const glyph = card.suit ? SUIT_GLYPH[card.suit] : null

  return (
    <div
      className={[
        'relative shrink-0 rounded-md border bg-card shadow-sm select-none',
        isRed ? 'border-red-400/40 text-red-500' : 'border-border text-foreground',
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
    >
      {isJoker ? (
        <div className="absolute inset-0 flex items-center justify-center font-display leading-none text-primary">
          <span className="[writing-mode:vertical-rl] tracking-widest">JOKER</span>
        </div>
      ) : (
        <>
          <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none font-mono font-semibold">
            <span>{card.rank}</span>
            {glyph && <span>{glyph}</span>}
          </div>
          <div className="absolute inset-0 flex items-center justify-center font-mono font-semibold opacity-25">
            {glyph}
          </div>
          <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none font-mono font-semibold rotate-180">
            <span>{card.rank}</span>
            {glyph && <span>{glyph}</span>}
          </div>
        </>
      )}
    </div>
  )
}

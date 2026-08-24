import { useState } from 'react';
import { Pencil, Copy, Check } from 'lucide-react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">{children}</div>;
}

// A compact mono chip — deliberately smaller/denser than shadcn's default Badge
// (rounded-full, h-5) to read as a card/rank marker rather than a status pill.
export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'amber' | 'red' | 'green' | 'gold' }) {
  const tones: Record<string, string> = {
    default: 'text-muted-foreground bg-muted border-border',
    amber: 'text-primary bg-primary/10 border-primary/30',
    red: 'text-red-400 bg-red-400/10 border-red-400/30',
    green: 'text-green-400 bg-green-400/10 border-green-400/30',
    gold: 'text-yellow-300 bg-yellow-300/10 border-yellow-300/30',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SmallButton({ children, onClick, disabled, tone = 'default' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'default' | 'amber' | 'red';
}) {
  const variant = tone === 'amber' ? 'secondary' : tone === 'red' ? 'destructive' : 'outline';
  return (
    <Button onClick={onClick} disabled={disabled} variant={variant} size="xs" className="text-[11px]">
      {children}
    </Button>
  );
}

// A small clipboard button for a rolled result — briefly swaps to a
// checkmark as the "little notice" that the copy happened, instead of a
// separate toast.
export function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy to clipboard"
      className={`text-muted-foreground/60 hover:text-primary transition-colors ${className}`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Textarea {...props} className={`resize-none ${props.className ?? ''}`} />;
}

// A roll trigger that also supports physical play: the pencil icon reveals
// 1 or 2 d6 inputs so a player who rolled real dice at the table can type
// in what came up instead of using the app's own RNG — same mechanical
// outcome either way, since both paths run through the same rule functions.
export function DiceRoller({ dice, label = 'Roll', onRoll, onManual }: {
  dice: 1 | 2;
  label?: string;
  onRoll: () => void;
  onManual: (values: number[]) => void;
}) {
  const [manual, setManual] = useState(false);
  const [vals, setVals] = useState<number[]>(dice === 2 ? [1, 1] : [1]);

  if (!manual) {
    return (
      <div className="inline-flex items-center gap-1">
        <SmallButton onClick={onRoll}>{label}</SmallButton>
        <button
          onClick={() => setManual(true)}
          title="Enter a physical dice roll"
          className="text-muted-foreground/50 hover:text-primary transition-colors"
        >
          <Pencil size={10} />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {vals.map((v, i) => (
        <input
          key={i}
          type="number"
          min={1}
          max={6}
          value={v}
          onChange={(e) => {
            const n = Math.max(1, Math.min(6, Math.round(Number(e.target.value)) || 1));
            setVals((prev) => prev.map((p, pi) => (pi === i ? n : p)));
          }}
          className="w-9 h-6 bg-background border border-border rounded text-[11px] text-center text-foreground"
        />
      ))}
      <SmallButton onClick={() => { onManual(vals); setManual(false); }}>Use</SmallButton>
      <button onClick={() => setManual(false)} className="text-muted-foreground/50 hover:text-foreground text-[10px] px-0.5">
        ✕
      </button>
    </div>
  );
}

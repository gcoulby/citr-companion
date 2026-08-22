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

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Textarea {...props} className={`resize-none ${props.className ?? ''}`} />;
}

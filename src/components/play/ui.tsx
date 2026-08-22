export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-wider text-[#8b949e] mb-1.5 font-mono">{children}</div>;
}

export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'amber' | 'red' | 'green' | 'gold' }) {
  const tones: Record<string, string> = {
    default: 'text-[#8b949e] bg-[#21262d] border-[#30363d]',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
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
  const tones: Record<string, string> = {
    default: 'border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58]',
    amber: 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10',
    red: 'border-red-400/30 text-red-400 hover:bg-red-400/10',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 rounded border text-[11px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-[#e6edf3] text-sm placeholder-[#3a3f47] focus:outline-none focus:border-amber-400/60 ${props.className ?? ''}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-[#e6edf3] text-sm placeholder-[#3a3f47] focus:outline-none focus:border-amber-400/60 resize-none ${props.className ?? ''}`}
    />
  );
}

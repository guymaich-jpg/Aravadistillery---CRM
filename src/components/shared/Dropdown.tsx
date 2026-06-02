import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  label: string;
  summary?: string | null;
  active?: boolean;
  width?: number;
  children: ReactNode;
}

export function Dropdown({ label, summary, active, width = 240, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'inline-flex items-center gap-1.5 h-[38px] px-3 rounded-lg border text-[13.5px] font-semibold whitespace-nowrap transition-colors',
          active
            ? 'border-[#c9821a] bg-[#fffaf0] text-[#8f5a0a]'
            : 'border-[#e9ddc9] bg-white text-[#2a2017] hover:border-[#d8c39a]',
        ].join(' ')}
      >
        <span className="font-bold">{label}</span>
        {summary && <span className="text-[#8f5a0a] font-semibold max-w-[130px] overflow-hidden text-ellipsis">{summary}</span>}
        <ChevronDown className="h-3.5 w-3.5 text-[#8a7a66] -ms-0.5 flex-none" />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+6px)] end-0 z-[60] bg-white border border-[#e9ddc9] rounded-[10px] shadow-[0_10px_34px_rgba(61,34,6,.16)] overflow-hidden p-1.5"
          style={{ width }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

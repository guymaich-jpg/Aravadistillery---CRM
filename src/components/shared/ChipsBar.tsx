export interface FilterChip {
  label: string;
  clear: () => void;
}

interface ChipsBarProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

export function ChipsBar({ chips, onClearAll }: ChipsBarProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-[7px] mb-3.5 items-center">
      {chips.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={c.clear}
          className="inline-flex items-center gap-1.5 bg-white border border-[#c9821a] text-[#8f5a0a] rounded-full px-3 py-1 text-[13px] font-semibold"
        >
          <span>{c.label}</span>
          <span className="text-[15px] leading-none opacity-70">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="bg-transparent border-none text-[#c0392b] text-[13px] font-semibold px-1.5 py-1"
      >
        נקה הכל
      </button>
    </div>
  );
}

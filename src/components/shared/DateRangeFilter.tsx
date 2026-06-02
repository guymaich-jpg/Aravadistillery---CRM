import { Dropdown } from './Dropdown';

interface DateRangeFilterProps {
  label: string;
  value: [string | null, string | null];
  onChange: (value: [string | null, string | null]) => void;
}

export function DateRangeFilter({ label, value, onChange }: DateRangeFilterProps) {
  const [from, to] = value;
  const active = !!from || !!to;

  return (
    <Dropdown label={label} summary={active ? `${from || '…'} → ${to || '…'}` : null} active={active} width={250}>
      <div className="p-1.5 flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs text-[#8a7a66] font-semibold">
          <span>מתאריך</span>
          <input
            type="date"
            value={from || ''}
            onChange={e => onChange([e.target.value || null, to])}
            className="h-9 border border-[#e9ddc9] rounded-[7px] px-2.5 text-[13.5px] w-full"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#8a7a66] font-semibold">
          <span>עד תאריך</span>
          <input
            type="date"
            value={to || ''}
            onChange={e => onChange([from, e.target.value || null])}
            className="h-9 border border-[#e9ddc9] rounded-[7px] px-2.5 text-[13.5px] w-full"
          />
        </label>
        {active && (
          <button
            type="button"
            onClick={() => onChange([null, null])}
            className="w-full pt-2 pb-1 border-t border-[#f0e7d6] text-[#c0392b] text-[13px] font-semibold bg-transparent"
          >
            נקה
          </button>
        )}
      </div>
    </Dropdown>
  );
}

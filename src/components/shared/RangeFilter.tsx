import { Dropdown } from './Dropdown';

interface RangeFilterProps {
  label: string;
  value: [number | null, number | null];
  onChange: (value: [number | null, number | null]) => void;
  unit?: string;
}

export function RangeFilter({ label, value, onChange, unit = '₪' }: RangeFilterProps) {
  const [min, max] = value;
  const active = min != null || max != null;

  return (
    <Dropdown label={label} summary={active ? `${min ?? '0'}–${max ?? '∞'} ${unit}` : null} active={active} width={220}>
      <div className="p-1.5 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="מינ׳"
            value={min ?? ''}
            onChange={e => onChange([e.target.value === '' ? null : +e.target.value, max])}
            className="h-9 border border-[#e9ddc9] rounded-[7px] px-2.5 text-[13.5px] w-full"
          />
          <span className="text-[#6b5e4d]">–</span>
          <input
            type="number"
            placeholder="מקס׳"
            value={max ?? ''}
            onChange={e => onChange([min, e.target.value === '' ? null : +e.target.value])}
            className="h-9 border border-[#e9ddc9] rounded-[7px] px-2.5 text-[13.5px] w-full"
          />
        </div>
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

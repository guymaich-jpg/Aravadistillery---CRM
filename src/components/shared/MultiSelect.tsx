import { Check } from 'lucide-react';
import { Dropdown } from './Dropdown';

interface MultiSelectProps<T extends string> {
  label: string;
  options: T[];
  value: T[];
  onChange: (value: T[]) => void;
  render: (option: T) => string;
}

export function MultiSelect<T extends string>({ label, options, value, onChange, render }: MultiSelectProps<T>) {
  const summary = value.length === 0 ? null : value.length === 1 ? render(value[0]) : `${value.length} נבחרו`;

  function toggle(v: T) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  }

  return (
    <Dropdown label={label} summary={summary} active={value.length > 0}>
      <div className="max-h-[280px] overflow-auto flex flex-col">
        {options.map(o => (
          <label key={o} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-sm cursor-pointer hover:bg-[#fdf8ef]">
            <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} className="sr-only" />
            <span className={[
              'w-[18px] h-[18px] rounded-[5px] border-[1.6px] flex items-center justify-center flex-none transition-colors',
              value.includes(o) ? 'bg-[#c9821a] border-[#c9821a]' : 'border-[#e9ddc9] bg-white',
            ].join(' ')}>
              {value.includes(o) && <Check className="h-3 w-3 text-white" />}
            </span>
            <span>{render(o)}</span>
          </label>
        ))}
      </div>
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="w-full mt-1 pt-2 pb-1 border-t border-[#f0e7d6] text-[#c0392b] text-[13px] font-semibold bg-transparent"
        >
          נקה
        </button>
      )}
    </Dropdown>
  );
}

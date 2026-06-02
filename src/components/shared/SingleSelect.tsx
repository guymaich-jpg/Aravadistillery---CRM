import { Dropdown } from './Dropdown';

interface SingleSelectProps<T extends string> {
  label: string;
  options: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  render: (option: T) => string;
  allLabel?: string;
}

export function SingleSelect<T extends string>({ label, options, value, onChange, render, allLabel = 'הכל' }: SingleSelectProps<T>) {
  const summary = value ? render(value) : null;

  return (
    <Dropdown label={label} summary={summary} active={!!value}>
      <div className="max-h-[280px] overflow-auto flex flex-col">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={[
            'text-start px-2.5 py-2 rounded-[7px] text-sm border-none bg-transparent',
            !value ? 'bg-[#fffaf0] text-[#8f5a0a] font-bold' : 'text-[#2a2017] hover:bg-[#fdf8ef]',
          ].join(' ')}
        >
          {allLabel}
        </button>
        {options.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={[
              'text-start px-2.5 py-2 rounded-[7px] text-sm border-none bg-transparent',
              value === o ? 'bg-[#fffaf0] text-[#8f5a0a] font-bold' : 'text-[#2a2017] hover:bg-[#fdf8ef]',
            ].join(' ')}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </Dropdown>
  );
}

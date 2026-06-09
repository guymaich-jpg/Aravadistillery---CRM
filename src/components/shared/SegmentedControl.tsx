interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex bg-[#efe4cf] rounded-[9px] p-[3px] gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            'px-3.5 py-1.5 rounded-[7px] text-[13px] font-bold border-none transition-all',
            value === o.value
              ? 'bg-white text-[#3d2206] shadow-[0_1px_3px_rgba(61,34,6,.12)]'
              : 'bg-transparent text-[#6b5e4d]',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

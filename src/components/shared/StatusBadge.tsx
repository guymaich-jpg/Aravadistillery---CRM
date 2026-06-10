interface StatusBadgeProps {
  label: string;
  colorClass?: string;
  /** Hex color for inline-styled badges (text color; bg & border are auto-derived) */
  color?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ label, colorClass, color, size = 'sm' }: StatusBadgeProps) {
  // If a raw hex color is provided, use inline styles (derived bg/border)
  if (color) {
    const sizeClasses = size === 'sm' ? 'px-2.5 py-[3px] text-[12.5px]' : 'px-3 py-1 text-sm';
    return (
      <span
        className={`inline-flex items-center rounded-full font-bold whitespace-nowrap border border-transparent ${sizeClasses}`}
        style={{ color, background: color + '1f', borderColor: color + '33' }}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        colorClass,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

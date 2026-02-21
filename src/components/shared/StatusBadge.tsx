interface StatusBadgeProps {
  label: string;
  colorClass: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ label, colorClass, size = 'sm' }: StatusBadgeProps) {
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

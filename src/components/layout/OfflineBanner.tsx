// OfflineBanner — shows a small amber bar when the browser is offline.
// Automatically hides when connectivity is restored.

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500 text-white text-center text-xs sm:text-sm py-1.5 px-4 font-medium"
    >
      אופליין — הנתונים עשויים לא להיות מעודכנים
    </div>
  );
}

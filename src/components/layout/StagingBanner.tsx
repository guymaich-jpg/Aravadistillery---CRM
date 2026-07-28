// StagingBanner — permanent yellow strip shown when the build targets the
// staging environment (VITE_APP_ENV=staging, baked in at build time).
// Production builds render nothing.

export function StagingBanner() {
  if (import.meta.env.VITE_APP_ENV !== 'staging') return null;

  return (
    <div
      role="status"
      className="bg-yellow-500 text-gray-900 text-center text-xs py-1 px-4 font-bold tracking-widest"
    >
      ⚠ STAGING
    </div>
  );
}

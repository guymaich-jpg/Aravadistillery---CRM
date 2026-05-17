import { useCRM } from '@/store/CRMContext';

export function StorageErrorBanner() {
  const { storageError } = useCRM();

  if (!storageError) return null;

  return (
    <div
      role="alert"
      dir="rtl"
      className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3"
    >
      <p className="text-sm text-red-700">
        שגיאה בחיבור למסד הנתונים: {storageError}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors whitespace-nowrap"
      >
        רענן דף
      </button>
    </div>
  );
}

import { useState } from 'react';
import { Wifi, WifiOff, Thermometer, Gauge, Droplets, FlaskConical, Settings, Clock } from 'lucide-react';
import type { FactoryConnectionStatus, FactoryAdapterType } from '@/types/factory';
import { ADAPTER_TYPE_LABELS } from '@/types/factory';

// Sensor skeleton cards — driven by the types/factory.ts definitions
const SENSOR_TYPES = [
  { type: 'temperature', label: 'טמפרטורה', icon: Thermometer, unit: '°C' },
  { type: 'pressure',    label: 'לחץ',       icon: Gauge,        unit: 'bar' },
  { type: 'flow',        label: 'זרימה',     icon: Droplets,     unit: 'L/h' },
  { type: 'volume',      label: 'נפח',       icon: FlaskConical, unit: 'L' },
  { type: 'abv',         label: 'ABV',       icon: FlaskConical, unit: '%' },
  { type: 'time',        label: 'זמן ריצה',  icon: Clock,        unit: 'min' },
] as const;

const ADAPTER_TYPES: FactoryAdapterType[] = [
  'mqtt', 'http-polling', 'websocket', 'modbus-tcp',
];

export function FactoryScreen() {
  const [status] = useState<FactoryConnectionStatus>('disconnected');
  const [configOpen, setConfigOpen] = useState(false);
  const [adapterType, setAdapterType] = useState<FactoryAdapterType>('mqtt');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  const isConnected = status === 'connected';

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">

      {/* Connection Status Card */}
      <div className={[
        'rounded-xl border shadow-sm p-5 flex items-center justify-between',
        status === 'connected'  ? 'bg-green-50 border-green-200' :
        status === 'error'      ? 'bg-red-50 border-red-200' :
        status === 'connecting' ? 'bg-amber-50 border-amber-200' :
        'bg-white border-gray-200',
      ].join(' ')}>
        <div className="flex items-center gap-4">
          <div className={[
            'w-12 h-12 rounded-xl flex items-center justify-center',
            status === 'connected'  ? 'bg-green-100' :
            status === 'error'      ? 'bg-red-100' :
            status === 'connecting' ? 'bg-amber-100' :
            'bg-gray-100',
          ].join(' ')}>
            {status === 'disconnected' || status === 'error' ? (
              <WifiOff className="h-6 w-6 text-gray-400" />
            ) : (
              <Wifi className="h-6 w-6 text-green-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[#252525]">
              {status === 'disconnected' ? 'מפעל לא מחובר' :
               status === 'connecting'   ? 'מתחבר…' :
               status === 'connected'    ? 'מפעל מחובר' :
               'שגיאת חיבור'}
            </p>
            <p className="text-xs text-[#716a56] mt-0.5">
              {status === 'disconnected'
                ? 'הגדר חיבור כדי לקבל נתונים ממערכת ניהול המפעל'
                : 'מחכה לנתוני חיישנים…'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setConfigOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2c332f] rounded-lg hover:bg-[#1e2420] transition-all shadow-sm"
        >
          <Settings className="h-4 w-4" />
          הגדרות חיבור
        </button>
      </div>

      {/* Sensor readings grid — skeleton when disconnected */}
      <div>
        <h3 className="text-sm font-semibold text-[#252525] mb-3">קריאות חיישנים</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SENSOR_TYPES.map(({ type, label, icon: Icon, unit }) => (
            <div
              key={type}
              className={[
                'bg-white rounded-xl border p-4 shadow-sm relative overflow-hidden',
                isConnected ? 'border-gray-200' : 'border-dashed border-gray-200',
              ].join(' ')}
            >
              {!isConnected && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <span className="text-xs text-[#716a56] bg-gray-100 px-2 py-1 rounded-full">
                    לא מחובר
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-[#716a56]" />
                <span className="text-xs font-medium text-[#716a56]">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-300">— — —</p>
              <p className="text-xs text-[#716a56] mt-1">{unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Production Run card — skeleton */}
      <div>
        <h3 className="text-sm font-semibold text-[#252525] mb-3">ריצת ייצור נוכחית</h3>
        <div className="bg-white rounded-xl border border-dashed border-gray-200 shadow-sm p-6 relative overflow-hidden">
          {!isConnected && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="text-center">
                <WifiOff className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-[#716a56]">יתחבר כשהמפעל מחובר</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'מספר סדרה', value: 'BATCH-000' },
              { label: 'מוצר', value: '—' },
              { label: 'כמות מתוכננת', value: '0 L' },
              { label: 'סטטוס', value: 'ממתין' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-[#716a56] mb-1">{label}</p>
                <p className="font-semibold text-[#252525] text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Production History table — empty skeleton */}
      <div>
        <h3 className="text-sm font-semibold text-[#252525] mb-3">היסטוריית ייצור</h3>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['מספר סדרה', 'מוצר', 'כמות מתוכננת', 'כמות בפועל', 'סטטוס', 'התחלה', 'סיום'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[#716a56]">
                  <div className="flex flex-col items-center gap-2">
                    <WifiOff className="h-6 w-6 text-gray-300" />
                    <span>אין ריצות ייצור מוקלטות — חבר את המפעל כדי להתחיל</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Config dialog */}
      {configOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-[#252525]">הגדרות חיבור מפעל</h3>
              <button
                onClick={() => setConfigOpen(false)}
                className="text-[#716a56] hover:text-[#252525] p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#716a56]">סוג חיבור</label>
                <select
                  value={adapterType}
                  onChange={(e) => setAdapterType(e.target.value as FactoryAdapterType)}
                  className="field-input"
                >
                  {ADAPTER_TYPES.map((t) => (
                    <option key={t} value={t}>{ADAPTER_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#716a56]">כתובת שרת (Endpoint)</label>
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="mqtt://192.168.1.100:1883"
                  className="field-input"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#716a56]">מפתח API (אופציונלי)</label>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="api-key…"
                  className="field-input"
                  dir="ltr"
                  type="password"
                />
              </div>

              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                חיבור מפעל עדיין בפיתוח. ההגדרות שמורות לשימוש עתידי.
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                disabled
                className="flex-1 py-2.5 bg-[#2c332f] text-white rounded-lg text-sm font-medium opacity-40 cursor-not-allowed"
              >
                התחבר (בקרוב)
              </button>
              <button
                onClick={() => setConfigOpen(false)}
                className="px-4 py-2.5 bg-gray-100 text-[#252525] rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

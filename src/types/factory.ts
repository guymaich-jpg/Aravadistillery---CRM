// Factory control types — stub, pre-defined for future hardware/API integration
// All types here are used by the stub UI. When real factory integration arrives,
// implement FactoryAdapter interface and inject it — no screen-level changes needed.

export type FactoryConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type FactoryAdapterType = 'mqtt' | 'http-polling' | 'websocket' | 'modbus-tcp';

export interface FactoryAdapterConfig {
  type: FactoryAdapterType;
  endpoint: string;
  pollIntervalMs?: number;
  credentials?: {
    apiKey?: string;
    username?: string;
    password?: string;
  };
}

export type ProductionRunStatus = 'planned' | 'in-progress' | 'completed' | 'aborted';

export interface ProductionRun {
  id: string;
  batchNumber: string;       // e.g. "ARQ-2026-001"
  productId: string;
  productName: string;       // snapshot
  status: ProductionRunStatus;
  plannedQuantity: number;   // bottles expected
  actualQuantity?: number;   // filled when completed
  startedAt?: string;        // ISO timestamp
  completedAt?: string;      // ISO timestamp
  sensorReadings?: SensorReading[];
  notes?: string;
}

export type SensorType = 'temperature' | 'pressure' | 'flow' | 'volume' | 'abv';

export interface SensorReading {
  sensorId: string;
  sensorType: SensorType;
  value: number;
  unit: string;              // e.g. '°C', 'bar', 'L/min', 'L', '%'
  timestamp: string;         // ISO timestamp
}

export interface FactorySystemStatus {
  connectionStatus: FactoryConnectionStatus;
  lastConnectedAt?: string;
  lastPingAt?: string;
  activeRuns: number;
  adapterType?: FactoryAdapterType;
  endpoint?: string;
  errorMessage?: string;
}

// FactoryAdapter interface — implement this when factory hardware is ready
// Stub: FactoryContext uses DISCONNECTED_STATUS and returns empty arrays
export interface FactoryAdapter {
  connect(config: FactoryAdapterConfig): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): FactorySystemStatus;
  getCurrentRun(): Promise<ProductionRun | null>;
  getRuns(limit?: number): Promise<ProductionRun[]>;
  subscribeToSensorReadings(callback: (reading: SensorReading) => void): () => void;
  onStatusChange(callback: (status: FactoryConnectionStatus) => void): () => void;
}

export const DISCONNECTED_STATUS: FactorySystemStatus = {
  connectionStatus: 'disconnected',
  activeRuns: 0,
};

// Hebrew labels for factory types
export const ADAPTER_TYPE_LABELS: Record<FactoryAdapterType, string> = {
  'mqtt':          'MQTT',
  'http-polling':  'HTTP Polling',
  'websocket':     'WebSocket',
  'modbus-tcp':    'Modbus TCP',
};

export const PRODUCTION_STATUS_LABELS: Record<ProductionRunStatus, string> = {
  'planned':     'מתוכנן',
  'in-progress': 'בייצור',
  'completed':   'הושלם',
  'aborted':     'בוטל',
};

export const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  'temperature': 'טמפרטורה',
  'pressure':    'לחץ',
  'flow':        'ספיקה',
  'volume':      'נפח',
  'abv':         'אלכוהול',
};

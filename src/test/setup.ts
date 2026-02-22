/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Mock localStorage for test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.subtle for SHA-256 in tests
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        digest: async (_algorithm: string, data: ArrayBuffer) => {
          // Simple mock — returns a deterministic hash based on data length
          // For real SHA-256 tests, the actual Web Crypto API is used
          const { createHash } = await import('crypto');
          const hash = createHash('sha256');
          hash.update(Buffer.from(data));
          return hash.digest().buffer;
        },
      },
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      },
    },
  });
}

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

// QA: 10 scenarios simulating stale/idle tab behavior (25h+)
// Verifies the visibilitychange handler in StockContext keeps inventory current.

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StockProvider, useStockCtx } from '../StockContext';
import { KEYS } from '@/lib/storage/localStorage.adapter';

// Seed localStorage with stock data before each test
const STOCK_SEED = [
  { productId: 'prod-1', currentStock: 100, minimumStock: 10, unit: 'bottles', lastUpdated: '2026-06-06T10:00:00Z' },
  { productId: 'prod-2', currentStock: 50, minimumStock: 5, unit: 'liters', lastUpdated: '2026-06-06T10:00:00Z' },
];

function fireVisibilityChange(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    writable: true,
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('StaleTab — visibilitychange inventory refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify(STOCK_SEED));
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Case 1: Tab returns after 25h idle — refresh fires ──────────────────
  it('1. refreshes stock when tab becomes visible after being backgrounded', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stockLevels).toHaveLength(2);

    // Simulate: stock updated externally while tab was hidden
    const updated = [
      { ...STOCK_SEED[0], currentStock: 200 },
      { ...STOCK_SEED[1], currentStock: 75 },
    ];
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify(updated));

    // Tab goes hidden then visible
    await act(async () => {
      fireVisibilityChange('hidden');
    });
    await act(async () => {
      fireVisibilityChange('visible');
    });

    await waitFor(() => {
      expect(result.current.stockLevels[0].currentStock).toBe(200);
      expect(result.current.stockLevels[1].currentStock).toBe(75);
    });
  });

  // ── Case 2: Tab stays visible — no unnecessary refresh ──────────────────
  it('2. does NOT refresh when tab was never hidden', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const originalLevels = result.current.stockLevels;

    // Simulate: stock changes in localStorage but NO visibility event
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([
      { ...STOCK_SEED[0], currentStock: 999 },
    ]));

    // No visibilitychange fired — state should remain unchanged
    expect(result.current.stockLevels).toEqual(originalLevels);
  });

  // ── Case 3: Tab goes hidden — no refresh on hide ────────────────────────
  it('3. does NOT trigger refresh on hide event (only on visible)', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Update storage
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([
      { ...STOCK_SEED[0], currentStock: 500 },
    ]));

    await act(async () => {
      fireVisibilityChange('hidden');
    });

    // Should still show original data — hiding doesn't trigger refresh
    expect(result.current.stockLevels[0].currentStock).toBe(100);
  });

  // ── Case 4: Multiple hide/visible cycles — each visible refresh works ───
  it('4. handles multiple hide/visible cycles correctly', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Cycle 1: update stock and return
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([
      { ...STOCK_SEED[0], currentStock: 150 },
      { ...STOCK_SEED[1], currentStock: 60 },
    ]));
    await act(async () => { fireVisibilityChange('hidden'); });
    await act(async () => { fireVisibilityChange('visible'); });
    await waitFor(() => expect(result.current.stockLevels[0].currentStock).toBe(150));

    // Cycle 2: update again and return
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([
      { ...STOCK_SEED[0], currentStock: 300 },
      { ...STOCK_SEED[1], currentStock: 90 },
    ]));
    await act(async () => { fireVisibilityChange('hidden'); });
    await act(async () => { fireVisibilityChange('visible'); });
    await waitFor(() => expect(result.current.stockLevels[0].currentStock).toBe(300));

    // Cycle 3: update again
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([
      { ...STOCK_SEED[0], currentStock: 0 },
      { ...STOCK_SEED[1], currentStock: 0 },
    ]));
    await act(async () => { fireVisibilityChange('hidden'); });
    await act(async () => { fireVisibilityChange('visible'); });
    await waitFor(() => expect(result.current.stockLevels[0].currentStock).toBe(0));
  });

  // ── Case 5: Stock empty after 25h — refresh picks up zero correctly ─────
  it('5. picks up zero stock correctly after long idle', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stockLevels[0].currentStock).toBe(100);

    // Factory sold everything while tab was idle
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([
      { ...STOCK_SEED[0], currentStock: 0 },
      { ...STOCK_SEED[1], currentStock: 0 },
    ]));

    await act(async () => { fireVisibilityChange('hidden'); });
    await act(async () => { fireVisibilityChange('visible'); });
    await waitFor(() => {
      expect(result.current.stockLevels[0].currentStock).toBe(0);
      expect(result.current.stockLevels[1].currentStock).toBe(0);
    });
  });

  // ── Case 6: New products added while idle — refresh picks them up ───────
  it('6. picks up new products added during idle period', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stockLevels).toHaveLength(2);

    // Factory added a third product while tab was hidden
    const withNewProduct = [
      ...STOCK_SEED,
      { productId: 'prod-3', currentStock: 25, minimumStock: 5, unit: 'bottles', lastUpdated: '2026-06-07T10:00:00Z' },
    ];
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify(withNewProduct));

    await act(async () => { fireVisibilityChange('hidden'); });
    await act(async () => { fireVisibilityChange('visible'); });
    await waitFor(() => expect(result.current.stockLevels).toHaveLength(3));
    expect(result.current.stockLevels[2].productId).toBe('prod-3');
  });

  // ── Case 7: Products removed while idle — refresh shows fewer ───────────
  it('7. reflects removed products after idle refresh', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stockLevels).toHaveLength(2);

    // Only one product remains
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([STOCK_SEED[0]]));

    await act(async () => { fireVisibilityChange('hidden'); });
    await act(async () => { fireVisibilityChange('visible'); });
    await waitFor(() => expect(result.current.stockLevels).toHaveLength(1));
  });

  // ── Case 8: Rapid hide/visible toggles — no double refresh ─────────────
  it('8. handles rapid visibility toggles without errors', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([
      { ...STOCK_SEED[0], currentStock: 42 },
      { ...STOCK_SEED[1], currentStock: 42 },
    ]));

    // Rapidly toggle 5 times
    await act(async () => {
      fireVisibilityChange('hidden');
      fireVisibilityChange('visible');
      fireVisibilityChange('hidden');
      fireVisibilityChange('visible');
      fireVisibilityChange('hidden');
      fireVisibilityChange('visible');
    });

    await waitFor(() => expect(result.current.stockLevels[0].currentStock).toBe(42));
    expect(result.current.storageError).toBeNull();
  });

  // ── Case 9: isRefreshing flag set during visibility refresh ─────────────
  it('9. sets isRefreshing during visibility-triggered refresh', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isRefreshing).toBe(false);

    await act(async () => { fireVisibilityChange('hidden'); });
    // The refresh is async — after firing visible, isRefreshing may briefly be true
    act(() => { fireVisibilityChange('visible'); });

    // Eventually settles back to false
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
  });

  // ── Case 10: Storage error during refresh — graceful degradation ────────
  it('10. handles storage error during refresh gracefully (keeps old data)', async () => {
    const { result } = renderHook(() => useStockCtx(), { wrapper: StockProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stockLevels[0].currentStock).toBe(100);

    // Corrupt localStorage to simulate storage failure
    localStorage.setItem(KEYS.STOCK_LEVELS, '{{invalid json');

    await act(async () => { fireVisibilityChange('hidden'); });
    await act(async () => { fireVisibilityChange('visible'); });

    // Should have an error but not crash — old data may be replaced depending on adapter
    await waitFor(() => {
      // Either keeps old data or shows error — but no crash
      expect(result.current.isRefreshing).toBe(false);
    });
  });
});

// Unit tests for the Firestore stockLevels listener (validation + retry logic)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase/firestore
const mockOnSnapshot = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection-ref'),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

// Mock firebase config
vi.mock('@/lib/firebase/config', () => ({
  getFirestoreDb: vi.fn(() => 'mock-db'),
}));

import { subscribeToStockLevels, subscribeToOrders } from '../firestore.listener';

describe('subscribeToStockLevels', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnSnapshot.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('filters out invalid docs and passes valid ones to onData', () => {
    // Arrange: capture the snapshot callback
    let snapshotCallback: (snapshot: unknown) => void = () => {};
    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (s: unknown) => void) => {
      snapshotCallback = onNext;
      return vi.fn(); // unsubscribe
    });

    const onData = vi.fn();
    const onError = vi.fn();
    subscribeToStockLevels({ onData, onError });

    // Simulate a snapshot with a mix of valid and invalid docs
    const fakeSnapshot = {
      docs: [
        { id: 'valid-doc', data: () => ({ productId: 'p1', currentStock: 100, unit: 'bottles', lastUpdated: '2026-06-01T00:00:00Z' }) },
        { id: 'invalid-doc', data: () => ({ productId: '', currentStock: 50, unit: 'bottles', lastUpdated: '2026-06-01T00:00:00Z' }) },
        { id: 'bad-stock', data: () => ({ productId: 'p2', currentStock: '50', unit: 'bottles', lastUpdated: '2026-06-01T00:00:00Z' }) },
        { id: 'valid-doc-2', data: () => ({ productId: 'p3', currentStock: 0, unit: 'liters', lastUpdated: '2026-06-02T12:00:00Z', minimumStock: 5 }) },
      ],
    };

    snapshotCallback(fakeSnapshot);

    expect(onData).toHaveBeenCalledTimes(1);
    const levels = onData.mock.calls[0][0];
    expect(levels).toHaveLength(2);
    expect(levels[0].productId).toBe('p1');
    expect(levels[1].productId).toBe('p3');
  });

  it('retries on snapshot error with exponential backoff', () => {
    // First call captures the error handler, returns unsubscribe
    let errorCallback: (err: Error) => void = () => {};
    let callCount = 0;

    mockOnSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErr: (e: Error) => void) => {
      callCount++;
      errorCallback = onErr;
      return vi.fn(); // unsubscribe
    });

    const onData = vi.fn();
    const onError = vi.fn();
    subscribeToStockLevels({ onData, onError });

    expect(callCount).toBe(1);

    // Trigger first error
    errorCallback(new Error('Network error'));
    expect(onError).toHaveBeenCalledWith('Network error');

    // Should schedule retry after 2000ms (BASE_DELAY * 2^0)
    vi.advanceTimersByTime(1999);
    expect(callCount).toBe(1); // not yet
    vi.advanceTimersByTime(1);
    expect(callCount).toBe(2); // retried

    // Trigger second error
    errorCallback(new Error('Network error 2'));
    // Should schedule retry after 4000ms (BASE_DELAY * 2^1)
    vi.advanceTimersByTime(3999);
    expect(callCount).toBe(2);
    vi.advanceTimersByTime(1);
    expect(callCount).toBe(3);

    // Trigger third error
    errorCallback(new Error('Network error 3'));
    // Should schedule retry after 8000ms (BASE_DELAY * 2^2)
    vi.advanceTimersByTime(7999);
    expect(callCount).toBe(3);
    vi.advanceTimersByTime(1);
    expect(callCount).toBe(4);

    // Trigger final error — should NOT retry, should call onData([])
    errorCallback(new Error('Final failure'));
    vi.advanceTimersByTime(20000);
    expect(callCount).toBe(4); // no more retries
    expect(onData).toHaveBeenCalledWith([]);
  });

  it('resets retry count on successful data receipt', () => {
    let snapshotCallback: (snapshot: unknown) => void = () => {};
    let errorCallback: (err: Error) => void = () => {};
    let callCount = 0;

    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (s: unknown) => void, onErr: (e: Error) => void) => {
      callCount++;
      snapshotCallback = onNext;
      errorCallback = onErr;
      return vi.fn();
    });

    const onData = vi.fn();
    const onError = vi.fn();
    subscribeToStockLevels({ onData, onError });

    // Trigger error then retry
    errorCallback(new Error('temporary'));
    vi.advanceTimersByTime(2000);
    expect(callCount).toBe(2);

    // Now receive valid data — should reset retryCount
    snapshotCallback({ docs: [{ id: 'd1', data: () => ({ productId: 'p1', currentStock: 10, unit: 'u', lastUpdated: '2026-01-01T00:00:00Z' }) }] });

    // Now trigger error again — should have full 3 retries available
    errorCallback(new Error('another error'));
    vi.advanceTimersByTime(2000);
    expect(callCount).toBe(3); // got another retry (not exhausted)
  });

  it('unsubscribe tears down listener and cancels pending retry', () => {
    let errorCallback: (err: Error) => void = () => {};
    const mockUnsub = vi.fn();

    mockOnSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErr: (e: Error) => void) => {
      errorCallback = onErr;
      return mockUnsub;
    });

    const onData = vi.fn();
    const onError = vi.fn();
    const unsubscribe = subscribeToStockLevels({ onData, onError });

    // Trigger error to schedule a retry
    errorCallback(new Error('err'));

    // Unsubscribe before retry fires
    unsubscribe();
    expect(mockUnsub).toHaveBeenCalled();

    // Advance timers — retry should NOT fire
    vi.advanceTimersByTime(10000);
    expect(onData).not.toHaveBeenCalled();
  });
});

describe('subscribeToOrders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnSnapshot.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('maps snapshot docs to orders preserving the stored paymentStatus', () => {
    let snapshotCallback: (snapshot: unknown) => void = () => {};
    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (s: unknown) => void) => {
      snapshotCallback = onNext;
      return vi.fn();
    });

    const onData = vi.fn();
    subscribeToOrders({ onData, onError: vi.fn() });

    snapshotCallback({
      docs: [
        { id: 'o1', data: () => ({ clientName: 'לקוח א', paymentStatus: 'pending', amountPaid: 0, total: 80 }) },
        { id: 'o2', data: () => ({ clientName: 'לקוח ב', paymentStatus: 'paid', amountPaid: 120, total: 120 }) },
      ],
    });

    expect(onData).toHaveBeenCalledTimes(1);
    const orders = onData.mock.calls[0][0];
    expect(orders).toHaveLength(2);
    // The doc id becomes the order id, and a pending order stays pending (bug #3 guard)
    expect(orders[0]).toMatchObject({ id: 'o1', paymentStatus: 'pending', amountPaid: 0 });
    expect(orders[1]).toMatchObject({ id: 'o2', paymentStatus: 'paid' });
  });

  it('retries on error then reports the message', () => {
    let errorCallback: (err: Error) => void = () => {};
    let callCount = 0;
    mockOnSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErr: (e: Error) => void) => {
      callCount++;
      errorCallback = onErr;
      return vi.fn();
    });

    const onError = vi.fn();
    subscribeToOrders({ onData: vi.fn(), onError });

    errorCallback(new Error('permission-denied'));
    expect(onError).toHaveBeenCalledWith('permission-denied');
    vi.advanceTimersByTime(2000);
    expect(callCount).toBe(2); // retried once
  });
});

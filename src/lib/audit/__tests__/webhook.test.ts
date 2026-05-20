import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendToWebhook } from '../webhook';
import type { AuditLogEntry } from '../types';

const sampleEntry: AuditLogEntry = {
  id: 'test-id',
  timestamp: '2026-05-19T10:00:00.000Z',
  action: 'save',
  collection: 'clients',
  recordId: 'c1',
  userEmail: 'test@dev.local',
  snapshot: { id: 'c1', businessName: 'Test' },
  source: 'crm',
};

describe('sendToWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a POST request with the entry as JSON', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

    await sendToWebhook('https://script.google.com/test', sampleEntry);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('https://script.google.com/test', {
      method: 'POST',
      body: JSON.stringify(sampleEntry),
    });
  });

  it('retries once on network failure', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(new Response('ok'));

    const promise = sendToWebhook('https://script.google.com/test', sampleEntry);
    // Advance past the 2s retry delay
    await vi.advanceTimersByTimeAsync(2100);
    await promise;

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('does not throw when both attempts fail', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const promise = sendToWebhook('https://script.google.com/test', sampleEntry);
    await vi.advanceTimersByTimeAsync(2100);

    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

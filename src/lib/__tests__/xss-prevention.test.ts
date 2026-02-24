// Security tests — XSS prevention

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../storage/localStorage.adapter';
import type { Client } from '@/types/crm';
import type { StockMovement } from '@/types/inventory';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('XSS Prevention', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it('stores client names with script tags as plain text', async () => {
    const maliciousClient: Client = {
      id: 'xss-test-1',
      name: '<script>alert("xss")</script>',
      email: 'test@example.com',
      phone: '',
      company: '<img onerror="alert(1)" src="">',
      address: '',
      status: 'active',
      tags: [],
      notes: '<div onload="steal()">notes</div>',
      createdAt: '2026-01-01',
    };
    await adapter.saveClient(maliciousClient);
    const result = await adapter.getClients();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const stored = result.data[0];
      // Data should be stored exactly as provided — no HTML encoding at storage layer
      // React will escape it during rendering
      expect(stored.name).toBe('<script>alert("xss")</script>');
      expect(stored.company).toBe('<img onerror="alert(1)" src="">');
      expect(stored.notes).toBe('<div onload="steal()">notes</div>');
    }
  });

  it('handles special characters in search-like operations', async () => {
    const client: Client = {
      id: 'special-chars',
      name: 'Test & <Company> "Quoted"',
      email: 'test+special@example.com',
      phone: '',
      company: '',
      address: '',
      status: 'active',
      tags: [],
      notes: "O'Reilly & Associates",
      createdAt: '2026-01-01',
    };
    await adapter.saveClient(client);
    const result = await adapter.getClients();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].name).toBe('Test & <Company> "Quoted"');
      expect(result.data[0].notes).toBe("O'Reilly & Associates");
    }
  });

  it('does not use dangerouslySetInnerHTML in source code', () => {
    // Scan all .tsx/.ts files (excluding test files) for unsafe HTML injection
    const srcDir = join(__dirname, '../../..');
    const unsafePattern = 'dangerous' + 'lySetInner' + 'HTML'; // split to avoid self-detection
    const findings: string[] = [];

    function scanDir(dir: string) {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          try {
            const stat = statSync(fullPath);
            if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== '__tests__' && entry !== 'test') {
              scanDir(fullPath);
            } else if ((entry.endsWith('.tsx') || entry.endsWith('.ts')) && !entry.includes('.test.') && !entry.includes('.spec.')) {
              const content = readFileSync(fullPath, 'utf-8');
              if (content.includes(unsafePattern)) {
                findings.push(fullPath);
              }
            }
          } catch { /* skip inaccessible files */ }
        }
      } catch { /* skip inaccessible dirs */ }
    }

    scanDir(join(srcDir, 'src'));
    expect(findings).toEqual([]);
  });

  it('stock movement notes with HTML are stored safely', async () => {
    const movement: StockMovement = {
      id: 'xss-movement',
      productId: '1',
      productName: 'Test',
      type: 'inbound',
      quantity: 10,
      delta: 10,
      notes: '<script>document.cookie</script>',
      createdAt: '2026-01-01',
    };
    await adapter.saveStockMovement(movement);
    const result = await adapter.getStockMovements();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].notes).toBe('<script>document.cookie</script>');
    }
  });
});

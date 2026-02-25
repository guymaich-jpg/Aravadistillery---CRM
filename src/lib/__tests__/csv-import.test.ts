// Tests for CSV import engine — column mapping, validation, deduplication, and row conversion

import { autoMapColumns, buildImportRows, rowToClientData, type ColumnMapping } from '../csv-import';
import type { Client } from '@/types/crm';

describe('autoMapColumns', () => {
  it('maps Hebrew headers to the correct fields', () => {
    const headers = ['שם מקום/עסק', 'טלפון', 'דוא״ל', 'כתובת'];
    const result = autoMapColumns(headers);
    expect(result).toEqual({
      'שם מקום/עסק': 'businessName',
      'טלפון': 'phone',
      'דוא״ל': 'email',
      'כתובת': 'address',
    });
  });

  it('maps unknown headers to null', () => {
    const headers = ['Foo', 'Bar'];
    const result = autoMapColumns(headers);
    expect(result).toEqual({
      'Foo': null,
      'Bar': null,
    });
  });
});

describe('buildImportRows', () => {
  const mapping: ColumnMapping = { 'שם': 'businessName', 'טלפון': 'phone', 'דוא״ל': 'email' };

  it('reports validation errors for empty required fields', () => {
    const rows = [{ 'שם': '', 'טלפון': '', 'דוא״ל': '' }];
    const result = buildImportRows(rows, mapping, []);

    expect(result).toHaveLength(1);
    const errors = result[0].errors;
    expect(errors.length).toBeGreaterThanOrEqual(2);

    const fieldNames = errors.map(e => e.field);
    expect(fieldNames).toContain('businessName');
    expect(fieldNames).toContain('phone');
  });

  it('detects duplicate by phone (normalised, stripping non-digits)', () => {
    const existing: Client[] = [{
      id: 'existing-1',
      businessName: 'Old Biz',
      contactPerson: '',
      phone: '050-123-4567',
      email: 'old@test.com',
      address: '',
      area: '',
      clientType: 'business',
      status: 'active',
      tags: [],
      notes: '',
      createdAt: '2025-01-01',
    }];

    const rows = [{ 'שם': 'מסעדה', 'טלפון': '0501234567', 'דוא״ל': 'test@test.com' }];
    const result = buildImportRows(rows, mapping, existing);

    expect(result).toHaveLength(1);
    expect(result[0].matchedClientId).toBe('existing-1');
  });

  it('sets matchedClientId to null for a new client with no phone match', () => {
    const existing: Client[] = [{
      id: 'existing-1',
      businessName: 'Old Biz',
      contactPerson: '',
      phone: '050-123-4567',
      email: 'old@test.com',
      address: '',
      area: '',
      clientType: 'business',
      status: 'active',
      tags: [],
      notes: '',
      createdAt: '2025-01-01',
    }];

    const rows = [{ 'שם': 'עסק חדש', 'טלפון': '0509999999', 'דוא״ל': 'new@test.com' }];
    const result = buildImportRows(rows, mapping, existing);

    expect(result).toHaveLength(1);
    expect(result[0].matchedClientId).toBeNull();
  });
});

describe('rowToClientData', () => {
  it('maps fields correctly with defaults and tag parsing', () => {
    const row = {
      rowNumber: 2,
      raw: {},
      mapped: {
        businessName: 'מסעדת השף',
        contactPerson: 'יוסי כהן',
        phone: '050-1234567',
        email: 'info@example.com',
        address: 'תל אביב',
        area: 'center',
        clientType: 'business',
        tags: 'VIP, מסעדה, חדש',
        notes: 'לקוח חשוב',
      },
      errors: [],
      matchedClientId: null,
    };

    const result = rowToClientData(row);

    expect(result.businessName).toBe('מסעדת השף');
    expect(result.contactPerson).toBe('יוסי כהן');
    expect(result.phone).toBe('050-1234567');
    expect(result.email).toBe('info@example.com');
    expect(result.address).toBe('תל אביב');
    expect(result.area).toBe('center');
    expect(result.clientType).toBe('business');
    expect(result.status).toBe('active'); // default when no status provided
    expect(result.tags).toEqual(['VIP', 'מסעדה', 'חדש']);
    expect(result.notes).toBe('לקוח חשוב');
  });

  it('resolves Hebrew status value פעיל to active', () => {
    const row = {
      rowNumber: 2,
      raw: {},
      mapped: {
        businessName: 'טסט',
        phone: '0501111111',
        status: 'פעיל',
      },
      errors: [],
      matchedClientId: null,
    };

    const result = rowToClientData(row);
    expect(result.status).toBe('active');
  });
});

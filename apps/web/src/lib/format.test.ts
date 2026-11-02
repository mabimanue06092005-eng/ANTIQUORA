import { describe, expect, it } from 'vitest';
import { formatINR, plural } from './format';
import { qs } from './api';

describe('formatINR', () => {
  it('formats paise with Indian digit grouping', () => {
    expect(formatINR(18500000)).toBe('₹1,85,000');
    expect(formatINR(49900)).toBe('₹499');
    expect(formatINR(0)).toBe('₹0');
  });
});

describe('plural', () => {
  it('pluralises', () => {
    expect(plural(1, 'item')).toBe('1 item');
    expect(plural(3, 'item')).toBe('3 items');
  });
});

describe('qs', () => {
  it('omits empty values', () => {
    expect(qs({ q: 'coin', page: 1, category: '', x: undefined })).toBe('?q=coin&page=1');
    expect(qs({})).toBe('');
  });
});

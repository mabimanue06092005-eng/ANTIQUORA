import { describe, expect, it } from 'vitest';
import { eraYear, formatEra } from './era';

describe('eraYear', () => {
  it.each([
    ['ca. 440–404 BCE', -440],
    ['29–27 BCE', -29],
    ['4th century BCE', -350],
    ['1st or 2nd century CE', 50],
    ['ca. 1st–2nd century CE', 50],
    ['3rd century', 250],
    ['mid-16th century', 1550],
    ['1654–55 CE (1065 AH)', 1654],
    ['1770–75', 1770],
    ['ca. 1830–32', 1830],
    ['200–201 CE', 200],
  ])('%s → %i', (input, year) => expect(eraYear(input)).toBe(year));

  it('returns null when no date is present', () => {
    expect(eraYear('Qing dynasty')).toBeNull();
    expect(eraYear(null)).toBeNull();
  });

  it('formats years', () => {
    expect(formatEra(-440)).toBe('440 BCE');
    expect(formatEra(1770)).toBe('1770 CE');
  });
});

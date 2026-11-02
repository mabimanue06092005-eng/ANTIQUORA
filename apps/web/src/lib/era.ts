/**
 * Converts a free-text period ("ca. 440–404 BCE", "mid-16th century", "1770–75") into an
 * approximate year for placing objects on a timeline. Negative = BCE. Returns null if unknown.
 */
export function eraYear(period: string | null | undefined): number | null {
  if (!period) return null;
  const s = period.toLowerCase();
  const bce = /\bbce?\b|\bb\.c\./.test(s);
  const century = s.match(/(\d{1,2})(?:st|nd|rd|th)\b[^,;]*?century/);
  if (century) {
    const n = Number(century[1]);
    return bce ? -((n - 1) * 100 + 50) : (n - 1) * 100 + 50;
  }
  const num = s.match(/\d{1,4}/);
  if (!num) return null;
  const y = Number(num[0]);
  return bce ? -y : y;
}

export function formatEra(year: number) {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

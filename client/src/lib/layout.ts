// How many cards sit side by side
export function columnsForWidth(width: number): 1 | 2 | 3 {
  if (width < 520) return 1;
  if (width < 860) return 2;
  return 3;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}
